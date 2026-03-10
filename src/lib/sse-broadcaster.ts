export interface ConfigUpdateEvent {
  type: 'logo' | 'skin' | 'announcement' | 'settings' | 'all';
  version: string;
  timestamp: number;
}

export interface NotificationEvent {
  type: 'notification';
  userId: string;
  notification: {
    id: string;
    type: string;
    title: string;
    content: string;
    orderId?: string;
    createdAt: string;
  };
  unreadCount: number;
  timestamp: number;
}

const clients = new Set<ReadableStreamDefaultController>();

export function addSSEConnection(controller: ReadableStreamDefaultController) {
  clients.add(controller);
}

export function removeSSEConnection(controller: ReadableStreamDefaultController) {
  clients.delete(controller);
}

export function broadcastConfigUpdate(type: 'logo' | 'skin' | 'announcement' | 'settings' | 'all') {
  const event: ConfigUpdateEvent = {
    type,
    version: Date.now().toString(),
    timestamp: Date.now(),
  };

  const data = `data: ${JSON.stringify(event)}\n\n`;

  clients.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(data));
    } catch {
      clients.delete(controller);
    }
  });
}

export function broadcastNotification(
  userId: string,
  notification: {
    id: string;
    type: string;
    title: string;
    content: string;
    orderId?: string;
    createdAt: string;
  },
  unreadCount: number
) {
  const event: NotificationEvent = {
    type: 'notification',
    userId,
    notification,
    unreadCount,
    timestamp: Date.now(),
  };

  const data = `data: ${JSON.stringify(event)}\n\n`;

  clients.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(data));
    } catch {
      clients.delete(controller);
    }
  });
}

export function getConnectionCount(): number {
  return clients.size;
}
