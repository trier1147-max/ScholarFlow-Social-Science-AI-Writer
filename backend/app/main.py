"""
ScholarFlow 后端入口
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, close_db
from app.routers import documents_router, chat_router, health_router, citations_router, drafts_router, polish_router, projects_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    print(f"[*] Starting {settings.APP_NAME}...")
    
    # 创建必要的目录
    settings.upload_path
    settings.chroma_path
    
    # 初始化数据库
    await init_db()
    print("[+] Database initialized")
    
    yield
    
    # 关闭时
    await close_db()
    print("[*] Shutting down...")


# 创建应用
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered academic writing assistant for humanities and social sciences",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS 配置 - 可通过 CORS_ORIGINS 环境变量配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 注册路由
app.include_router(health_router)
app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(citations_router)
app.include_router(drafts_router)
app.include_router(polish_router)
app.include_router(projects_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )

