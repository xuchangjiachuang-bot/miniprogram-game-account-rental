# 功能开发计划

本文档详细说明了所有需要开发的功能、技术方案和实现步骤。

---

## 一、分账系统逻辑说明

### ✅ 当前逻辑（已正确实现）

**订单完成时的分账流程**：

```
订单完成（order.status = COMPLETED）
    ↓
计算分账（calculateOrderCompletionSplit）
    ├─ 平台佣金 = 租金 × 佣金比例（默认5%）
    ├─ 卖家收入 = 租金 - 平台佣金
    └─ 买家退款 = 押金全额退还
    ↓
执行余额变动（changeBalance）
    ├─ 买家：+押金（DEPOSIT_REFUND）
    ├─ 卖家：+（租金-佣金）（RENT_INCOME）
    └─ 平台：+佣金（PLATFORM_INCOME）
    ↓
卖家可提现余额 = 原余额 +（租金-佣金）
```

**举例说明**：

| 项目 | 金额 | 说明 |
|-----|------|------|
| 租金 | ¥100 | 买家支付的租金 |
| 押金 | ¥50 | 买家支付的押金 |
| 平台佣金 | ¥5 | 100 × 5% |
| 卖家收入 | ¥95 | 100 - 5 |
| 买家退款 | ¥50 | 押金全额退还 |

**订单完成后的余额变化**：
- 买家可用余额：+¥50
- 卖家可用余额：+¥95
- 平台可用余额：+¥5

**提现时的流程**：

```
卖家申请提现 ¥95
    ↓
验证余额（≥¥95）✅
    ↓
计算手续费（1%）
    ├─ 手续费 = 95 × 1% = ¥0.95
    └─ 实际到账 = 95 - 0.95 = ¥94.05
    ↓
扣除卖家余额（-¥95）
    ↓
创建提现记录（status=pending）
    ↓
后台审核通过后
    ↓
调用支付平台转账接口
    └─ 转账 ¥94.05 到卖家支付宝/微信
```

**结论**：当前逻辑是正确的，分账在订单完成时已经完成，提现时只是转账到用户账户。

---

## 二、需要开发的功能清单

### 2.1 对象存储 - 文件上传功能

**优先级**：⭐⭐⭐⭐⭐（必需）

**功能描述**：
- 用户头像上传
- 实名认证身份证照片上传
- 账号截图上传

**技术方案**：
- 使用阿里云 OSS SDK
- 前端：选择文件 → 上传 → 获取URL
- 后端：验证文件类型和大小 → 生成签名URL → 返回给前端直接上传

**实现步骤**：

#### Step 1: 安装依赖

```bash
pnpm add ali-oss
pnpm add multer  # 文件上传中间件
```

#### Step 2: 创建 OSS 配置

```typescript
// src/lib/oss-config.ts
import OSS from 'ali-oss';

const ossClient = new OSS({
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET!,
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  endpoint: process.env.OSS_ENDPOINT,
});

export { ossClient };
```

#### Step 3: 创建签名接口

```typescript
// src/app/api/oss/sign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ossClient } from '@/lib/oss-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileType } = body;

    // 生成唯一文件名
    const ext = fileName.split('.').pop();
    const newFileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const objectName = `uploads/${newFileName}`;

    // 获取签名URL（有效期30分钟）
    const url = ossClient.signatureUrl(objectName, {
      method: 'PUT',
      contentType: fileType,
      expires: 1800,
    });

    return NextResponse.json({
      success: true,
      data: {
        url,
        objectName,
        publicUrl: `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${objectName}`
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '生成签名失败'
    }, { status: 500 });
  }
}
```

#### Step 4: 前端上传组件

```typescript
// src/components/ImageUploader.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploaderProps {
  onSuccess: (url: string) => void;
  maxSize?: number; // MB
  accept?: string;
}

export function ImageUploader({ onSuccess, maxSize = 5, accept = 'image/*' }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件大小
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`文件大小不能超过 ${maxSize}MB`);
      return;
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('只能上传图片文件');
      return;
    }

    setUploading(true);

    try {
      // 获取签名URL
      const signRes = await fetch('/api/oss/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type
        })
      });

      const signData = await signRes.json();

      if (!signData.success) {
        throw new Error('获取上传凭证失败');
      }

      // 直接上传到OSS
      await fetch(signData.data.url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      toast.success('上传成功');
      onSuccess(signData.data.publicUrl);
    } catch (error) {
      console.error('上传失败:', error);
      toast.error('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        id="image-upload"
      />
      <label htmlFor="image-upload">
        <Button variant="outline" disabled={uploading} asChild>
          <span className="cursor-pointer">
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                选择图片
              </>
            )}
          </span>
        </Button>
      </label>
    </div>
  );
}
```

#### Step 5: 集成到用户中心

```typescript
// 在 src/app/user-center/page.tsx 中使用
import { ImageUploader } from '@/components/ImageUploader';

// 头像上传部分
const handleAvatarUpload = (url: string) => {
  setProfileForm({ ...profileForm, avatar: url });
  toast.success('头像上传成功');
};

// JSX中使用
<ImageUploader
  onSuccess={handleAvatarUpload}
  maxSize={2}
  accept="image/jpeg,image/png"
/>
```

---

### 2.2 群聊功能 - 实时通讯

**优先级**：⭐⭐⭐⭐⭐（必需）

**功能描述**：
- 订单创建时自动创建群聊
- 买卖双方和客服在群内沟通
- 实时消息收发
- 消息历史记录

**技术方案**：
- 使用 Socket.io 实现 WebSocket 通讯
- 群聊ID = 订单ID
- 消息存储在数据库 messages 表

**实现步骤**：

#### Step 1: 安装依赖

```bash
pnpm add socket.io socket.io-client
```

#### Step 2: 创建 WebSocket 服务器

```typescript
// src/lib/socket-server.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    },
    pingInterval: 25000,
    pingTimeout: 60000
  });

  io.on('connection', (socket) => {
    console.log('用户连接:', socket.id);

    // 用户加入群聊
    socket.on('join:order', ({ orderId, userId, username }) => {
      socket.join(`order:${orderId}`);
      socket.to(`order:${orderId}`).emit('user:joined', { userId, username });
    });

    // 发送消息
    socket.on('message:send', async (data) => {
      const { orderId, userId, username, content, avatar } = data;

      // 保存消息到数据库
      const message = await db.insert(messages).values({
        orderId,
        senderId: userId,
        senderName: username,
        senderAvatar: avatar,
        content,
        timestamp: new Date()
      }).returning();

      // 广播消息给群内所有用户
      io!.to(`order:${orderId}`).emit('message:receive', message[0]);
    });

    // 用户离开群聊
    socket.on('leave:order', ({ orderId, userId }) => {
      socket.leave(`order:${orderId}`);
      socket.to(`order:${orderId}`).emit('user:left', { userId });
    });

    socket.on('disconnect', () => {
      console.log('用户断开连接:', socket.id);
    });
  });

  return io;
}

export function getSocketServer() {
  return io;
}
```

#### Step 3: 集成到 Next.js

```typescript
// src/app/api/socket/route.ts
import { NextRequest } from 'next/server';
import { Server as HTTPServer } from 'http';
import { initSocketServer } from '@/lib/socket-server';

const httpServer: HTTPServer = new HTTPServer();
initSocketServer(httpServer);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return new Response('Socket server is running');
}

// 确保服务器持续运行
if (process.env.NODE_ENV !== 'production') {
  httpServer.listen(3001, () => {
    console.log('Socket server running on port 3001');
  });
}
```

#### Step 4: 前端 Socket 客户端

```typescript
// src/lib/socket-client.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function initSocket(userId: string, username: string) {
  if (socket?.connected) return socket;

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('Socket 连接成功');
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function joinOrder(orderId: string, userId: string, username: string) {
  const socket = getSocket();
  if (!socket) return;

  socket.emit('join:order', { orderId, userId, username });
}

export function leaveOrder(orderId: string) {
  const socket = getSocket();
  if (!socket) return;

  socket.emit('leave:order', { orderId });
}

export function sendMessage(data: any) {
  const socket = getSocket();
  if (!socket) return;

  socket.emit('message:send', data);
}

export function onMessageReceive(callback: (message: any) => void) {
  const socket = getSocket();
  if (!socket) return;

  socket.on('message:receive', callback);
}
```

#### Step 5: 集成到群聊页面

```typescript
// 在 src/app/user-center/page.tsx 的群聊部分添加
import { useEffect } from 'react';
import { initSocket, joinOrder, leaveOrder, sendMessage, onMessageReceive } from '@/lib/socket-client';
import { getToken } from '@/lib/auth-token';

// 初始化Socket
useEffect(() => {
  if (user) {
    const socket = initSocket(user.id, user.username);

    return () => {
      socket?.disconnect();
    };
  }
}, [user]);

// 监听消息
useEffect(() => {
  const handleReceive = (message: any) => {
    if (selectedChat && message.orderId === selectedChat.orderId) {
      setChatMessages(prev => [...prev, message]);
    }
  };

  onMessageReceive(handleReceive);
}, [selectedChat]);

// 发送消息
const handleSendMessage = () => {
  if (!newMessage.trim() || !selectedChat || !user) return;

  sendMessage({
    orderId: selectedChat.orderId,
    userId: user.id,
    username: user.username,
    avatar: user.avatar,
    content: newMessage
  });

  setNewMessage('');
};

// 切换群聊时加入/离开
const handleSelectChat = (chat: GroupChat) => {
  if (selectedChat) {
    leaveOrder(selectedChat.orderId);
  }

  setSelectedChat(chat);
  joinOrder(chat.orderId, user!.id, user!.username);
  loadChatMessages(chat.id);
};
```

---

### 2.3 实名认证功能

**优先级**：⭐⭐⭐⭐（必需）

**功能描述**：
- 用户上传身份证照片
- 调用阿里云实人认证
- 审核通过后标记为已认证

**技术方案**：
- 使用阿里云实人认证服务
- 前端：上传照片 → 获取认证Token → 打开认证页面
- 后端：查询认证结果 → 更新用户状态

**实现步骤**：

#### Step 1: 创建认证接口

```typescript
// src/app/api/verification/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/auth-token';
import CloudAuth from '@alicloud/cloudauth20190307';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';

export async function POST(request: NextRequest) {
  try {
    const token = getToken();
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { realName, idCard } = body;

    // 创建阿里云客户端
    const config = new $OpenApi.Config({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
      endpoint: 'cloudauth.aliyuncs.com',
      regionId: 'cn-hangzhou'
    });

    const client = new CloudAuth(config);

    // 获取认证Token
    const request = new CloudAuth.DescribeVerifyTokenRequest({
      sceneId: process.env.ALIYUN_FACE_SCENE_ID!,
      outerOrderNo: `VERIFY_${token.userId}_${Date.now()}`
    });

    const response = await client.describeVerifyToken(request);

    if (!response.body?.token) {
      throw new Error('获取认证Token失败');
    }

    return NextResponse.json({
      success: true,
      data: {
        token: response.body.token,
        verifyUrl: `https://cloudauth.aliyun.com/?token=${response.body.token}`
      }
    });
  } catch (error) {
    console.error('实名认证失败:', error);
    return NextResponse.json({
      success: false,
      error: '实名认证失败'
    }, { status: 500 });
  }
}
```

#### Step 2: 查询认证结果

```typescript
// src/app/api/verification/result/route.ts
import { NextRequest, NextResponse } from 'next/server';
import CloudAuth from '@alicloud/cloudauth20190307';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: '缺少token参数' }, { status: 400 });
    }

    // 创建阿里云客户端
    const config = new $OpenApi.Config({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
      endpoint: 'cloudauth.aliyuncs.com',
      regionId: 'cn-hangzhou'
    });

    const client = new CloudAuth(config);

    // 查询认证结果
    const request = new CloudAuth.DescribeVerifyResultRequest({
      token
    });

    const response = await client.describeVerifyResult(request);

    const result = response.body;

    // 更新用户认证状态
    if (result?.passed && result?.materialInfo) {
      await updateUserVerification(token.userId, {
        realName: result.materialInfo.realName,
        idCard: result.materialInfo.idNumber,
        verified: true,
        verifiedAt: new Date()
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        passed: result?.passed || false,
        subCode: result?.subCode,
        materialInfo: result?.materialInfo
      }
    });
  } catch (error) {
    console.error('查询认证结果失败:', error);
    return NextResponse.json({
      success: false,
      error: '查询认证结果失败'
    }, { status: 500 });
  }
}
```

#### Step 3: 前端集成

```typescript
// 在 src/app/user-center/page.tsx 的实名认证部分
const handleSubmitVerification = async () => {
  if (!verificationForm.realName || !verificationForm.idCard) {
    toast.error('请填写完整信息');
    return;
  }

  setVerifying(true);

  try {
    // 获取认证Token
    const res = await fetch('/api/verification/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        realName: verificationForm.realName,
        idCard: verificationForm.idCard
      })
    });

    const result = await res.json();

    if (result.success && result.data.verifyUrl) {
      // 打开认证页面
      window.open(result.data.verifyUrl, '_blank');

      // 轮询查询结果（每2秒查询一次，最多查询30次）
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 30) {
          clearInterval(pollInterval);
          toast.error('认证超时，请重试');
          return;
        }

        const checkRes = await fetch(`/api/verification/result?token=${result.data.token}`);
        const checkResult = await checkRes.json();

        if (checkResult.success) {
          clearInterval(pollInterval);

          if (checkResult.data.passed) {
            toast.success('实名认证成功！');
            setVerificationDialogOpen(false);
            loadUserData();
          } else {
            toast.error('实名认证失败，请重试');
          }
        }
      }, 2000);
    }
  } catch (error) {
    toast.error('认证失败，请重试');
  } finally {
    setVerifying(false);
  }
};
```

---

### 2.4 微信登录功能

**优先级**：⭐⭐⭐（可选）

**功能描述**：
- 用户使用微信扫码登录
- 获取微信用户信息
- 自动注册或登录

**实现步骤**：

#### Step 1: 创建微信登录接口

```typescript
// src/app/api/auth/wechat/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    // 重定向到微信授权页面
    const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/wechat/callback`);
    const authUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${process.env.WECHAT_OA_APP_ID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login#wechat_redirect`;

    return NextResponse.redirect(authUrl);
  }

  return NextResponse.json({ message: 'WeChat login initiated' });
}
```

#### Step 2: 创建回调接口

```typescript
// src/app/api/auth/wechat/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect('/login?error=no_code');
  }

  try {
    // 1. 使用code换取access_token
    const tokenRes = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${process.env.WECHAT_OA_APP_ID}&secret=${process.env.WECHAT_OA_APP_SECRET}&code=${code}&grant_type=authorization_code`);

    const tokenData = await tokenRes.json();

    if (tokenData.errcode) {
      throw new Error(tokenData.errmsg);
    }

    // 2. 使用access_token获取用户信息
    const userRes = await fetch(`https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}`);

    const userData = await userRes.json();

    // 3. 查找或创建用户
    const user = await findOrCreateWechatUser({
      openid: tokenData.openid,
      nickname: userData.nickname,
      avatar: userData.headimgurl,
      unionid: userData.unionid
    });

    // 4. 设置登录token
    const authToken = generateToken(user.id, 'buyer');

    // 5. 重定向到首页
    const response = NextResponse.redirect('/');
    response.cookies.set('auth_token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7天
    });

    return response;
  } catch (error) {
    console.error('微信登录失败:', error);
    return NextResponse.redirect('/login?error=wechat_login_failed');
  }
}
```

---

### 2.5 支付分账功能（可选，但推荐）

**优先级**：⭐⭐⭐（可选）

**说明**：
- 当前的分账是在内部账户系统完成
- 如果需要直接通过支付平台分账，需要申请支付平台的分账功能
- 这可以实现资金的实时分账，避免平台承担资金风险

**实现步骤**（以支付宝为例）：

```typescript
// src/lib/alipay-split.ts
import AlipaySdk from 'alipay-sdk';

const alipaySdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID!,
  privateKey: process.env.ALIPAY_PRIVATE_KEY!,
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY!,
  gateway: process.env.ALIPAY_GATEWAY!,
});

export async function createAlipayOrder(params: any) {
  const result = await alipaySdk.exec('alipay.trade.create', {
    notify_url: process.env.ALIPAY_NOTIFY_URL!,
    bizContent: {
      out_trade_no: params.orderNo,
      total_amount: params.amount,
      subject: params.subject,
      extend_params: {
        settle_info: {
          settle_detail_infos: [
            {
              transfer_in_account: params.sellerAccountId,
              amount: params.sellerAmount,
              trans_out_type: 'USER_ACCOUNT'
            },
            {
              transfer_in_account: process.env.ALIPAY_PLATFORM_ACCOUNT_ID!,
              amount: params.platformCommission,
              trans_out_type: 'USER_ACCOUNT'
            }
          ]
        }
      }
    }
  });

  return result;
}
```

---

## 三、开发时间估算

| 功能 | 预估工作量 | 优先级 |
|-----|----------|-------|
| 对象存储 - 文件上传 | 4-6小时 | ⭐⭐⭐⭐⭐ |
| 群聊功能 - Socket.io | 8-12小时 | ⭐⭐⭐⭐⭐ |
| 实名认证 | 6-8小时 | ⭐⭐⭐⭐ |
| 微信登录 | 4-6小时 | ⭐⭐⭐ |
| 支付分账 | 6-8小时 | ⭐⭐⭐ |

**总计**：约 28-40 小时

---

## 四、下一步行动

1. ✅ 申请第三方服务 SDK/API（参考 `THIRD_PARTY_APIS_REQUIRED.md`）
2. ✅ 按优先级依次实现功能
3. ✅ 每个功能实现后进行测试
4. ✅ 部署到生产环境前进行完整测试

---

## 五、问题与支持

如有任何问题，请联系开发团队或参考各平台的官方文档。
