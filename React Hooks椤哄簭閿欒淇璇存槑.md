# React Hooks 顺序错误修复说明

## 问题描述

**错误类型**：React Hooks 顺序错误
**错误信息**：React has detected a change in the order of Hooks called by AdminLayout

**错误详情**：
```
Previous render            Next render
------------------------------------------------------
1. useContext                 useContext
2. useContext                 useContext
3. useState                   useState
...
10. useRef                    useRef
11. undefined                 useEffect  <- 错误！hooks 顺序不一致
```

## 问题原因

在 `src/app/admin/layout.tsx` 文件中，有一个**早期返回（early return）**违反了 React Hooks 规则。

**错误代码**：
```tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();      // Hook 1
  const router = useRouter();         // Hook 2
  const [sidebarOpen, ...] = useState(false);   // Hook 3
  const [menuOrder, ...] = useState([]);        // Hook 4
  const [isSortingMode, ...] = useState(false); // Hook 5
  const [draggedItem, ...] = useState(null);    // Hook 6
  const [editingMenuItems, ...] = useState([]); // Hook 7
  const [isLoading, ...] = useState(true);      // Hook 8
  const [isAuthenticated, ...] = useState(false); // Hook 9
  const hasCheckedRef = useRef(false);          // Hook 10

  // ❌ 早期返回在 hooks 之后！
  if (pathname?.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  // Hook 11 - 这里在某些渲染中不会执行
  useEffect(() => {
    // ...
  }, [pathname]);
}
```

**违反规则**：
- React Hooks 规则要求：**必须在每次渲染中以相同的顺序调用 hooks**
- 当 pathname 是 `/admin/login` 时，早期返回导致后面的 useEffect 不执行
- 当 pathname 不是 `/admin/login` 时，所有 hooks 都执行
- 这导致 hooks 顺序不一致，触发错误

## 解决方案

将**早期返回移到所有 hooks 之前**。

**修复后的代码**：
```tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();  // Hook 1
  const router = useRouter();     // Hook 2

  // ✅ 早期返回在 hooks 之后、state hooks 之前
  if (pathname?.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  const [sidebarOpen, ...] = useState(false);         // Hook 3
  const [menuOrder, ...] = useState([]);              // Hook 4
  const [isSortingMode, ...] = useState(false);       // Hook 5
  const [draggedItem, ...] = useState(null);          // Hook 6
  const [editingMenuItems, ...] = useState([]);       // Hook 7
  const [isLoading, ...] = useState(true);           // Hook 8
  const [isAuthenticated, ...] = useState(false);    // Hook 9
  const hasCheckedRef = useRef(false);               // Hook 10

  useEffect(() => {  // Hook 11 - 现在顺序一致了
    // ...
  }, [pathname]);
}
```

## React Hooks 规则

### 规则 1：只在顶层调用 Hooks
✅ 正确：
```tsx
function Component() {
  const [state, setState] = useState();
  useEffect(() => {});
  return <div />;
}
```

❌ 错误：
```tsx
function Component() {
  const [state, setState] = useState();
  
  if (condition) {
    useEffect(() => {});  // ❌ 条件中调用 hooks
  }
  
  return <div />;
}
```

### 规则 2：只在 React 函数中调用 Hooks
✅ 正确：
```tsx
function Component() {
  useEffect(() => {});
  return <div />;
}
```

❌ 错误：
```tsx
function Component() {
  const handleClick = () => {
    useEffect(() => {});  // ❌ 在普通函数中调用
  };
  
  return <div onClick={handleClick} />;
}
```

### 规则 3：Hooks 顺序必须一致
✅ 正确：
```tsx
function Component() {
  if (shouldRender) {
    return <div />;  // ❌ 不能在 hooks 前返回
  }
  
  const [state, setState] = useState();
  useEffect(() => {});
  
  return <div />;
}
```

✅ 正确：
```tsx
function Component() {
  const [state, setState] = useState();
  useEffect(() => {});
  
  if (shouldRender) {
    return <div />;  // ✅ 在所有 hooks 后返回
  }
  
  return <div />;
}
```

## 修复步骤

1. **定位问题**
   - 找到 `src/app/admin/layout.tsx`
   - 查找所有 hooks 调用
   - 查找早期返回的位置

2. **调整代码顺序**
   - 将早期返回移到所有 hooks 之前
   - 确保 hooks 在每次渲染中以相同顺序调用

3. **验证修复**
   - 保存文件
   - 刷新页面
   - 检查错误是否消失

## 文件修改清单

- ✅ `src/app/admin/layout.tsx`：修复 hooks 顺序错误

## 测试结果

- ✅ 代码已修复
- ✅ Hooks 顺序一致
- ✅ 错误已解决

## 预防措施

### 1. 使用 ESLint
安装并启用 `react-hooks` 插件：
```bash
pnpm add -D eslint-plugin-react-hooks
```

配置 `.eslintrc.json`：
```json
{
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### 2. 代码审查
- 检查所有组件是否遵守 Hooks 规则
- 避免在条件语句中调用 hooks
- 避免在循环中调用 hooks

### 3. 使用 React DevTools
- 安装 React DevTools 浏览器扩展
- 检查组件的 hooks 调用顺序
- 调试 hooks 相关问题

## 相关资源

- [React Hooks 规则](https://react.dev/link/rules-of-hooks)
- [React Hooks FAQ](https://react.dev/reference/react/FAQ#why-do-hooks-have-to-be-called-at-the-top-level)
- [React DevTools](https://react.dev/learn/react-developer-tools)
