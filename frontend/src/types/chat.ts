export type ChatRole = 'Instructor' | 'Student' | 'Member';

export type ChatMessageType = 'text' | 'image' | 'file';

export interface ChatMember {
  user_id: string | null;
  name: string;
  role: ChatRole | string;
  photo?: string | null;
  code?: string | null;
  email?: string | null;
}

export interface ChatMessage {
  id: string;
  offering_id: string;
  body: string | null;
  message_type: ChatMessageType | string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string | null;
  sender_id: string;
  sender_name: string;
  sender_role: ChatRole | string;
  sender_photo?: string | null;
}

export interface ChatMembersResponse {
  offering_id: string;
  course_code?: string | null;
  title?: string | null;
  members: ChatMember[];
  total: number;
}

export interface ChatMessagesResponse {
  offering_id: string;
  messages: ChatMessage[];
  has_more: boolean;
}

export interface ChatInboxChannel {
  offering_id: string;
  course_code?: string | null;
  title: string;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
}

export interface ChatInboxResponse {
  total_unread: number;
  channels: ChatInboxChannel[];
}
