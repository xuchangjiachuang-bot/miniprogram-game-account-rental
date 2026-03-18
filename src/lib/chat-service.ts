'use client';

import { getToken } from '@/lib/auth-token';

export interface ChatGroupMember {
  id: string;
  name: string;
  avatar?: string;
  role: 'buyer' | 'seller' | 'admin';
}

export interface ChatGroup {
  id: string;
  orderId: string;
  orderTitle: string;
  members: ChatGroupMember[];
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    content: string;
    sender: string;
    time: string;
  };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderType: 'buyer' | 'seller' | 'admin' | 'system';
  senderName: string;
  senderAvatar?: string;
  content: string;
  fileKey?: string;
  imageUrl?: string;
  messageType: 'text' | 'image' | 'system';
  createdAt: string;
}

async function uploadChatImage(file: File): Promise<{ key: string; url: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'screenshot');

  const response = await fetch('/api/storage/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok || !payload.success || !payload.url || !payload.key) {
    throw new Error(payload.error || '图片上传失败');
  }

  return {
    key: payload.key as string,
    url: payload.url as string,
  };
}

function buildHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJson(response: Response) {
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || '请求失败');
  }

  return payload.data;
}

export async function getUserGroups(): Promise<ChatGroup[]> {
  const response = await fetch('/api/chat/user-groups', {
    headers: buildHeaders(),
    cache: 'no-store',
  });

  return parseJson(response);
}

export async function getGroupMessages(groupId: string, limit = 50): Promise<ChatMessage[]> {
  const response = await fetch(`/api/chat/groups/${groupId}/messages?limit=${limit}`, {
    headers: buildHeaders(),
    cache: 'no-store',
  });

  return parseJson(response);
}

export async function sendGroupMessage(groupId: string, content: string): Promise<ChatMessage> {
  const response = await fetch(`/api/chat/groups/${groupId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders(),
    },
    body: JSON.stringify({ content }),
  });

  return parseJson(response);
}

export async function sendGroupImageMessage(groupId: string, file: File): Promise<ChatMessage> {
  const uploaded = await uploadChatImage(file);
  const response = await fetch(`/api/chat/groups/${groupId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders(),
    },
    body: JSON.stringify({ content: uploaded.key, messageType: 'image' }),
  });

  return parseJson(response);
}
