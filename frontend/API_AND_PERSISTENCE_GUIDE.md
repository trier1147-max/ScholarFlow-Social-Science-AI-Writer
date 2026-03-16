# API 客户端和状态持久化使用指南

## 📚 API 客户端使用

### 基本用法

```typescript
import { api } from '@/lib/api-client'

// GET 请求
const data = await api.get<ResponseType>('/api/endpoint')

// POST 请求
const result = await api.post<ResponseType>('/api/endpoint', { 
  key: 'value' 
})

// PATCH 请求
await api.patch('/api/endpoint/123', { 
  title: 'new title' 
})

// DELETE 请求
await api.delete('/api/endpoint/123')

// 上传文件
const result = await api.uploadFile(
  '/api/upload',
  file,
  { project_id: '123' }
)
```

### 禁用自动错误提示

如果你想自己处理错误提示，可以传入 `false`：

```typescript
try {
  const data = await api.get('/api/endpoint', false)  // 不显示错误 Toast
  // 处理数据
} catch (error) {
  // 自定义错误处理
  toast.error('自定义错误消息', 'Custom Error')
}
```

### 完整示例

```typescript
const loadDocuments = async () => {
  setLoading(true)
  try {
    const result = await api.get<{ data: Document[] }>(
      `/api/projects/${projectId}/documents`
    )
    
    if (result.data) {
      setDocuments(result.data)
    }
  } catch (error) {
    console.error('Failed to load documents:', error)
    // 错误已经由 API 客户端显示 Toast
  } finally {
    setLoading(false)
  }
}
```

---

## 💾 状态持久化使用

### 基本用法

```typescript
import { usePersistedState } from '@/hooks/usePersistedState'

function MyComponent() {
  // 用法和 useState 完全一样，但会自动保存到 localStorage
  const [value, setValue] = usePersistedState('my-key', 'default-value')
  
  // 数字类型
  const [count, setCount] = usePersistedState<number>('count', 0)
  
  // 布尔类型
  const [isEnabled, setIsEnabled] = usePersistedState<boolean>('enabled', false)
  
  // 对象类型
  const [settings, setSettings] = usePersistedState<Settings>('settings', {
    theme: 'light',
    fontSize: 14
  })
  
  return (
    <div>
      <button onClick={() => setValue('new value')}>
        Update Value
      </button>
    </div>
  )
}
```

### 清除持久化数据

```typescript
import { clearPersistedState, clearAllPersistedState } from '@/hooks/usePersistedState'

// 清除单个键
clearPersistedState('my-key')

// 清除所有应用数据
clearAllPersistedState()
```

### 实际应用示例

#### 1. 面板宽度持久化

```typescript
const [leftPanelWidth, setLeftPanelWidth] = usePersistedState(
  'scholarflow-left-panel-width',
  320
)

const [rightPanelWidth, setRightPanelWidth] = usePersistedState(
  'scholarflow-right-panel-width',
  500
)
```

#### 2. UI 状态持久化

```typescript
const [isSidebarCollapsed, setIsSidebarCollapsed] = usePersistedState(
  'scholarflow-sidebar-collapsed',
  false
)

const [theme, setTheme] = usePersistedState<'light' | 'dark'>(
  'scholarflow-theme',
  'light'
)
```

#### 3. 用户偏好设置

```typescript
interface EditorSettings {
  fontSize: number
  fontFamily: string
  lineHeight: number
}

const [editorSettings, setEditorSettings] = usePersistedState<EditorSettings>(
  'scholarflow-editor-settings',
  {
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 1.5
  }
)

// 更新部分设置
setEditorSettings(prev => ({
  ...prev,
  fontSize: 16
}))
```

---

## 🎯 已更新的组件

以下组件已经使用了新的 API 客户端和状态持久化：

### 1. ✅ Workspace.tsx
- 面板宽度持久化
- 面板折叠状态持久化

### 2. ✅ AppLayout.tsx
- 最后访问项目持久化
- 自动恢复上次的项目

### 3. ✅ ConversationSidebar.tsx
- 使用统一 API 客户端删除对话
- 自动错误处理和提示

### 4. ✅ ProjectList.tsx
- 使用统一 API 客户端
- 创建/更新/删除项目
- 自动成功提示

---

## 🔧 迁移指南

### 将旧的 fetch 代码迁移到 API 客户端

**之前：**
```typescript
const response = await fetch('http://127.0.0.1:8000/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})

if (!response.ok) {
  throw new Error('Request failed')
}

const result = await response.json()
```

**之后：**
```typescript
const result = await api.post('/api/endpoint', data)
```

### 将 useState 迁移到 usePersistedState

**之前：**
```typescript
const [width, setWidth] = useState(320)
```

**之后：**
```typescript
const [width, setWidth] = usePersistedState('my-component-width', 320)
```

---

## 📌 注意事项

1. **localStorage 限制**：
   - 大小限制约 5-10MB
   - 只能存储字符串（会自动 JSON 序列化）
   - 不要存储敏感信息

2. **键名规范**：
   - 使用 `scholarflow-` 前缀避免冲突
   - 使用描述性的名称
   - 示例：`scholarflow-left-panel-width`

3. **错误处理**：
   - API 客户端会自动显示错误 Toast
   - 你仍然需要在 catch 块中处理逻辑
   - 使用 `console.error` 记录错误日志

4. **性能考虑**：
   - usePersistedState 会在每次状态改变时写入 localStorage
   - 对于频繁更新的状态，考虑使用防抖

---

## ✨ 好处总结

### API 客户端
- ✅ 统一的错误处理
- ✅ 自动显示错误提示
- ✅ 代码更简洁
- ✅ 易于维护和测试
- ✅ 支持拦截器（未来可扩展）

### 状态持久化
- ✅ 用户体验更好
- ✅ 记住用户偏好
- ✅ 刷新页面不丢失状态
- ✅ 使用简单，和 useState 一样
- ✅ 自动序列化和反序列化
