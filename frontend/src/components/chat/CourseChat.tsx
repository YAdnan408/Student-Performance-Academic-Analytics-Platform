'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { resolveMediaUrl } from '@/lib/media';
import { chatService } from '@/services/chatService';
import { ChatMember, ChatMessage } from '@/types/chat';
import { useAuth } from '@/context/AuthContext';

const ACCEPTED =
  '.png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

type PendingFile = {
  id: string;
  file: File;
  previewUrl: string | null;
  isImage: boolean;
};

function isImageFile(file: File): boolean {
  const ext = `.${(file.name.split('.').pop() || '').toLowerCase()}`;
  return IMAGE_EXTS.has(ext) || file.type.startsWith('image/');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Highlight only @everyone and exact @Member Name mentions (+ URLs). */
function renderRichText(text: string, memberNames: string[] = []): ReactNode[] {
  const names = [...new Set(memberNames.filter(Boolean))].sort((a, b) => b.length - a.length);
  const mentionAlt = names.length
    ? `@everyone|@(?:${names.map(escapeRegExp).join('|')})|https?:\\/\\/[^\\s]+`
    : `@everyone|https?:\\/\\/[^\\s]+`;
  const re = new RegExp(`(${mentionAlt})`, 'gi');
  const knownMentions = new Set(['@everyone', ...names.map((n) => `@${n}`.toLowerCase())]);

  return text.split(re).filter((p) => p !== undefined && p !== '').map((part, i) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="text-sky-300 underline break-all hover:text-sky-200"
        >
          {part}
        </a>
      );
    }
    if (part.startsWith('@') && knownMentions.has(part.toLowerCase())) {
      return (
        <span key={i} className="text-sky-300 font-medium bg-sky-500/15 rounded px-0.5">
          {part}
        </span>
      );
    }
    return <span key={i} className="text-white">{part}</span>;
  });
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

interface CourseChatProps {
  offeringId: string;
}

const CourseChat = ({ offeringId }: CourseChatProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [selectedMember, setSelectedMember] = useState<ChatMember | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const upsertMessage = useCallback((msg: ChatMessage) => {
    if (!msg?.id || seenIds.current.has(msg.id)) return;
    seenIds.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mem, hist] = await Promise.all([
        chatService.getMembers(offeringId),
        chatService.getMessages(offeringId, { limit: 50 }),
      ]);
      setMembers(mem.members || []);
      seenIds.current = new Set(hist.messages.map((m) => m.id));
      setMessages(hist.messages);
      setHasMore(hist.has_more);
      await chatService.markRead(offeringId).catch(() => undefined);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chat-inbox-refresh'));
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      setError(ax.response?.data?.detail || 'Failed to load course chat');
    } finally {
      setLoading(false);
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [offeringId, scrollToBottom]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    // Wait until REST load succeeds so axios can refresh an expired access token first.
    if (loading || error) return;

    let closed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        retryTimer = setTimeout(connect, 2500);
        return;
      }
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }
      const ws = new WebSocket(chatService.buildWsUrl(offeringId, token));
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (!closed) retryTimer = setTimeout(connect, 2500);
      };
      ws.onerror = () => {
        try { ws.close(); } catch { /* ignore */ }
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message' && data.message) {
            upsertMessage(data.message as ChatMessage);
            setTimeout(() => scrollToBottom(true), 30);
            chatService.markRead(offeringId).then(() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('chat-inbox-refresh'));
              }
            }).catch(() => undefined);
          }
        } catch { /* ignore */ }
      };
    };

    const onTokenRefresh = () => {
      try { wsRef.current?.close(); } catch { /* ignore */ }
      wsRef.current = null;
      if (retryTimer) clearTimeout(retryTimer);
      connect();
    };

    connect();
    window.addEventListener('auth-token-refreshed', onTokenRefresh);
    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener('auth-token-refreshed', onTokenRefresh);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [loading, error, offeringId, upsertMessage, scrollToBottom]);

  useEffect(() => {
    return () => {
      pendingFiles.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, [pendingFiles]);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const opts: Array<{ label: string; insert: string }> = [];
    if ('everyone'.startsWith(q) || q === '') {
      opts.push({ label: '@everyone', insert: '@everyone' });
    }
    members.forEach((m) => {
      if (m.name.toLowerCase().includes(q) || m.name.toLowerCase().startsWith(q)) {
        opts.push({ label: `@${m.name}`, insert: `@${m.name}` });
      }
    });
    return opts.slice(0, 8);
  }, [mentionQuery, members]);

  const updateMentionState = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const match = before.match(/@([A-Za-z0-9_.'\- ]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const applyMention = (insert: string) => {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret);
    const after = text.slice(caret);
    const replaced = before.replace(/@([A-Za-z0-9_.'\- ]*)$/, `${insert} `);
    setText(replaced + after);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const pos = replaced.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const next: PendingFile[] = [];
    Array.from(files).forEach((file) => {
      const img = isImageFile(file);
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl: img ? URL.createObjectURL(file) : null,
        isImage: img,
      });
    });
    setPendingFiles((prev) => [...prev, ...next].slice(0, 8));
  };

  const removePending = (id: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const loadOlder = async () => {
    if (!messages.length || loadingMore) return;
    setLoadingMore(true);
    try {
      const hist = await chatService.getMessages(offeringId, {
        limit: 40,
        beforeId: messages[0].id,
      });
      const fresh = hist.messages.filter((m) => !seenIds.current.has(m.id));
      fresh.forEach((m) => seenIds.current.add(m.id));
      setMessages((prev) => [...fresh, ...prev]);
      setHasMore(hist.has_more);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && pendingFiles.length === 0) || sending) return;
    setSending(true);
    setError(null);
    try {
      if (pendingFiles.length === 0) {
        const msg = await chatService.sendText(offeringId, body);
        upsertMessage(msg);
      } else {
        // First file carries caption; remaining files follow; leftover text alone if only text somehow
        for (let i = 0; i < pendingFiles.length; i++) {
          const caption = i === 0 ? body || undefined : undefined;
          const msg = await chatService.sendAttachment(offeringId, pendingFiles[i].file, caption);
          upsertMessage(msg);
        }
        if (body && pendingFiles.length === 0) {
          const msg = await chatService.sendText(offeringId, body);
          upsertMessage(msg);
        }
      }
      pendingFiles.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
      setPendingFiles([]);
      setText('');
      setMentionQuery(null);
      setTimeout(() => scrollToBottom(true), 30);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      setError(ax.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center py-16"><Spinner /></div>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 !p-0 overflow-hidden flex flex-col min-h-[520px] max-h-[70vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
            <div>
              <h3 className="text-white font-semibold">Course Chat</h3>
              <p className="text-xs text-purple-200/50">
                {connected ? 'Live' : 'Reconnecting…'} · Instructor & enrolled students only
              </p>
            </div>
            <Button size="sm" variant="ghost" className="lg:hidden" onClick={() => setShowMembers((v) => !v)}>
              Members ({members.length})
            </Button>
          </div>

          {error && (
            <div className="px-4 py-2 text-sm text-red-300 bg-red-500/10 border-b border-red-500/20">{error}</div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {hasMore && (
              <div className="flex justify-center">
                <Button size="sm" variant="ghost" loading={loadingMore} onClick={loadOlder}>
                  Load earlier messages
                </Button>
              </div>
            )}
            {messages.length === 0 ? (
              <p className="text-center text-purple-200/40 text-sm py-12">
                No messages yet. Say hello to start the conversation.
              </p>
            ) : (
              messages.map((m) => {
                const mine = user?.id && m.sender_id === String(user.id);
                const fileUrl = resolveMediaUrl(m.attachment_url);
                const isImage = m.message_type === 'image' && !!fileUrl;
                return (
                  <div key={m.id} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                    {!mine && <Avatar src={m.sender_photo} name={m.sender_name} size="sm" className="mt-1 shrink-0" />}
                    <div className={`max-w-[80%] min-w-0 ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div className="flex items-center gap-2 px-1 flex-wrap">
                        <span className="text-xs font-medium text-white/90">{mine ? 'You' : m.sender_name}</span>
                        <span className="text-[10px] text-purple-200/40">{formatTime(m.created_at)}</span>
                      </div>
                      {m.body && (
                        <div
                          className={`rounded-2xl px-3 py-2 border ${
                            mine
                              ? 'bg-purple-500/25 border-purple-400/30 text-white'
                              : 'bg-white/5 border-white/10 text-purple-50'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {renderRichText(m.body, members.map((x) => x.name))}
                          </p>
                        </div>
                      )}
                      {isImage && (
                        <button
                          type="button"
                          onClick={() => setExpandedPhoto(fileUrl)}
                          className="block p-0 m-0 border-0 bg-transparent leading-none overflow-hidden rounded-2xl"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={fileUrl}
                            alt={m.attachment_name || 'image'}
                            className="block max-h-64 max-w-full h-auto w-auto rounded-2xl"
                          />
                        </button>
                      )}
                      {m.message_type === 'file' && fileUrl && (
                        <div
                          className={`rounded-2xl px-3 py-2 border ${
                            mine
                              ? 'bg-purple-500/25 border-purple-400/30'
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-sky-300 hover:text-sky-200 underline"
                          >
                            {m.attachment_name || 'Download file'}
                          </a>
                        </div>
                      )}
                      {!m.body && !isImage && m.message_type !== 'file' && (
                        <div
                          className={`rounded-2xl px-3 py-2 border ${
                            mine
                              ? 'bg-purple-500/25 border-purple-400/30 text-white'
                              : 'bg-white/5 border-white/10 text-purple-50'
                          }`}
                        >
                          <p className="text-sm text-purple-200/40">Empty message</p>
                        </div>
                      )}
                    </div>
                    {mine && <Avatar src={m.sender_photo} name={m.sender_name} size="sm" className="mt-1 shrink-0" />}
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-white/10 p-3 bg-black/20 space-y-2 relative">
            {pendingFiles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pendingFiles.map((p) => (
                  <div
                    key={p.id}
                    className={`relative shrink-0 w-28 h-24 rounded-xl overflow-hidden ${
                      p.isImage ? '' : 'border border-white/10 bg-white/5'
                    }`}
                  >
                    {p.isImage && p.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.previewUrl} alt={p.file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center px-2 text-center">
                        <span className="text-lg">📄</span>
                        <span className="text-[10px] text-purple-100/80 line-clamp-2 break-all">{p.file.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removePending(p.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs hover:bg-red-500/80"
                      aria-label="Remove attachment"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {mentionSuggestions.length > 0 && (
              <div className="absolute bottom-full left-3 right-3 mb-1 rounded-xl border border-white/10 bg-slate-900/95 shadow-xl overflow-hidden z-10">
                {mentionSuggestions.map((s, idx) => (
                  <button
                    key={s.insert}
                    type="button"
                    onClick={() => applyMention(s.insert)}
                    className={`w-full text-left px-3 py-2 text-sm ${
                      idx === mentionIndex ? 'bg-purple-500/30 text-white' : 'text-purple-100 hover:bg-white/5'
                    }`}
                  >
                    {s.label}
                    {s.insert === '@everyone' && (
                      <span className="ml-2 text-[10px] text-purple-200/50">notify everyone</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={ACCEPTED}
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  if (fileRef.current) fileRef.current.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
                className="shrink-0 w-10 h-10 rounded-full bg-white/5 border border-white/10 text-purple-100 hover:bg-white/10 flex items-center justify-center text-xl leading-none"
                aria-label="Add attachment"
                title="Add attachment"
              >
                +
              </button>
              <div className="relative flex-1 min-h-[3.25rem] rounded-xl bg-white/5">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words"
                >
                  {text ? (
                    renderRichText(text, members.map((x) => x.name))
                  ) : (
                    <span className="text-purple-200/30">Message… use @ to mention, @everyone for all</span>
                  )}
                </div>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => {
                    const value = e.target.value;
                    setText(value);
                    updateMentionState(value, e.target.selectionStart);
                  }}
                  onKeyDown={(e) => {
                    if (mentionSuggestions.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setMentionIndex((i) => (i + 1) % mentionSuggestions.length);
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setMentionIndex((i) => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length);
                        return;
                      }
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        applyMention(mentionSuggestions[mentionIndex].insert);
                        return;
                      }
                      if (e.key === 'Escape') {
                        setMentionQuery(null);
                        return;
                      }
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={2}
                  placeholder=""
                  className="relative w-full resize-none rounded-xl bg-transparent border border-white/10 px-3 py-2 text-sm text-transparent caret-white selection:bg-purple-500/40 focus:outline-none focus:ring-1 focus:ring-purple-400/50"
                />
              </div>
              <Button size="sm" loading={sending} onClick={send} disabled={!text.trim() && pendingFiles.length === 0}>
                Send
              </Button>
            </div>
            <p className="text-[10px] text-purple-200/40 pl-12">png, jpg, pdf, docx, xlsx, pptx · max 10MB each</p>
          </div>
        </Card>

        <Card className={`${showMembers ? 'block' : 'hidden'} lg:block !p-0 overflow-hidden max-h-[70vh]`}>
          {selectedMember ? (
            <div className="flex flex-col h-full max-h-[70vh]">
              <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h3 className="text-white font-semibold">Profile</h3>
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="w-8 h-8 rounded-lg text-purple-200/60 hover:text-white hover:bg-white/10 flex items-center justify-center text-lg"
                  aria-label="Close profile"
                >
                  ×
                </button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto">
                <button
                  type="button"
                  className="mx-auto block"
                  onClick={() => {
                    const url = resolveMediaUrl(selectedMember.photo);
                    if (url) setExpandedPhoto(url);
                  }}
                  title={selectedMember.photo ? 'Expand photo' : undefined}
                >
                  <Avatar src={selectedMember.photo} name={selectedMember.name} size="xl" />
                </button>
                <div className="text-center space-y-1">
                  <p className="text-lg font-semibold text-white">{selectedMember.name}</p>
                  <Badge variant={selectedMember.role === 'Instructor' ? 'warning' : 'info'}>
                    {selectedMember.role}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  {selectedMember.code && (
                    <div className="flex justify-between gap-3 border-b border-white/5 py-2">
                      <span className="text-purple-200/50">ID</span>
                      <span className="font-mono text-purple-100">{selectedMember.code}</span>
                    </div>
                  )}
                  {selectedMember.email && (
                    <div className="flex justify-between gap-3 border-b border-white/5 py-2">
                      <span className="text-purple-200/50">Email</span>
                      <span className="text-purple-100 break-all text-right">{selectedMember.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 border-b border-white/5 py-2">
                    <span className="text-purple-200/50">Role</span>
                    <span className="text-purple-100">{selectedMember.role}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const mention = `@${selectedMember.name} `;
                    setText((prev) => (prev && !prev.endsWith(' ') ? `${prev} ${mention}` : `${prev}${mention}`));
                    textareaRef.current?.focus();
                  }}
                >
                  Mention in chat
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                <h3 className="text-white font-semibold">Members</h3>
                <p className="text-xs text-purple-200/50">{members.length} with access · click for profile</p>
              </div>
              <ul className="overflow-y-auto max-h-[calc(70vh-64px)] divide-y divide-white/5">
                {members.map((m, idx) => (
                  <li key={`${m.user_id || m.code || idx}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedMember(m)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors"
                    >
                      <Avatar src={m.photo} name={m.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white truncate">{m.name}</p>
                        {m.code && <p className="text-[10px] font-mono text-purple-200/40">{m.code}</p>}
                      </div>
                      <Badge variant={m.role === 'Instructor' ? 'warning' : 'info'}>{m.role}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      {expandedPhoto && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setExpandedPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setExpandedPhoto(null)}
            className="absolute top-4 right-4 z-[61] w-10 h-10 rounded-full bg-black/70 border border-white/20 text-white text-2xl leading-none hover:bg-red-500/80"
            aria-label="Close"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expandedPhoto}
            alt="Expanded"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default CourseChat;
