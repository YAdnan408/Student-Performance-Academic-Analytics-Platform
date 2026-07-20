import api from '@/lib/api';
import {
  ChatInboxResponse,
  ChatMembersResponse,
  ChatMessage,
  ChatMessagesResponse,
} from '@/types/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export const chatService = {
  async getInbox(): Promise<ChatInboxResponse> {
    const { data } = await api.get<ChatInboxResponse>('/chat/inbox');
    return data;
  },

  async markRead(offeringId: string): Promise<void> {
    await api.post(`/chat/offerings/${offeringId}/read`);
  },

  async getMembers(offeringId: string): Promise<ChatMembersResponse> {
    const { data } = await api.get<ChatMembersResponse>(`/chat/offerings/${offeringId}/members`);
    return data;
  },

  async getMessages(offeringId: string, opts?: { limit?: number; beforeId?: string }): Promise<ChatMessagesResponse> {
    const { data } = await api.get<ChatMessagesResponse>(`/chat/offerings/${offeringId}/messages`, {
      params: {
        limit: opts?.limit ?? 50,
        before_id: opts?.beforeId,
      },
    });
    return data;
  },

  async sendText(offeringId: string, body: string): Promise<ChatMessage> {
    const { data } = await api.post<ChatMessage>(`/chat/offerings/${offeringId}/messages`, { body });
    return data;
  },

  async sendAttachment(offeringId: string, file: File, caption?: string): Promise<ChatMessage> {
    const form = new FormData();
    form.append('file', file);
    if (caption?.trim()) form.append('caption', caption.trim());
    const { data } = await api.post<ChatMessage>(`/chat/offerings/${offeringId}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  buildWsUrl(offeringId: string, token: string): string {
    const base = API_URL.replace(/^http/, 'ws');
    return `${base}/chat/ws/${offeringId}?token=${encodeURIComponent(token)}`;
  },
};
