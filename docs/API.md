# ScholarFlow API 文档

> Base URL: `http://localhost:8000/api`

## 认证

暂不需要认证（MVP 阶段）

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

### 分页响应
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

---

## 文献管理 API

### 上传文献

上传并解析 PDF 文献文件。

```
POST /documents/upload
Content-Type: multipart/form-data
```

**请求参数**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| file | File | ✅ | PDF 文件 (最大 50MB) |

**响应示例**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "数字时代的微观权力",
    "authors": ["李明"],
    "year": 2019,
    "source": "新闻与传播研究",
    "abstract": "本文从福柯的微观权力理论出发...",
    "file_path": "/uploads/550e8400.pdf",
    "chunk_count": 45,
    "created_at": "2026-01-20T12:00:00Z"
  },
  "message": "文献上传成功"
}
```

**错误码**
| 错误码 | 描述 |
|--------|------|
| INVALID_FILE_TYPE | 只支持 PDF 文件 |
| FILE_TOO_LARGE | 文件超过 50MB |
| PARSE_FAILED | PDF 解析失败 |

---

### 获取文献列表

```
GET /documents
```

**查询参数**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| page | int | ❌ | 页码，默认 1 |
| page_size | int | ❌ | 每页数量，默认 20 |
| search | string | ❌ | 搜索关键词 |
| sort_by | string | ❌ | 排序字段 (created_at, title, year) |
| sort_order | string | ❌ | 排序方向 (asc, desc) |

**响应示例**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "数字时代的微观权力",
      "authors": ["李明"],
      "year": 2019,
      "source": "新闻与传播研究",
      "created_at": "2026-01-20T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

---

### 获取文献详情

```
GET /documents/{document_id}
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "数字时代的微观权力",
    "authors": ["李明"],
    "year": 2019,
    "source": "新闻与传播研究",
    "abstract": "本文从福柯的微观权力理论出发...",
    "keywords": ["微观权力", "社交媒体", "数字治理"],
    "file_path": "/uploads/550e8400.pdf",
    "chunk_count": 45,
    "sections": [
      {"title": "引言", "page": 1},
      {"title": "文献综述", "page": 3},
      {"title": "研究方法", "page": 8}
    ],
    "created_at": "2026-01-20T12:00:00Z"
  }
}
```

---

### 删除文献

```
DELETE /documents/{document_id}
```

**响应示例**
```json
{
  "success": true,
  "message": "文献删除成功"
}
```

---

## 对话 API

### 发送消息

发送对话消息，使用 SSE (Server-Sent Events) 流式返回。

```
POST /chat
Content-Type: application/json
Accept: text/event-stream
```

**请求体**
```json
{
  "message": "请帮我总结这几篇文献关于'数字媒介权力'的核心观点",
  "document_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ],
  "mode": "strict",
  "conversation_id": "conv-123"
}
```

**请求参数**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| message | string | ✅ | 用户消息 |
| document_ids | string[] | ✅ | 选中的文献 ID 列表 |
| mode | string | ❌ | strict (仅私有库) / explore (通用知识) |
| conversation_id | string | ❌ | 对话 ID，不传则创建新对话 |

**SSE 响应格式**

```
event: start
data: {"conversation_id": "conv-123", "message_id": "msg-456"}

event: agent
data: {"agent": "researcher", "status": "searching", "detail": "正在检索相关文献..."}

event: agent
data: {"agent": "researcher", "status": "done", "sources": 5}

event: content
data: {"text": "根据您提供的文献，关于"}

event: content
data: {"text": "'数字媒介权力'的核心观点可以归纳为以下几点：\n\n"}

event: content
data: {"text": "1. **权力的分散化**：福柯认为"}

event: citation
data: {"index": 1, "document_id": "550e8400...", "page": 45, "text": "权力不是自上而下的压制..."}

event: content
data: {"text": "[^1]...\n\n"}

event: done
data: {"total_tokens": 1234, "citations": [{"index": 1, "document_id": "...", "page": 45}]}
```

**SSE 事件类型**
| 事件 | 描述 |
|------|------|
| start | 开始生成 |
| agent | Agent 状态更新 |
| content | 生成的文本内容 |
| citation | 引用信息 |
| error | 错误信息 |
| done | 生成完成 |

---

### 获取对话历史

```
GET /chat/{conversation_id}/history
```

**响应示例**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg-001",
      "role": "user",
      "content": "请帮我总结这几篇文献...",
      "created_at": "2026-01-20T12:00:00Z"
    },
    {
      "id": "msg-002",
      "role": "assistant",
      "content": "根据您提供的文献...[^1]...",
      "citations": [
        {"index": 1, "document_id": "...", "page": 45, "text": "..."}
      ],
      "created_at": "2026-01-20T12:00:05Z"
    }
  ]
}
```

---

## 写作 API

### 生成大纲

```
POST /write/outline
Content-Type: application/json
```

**请求体**
```json
{
  "topic": "社交媒体对青年政治参与的影响",
  "document_ids": ["...", "..."],
  "outline_type": "literature_review"
}
```

**outline_type 选项**
- `literature_review`: 文献综述
- `research_paper`: 研究论文
- `thesis_chapter`: 论文章节

**响应示例**
```json
{
  "success": true,
  "data": {
    "outline": [
      {
        "level": 1,
        "title": "引言",
        "description": "介绍研究背景与问题"
      },
      {
        "level": 1,
        "title": "文献综述",
        "children": [
          {
            "level": 2,
            "title": "社交媒体与政治传播",
            "key_sources": ["李明, 2019", "Smith, 2020"]
          }
        ]
      }
    ]
  }
}
```

---

### 生成写作内容

```
POST /write/generate
Content-Type: application/json
Accept: text/event-stream
```

**请求体**
```json
{
  "instruction": "请撰写关于'社交媒体权力结构'的文献综述段落",
  "document_ids": ["...", "..."],
  "outline_section": "2.1 社交媒体与政治传播",
  "length": "medium"
}
```

**length 选项**
- `short`: 约 200 字
- `medium`: 约 500 字
- `long`: 约 1000 字

**响应**: SSE 流式返回，格式同对话 API

---

### 润色文本

```
POST /write/polish
Content-Type: application/json
Accept: text/event-stream
```

**请求体**
```json
{
  "text": "社交媒体对青年的政治参与有很大影响。很多研究都发现...",
  "style": "academic",
  "focus": ["remove_ai_tone", "enhance_terminology"]
}
```

**focus 选项**
- `remove_ai_tone`: 消除 AI 痕迹
- `enhance_terminology`: 增强专业术语
- `improve_flow`: 改善行文流畅度
- `add_hedging`: 添加学术限定语

**响应**: SSE 流式返回润色后的文本

---

## 引用 API

### 获取引用详情

```
GET /citations/{chunk_id}
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "chunk_id": "chunk-123",
    "document_id": "doc-456",
    "document_title": "数字时代的微观权力",
    "authors": ["李明"],
    "year": 2019,
    "page_number": 45,
    "section_title": "理论框架",
    "content": "福柯认为，权力不是自上而下的压制，而是弥散于社会关系网络之中...",
    "context_before": "在分析数字媒介权力时，我们需要回到经典理论。",
    "context_after": "这一观点为我们理解社交媒体提供了新的视角。"
  }
}
```

---

### 导出 BibTeX

```
POST /citations/export/bibtex
Content-Type: application/json
```

**请求体**
```json
{
  "document_ids": ["...", "..."]
}
```

**响应**
```
Content-Type: text/plain

@article{li2019digital,
  title={数字时代的微观权力},
  author={李明},
  journal={新闻与传播研究},
  year={2019}
}

@article{smith2020social,
  title={Social Media and Political Power},
  author={Smith, John},
  journal={Journal of Communication},
  year={2020}
}
```

---

## 错误码一览

| 错误码 | HTTP 状态 | 描述 |
|--------|----------|------|
| INVALID_FILE_TYPE | 400 | 不支持的文件类型 |
| FILE_TOO_LARGE | 400 | 文件过大 |
| PARSE_FAILED | 500 | 文件解析失败 |
| DOCUMENT_NOT_FOUND | 404 | 文献不存在 |
| NO_DOCUMENTS_SELECTED | 400 | 未选择文献 |
| LLM_ERROR | 500 | AI 服务异常 |
| RATE_LIMIT_EXCEEDED | 429 | 请求过于频繁 |

