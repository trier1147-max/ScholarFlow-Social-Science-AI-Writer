"""
API 路由
"""

from app.routers.documents import router as documents_router
from app.routers.chat import router as chat_router
from app.routers.health import router as health_router
from app.routers.citations import router as citations_router
from app.routers.drafts import router as drafts_router
from app.routers.polish import router as polish_router
from app.routers.projects import router as projects_router

__all__ = [
    "documents_router",
    "chat_router",
    "health_router",
    "citations_router",
    "drafts_router",
    "polish_router",
    "projects_router"
]

