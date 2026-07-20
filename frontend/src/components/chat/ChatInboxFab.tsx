'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { chatService } from '@/services/chatService';
import { ChatInboxChannel } from '@/types/chat';

const ChatInboxFab = () => {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState<ChatInboxChannel[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user || (user.role !== 'student' && user.role !== 'instructor')) return;
    try {
      const data = await chatService.getInbox();
      setChannels(data.channels || []);
      setTotalUnread(data.total_unread || 0);
    } catch {
      /* keep previous */
    }
  }, [user]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    const onRefresh = () => load();
    window.addEventListener('chat-inbox-refresh', onRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('chat-inbox-refresh', onRefresh);
    };
  }, [load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Refresh when navigating between pages
  useEffect(() => {
    load();
  }, [pathname, load]);

  if (!user || (user.role !== 'student' && user.role !== 'instructor')) {
    return null;
  }

  const badge = totalUnread > 9 ? '9+' : totalUnread > 0 ? String(totalUnread) : null;

  const openChannel = async (c: ChatInboxChannel) => {
    // Optimistically clear this channel's unread so FAB updates immediately
    const cleared = c.unread_count || 0;
    if (cleared > 0) {
      setChannels((prev) =>
        prev.map((ch) =>
          ch.offering_id === c.offering_id ? { ...ch, unread_count: 0 } : ch,
        ),
      );
      setTotalUnread((prev) => Math.max(0, prev - cleared));
    }
    setOpen(false);
    try {
      await chatService.markRead(c.offering_id);
    } catch {
      /* CourseChat will also mark read */
    }
    const base =
      user.role === 'instructor'
        ? `/instructor/courses/${c.offering_id}`
        : `/student/my-courses/${c.offering_id}`;
    router.push(`${base}?tab=chat`);
    load();
  };

  return (
    <div className="fixed bottom-6 right-6 z-40" ref={ref}>
      {open && (
        <div className="mb-3 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-fadeIn">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Course Chats</p>
              <p className="text-[11px] text-purple-200/50">
                {totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-purple-200/50 hover:text-white text-sm">
              ✕
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto divide-y divide-white/5">
            {channels.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-purple-200/40">No course chats yet</li>
            ) : (
              channels.map((c) => (
                <li key={c.offering_id}>
                  <button
                    type="button"
                    onClick={() => openChannel(c)}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">
                          {c.course_code ? `${c.course_code} — ` : ''}
                          {c.title}
                        </p>
                        <p className="text-xs text-purple-200/50 truncate mt-0.5">
                          {c.last_message_preview || 'No messages yet'}
                        </p>
                      </div>
                      {c.unread_count > 0 && (
                        <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {c.unread_count > 9 ? '9+' : c.unread_count}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) load();
        }}
        className="relative w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-900/40 flex items-center justify-center text-white hover:scale-105 transition-transform"
        aria-label="Course chats"
        title="Course chats"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {badge && (
          <span className="absolute -top-1 -right-1 min-w-[1.35rem] h-5 px-1 rounded-full bg-rose-500 text-[10px] font-bold flex items-center justify-center border-2 border-slate-900">
            {badge}
          </span>
        )}
      </button>
    </div>
  );
};

export default ChatInboxFab;
