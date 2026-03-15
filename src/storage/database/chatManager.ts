import { ensureOrderGroupChat } from '@/lib/chat-service-new';

export class ChatManager {
  async createGroupChat(data: {
    orderId: string;
    title: string;
    buyerId: string;
    sellerId: string;
  }) {
    return ensureOrderGroupChat(data.orderId);
  }
}

export const chatManager = new ChatManager();
