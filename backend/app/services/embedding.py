"""
Embedding 服务
使用 sentence-transformers 加载 BGE-M3 模型
"""

from typing import List, Optional
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)


class EmbeddingService:
    """文本向量化服务"""
    
    _instance: Optional["EmbeddingService"] = None
    _model = None
    
    def __init__(self, model_name: str = "BAAI/bge-m3", device: str = "cpu"):
        """
        初始化 Embedding 服务
        
        Args:
            model_name: 模型名称，默认使用 BGE-M3
            device: 运行设备 (cpu/cuda)
        """
        self.model_name = model_name
        self.device = device
        self._initialized = False
    
    def _load_model(self):
        """延迟加载模型"""
        if self._initialized:
            return
        
        try:
            from sentence_transformers import SentenceTransformer
            
            logger.info(f"Loading embedding model: {self.model_name}")
            logger.info("This may take a while on first run (downloading ~2GB model)...")
            
            EmbeddingService._model = SentenceTransformer(
                self.model_name,
                device=self.device
            )
            self._initialized = True
            logger.info("Embedding model loaded successfully")
            
        except ImportError:
            raise ImportError(
                "sentence-transformers not installed. "
                "Run: pip install sentence-transformers"
            )
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
    
    def embed_text(self, text: str) -> List[float]:
        """
        将单个文本转换为向量
        
        Args:
            text: 输入文本
            
        Returns:
            向量列表
        """
        self._load_model()
        
        # BGE 模型建议添加指令前缀以获得更好效果
        # 对于检索任务，query 和 passage 使用不同前缀
        embedding = EmbeddingService._model.encode(
            text,
            normalize_embeddings=True
        )
        return embedding.tolist()
    
    def embed_texts(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """
        批量将文本转换为向量
        
        Args:
            texts: 输入文本列表
            batch_size: 批处理大小
            
        Returns:
            向量列表的列表
        """
        self._load_model()
        
        embeddings = EmbeddingService._model.encode(
            texts,
            batch_size=batch_size,
            normalize_embeddings=True,
            show_progress_bar=len(texts) > 10
        )
        return embeddings.tolist()
    
    def embed_query(self, query: str) -> List[float]:
        """
        将查询文本转换为向量（用于检索）
        BGE 模型建议对查询添加特定前缀
        
        Args:
            query: 查询文本
            
        Returns:
            向量列表
        """
        self._load_model()
        
        # BGE-M3 对查询文本建议添加前缀
        instruction = "Represent this sentence for searching relevant passages: "
        embedding = EmbeddingService._model.encode(
            instruction + query,
            normalize_embeddings=True
        )
        return embedding.tolist()
    
    @property
    def dimension(self) -> int:
        """获取向量维度"""
        self._load_model()
        return EmbeddingService._model.get_sentence_embedding_dimension()


# 单例获取函数
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service(
    model_name: str = "BAAI/bge-m3",
    device: str = "cpu"
) -> EmbeddingService:
    """
    获取 Embedding 服务单例
    
    Args:
        model_name: 模型名称
        device: 运行设备
        
    Returns:
        EmbeddingService 实例
    """
    global _embedding_service
    
    if _embedding_service is None:
        _embedding_service = EmbeddingService(model_name, device)
    
    return _embedding_service
