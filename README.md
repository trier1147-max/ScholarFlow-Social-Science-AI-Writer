# ScholarFlow

> 🎓 人文社科领域的 AI 学术写作工作台

ScholarFlow 是一款专为人文社科研究生和科研人员打造的 AI 写作助手。它通过构建私有文献数据库，利用 RAG（检索增强生成）技术，帮助用户基于真实文献进行学术写作，实现"无据不言"的高质量原创输出。

## ✨ 核心特性

- **📚 私有文献库**: 上传 PDF 文献，自动解析并构建个人知识库
- **🔍 RAG 驱动写作**: 基于你的文献生成内容，每个观点都有引用支撑
- **📝 三栏式工作台**: 文献管理 + AI 对话 + 写作编辑器，一站式体验
- **🎯 引用回溯**: 点击脚注即可跳转到 PDF 原文位置
- **✍️ 学术润色**: 专门的编辑 Agent，消除 AI 痕迹，提升学术语气

## 🏗️ 技术栈

### 前端
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Radix UI
- Tiptap Editor

### 后端
- FastAPI (Python)
- SQLAlchemy + SQLite/PostgreSQL
- Chroma (向量数据库)
- LangChain

### AI/ML
- DeepSeek API (LLM)
- BGE-M3 (Embedding)
- PyMuPDF (PDF 解析)

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Python 3.11+
- Git

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/yourusername/scholarflow.git
cd scholarflow
```

2. **启动后端**
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# 编辑 .env 填入你的 API Key

uvicorn app.main:app --reload --port 8000
```

3. **启动前端**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

4. **访问应用**
- 前端: http://localhost:3000
- API 文档: http://localhost:8000/docs

## 📁 项目结构

```
ScholarFlow/
├── frontend/          # Next.js 前端应用
├── backend/           # FastAPI 后端服务
├── docs/              # 项目文档
└── scripts/           # 工具脚本
```

## 🎯 产品定位

### 目标用户
- 人文社科研究生（传媒学、社会学、教育学等）
- 高校科研人员
- 需要撰写学术论文的从业者

### 使用场景
- 📖 课程论文写作
- 📑 文献综述撰写
- 📝 期刊论文润色
- 🎓 学位论文辅助

### 与竞品的区别

| 产品 | 定位 | ScholarFlow 优势 |
|------|------|------------------|
| NotebookLM | 文献阅读笔记 | 我们输出完整论文 |
| Consensus | 学术检索 | 我们基于私有库写作 |
| Jenni AI | 通用写作 | 我们深耕人文社科 |

## 📜 开发规范

详见 [开发规范文档](./docs/DEVELOPMENT.md)

## 🗺️ Roadmap

- [x] 项目基础架构
- [ ] 文献上传与解析
- [ ] RAG 对话功能
- [ ] 写作生成功能
- [ ] 引用回溯
- [ ] 编辑器集成
- [ ] 导出功能

## 📄 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

Made with ❤️ for Academic Writers

