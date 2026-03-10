# 游戏组队匹配平台 - 技术文档

## 📋 项目概述

- **项目名称**: 游戏组队匹配平台
- **基础URL**: https://y7wfstjk98.coze.site
- **技术栈**: Next.js 16 + React 19 + TypeScript + PostgreSQL + Socket.io
- **前端**: https://y7wfstjk98.coze.site/
- **管理后台**: https://y7wfstjk98.coze.site/admin

---

## 🗄️ 数据库表结构

### 1. users（用户表）
```typescript
{
  id: string                          // 用户ID（主键）
  openId: string                      // 微信OpenID（唯一）
  nickname: string                    // 昵称
  avatar: string                      // 头像URL
  gender: string                      // 性别
  age: number                         // 年龄
  platformType: string                // 平台类型（电脑端/手机端）
  gameMode: string                    // 偏好游戏模式
  goodMaps: jsonb                     // 擅长地图列表
  address: string                     // 地址
  regionCode: string                  // 地区代码
  reputationScore: number             // 信誉分（默认100）
  createdAt: string                   // 创建时间
  updatedAt: string                   // 更新时间
  preferOppositeGender: boolean       // 优先异性匹配
  province: string                    // 省份
  city: string                        // 城市
  dialectTag: string                  // 方言标签
  totalRatingScore: number            // 评价总分
  positiveCount: number               // 好评数量
  negativeCount: number               // 差评数量
  cheaterCount: number                // 作弊举报数量
  playStyleTags: jsonb                // 玩法风格标签
  backgroundImage: string             // 背景图片
  bio: string                         // 个人简介（500字）
  likesCount: number                  // 点赞数
  gameId: string                      // 游戏ID
  roomCount: number                   // 房间参与数
  phone: string                       // 手机号
  phoneVerified: boolean              // 手机是否验证
  status: string                      // 账号状态（normal/banned）
  bannedAt: string                    // 封禁时间
  bannedReason: string                // 封禁原因
  bannedBy: string                    // 封禁人ID
}
```

### 2. matchRequests（匹配请求表）
```typescript
{
  id: string                          // 请求ID（主键）
  userId: string                      // 用户ID（外键）
  gameMode: string                    // 游戏模式
  teamSize: number                    // 队伍大小
  maps: jsonb                         // 擅长地图列表
  preferOppositeGender: boolean       // 优先异性匹配
  createdAt: string                   // 创建时间
  status: string                      // 状态（pending/matched/cancelled）
}
```

### 3. matchRooms（匹配房间表）
```typescript
{
  id: string                          // 房间ID（主键）
  gameMode: string                    // 游戏模式
  teamSize: number                    // 队伍大小
  status: string                      // 状态（matching/active/ended）
  createdAt: string                   // 创建时间
  updatedAt: string                   // 更新时间
}
```

### 4. roomMembers（房间成员表）
```typescript
{
  id: string                          // 成员ID（主键）
  roomId: string                      // 房间ID（外键）
  userId: string                      // 用户ID（外键）
  joinedAt: string                    // 加入时间
  lastActiveAt: string                // 最后活跃时间
}
```

### 5. reviews（评价表）
```typescript
{
  id: string                          // 评价ID（主键）
  fromUserId: string                  // 评价人ID（外键）
  toUserId: string                    // 被评价人ID（外键）
  matchRoomId: string                 // 匹配房间ID
  ratingType: string                  // 评价类型（positive/negative/cheater）
  comment: string                     // 评价内容
  isFollowUp: boolean                 // 是否追加评价
  createdAt: string                   // 创建时间
  playStyleTag: string                // 玩法风格标签
  playStyleTags: jsonb                // 玩法风格标签列表
}
```

### 6. likes（点赞表）
```typescript
{
  id: string                          // 点赞ID（主键）
  userId: string                      // 点赞人ID（外键）
  likedUserId: string                 // 被点赞人ID（外键）
  createdAt: string                   // 创建时间
}
```

### 7. smsVerifications（短信验证码表）
```typescript
{
  id: string                          // 验证ID（主键）
  phone: string                       // 手机号
  code: string                        // 验证码
  type: string                        // 类型（login/register）
  verified: boolean                   // 是否已验证
  expiresAt: string                   // 过期时间
  createdAt: string                   // 创建时间
}
```

### 8. banReviews（评价封禁表）
```typescript
{
  id: string                          // 封禁ID（主键）
  userId: string                      // 用户ID
  reviewId: string                    // 评价ID
  status: string                      // 状态
  action: string                      // 操作类型
  reason: string                      // 封禁原因
  processedBy: string                 // 处理人ID
  processedAt: string                 // 处理时间
  createdAt: string                   // 创建时间
}
```

### 9. alertRules（告警规则表）
```typescript
{
  id: string                          // 规则ID（主键）
  ruleName: string                    // 规则名称
  metricType: string                  // 指标类型
  threshold: number                   // 阈值
  comparison: string                  // 比较方式
  severity: string                    // 严重程度
  enabled: boolean                    // 是否启用
  notifyEmail: boolean                // 邮件通知
  notifySms: boolean                  // 短信通知
  description: string                 // 描述
  createdAt: string                   // 创建时间
  updatedAt: string                   // 更新时间
}
```

### 10. matchAlgorithmConfig（匹配算法配置表）
```typescript
{
  id: string                          // 配置ID（主键）
  factorName: string                  // 因子名称
  factorDisplay: string               // 因子显示名称
  weight: number                      // 权重
  enabled: boolean                    // 是否启用
  isRequired: boolean                 // 是否必需
  description: string                 // 描述
  createdAt: string                   // 创建时间
  updatedAt: string                   // 更新时间
}
```

### 11. friendships（好友关系表）
```typescript
{
  id: string                          // 关系ID（主键）
  userId: string                      // 用户ID
  friendId: string                    // 好友ID
  status: string                      // 状态（pending/accepted）
  createdAt: string                   // 创建时间
}
```

---

## 🔌 API 接口文档

### 基础信息
- **Base URL**: https://y7wfstjk98.coze.site
- **Content-Type**: application/json

### 认证相关

#### 1. 发送验证码
```http
POST /api/auth/send-code
Content-Type: application/json

{
  "phone": "13800138000"
}
```

#### 2. 手机号登录
```http
POST /api/auth/phone-login
Content-Type: application/json

{
  "phone": "13800138000",
  "code": "123456"
}
```

#### 3. 微信登录
```http
POST /api/auth/wechat-login
Content-Type: application/json

{
  "code": "wx_login_code",
  "nickName": "用户昵称",
  "avatarUrl": "头像URL",
  "gender": 1,
  "country": "中国",
  "province": "广东",
  "city": "深圳"
}
```

#### 4. 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "openId": "wx_openid",
  "nickname": "用户昵称",
  "avatar": "头像URL",
  "gender": "男",
  "age": 25,
  "phone": "13800138000",
  "phoneVerified": true
}
```

### 匹配相关

#### 1. 开始匹配
```http
POST /api/match/start
Content-Type: application/json

{
  "userId": "user_id",
  "platformType": "电脑端",
  "gameMode": "全面战场",
  "teamSize": 4,
  "maps": ["地图1", "地图2"],
  "preferOppositeGender": false
}
```

#### 2. 获取匹配状态
```http
GET /api/match/status?userId=user_id
```

#### 3. 取消匹配
```http
POST /api/match/cancel
Content-Type: application/json

{
  "userId": "user_id"
}
```

#### 4. 离开房间
```http
POST /api/match/leave
Content-Type: application/json

{
  "userId": "user_id"
}
```

#### 5. 获取房间信息
```http
GET /api/match/room?roomId=room_id
```

#### 6. 匹配成功
```http
POST /api/match/success
Content-Type: application/json

{
  "roomId": "room_id",
  "userId": "user_id"
}
```

#### 7. 强制离开所有房间
```http
POST /api/match/force-leave-all
Content-Type: application/json

{
  "userId": "user_id"
}
```

### 用户相关

#### 1. 获取用户信息
```http
GET /api/user/info
```

#### 2. 创建用户
```http
POST /api/user/create
Content-Type: application/json

{
  "openId": "wx_openid",
  "nickname": "用户昵称"
}
```

#### 3. 检查用户
```http
GET /api/user/check?userId=user_id
```

#### 4. 更新用户资料
```http
PUT /api/auth/profile
Content-Type: application/json

{
  "userId": "user_id",
  "nickname": "新昵称",
  "gender": "男",
  "age": 26,
  "dialectTag": "粤语",
  "bio": "个人简介"
}
```

#### 5. 上传头像
```http
POST /api/upload/avatar
Content-Type: multipart/form-data

file: [头像文件]
userId: user_id
```

### 评价相关

#### 1. 创建评价
```http
POST /api/review/create
Content-Type: application/json

{
  "fromUserId": "user_id_1",
  "toUserId": "user_id_2",
  "matchRoomId": "room_id",
  "ratingType": "positive",
  "comment": "很好的队友",
  "playStyleTags": ["积极", "配合"]
}
```

#### 2. 获取评价列表
```http
GET /api/review/list?userId=user_id
```

### 点赞相关

#### 1. 点赞/取消点赞
```http
POST /api/likes
Content-Type: application/json

{
  "userId": "user_id_1",
  "likedUserId": "user_id_2"
}
```

#### 2. 检查是否已点赞
```http
GET /api/likes/check?userId=user_id_1&likedUserId=user_id_2
```

### 配置相关

#### 1. 获取游戏配置
```http
GET /api/game-config
```

#### 2. 获取页面配置
```http
GET /api/page-config?key=lobby_title_image
```

#### 3. 获取分享配置
```http
GET /api/share-config
```

### 短信相关

#### 1. 发送验证码
```http
POST /api/sms/send-code
Content-Type: application/json

{
  "phone": "13800138000",
  "type": "login"
}
```

#### 2. 验证验证码
```http
POST /api/sms/verify-code
Content-Type: application/json

{
  "phone": "13800138000",
  "code": "123456",
  "type": "login"
}
```

### 管理后台相关

#### 1. 管理员登录
```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

#### 2. 获取管理员信息
```http
GET /api/admin/me
```

#### 3. 获取用户列表
```http
GET /api/admin/users
```

#### 4. 获取房间列表
```http
GET /api/admin/rooms
```

#### 5. 获取统计信息
```http
GET /api/admin/stats
```

#### 6. 获取审计日志
```http
GET /api/admin/audit-logs
```

---

## 🔌 Socket.io 实时消息类型

### 连接事件

#### 1. 连接成功
```javascript
socket.on('connect', () => {
  console.log('WebSocket 已连接');
});
```

#### 2. 连接错误
```javascript
socket.on('connect_error', (error) => {
  console.error('WebSocket 连接错误:', error);
});
```

#### 3. 断开连接
```javascript
socket.on('disconnect', () => {
  console.log('WebSocket 已断开');
});
```

### 房间事件

#### 1. 加入房间
```javascript
socket.emit('join-room', {
  roomId: 'room_id',
  userId: 'user_id'
});
```

#### 2. 离开房间
```javascript
socket.emit('leave-room', {
  roomId: 'room_id',
  userId: 'user_id'
});
```

#### 3. 用户加入房间
```javascript
socket.on('user-joined', ({ userId }) => {
  console.log('用户加入房间:', userId);
});
```

#### 4. 用户离开房间
```javascript
socket.on('user-left', ({ userId }) => {
  console.log('用户离开房间:', userId);
});
```

#### 5. 房间结束
```javascript
socket.on('room-ended', ({ roomId, room }) => {
  console.log('房间结束:', roomId);
});
```

### WebRTC 事件

#### 1. 发送 Offer
```javascript
socket.emit('webrtc-offer', {
  roomId: 'room_id',
  userId: 'user_id',
  targetUserId: 'target_user_id',
  offer: RTCSessionDescription
});
```

#### 2. 接收 Offer
```javascript
socket.on('webrtc-offer', ({ userId, targetUserId, offer }) => {
  console.log('收到 Offer:', offer);
  // 创建 PeerConnection 并发送 Answer
});
```

#### 3. 发送 Answer
```javascript
socket.emit('webrtc-answer', {
  roomId: 'room_id',
  userId: 'user_id',
  targetUserId: 'target_user_id',
  answer: RTCSessionDescription
});
```

#### 4. 接收 Answer
```javascript
socket.on('webrtc-answer', ({ userId, targetUserId, answer }) => {
  console.log('收到 Answer:', answer);
  // 设置远程描述
});
```

#### 5. 发送 ICE Candidate
```javascript
socket.emit('webrtc-ice-candidate', {
  roomId: 'room_id',
  userId: 'user_id',
  targetUserId: 'target_user_id',
  candidate: RTCIceCandidate
});
```

#### 6. 接收 ICE Candidate
```javascript
socket.on('webrtc-ice-candidate', ({ userId, targetUserId, candidate }) => {
  console.log('收到 ICE Candidate:', candidate);
  // 添加到 PeerConnection
});
```

---

## 📁 项目结构

```
src/
├── app/                          # Next.js App Router
│   ├── (用户前端)
│   │   ├── page.tsx              # 首页（组队大厅）
│   │   ├── login/page.tsx        # 用户登录
│   │   ├── history/page.tsx      # 组队记录
│   │   ├── profile/page.tsx      # 个人资料
│   │   └── reviews/page.tsx      # 评价管理
│   │
│   ├── admin/                     # 管理后台
│   │   ├── layout.tsx            # 后台布局
│   │   ├── login/page.tsx        # 后台登录
│   │   ├── users/page.tsx        # 用户管理
│   │   ├── rooms/page.tsx        # 房间管理
│   │   ├── reviews/page.tsx      # 评价管理
│   │   ├── game-config/page.tsx  # 游戏配置
│   │   ├── match-config/page.tsx # 匹配配置
│   │   ├── page-config/page.tsx  # 页面配置
│   │   ├── share-config/page.tsx # 分享配置
│   │   ├── sms-config/page.tsx   # 短信配置
│   │   ├── audit-logs/page.tsx   # 审计日志
│   │   └── settings/page.tsx     # 系统设置
│   │
│   └── api/                       # API 路由
│       ├── auth/                 # 认证相关
│       ├── match/                # 匹配相关
│       ├── user/                 # 用户相关
│       ├── room/                 # 房间相关
│       ├── review/               # 评价相关
│       ├── likes/                # 点赞相关
│       ├── game-config/          # 游戏配置
│       ├── share-config/         # 分享配置
│       ├── sms/                  # 短信相关
│       ├── upload/               # 文件上传
│       └── admin/                # 管理后台 API
│
├── components/                    # React 组件
│   └── ui/                       # shadcn/ui 组件
│
├── hooks/                        # React Hooks
│   ├── useWebRTC.ts             # WebRTC 通信
│   ├── use-mobile.ts            # 移动端检测
│   └── use-toast.ts             # Toast 通知
│
└── storage/                      # 数据访问层
    └── database/                # Drizzle ORM
        ├── userManager.ts
        ├── matchManager.ts
        ├── reviewManager.ts
        ├── likeManager.ts
        ├── matcher-service.ts   # 匹配服务
        └── shared/schema.ts     # 数据库表定义
```

---

## 🚀 快速开始

### 安装依赖
```bash
pnpm install
```

### 启动开发服务器
```bash
pnpm dev
```

### 构建生产版本
```bash
pnpm build
```

### 启动生产服务器
```bash
pnpm start
```

---

## 🔐 环境变量

需要配置以下环境变量：

```env
# 数据库
DATABASE_URL=postgresql://...

# 微信小程序
WECHAT_APP_ID=wx...
WECHAT_APP_SECRET=...

# 阿里云短信
ALIYUN_ACCESS_KEY_ID=...
ALIYUN_ACCESS_KEY_SECRET=...
ALIYUN_SMS_SIGN_NAME=...
ALIYUN_SMS_TEMPLATE_CODE=...

# 对象存储（Coze）
S3_ENDPOINT=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=...

# TURN 服务器（可选）
TURN_SERVER_URL=turn:...
TURN_USERNAME=...
TURN_PASSWORD=...
```

---

## 📱 小程序开发

小程序源码位于 `taro-miniprogram/` 目录，使用 Taro 3.6 框架开发。

### 安装依赖
```bash
cd taro-miniprogram
pnpm install
```

### 开发
```bash
pnpm run dev:weapp
```

### 构建
```bash
pnpm run build:weapp
```

---

## 📝 注意事项

1. **认证**: 所有需要认证的 API 都需要 JWT Token
2. **CORS**: 前端和 API 在同一域名下，无需配置 CORS
3. **WebSocket**: 使用 Socket.io 进行实时通信
4. **WebRTC**: 支持语音通话，需要 TURN 服务器支持
5. **文件上传**: 头像和图片使用 Coze 对象存储
6. **匹配服务**: 后台自动运行，每 2 秒执行一次匹配

---

## 📞 技术支持

如有问题，请联系技术团队或查看项目文档。
