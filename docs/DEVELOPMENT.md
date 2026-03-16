# ScholarFlow 开发规范

## 1. 项目概述

```yaml
项目名称: ScholarFlow
项目类型: AI 学术写作助手 (Web App)
目标用户: 人文社科研究生/科研人员
开发模式: 独立开发
```

## 2. 技术栈

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 14.x | React 框架 (App Router) |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 3.x | 样式 |
| Radix UI | latest | 无样式组件库 |
| Tiptap | 2.x | 富文本编辑器 |
| Zustand | 4.x | 状态管理 |
| SWR | 2.x | 数据请求 |

### 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | 0.109+ | Web 框架 |
| Python | 3.11+ | 运行时 |
| SQLAlchemy | 2.0+ | ORM |
| SQLite/PostgreSQL | - | 数据库 |
| Chroma | 0.4+ | 向量数据库 |
| LangChain | 0.1+ | LLM 编排 |

### AI/ML
| 技术 | 用途 |
|------|------|
| DeepSeek API | 主力 LLM |
| BGE-M3 | 文本向量化 (本地) |
| PyMuPDF | PDF 解析 |
| pdfplumber | PDF 表格提取 |

## 3. 项目结构

```
ScholarFlow/
├── frontend/                 # Next.js 前端
│   ├── app/                  # App Router 页面
│   │   ├── (auth)/          # 认证相关页面
│   │   ├── workspace/       # 主工作台
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/          # React 组件
│   │   ├── ui/              # 基础 UI 组件
│   │   ├── library/         # 文献管理组件
│   │   ├── chat/            # 对话组件
│   │   └── editor/          # 编辑器组件
│   ├── lib/                 # 工具函数
│   ├── hooks/               # 自定义 Hooks
│   ├── stores/              # Zustand stores
│   ├── types/               # TypeScript 类型
│   └── styles/              # 全局样式
│
├── backend/                  # FastAPI 后端
│   ├── app/
│   │   ├── main.py          # FastAPI 入口
│   │   ├── config.py        # 配置管理
│   │   ├── database.py      # 数据库连接
│   │   ├── models/          # SQLAlchemy 模型
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── routers/         # API 路由
│   │   ├── services/        # 业务逻辑
│   │   │   └── agents/      # AI Agents
│   │   └── utils/           # 工具函数
│   └── tests/               # 测试
│
├── docs/                     # 项目文档
└── scripts/                  # 脚本工具
```

## 4. 命名规范

### Python (后端)
```python
# 文件名: snake_case
document_parser.py

# 类名: PascalCase
class DocumentParser:
    pass

# 函数/变量: snake_case
def parse_document():
    file_path = "..."

# 常量: UPPER_SNAKE_CASE
MAX_FILE_SIZE = 50 * 1024 * 1024
```

### TypeScript (前端)
```typescript
// 组件文件: PascalCase
ChatPane.tsx

// 工具文件: camelCase
formatDate.ts

// 组件/类: PascalCase
function ChatPane() {}

// 函数/变量: camelCase
const handleSubmit = () => {}

// 常量: UPPER_SNAKE_CASE
const API_BASE_URL = "..."

// 类型/接口: PascalCase
interface Document {}
type MessageRole = 'user' | 'assistant'
```

## 5. 组件规范

### React 组件模板
```tsx
// 1. 导入 (React -> 第三方 -> 本地)
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'

// 2. 类型定义
interface ChatMessageProps {
  message: Message
  onCitationClick?: (id: string) => void
  className?: string
}

// 3. 组件 (使用 function 声明, 导出命名组件)
export function ChatMessage({ 
  message, 
  onCitationClick,
  className 
}: ChatMessageProps) {
  // 3.1 Hooks
  const [isExpanded, setIsExpanded] = useState(false)
  
  // 3.2 Handlers
  const handleClick = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])
  
  // 3.3 Render
  return (
    <div className={cn(
      'p-4 rounded-lg',
      message.role === 'user' ? 'bg-slate-100' : 'bg-white',
      className
    )}>
      {message.content}
    </div>
  )
}
```

## 6. API 规范

### FastAPI 路由模板
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.document import DocumentCreate, DocumentResponse
from app.services.parser import DocumentParser

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="上传文献",
    description="上传并解析 PDF 文献文件"
)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    上传并解析 PDF 文献
    
    - **file**: PDF 文件 (最大 50MB)
    - Returns: 解析后的文献信息
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只支持 PDF 文件"
        )
    
    parser = DocumentParser(db)
    document = await parser.parse(file)
    return document
```

### API 响应格式
```python
# 成功响应
{
    "success": True,
    "data": { ... },
    "message": "操作成功"
}

# 错误响应
{
    "success": False,
    "error": {
        "code": "INVALID_FILE_TYPE",
        "message": "只支持 PDF 文件"
    }
}

# 分页响应
{
    "success": True,
    "data": [...],
    "pagination": {
        "page": 1,
        "page_size": 20,
        "total": 100,
        "total_pages": 5
    }
}
```

## 7. Git 规范

### 分支策略
```
main        ← 稳定版本，可部署
└── dev     ← 日常开发
    └── feat/xxx  ← 功能分支（大功能）
```

### Commit 格式
```bash
<type>: <description>

# type 类型:
feat:     新功能
fix:      Bug 修复
docs:     文档更新
style:    代码格式（不影响功能）
refactor: 重构（非新功能、非Bug修复）
perf:     性能优化
test:     测试相关
chore:    构建/工具/依赖相关

# 示例:
git commit -m "feat: 实现 PDF 上传解析功能"
git commit -m "fix: 修复文献列表分页显示错误"
git commit -m "docs: 更新 API 接口文档"
git commit -m "refactor: 重构 Agent 调用逻辑"
```

## 8. 环境配置

### 后端 (.env)
```bash
# 应用配置
APP_ENV=development
DEBUG=true
SECRET_KEY=your-secret-key-change-in-production

# 数据库
DATABASE_URL=sqlite:///./data/scholarflow.db

# AI API
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# 文件存储
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50

# 向量库
CHROMA_PERSIST_DIR=./data/chroma

# Embedding 模型
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DEVICE=cpu
```

### 前端 (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=ScholarFlow
```

## 9. 开发流程

### 本地启动
```bash
# 终端 1: 启动后端
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 终端 2: 启动前端
cd frontend
npm install
npm run dev
```

### 访问地址
- 前端: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 10. MVP 功能优先级

### P0 - 必须有 (Week 1-4) ✅ 已完成
- [x] 项目基础架构
- [x] 文献上传与 PDF 解析
- [x] 文献列表管理 (CRUD)
- [x] 文献向量化存储
- [x] 基于文献的 RAG 对话
- [x] 基础写作生成

### P1 - 应该有 (Week 5-6) ✅ 已完成
- [x] 引用回溯（点击脚注跳转原文）
- [x] Tiptap 编辑器集成
- [x] 草稿自动保存
- [x] 写作润色功能

### P2 - 可以有 (Week 7-8)
- [ ] Agent 状态可视化
- [ ] 导出 Word/PDF/Markdown
- [ ] 多项目管理
- [ ] BibTeX 引用导出

