'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, FileText, Wallet, Shield, Upload, CheckCircle, Camera, Loader2, AlertCircle, MessageSquare, Send, Clock, Users, RefreshCw, Bell, Check, CheckCheck } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { formatBalance } from '@/lib/balance-service';
import { ImageUploader } from '@/components/ImageUploader';
import { getToken } from '@/lib/auth-token';
import { buildWechatPaymentHrefForCurrentEnv } from '@/lib/wechat/payment-entry';

interface GroupChat {
  id: string;
  orderId: string;
  orderTitle: string;
  members: {
    id: string;
    name: string;
    avatar?: string;
    role: 'buyer' | 'seller' | 'admin';
  }[];
  lastMessage?: {
    content: string;
    sender: string;
    time: string;
  };
  createdAt: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderType?: 'buyer' | 'seller' | 'admin' | 'system';
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
}

interface WalletUiSettings {
  withdrawalFee: number;
}

export default function UserCenterPage() {
  const { user, loading } = useUser();
  const [activeTab, setActiveTab] = useState('profile');
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  // 监听URL变化
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkUrl = () => {
      const url = window.location.href;
      if (url !== currentUrl) {
        setCurrentUrl(url);
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        const validTab = tabParam && ['profile', 'verification', 'chats', 'orders', 'wallet', 'notifications'].includes(tabParam);
        if (validTab) {
          setActiveTab(tabParam);
        } else if (tabParam === null) {
          setActiveTab('profile');
        }
      }
    };

    // 初始检查
    checkUrl();

    // 定期检查URL变化（简单但有效的方法）
    const interval = setInterval(checkUrl, 100);

    return () => clearInterval(interval);
  }, [currentUrl]);

  // 监听activeTab变化，同步URL
  useEffect(() => {
    if (typeof window !== 'undefined' && activeTab) {
      const url = new URL(window.location.href);
      if (activeTab === 'profile') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', activeTab);
      }
      const newUrl = url.toString();
      if (newUrl !== window.location.href) {
        window.history.replaceState({}, '', newUrl);
        setCurrentUrl(newUrl);
      }
    }
  }, [activeTab]);

  // 群聊状态
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<GroupChat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(false);

  // 钱包状态
  const [balance, setBalance] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [walletUiSettings, setWalletUiSettings] = useState<WalletUiSettings>({
    withdrawalFee: 1,
  });
  const hasBoundWechatWithdrawAccount = Boolean(user?.wechat_openid);
  const withdrawAccountDisplayValue = hasBoundWechatWithdrawAccount
    ? '当前授权登录的微信账号（自动到账）'
    : withdrawAccount;

  // 个人资料表单
  const [profileForm, setProfileForm] = useState({
    username: '',
    phone: '',
    avatar: '',
    avatarKey: '',
    email: ''
  });

  // 实名认证表单
  const [verificationForm, setVerificationForm] = useState({
    realName: '',
    idCard: '',
    idCardFront: '',
    idCardBack: ''
  });
  const [verificationKeys, setVerificationKeys] = useState({
    front: '',
    back: ''
  });
  const [verificationPreview, setVerificationPreview] = useState({
    front: '',
    back: ''
  });

  // 文件上传输入框引用
  const idCardFrontRef = useRef<HTMLInputElement>(null);
  const idCardBackRef = useRef<HTMLInputElement>(null);

  // 通知状态
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationsAbortRef = useRef<AbortController | null>(null);

  // 订单列表状态
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const ordersAbortRef = useRef<AbortController | null>(null);

  const isInterruptedRequestError = (error: unknown, controller: AbortController) => {
    if (controller.signal.aborted) {
      return true;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      return true;
    }

    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return typeof document !== 'undefined' && document.visibilityState === 'hidden';
    }

    return false;
  };

  useEffect(() => {
    return () => {
      notificationsAbortRef.current?.abort();
      ordersAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const frontPreview = verificationPreview.front;
    const backPreview = verificationPreview.back;

    return () => {
      [frontPreview, backPreview].forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [verificationPreview.front, verificationPreview.back]);

  // 加载用户资料
  useEffect(() => {
    if (!user) return;

    setProfileForm({
      username: user.username || '',
      phone: user.phone || '',
      avatar: user.avatar || '',
      avatarKey: '',
      email: user.email || ''
    });
    setWithdrawAccount(user.wechat_openid || '');
    loadPublicPlatformSettings();
  }, [user]);

  // 按当前 tab 懒加载数据，避免个人资料/钱包页被不相关请求拖垮
  useEffect(() => {
    if (!user) return;

    switch (activeTab) {
      case 'chats':
        loadGroupChats();
        break;
      case 'orders':
        loadUserOrders();
        break;
      case 'wallet':
        loadWalletData();
        break;
      case 'notifications':
        loadNotifications();
        break;
      default:
        break;
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (activeTab !== 'chats' || !user) {
      return;
    }

    const groupTimer = window.setInterval(() => {
      loadGroupChats();
    }, 15000);

    const messageTimer = selectedChat ? window.setInterval(() => {
      loadChatMessages(selectedChat.id, { silent: true });
    }, 5000) : null;

    return () => {
      window.clearInterval(groupTimer);
      if (messageTimer) {
        window.clearInterval(messageTimer);
      }
    };
  }, [activeTab, selectedChat?.id, user?.id]);

  // 加载钱包数据
  const loadPublicPlatformSettings = async () => {
    try {
      const response = await fetch('/api/admin/platform-settings', {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('加载平台配置失败');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '加载平台配置失败');
      }

      setWalletUiSettings({
        withdrawalFee: Number(result.data?.withdrawalFee || 1),
      });
    } catch (error) {
      console.error('加载平台配置失败:', error);
    }
  };

  const loadWalletData = async () => {
    if (!user) return;

    // 加载余额
    if (false) {
      toast.error('请在微信内打开后发起充值');
      return;
    }

    try {
      const token = getToken();

      if (false) {
        toast.error('请在微信内打开后发起充值');
        return;
      }

      if (!token) {
        toast.error('请先登录后再发起充值');
        return;
      }

      if (false) {
        toast.error('请在微信内打开后发起充值');
        return;
      }

      if (!token) {
        toast.error('请先登录后再发起充值');
        return;
      }

      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [balanceResponse, transactionsResponse] = await Promise.all([
        fetch('/api/wallet', {
          headers,
          cache: 'no-store'
        }),
        fetch('/api/wallet/transactions?page=1&pageSize=10', {
          headers,
          cache: 'no-store'
        })
      ]);

      if (!balanceResponse.ok) {
        throw new Error('加载钱包余额失败');
      }

      if (!transactionsResponse.ok) {
        throw new Error('加载钱包流水失败');
      }

      const balanceResult = await balanceResponse.json();
      const transactionsResult = await transactionsResponse.json();

      setBalance(balanceResult.data || null);
      setTransactions(transactionsResult.data?.list || []);
    } catch (error) {
      console.error('加载钱包数据失败:', error);
      toast.error('加载钱包数据失败');
    }
  };

  // 加载通知数据
  const loadNotifications = async () => {
    if (!user) return;

    notificationsAbortRef.current?.abort();
    const controller = new AbortController();
    notificationsAbortRef.current = controller;

    setNotificationsLoading(true);
    try {
      // 获取 token
      const token = getToken();

      const response = await fetch(`/api/notifications?userId=${user.id}&includeRead=true`, {
        signal: controller.signal,
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });
      if (!response.ok) {
        throw new Error('加载通知失败');
      }
      const data = await response.json();
      const rawNotifications = Array.isArray(data.notifications)
        ? data.notifications
        : Array.isArray(data.data)
          ? data.data
          : [];

      setNotifications(rawNotifications.map((notification: any) => ({
        ...notification,
        user_id: notification.user_id ?? notification.userId,
        order_id: notification.order_id ?? notification.orderId,
        is_read: notification.is_read ?? notification.isRead ?? false,
        created_at: notification.created_at ?? notification.createdAt,
        read_at: notification.read_at ?? notification.readAt ?? null,
      })));
    } catch (error) {
      if (isInterruptedRequestError(error, controller)) {
        return;
      }

      console.error('加载通知失败:', error);
      toast.error('加载通知失败');
    } finally {
      if (notificationsAbortRef.current === controller) {
        setNotificationsLoading(false);
        notificationsAbortRef.current = null;
      }
    }
  };

  // 加载订单列表
  const loadUserOrders = async () => {
    if (!user) return;

    ordersAbortRef.current?.abort();
    const controller = new AbortController();
    ordersAbortRef.current = controller;

    setOrdersLoading(true);
    try {
      const token = getToken();
      const response = await fetch('/api/orders', {
        signal: controller.signal,
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });
      if (!response.ok) {
        throw new Error('加载订单失败');
      }
      const data = await response.json();
      setUserOrders(data.data?.orders || []);
    } catch (error) {
      if (isInterruptedRequestError(error, controller)) {
        return;
      }

      console.error('加载订单失败:', error);
      toast.error('加载订单失败');
    } finally {
      if (ordersAbortRef.current === controller) {
        setOrdersLoading(false);
        ordersAbortRef.current = null;
      }
    }
  };

  // 处理通知点击
  const handleNotificationClick = async (notification: any) => {
    // 标记为已读
    if (!notification.is_read) {
      try {
        const token = getToken();
        await fetch(`/api/notifications/${notification.id}/read`, {
          method: 'POST',
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : {}
        });
        // 更新本地状态
        setNotifications(notifications.map(n =>
          n.id === notification.id ? { ...n, is_read: true } : n
        ));
      } catch (error) {
        console.error('标记已读失败:', error);
      }
    }

    // 如果通知关联订单，跳转到订单详情页
    if (notification.order_id) {
      window.location.href = `/orders?tab=list&order=${notification.order_id}`;
    }
  };

  // 获取交易类型文本
  const getTransactionTypeText = (type: string): string => {
    const typeMap: Record<string, string> = {
      deposit: '充值',
      withdraw: '提现',
      refund: '退款',
      income: '收入',
      penalty: '扣款',
      deposit_refund: '押金退还',
      deposit_freeze: '押金冻结',
      deposit_unfreeze: '押金解冻',
      commission: '平台佣金',
      rent_income: '租金收入',
      platform_income: '平台收入'
    };
    return typeMap[type] || '未知';
  };

  // 获取交易类型颜色
  const getTransactionTypeColor = (type: string): string => {
    if (type === 'withdraw' || type === 'freeze' || type === 'penalty' || type === 'deposit_freeze' || type === 'listing_deposit_freeze') {
      return 'text-red-500';
    }
    return 'text-green-500';
  };

  const getTransactionDisplayAmount = (transaction: any): number => {
    if (
      transaction.transaction_type === 'withdraw' ||
      transaction.transaction_type === 'freeze' ||
      transaction.transaction_type === 'deposit_freeze' ||
      transaction.transaction_type === 'listing_deposit_freeze'
    ) {
      return -Math.abs(Number(transaction.amount) || 0);
    }

    if (
      transaction.transaction_type === 'unfreeze' ||
      transaction.transaction_type === 'deposit_unfreeze' ||
      transaction.transaction_type === 'listing_deposit_unfreeze'
    ) {
      return Math.abs(Number(transaction.amount) || 0);
    }

    return Number(transaction.amount) || 0;
  };

  const getTransactionBadgeText = (type: string): string => {
    if (type === 'freeze') {
      return '提现申请';
    }

    if (type === 'unfreeze') {
      return '提现退回';
    }

    if (type === 'listing_deposit_freeze') {
      return '上架保证金冻结';
    }

    if (type === 'listing_deposit_unfreeze') {
      return '上架保证金解冻';
    }

    return getTransactionTypeText(type);
  };

  // 充值
  const handleRecharge = async () => {
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      toast.error('请输入有效的充值金额');
      return;
    }

    try {
      // 获取 token
      const token = getToken();

      if (!token) {
        toast.error('请先登录后再发起充值');
        return;
      }

      window.location.href = buildWechatPaymentHrefForCurrentEnv({
        rechargeAmount,
      });
      return;
    } catch (error) {
      console.error('充值失败:', error);
      toast.error('充值跳转失败，请重试');
    }
  };

  // 提现
  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('请输入有效的提现金额');
      return;
    }
    if (!withdrawAccount) {
      toast.error('请输入提现账户');
      return;
    }
    if (balance && parseFloat(withdrawAmount) > balance.available_balance) {
      toast.error('提现金额超过可用余额');
      return;
    }

    try {
      // 获取 token
      const token = getToken();

      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          withdrawal_type: 'alipay', // 默认支付宝
          account_info: withdrawAccount
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`提现 ¥${withdrawAmount} 申请已提交！`);
        setWithdrawAmount('');
        setWithdrawAccount('');
        loadWalletData();
      } else {
        toast.error(result.error || '提现失败');
      }
    } catch (error) {
      console.error('提现失败:', error);
      toast.error('提现失败，请重试');
    }
  };

  // 加载群聊列表
  const handleWechatWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('请输入有效的提现金额');
      return;
    }

    if (!user?.wechat_openid) {
      toast.error('请先使用微信授权登录并绑定微信后再提现');
      return;
    }

    if (balance && parseFloat(withdrawAmount) > Number(balance.available_balance || 0)) {
      toast.error('提现金额超过可用余额');
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        toast.error('请先登录后再提现');
        return;
      }

      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          withdrawal_type: 'wechat'
        })
      });

      const result = await response.json();
      if (!result.success) {
        toast.error(result.error || '提现失败');
        return;
      }

      toast.success(`微信提现 ¥${withdrawAmount} 已提交`);
      setWithdrawAmount('');
      setWithdrawAccount(user?.wechat_openid || '');
      loadWalletData();
    } catch (error) {
      console.error('提现失败:', error);
      toast.error('提现失败，请重试');
    }
  };

  const loadGroupChats = async () => {
    setLoadingChats(true);
    try {
      const token = getToken();
      const res = await fetch('/api/chat/user-groups', {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });
      const result = await res.json();

      if (result.success && result.data) {
        setGroupChats(result.data);
        setSelectedChat((current) => {
          if (!current) {
            return current;
          }

          return result.data.find((chat: GroupChat) => chat.id === current.id) || current;
        });
      } else {
        setGroupChats([]);
      }
    } catch (error) {
      console.error('加载群聊失败:', error);
      toast.error('加载群聊失败');
    } finally {
      setLoadingChats(false);
    }
  };

  const loadChatMessages = async (chatId: string, options?: { silent?: boolean }) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/chat/groups/${chatId}/messages?limit=50`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });
      const result = await res.json();

      if (result.success && result.data) {
        setChatMessages(result.data.map((message: any) => ({
          id: message.id,
          senderId: message.senderId,
          senderType: message.senderType,
          senderName: message.senderName || message.senderType || '系统',
          senderAvatar: message.senderAvatar,
          content: message.content,
          timestamp: message.createdAt || message.timestamp || new Date().toISOString()
        })));
      } else {
        setChatMessages([]);
      }
    } catch (error) {
      console.error('加载聊天记录失败:', error);
      if (!options?.silent) {
        toast.error('加载聊天记录失败');
      }
    }
  };

  const handleSelectChat = (chat: GroupChat) => {
    setSelectedChat(chat);
    loadChatMessages(chat.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user) return;

    try {
      const token = getToken();
      const response = await fetch(`/api/chat/groups/${selectedChat.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          messageType: 'text',
          content: newMessage.trim()
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '发送消息失败');
      }

      setNewMessage('');
      setChatMessages((current) => [...current, {
        id: result.data.id,
        senderId: result.data.senderId,
        senderType: result.data.senderType,
        senderName: result.data.senderName,
        senderAvatar: result.data.senderAvatar,
        content: result.data.content,
        timestamp: result.data.createdAt,
      }]);
      loadGroupChats();
    } catch (error) {
      console.error('发送消息失败:', error);
      toast.error('发送消息失败');
    }
  };

  const handleAvatarUpload = async (url: string, key: string) => {
    // 更新本地状态
    setProfileForm({
      ...profileForm,
      avatar: url,
      avatarKey: key
    });

    toast.success('头像上传成功');
  };

  // 提交个人资料
  const handleSaveProfile = async () => {
    // TODO: 实现保存个人资料逻辑
    toast.info('保存个人资料功能待实现');
  };

  // 处理身份证照片上传
  const handleIdCardUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast.error('文件大小不能超过5MB');
      return;
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('仅支持JPG、PNG格式的图片');
      return;
    }

    // 设置对应的上传状态
    if (side === 'front') {
      setUploadingFront(true);
    } else {
      setUploadingBack(true);
    }

    try {
      // 创建FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'id_card');

      // 获取 token
      const token = getToken();

      // 上传到Coze存储
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {},
        body: formData
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '上传失败');
      }

      toast.success('上传成功');

      // 更新表单
      const previewUrl = URL.createObjectURL(file);

      if (side === 'front') {
        setVerificationForm(prev => ({ ...prev, idCardFront: result.url }));
        setVerificationKeys(prev => ({ ...prev, front: result.key || '' }));
        setVerificationPreview(prev => ({ ...prev, front: previewUrl }));
      } else {
        setVerificationForm(prev => ({ ...prev, idCardBack: result.url }));
        setVerificationKeys(prev => ({ ...prev, back: result.key || '' }));
        setVerificationPreview(prev => ({ ...prev, back: previewUrl }));
      }
    } catch (error) {
      console.error('上传失败:', error);
      toast.error(error instanceof Error ? error.message : '上传失败，请重试');
    } finally {
      // 清除对应的上传状态
      if (side === 'front') {
        setUploadingFront(false);
      } else {
        setUploadingBack(false);
      }
    }
  };

  // 提交实名认证
  const handleSubmitVerification = async () => {
    if (!verificationForm.realName || !verificationForm.idCard) {
      toast.error('请填写完整信息');
      return;
    }

    if (!verificationForm.idCardFront || !verificationForm.idCardBack) {
      toast.error('请上传身份证正反面照片');
      return;
    }

    setVerifying(true);
    try {
      // 获取 token
      const token = getToken();

      // 提交实名认证申请（人工审核）
      const response = await fetch('/api/verification/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          realName: verificationForm.realName,
          idCard: verificationForm.idCard,
          idCardFrontUrl: verificationKeys.front || verificationForm.idCardFront,
          idCardBackUrl: verificationKeys.back || verificationForm.idCardBack,
          verificationService: 'manual'
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '提交认证申请失败');
      }

      // 显示成功提示
      toast.success(result.message || '实名认证申请已提交，请等待人工审核');
    } catch (error: any) {
      toast.error(error.message || '提交失败，请重试');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>请先登录</CardTitle>
            <CardDescription>您需要登录后才能访问个人中心</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              去登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isVerified = user.isRealNameVerified;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">个人中心</h1>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-2 md:grid-cols-6">
              <TabsTrigger value="profile" className="flex min-h-[64px] flex-col gap-1 px-2 py-2 text-[11px] leading-tight sm:min-h-0 sm:flex-row sm:text-sm">
                <User className="h-4 w-4 sm:mr-2" />
                个人资料
              </TabsTrigger>
              <TabsTrigger value="verification" className="flex min-h-[64px] flex-col gap-1 px-2 py-2 text-[11px] leading-tight sm:min-h-0 sm:flex-row sm:text-sm">
                <Shield className="h-4 w-4 sm:mr-2" />
                实名认证
              </TabsTrigger>
              <TabsTrigger value="chats" className="flex min-h-[64px] flex-col gap-1 px-2 py-2 text-[11px] leading-tight sm:min-h-0 sm:flex-row sm:text-sm">
                <MessageSquare className="h-4 w-4 sm:mr-2" />
                群聊
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex min-h-[64px] flex-col gap-1 px-2 py-2 text-[11px] leading-tight sm:min-h-0 sm:flex-row sm:text-sm">
                <FileText className="h-4 w-4 sm:mr-2" />
                我的订单
              </TabsTrigger>
              <TabsTrigger value="wallet" className="flex min-h-[64px] flex-col gap-1 px-2 py-2 text-[11px] leading-tight sm:min-h-0 sm:flex-row sm:text-sm">
                <Wallet className="h-4 w-4 sm:mr-2" />
                我的钱包
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex min-h-[64px] flex-col gap-1 px-2 py-2 text-[11px] leading-tight sm:min-h-0 sm:flex-row sm:text-sm">
                <Bell className="h-4 w-4 sm:mr-2" />
                通知
              </TabsTrigger>
            </TabsList>

            {/* 个人资料 */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>个人资料</CardTitle>
                  <CardDescription>管理您的基本信息</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 头像 */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:space-x-4">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {profileForm.avatar ? (
                          <img src={profileForm.avatar} alt="头像" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                    </div>
                    <div className="w-full flex-1">
                      <ImageUploader
                        type="avatar"
                        onSuccess={handleAvatarUpload}
                        currentUrl={profileForm.avatar}
                        maxSize={2}
                        accept="image/jpeg,image/png,image/gif"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        点击上方按钮上传新头像
                      </p>
                    </div>
                  </div>

                  {/* 基本信息 */}
                  <div className="grid gap-4">
                    <div>
                      <Label>用户名</Label>
                      <Input
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
                        placeholder="请输入用户名"
                      />
                    </div>
                    <div>
                      <Label>手机号</Label>
                      <Input
                        value={profileForm.phone}
                        disabled
                        placeholder="手机号"
                      />
                    </div>
                    <div>
                      <Label>邮箱</Label>
                      <Input
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                        placeholder="请输入邮箱"
                      />
                    </div>
                  </div>

                  <Button onClick={handleSaveProfile} className="w-full">
                    保存修改
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 实名认证 */}
            <TabsContent value="verification">
              <Card>
                <CardHeader>
                  <CardTitle>实名认证</CardTitle>
                  <CardDescription>
                    为了保障交易安全，购买和出租账号都需要完成实名认证
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isVerified ? (
                    <div className="text-center py-12">
                      <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">已通过实名认证</h3>
                      <p className="text-muted-foreground">您的实名认证已通过审核</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium mb-1">为什么需要实名认证？</p>
                          <ul className="list-disc list-inside space-y-1 text-yellow-700">
                            <li>保障交易安全，防止欺诈</li>
                            <li>符合国家法律法规要求</li>
                            <li>保护您的账号和资金安全</li>
                          </ul>
                        </div>
                      </div>

                      <Button
                        onClick={() => setVerificationDialogOpen(true)}
                        className="w-full"
                        size="lg"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        开始实名认证
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 群聊 */}
            <TabsContent value="chats">
              <Card>
                <CardHeader>
                  <CardTitle>群聊</CardTitle>
                  <CardDescription>查看和管理订单群聊，与买家和客服沟通</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingChats ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    </div>
                  ) : groupChats.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">暂无群聊</h3>
                      <p className="text-sm text-muted-foreground">
                        当您有成交订单时，系统会自动创建群聊
                      </p>
                    </div>
                  ) : selectedChat ? (
                    // 聊天界面
                    <div className="h-[600px] flex flex-col">
                      {/* 聊天头部 */}
                      <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-base">{selectedChat.orderTitle}</h3>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>{selectedChat.members.length}人</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedChat(null)}
                        >
                          返回列表
                        </Button>
                      </div>

                      {/* 聊天记录 */}
                      <div className="flex-1 overflow-y-auto py-4 space-y-4">
                        {chatMessages.map((message) => {
                          const isSelf = message.senderId === user?.id;
                          return (
                            <div
                              key={message.id}
                              className={`flex gap-3 ${isSelf ? 'flex-row-reverse' : ''}`}
                            >
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                {message.senderAvatar ? (
                                  <img
                                    src={message.senderAvatar}
                                    alt={message.senderName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <AvatarFallback className="text-xs">
                                    {message.senderName.charAt(0)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className={`max-w-[70%] ${isSelf ? 'text-right' : ''}`}>
                                <div className="text-xs text-muted-foreground mb-1">
                                  {message.senderName}
                                </div>
                                <div
                                  className={`inline-block px-3 py-2 rounded-lg text-sm ${
                                    isSelf
                                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                                      : 'bg-gray-100 text-gray-900'
                                  }`}
                                >
                                  {message.content}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* 消息输入 */}
                      <div className="pt-3 border-t">
                        <div className="flex gap-2">
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSendMessage();
                              }
                            }}
                            placeholder="输入消息..."
                            className="flex-1"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            size="icon"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // 群聊列表
                    <div className="space-y-2">
                      {groupChats.map((chat) => (
                        <div
                          key={chat.id}
                          onClick={() => handleSelectChat(chat)}
                          className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-sm mb-1">
                                {chat.orderTitle}
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(chat.createdAt).toLocaleDateString('zh-CN')}
                                </span>
                              </div>
                              {chat.lastMessage && (
                                <p className="text-xs text-gray-600 line-clamp-1">
                                  <span className="font-medium text-gray-900">
                                    {chat.lastMessage.sender}:
                                  </span>{' '}
                                  {chat.lastMessage.content}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" />
                              <span>{chat.members.length}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 我的订单 */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>我的订单</CardTitle>
                      <CardDescription>查看您的订单记录</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadUserOrders} className="w-full sm:w-auto">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      刷新
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-gray-400" />
                      <p className="text-gray-500">加载中...</p>
                    </div>
                  ) : userOrders.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>暂无订单</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => window.location.href = '/orders'}
                      >
                        浏览账号
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userOrders.map((order) => (
                        <div
                          key={order.id}
                          className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                          onClick={() => window.location.href = `/orders/${order.id}`}
                        >
                          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">订单号：{order.order_no}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {order.account_id} - {order.coins_million}M 哈夫币
                              </p>
                            </div>
                            <Badge variant={
                              order.status === 'active' ? 'default' :
                              order.status === 'completed' ? 'secondary' :
                              order.status === 'cancelled' ? 'destructive' : 'outline'
                            }>
                              {order.status === 'active' ? '进行中' :
                               order.status === 'completed' ? '已完成' :
                               order.status === 'cancelled' ? '已取消' : '待支付'}
                            </Badge>
                          </div>
                          <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                            <span>
                              ¥{order.total_amount.toFixed(2)}
                            </span>
                            <span>
                              {new Date(order.created_at).toLocaleString('zh-CN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 我的钱包 */}
            <TabsContent value="wallet">
              <div className="space-y-4 sm:space-y-6">
                {balance && (
                  <>
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] md:items-start">
                      {/* 充值与提现 */}
                      <Card className="order-1">
                        <CardHeader className="pb-3 sm:pb-6">
                          <CardTitle>充值与提现</CardTitle>
                          <CardDescription className="sm:hidden">
                            常用操作放在前面，首屏可直接充值
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 sm:pt-6">
                          <Tabs defaultValue="recharge">
                            <TabsList className="grid h-auto w-full grid-cols-2">
                              <TabsTrigger value="recharge">充值</TabsTrigger>
                              <TabsTrigger value="withdraw">提现</TabsTrigger>
                            </TabsList>

                            <TabsContent value="recharge" className="space-y-3 sm:space-y-4">
                              <div className="space-y-2">
                                <Label>充值金额</Label>
                                <Input
                                  type="number"
                                  placeholder="请输入充值金额"
                                  value={rechargeAmount}
                                  onChange={(e) => setRechargeAmount(e.target.value)}
                                />
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {[100, 200, 500, 1000].map((amount) => (
                                  <Button
                                    key={amount}
                                    variant="outline"
                                    size="sm"
                                    className="px-0"
                                    onClick={() => setRechargeAmount(amount.toString())}
                                  >
                                    ¥{amount}
                                  </Button>
                                ))}
                              </div>
                              <Button onClick={handleRecharge} className="w-full">
                                立即充值
                              </Button>
                            </TabsContent>

                            <TabsContent value="withdraw" className="space-y-3 sm:space-y-4">
                              <div className="space-y-2">
                                <Label>提现金额</Label>
                                <Input
                                  type="number"
                                  placeholder="请输入提现金额"
                                  value={withdrawAmount}
                                  onChange={(e) => setWithdrawAmount(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>提现账户</Label>
                                <Input
                                  placeholder="提现将直接打款到当前绑定微信"
                                  value={withdrawAccountDisplayValue}
                                  disabled={hasBoundWechatWithdrawAccount}
                                  onChange={(e) => setWithdrawAccount(e.target.value)}
                                />
                              </div>
                              {hasBoundWechatWithdrawAccount ? (
                                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                                  已绑定微信账号，提现时会直接打款到当前微信，无需手动输入微信号。
                                </div>
                              ) : (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                                  当前账号未绑定微信，请先使用微信授权登录后再提现。
                                </div>
                              )}
                              <Button onClick={handleWechatWithdraw} className="w-full" disabled={!hasBoundWechatWithdrawAccount}>
                                申请提现
                              </Button>
                              <p className="text-center text-xs text-gray-500">
                                {`* 提现手续费 ${walletUiSettings.withdrawalFee}%`}
                              </p>
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      </Card>

                      {/* 余额卡片 */}
                      <div className="order-2 grid gap-3 grid-cols-2 md:grid-cols-1">
                        <Card className="col-span-2 md:col-span-1">
                          <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
                            <CardTitle className="text-sm font-medium text-gray-600">可用余额</CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                            <div className="text-2xl font-bold text-gray-900 sm:text-3xl">
                              {formatBalance(balance.available_balance)}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">可提现金额</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
                            <CardTitle className="text-sm font-medium text-gray-600">冻结余额</CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                            <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent sm:text-3xl">
                              {formatBalance(balance.frozen_balance)}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">订单押金等</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
                            <CardTitle className="text-sm font-medium text-gray-600">总余额</CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                            <div className="text-xl font-bold text-green-600 sm:text-3xl">
                              {formatBalance(balance.total_balance)}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">可用 + 冻结</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </>
                )}

                {/* 交易记录 */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle>交易记录</CardTitle>
                      <Button variant="outline" size="sm" onClick={loadWalletData} className="w-full sm:w-auto">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        刷新
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {transactions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          暂无交易记录
                        </div>
                      ) : (
                        transactions.slice(0, 10).map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {getTransactionBadgeText(transaction.transaction_type)}
                                </Badge>
                              </div>
                              {transaction.remark && (
                                <p className="text-sm text-gray-600 mt-1">{transaction.remark}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(transaction.created_at).toLocaleString('zh-CN')}
                              </p>
                            </div>
                            <div className={`text-lg font-semibold ${getTransactionTypeColor(transaction.transaction_type)}`}>
                              {getTransactionDisplayAmount(transaction) >= 0 ? '+' : ''}
                              {formatBalance(getTransactionDisplayAmount(transaction))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 通知 */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>通知</CardTitle>
                      <CardDescription>查看您的系统通知</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadNotifications} className="w-full sm:w-auto">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      刷新
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {notificationsLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-gray-400" />
                        <p className="text-gray-500">加载中...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>暂无通知</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`flex items-start gap-4 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer ${!notification.is_read ? 'bg-purple-50 border-purple-200' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex-shrink-0">
                            <Bell className={`h-6 w-6 ${!notification.is_read ? 'text-purple-600' : 'text-gray-400'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-medium truncate">{notification.title}</h4>
                              {!notification.is_read && (
                                <Badge className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">未读</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{notification.content}</p>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>{new Date(notification.created_at).toLocaleString('zh-CN')}</span>
                              {notification.is_read && (
                                <span className="flex items-center gap-1">
                                  <CheckCheck className="h-3 w-3" />
                                  已读
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 实名认证对话框 */}
      <Dialog open={verificationDialogOpen} onOpenChange={setVerificationDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>实名认证</DialogTitle>
            <DialogDescription>
              请填写您的真实信息，所有信息将严格保密
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="realName">真实姓名 *</Label>
              <Input
                id="realName"
                value={verificationForm.realName}
                onChange={(e) => setVerificationForm({...verificationForm, realName: e.target.value})}
                placeholder="请输入您的真实姓名"
              />
            </div>
            <div>
              <Label htmlFor="idCard">身份证号 *</Label>
              <Input
                id="idCard"
                value={verificationForm.idCard}
                onChange={(e) => setVerificationForm({...verificationForm, idCard: e.target.value})}
                placeholder="请输入身份证号"
                maxLength={18}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>身份证正面 *</Label>
                <div
                  className={`mt-1.5 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    uploadingFront ? 'bg-accent/50' : 'hover:bg-accent'
                  }`}
                  onClick={() => !uploadingFront && idCardFrontRef.current?.click()}
                >
                  {uploadingFront ? (
                    <div className="flex flex-col items-center justify-center h-32">
                      <Loader2 className="h-10 w-10 animate-spin text-purple-600 mb-2" />
                      <p className="text-sm text-muted-foreground">上传中...</p>
                    </div>
                  ) : verificationForm.idCardFront ? (
                    <img
                      src={verificationPreview.front || verificationForm.idCardFront}
                      alt="身份证正面"
                      className="w-full h-32 object-contain"
                    />
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">点击上传</p>
                    </>
                  )}
                </div>
                <input
                  ref={idCardFrontRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  className="hidden"
                  disabled={uploadingFront}
                  onChange={(e) => handleIdCardUpload(e, 'front')}
                />
              </div>
              <div>
                <Label>身份证反面 *</Label>
                <div
                  className={`mt-1.5 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    uploadingBack ? 'bg-accent/50' : 'hover:bg-accent'
                  }`}
                  onClick={() => !uploadingBack && idCardBackRef.current?.click()}
                >
                  {uploadingBack ? (
                    <div className="flex flex-col items-center justify-center h-32">
                      <Loader2 className="h-10 w-10 animate-spin text-purple-600 mb-2" />
                      <p className="text-sm text-muted-foreground">上传中...</p>
                    </div>
                  ) : verificationForm.idCardBack ? (
                    <img
                      src={verificationPreview.back || verificationForm.idCardBack}
                      alt="身份证反面"
                      className="w-full h-32 object-contain"
                    />
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">点击上传</p>
                    </>
                  )}
                </div>
                <input
                  ref={idCardBackRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  className="hidden"
                  disabled={uploadingBack}
                  onChange={(e) => handleIdCardUpload(e, 'back')}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setVerificationDialogOpen(false)}
              disabled={verifying}
              className="w-full sm:flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleSubmitVerification}
              disabled={verifying}
              className="w-full sm:flex-[2]"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                '提交认证'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
