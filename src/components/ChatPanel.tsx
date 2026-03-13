'use client';

import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getUserGroups, type ChatGroup } from '@/lib/chat-service';
import { ChatWindow } from './ChatWindow';

export function ChatPanel() {
  const { user } = useUser();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [loading, setLoading] = useState(true);

  const loadGroups = async (options?: { silent?: boolean }) => {
    if (!user) {
      setGroups([]);
      setSelectedGroup(null);
      setLoading(false);
      return;
    }

    try {
      if (!options?.silent) {
        setLoading(true);
      }

      const data = await getUserGroups();
      setGroups(data);
      setSelectedGroup((current) => {
        if (!current) {
          return data[0] || null;
        }

        return data.find((group) => group.id === current.id) || data[0] || null;
      });
    } catch (error) {
      console.error('加载群聊列表失败:', error);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadGroups();

    const timer = window.setInterval(() => {
      void loadGroups({ silent: true });
    }, 15000);

    return () => window.clearInterval(timer);
  }, [user?.id]);

  return (
    <div className="flex h-[600px] gap-4">
      <Card className="flex w-80 flex-col">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-lg">订单群聊</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">正在加载群聊...</div>
            ) : groups.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <MessageSquare className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>暂无群聊</p>
                <p className="mt-1 text-xs">下单后会自动生成订单群聊</p>
              </div>
            ) : (
              <div className="divide-y">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroup(group)}
                    className={`flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50 ${
                      selectedGroup?.id === group.id ? 'bg-muted' : ''
                    }`}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback>{group.orderTitle.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium">{group.orderTitle}</p>
                        <Badge variant="secondary" className="text-xs">
                          订单
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {group.lastMessage?.content || '暂无消息'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex-1">
        {selectedGroup ? (
          <ChatWindow group={selectedGroup} onClose={() => setSelectedGroup(null)} />
        ) : (
          <Card className="flex h-full items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="text-base">选择一个订单群聊开始沟通</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
