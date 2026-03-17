"""
配置管理模块
使用 pydantic-settings 管理环境变量
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    # 应用配置
    APP_NAME: str = "ScholarFlow"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    
    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # 数据库配置
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/scholarflow.db"
    
    # 文件存储
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50
    
    # 向量数据库
    CHROMA_PERSIST_DIR: str = "./data/chroma"
    
    # AI 配置
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-chat"
    
    # Embedding 配置（Jina API）
    JINA_API_KEY: str = ""
    
    # CORS 配置 - 开发环境允许所有来源
    CORS_ORIGINS: list[str] = ["*"]
    
    @property
    def upload_path(self) -> Path:
        """获取上传目录路径"""
        path = Path(self.UPLOAD_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path
    
    @property
    def chroma_path(self) -> Path:
        """获取 Chroma 数据目录路径"""
        path = Path(self.CHROMA_PERSIST_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path
    
    @property
    def max_file_size_bytes(self) -> int:
        """获取最大文件大小（字节）"""
        return self.MAX_FILE_SIZE_MB * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


# 导出配置实例
settings = get_settings()

