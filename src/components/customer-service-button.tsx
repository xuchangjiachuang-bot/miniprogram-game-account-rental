'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, X, Send, ExternalLink } from 'lucide-react';

interface CustomerServiceConfig {
  isEnabled: boolean;
  status: 'online' | 'offline' | 'busy';
  kfAvatar: string;
  kfQrCode: string;
  kfUrl: string; // 客服链接
  welcomeMessage: string;
  offlineMessage: string;
  busyMessage: string;
  autoReply: boolean;
  showOnHomepage: boolean;
  showOnOrderPage: boolean;
  showOnSellerPage: boolean;
  floatingButtonEnabled: boolean;
  floatingButtonPosition: 'left' | 'right';
  floatingButtonColor: string;
}

interface CustomerServiceProps {
  pageType?: 'homepage' | 'order' | 'seller' | 'all';
}

export function CustomerServiceButton({ pageType = 'all' }: CustomerServiceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<CustomerServiceConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/customer-service/config');
      const result = await response.json();
      if (result.success) {
        setConfig(result.data);
      }
    } catch (error) {
      console.error('加载客服配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 检查是否应该显示客服按钮
  const shouldShow = () => {
    if (!config || !config.isEnabled || !config.floatingButtonEnabled) {
      return false;
    }

    if (pageType === 'all') {
      return true;
    }

    if (pageType === 'homepage' && config.showOnHomepage) {
      return true;
    }

    if (pageType === 'order' && config.showOnOrderPage) {
      return true;
    }

    if (pageType === 'seller' && config.showOnSellerPage) {
      return true;
    }

    return false;
  };

  // 获取状态消息
  const getStatusMessage = () => {
    if (!config) return '';

    if (config.status === 'offline') {
      return config.offlineMessage;
    }

    if (config.status === 'busy') {
      return config.busyMessage;
    }

    return config.welcomeMessage;
  };

  // 获取状态颜色
  const getStatusColor = () => {
    if (!config) return '#07C160';

    if (config.status === 'offline') {
      return '#9CA3AF';
    }

    if (config.status === 'busy') {
      return '#F59E0B';
    }

    return config.floatingButtonColor;
  };

  // 获取状态文字
  const getStatusText = () => {
    if (!config) return '在线';

    if (config.status === 'offline') {
      return '离线';
    }

    if (config.status === 'busy') {
      return '忙碌';
    }

    return '在线';
  };

  if (loading || !shouldShow() || !config) {
    return null;
  }

  const positionClass = config.floatingButtonPosition === 'left' ? 'left-8' : 'right-8';
  const buttonColor = getStatusColor();

  return (
    <>
      {/* 客服悬浮按钮 */}
      <div className={`fixed bottom-8 ${positionClass} z-50`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group relative w-12 h-12 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center cursor-pointer"
          style={{ backgroundColor: buttonColor }}
          aria-label="在线客服"
        >
          <style jsx>{`
            @keyframes bounce-soft {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
          `}</style>
          <div className="customer-bounce group-hover:animate-bounce-soft">
            {isOpen ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <MessageCircle className="w-5 h-5 text-white" />
            )}
          </div>

          {/* 未读消息提示 */}
          {!isOpen && config.status === 'online' && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md">
              1
            </span>
          )}

          {/* 悬停提示气泡 */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:translate-y-0 translate-y-2">
            <div className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg whitespace-nowrap">
              <div className="font-medium">在线客服</div>
              <div className="text-xs text-gray-400">
                {getStatusText()}客服
              </div>
            </div>
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-gray-900 mx-auto"></div>
          </div>
        </button>
      </div>

      {/* 客服聊天窗口 */}
      {isOpen && (
        <div className={`fixed bottom-24 ${positionClass} w-[350px] h-[500px] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col border border-gray-200`}>
          {/* 聊天窗口头部 */}
          <div
            className="text-white px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: buttonColor }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold">在线客服</div>
                <div className="text-xs opacity-90">
                  {getStatusText()}客服
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 聊天内容区域 */}
          <div className="flex-1 bg-gray-50 p-4 overflow-y-auto space-y-3">
            {/* 客服欢迎消息 */}
            <div className="flex gap-2">
              {config.kfAvatar ? (
                <img
                  src={config.kfAvatar}
                  alt="在线客服"
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: buttonColor }}
                >
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm max-w-[80%]">
                <div className="text-sm text-gray-700">
                  {getStatusMessage()}
                </div>
                <div className="text-xs text-gray-400 mt-1">刚刚</div>
              </div>
            </div>

            {/* 客服二维码 */}
            {config.kfQrCode && (
              <div className="flex gap-2">
                {config.kfAvatar ? (
                  <img
                    src={config.kfAvatar}
                    alt="在线客服"
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: buttonColor }}
                  >
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm max-w-[80%]">
                  <div className="text-sm text-gray-700 mb-2">
                    扫码添加客服微信
                  </div>
                  <img
                    src={config.kfQrCode}
                    alt="客服二维码"
                    className="w-32 h-32 rounded-lg"
                  />
                  <div className="text-xs text-gray-400 mt-1">刚刚</div>
                </div>
              </div>
            )}

            {/* 客服链接按钮 */}
            {config.kfUrl && (
              <div className="flex gap-2">
                {config.kfAvatar ? (
                  <img
                    src={config.kfAvatar}
                    alt="在线客服"
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: buttonColor }}
                  >
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm max-w-[80%]">
                  <div className="text-sm text-gray-700 mb-2">
                    点击链接联系客服
                  </div>
                  <a
                    href={config.kfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    打开企业微信客服
                  </a>
                  <div className="text-xs text-gray-400 mt-1">刚刚</div>
                </div>
              </div>
            )}

            {/* 常见问题快捷按钮 */}
            {config.autoReply && config.status === 'online' && (
              <div className="flex flex-wrap gap-2 mt-2">
                <button className="px-3 py-1.5 bg-white rounded-full text-xs text-gray-700 hover:bg-gray-50 border border-gray-200 transition-colors">
                  如何租赁账号？
                </button>
                <button className="px-3 py-1.5 bg-white rounded-full text-xs text-gray-700 hover:bg-gray-50 border border-gray-200 transition-colors">
                  如何上架账号？
                </button>
                <button className="px-3 py-1.5 bg-white rounded-full text-xs text-gray-700 hover:bg-gray-50 border border-gray-200 transition-colors">
                  支付方式
                </button>
              </div>
            )}

            {/* 提示信息 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
              <div className="text-xs text-yellow-800">
                <div className="font-medium mb-1">💡 温馨提示</div>
                <div>您可以通过以下方式联系客服：</div>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {config.kfUrl && (
                    <li>点击上方的"打开企业微信客服"按钮</li>
                  )}
                  {config.kfQrCode && (
                    <li>扫描上方二维码添加客服微信</li>
                  )}
                  {!config.kfUrl && !config.kfQrCode && (
                    <li>请联系管理员配置企业微信客服信息</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* 底部提示 */}
          <div className="border-t border-gray-200 p-3 bg-white">
            <div className="text-xs text-center text-gray-500">
              由企业微信客服系统提供支持
            </div>
          </div>
        </div>
      )}
    </>
  );
}
