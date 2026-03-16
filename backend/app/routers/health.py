"""
健康检查路由
"""

from fastapi import APIRouter
from app.config import settings

router = APIRouter(tags=["health"])


@router.get("/")
async def root():
    """根路由"""
    return {
        "name": settings.APP_NAME,
        "version": "0.1.0",
        "status": "running"
    }


@router.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "environment": settings.APP_ENV
    }

