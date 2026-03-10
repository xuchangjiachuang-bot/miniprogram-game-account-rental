'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, MoreVertical, Plus } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { getUserGroups, type ChatGroup } from '@/lib/chat-service';
import { ChatWindow } from './ChatWindow';

export function ChatPanel() {
  const { user } = useUser();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载群聊列表
  const loadGroups = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getUserGroups(user.id);
      setGroups(data);
    } catch (error) {
      console.error('加载群聊列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [user]);

  return (
    <div className="flex h-[600px] gap-4">
      {/* 群聊列表 */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="border-b flex flex-row items-center justify-between space-y-0 py-3">
          <CardTitle className="text-lg">消息</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="p-4 text-center text-gray-500">加载中...</div>
            ) : groups.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>暂无群聊</p>
              </div>
            ) : (
              <div className="divide-y">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                      selectedGroup?.id === group.id ? 'bg-purple-50' : ''
                    }`}
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback>{group.title.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{group.title}</p>
                        {group.orderId && (
                          <Badge variant="secondary" className="text-xs">订单</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        群聊ID: {group.id.slice(0, 8)}...
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 聊天窗口 */}
      <Card className="flex-1 flex flex-col">
        {selectedGroup ? (
          <ChatWindow
            group={selectedGroup}
            onClose={() => setSelectedGroup(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">选择一个群聊开始聊天</p>
              <p className="text-sm mt-1">订单创建后会自动生成群聊</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
