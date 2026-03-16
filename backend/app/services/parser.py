"""
PDF 解析服务
使用 pdfplumber 进行文本提取
"""

import re
from pathlib import Path
from typing import Dict, List, Any, Optional
import pdfplumber


class PDFParser:
    """PDF 解析器"""
    
    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 100):
        """
        初始化解析器
        
        Args:
            chunk_size: 切片大小（字符数）
            chunk_overlap: 切片重叠大小
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    async def parse(self, file_path: Path) -> Dict[str, Any]:
        """
        解析 PDF 文件
        
        Args:
            file_path: PDF 文件路径
            
        Returns:
            解析结果，包含元数据和切片
        """
        try:
            with pdfplumber.open(file_path) as pdf:
                # 提取文本
                full_text = ""
                page_texts = []
                
                for page_num, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    # 清理文本
                    text = self._clean_text(text)
                    
                    page_texts.append({
                        "page": page_num + 1,
                        "text": text,
                        "char_start": len(full_text),
                        "char_end": len(full_text) + len(text)
                    })
                    full_text += text + "\n\n"
                
                # 提取元数据
                metadata = self._extract_metadata(pdf.metadata or {}, full_text)
                
                # 创建切片
                chunks = self._create_chunks(page_texts)
                
                return {
                    **metadata,
                    "page_count": len(pdf.pages),
                    "chunks": chunks
                }
                
        except Exception as e:
            raise Exception(f"PDF parsing failed: {str(e)}")
    
    def _clean_text(self, text: str) -> str:
        """清理提取的文本"""
        # 移除多余空白
        text = re.sub(r'\s+', ' ', text)
        # 修复断行
        text = re.sub(r'(\w)-\s+(\w)', r'\1\2', text)
        # 恢复段落
        text = re.sub(r'\. ([A-Z])', r'.\n\n\1', text)
        return text.strip()
    
    def _extract_metadata(self, pdf_metadata: dict, full_text: str) -> Dict[str, Any]:
        """提取文献元数据"""
        
        # 从 PDF 元数据提取
        title = pdf_metadata.get("Title", "") or pdf_metadata.get("title", "")
        author = pdf_metadata.get("Author", "") or pdf_metadata.get("author", "")
        
        # 如果元数据为空，尝试从文本提取
        if not title:
            title = self._extract_title(full_text)
        
        authors = self._parse_authors(author) if author else self._extract_authors(full_text)
        year = self._extract_year(full_text)
        abstract = self._extract_abstract(full_text)
        keywords = self._extract_keywords(full_text)
        
        return {
            "title": title or "Untitled Document",
            "authors": authors,
            "year": year,
            "source": None,
            "abstract": abstract,
            "keywords": keywords
        }
    
    def _extract_title(self, text: str) -> str:
        """从文本提取标题"""
        lines = text.strip().split("\n")
        for line in lines[:15]:  # 查看前15行
            line = line.strip()
            # 标题通常较短且不包含常见的非标题词
            if 10 < len(line) < 200:
                lower_line = line.lower()
                skip_words = [
                    "abstract", "introduction", "copyright", 
                    "all rights", "journal", "volume", "issue",
                    "摘要", "引言", "版权", "关键词"
                ]
                if not any(kw in lower_line for kw in skip_words):
                    # 标题通常首字母大写或全大写
                    if line[0].isupper() or line.isupper():
                        return line
        return ""
    
    def _parse_authors(self, author_str: str) -> List[str]:
        """解析作者字符串"""
        separators = [",", ";", " and ", " AND ", "、", "，", "&"]
        authors = [author_str]
        
        for sep in separators:
            new_authors = []
            for a in authors:
                new_authors.extend(a.split(sep))
            authors = new_authors
        
        # 清理并过滤
        authors = [a.strip() for a in authors if a.strip() and len(a.strip()) > 1]
        return authors[:10]  # 最多返回10个作者
    
    def _extract_authors(self, text: str) -> List[str]:
        """从文本提取作者（简单实现）"""
        # 在标题后的前几行中查找可能的作者名
        # 这是一个简化的实现
        return []
    
    def _extract_year(self, text: str) -> Optional[int]:
        """提取年份"""
        # 匹配合理范围内的年份
        years = re.findall(r'\b(19[89]\d|20[0-2]\d)\b', text[:8000])
        if years:
            from collections import Counter
            year_counts = Counter(years)
            most_common = year_counts.most_common(1)[0][0]
            return int(most_common)
        return None
    
    def _extract_abstract(self, text: str) -> Optional[str]:
        """提取摘要"""
        patterns = [
            # 英文摘要
            r'Abstract[:\s]*\n*(.{100,2500}?)(?=\n\s*(?:Keywords?|Introduction|1\.|1\s|INTRODUCTION))',
            r'ABSTRACT[:\s]*\n*(.{100,2500}?)(?=\n\s*(?:KEYWORDS?|INTRODUCTION|1\.))',
            # 中文摘要
            r'摘\s*要[:\s：]*\n*(.{50,1500}?)(?=\n\s*(?:关键词|Keywords?|引言|一、|1\.))',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                abstract = match.group(1).strip()
                # 清理多余空白
                abstract = re.sub(r'\s+', ' ', abstract)
                # 移除可能的页眉页脚
                abstract = re.sub(r'\d+\s*$', '', abstract)
                if len(abstract) >= 50:
                    return abstract
        
        return None
    
    def _extract_keywords(self, text: str) -> List[str]:
        """提取关键词"""
        patterns = [
            r'Keywords?[:\s：]*\n*(.{10,500}?)(?=\n\s*(?:Abstract|Introduction|1\.|摘要|引言))',
            r'KEYWORDS?[:\s：]*\n*(.{10,500}?)(?=\n)',
            r'关键词[:\s：]*\n*(.{10,300}?)(?=\n\s*(?:Abstract|Introduction|摘要|引言|一、|1\.))',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                keywords_str = match.group(1).strip()
                # 分割关键词
                keywords = re.split(r'[,;，；、·]', keywords_str)
                keywords = [kw.strip() for kw in keywords if kw.strip() and len(kw.strip()) > 1]
                return keywords[:10]  # 最多返回10个关键词
        
        return []
    
    def _create_chunks(self, page_texts: List[Dict]) -> List[Dict]:
        """创建文本切片，使用滑动窗口策略"""
        chunks = []
        chunk_index = 0
        
        # 合并所有页面文本
        all_text = ""
        page_boundaries = []  # 记录每页在全文中的位置
        
        for page_data in page_texts:
            start = len(all_text)
            all_text += page_data["text"] + "\n\n"
            end = len(all_text)
            page_boundaries.append({
                "page": page_data["page"],
                "start": start,
                "end": end
            })
        
        # 按段落分割
        paragraphs = self._split_into_paragraphs(all_text)
        
        # 使用滑动窗口创建切片
        current_chunk = ""
        current_start = 0
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # 如果当前切片加上新段落不超过限制
            if len(current_chunk) + len(para) + 2 <= self.chunk_size:
                if current_chunk:
                    current_chunk += "\n\n"
                else:
                    current_start = all_text.find(para)
                current_chunk += para
            else:
                # 保存当前切片
                if current_chunk:
                    page_num = self._get_page_number(current_start, page_boundaries)
                    chunks.append({
                        "content": current_chunk,
                        "page_number": page_num,
                        "section_title": self._detect_section(current_chunk),
                        "chunk_index": chunk_index,
                        "char_start": current_start,
                        "char_end": current_start + len(current_chunk)
                    })
                    chunk_index += 1
                
                # 开始新切片，保留部分重叠
                if self.chunk_overlap > 0 and current_chunk:
                    # 保留最后一部分作为重叠
                    overlap_text = current_chunk[-self.chunk_overlap:]
                    current_chunk = overlap_text + "\n\n" + para
                    current_start = all_text.find(para) - len(overlap_text) - 2
                else:
                    current_chunk = para
                    current_start = all_text.find(para)
        
        # 保存最后一个切片
        if current_chunk:
            page_num = self._get_page_number(current_start, page_boundaries)
            chunks.append({
                "content": current_chunk,
                "page_number": page_num,
                "section_title": self._detect_section(current_chunk),
                "chunk_index": chunk_index,
                "char_start": current_start,
                "char_end": current_start + len(current_chunk)
            })
        
        return chunks
    
    def _split_into_paragraphs(self, text: str) -> List[str]:
        """将文本分割为段落"""
        # 按双换行或单独的句号+换行分割
        paragraphs = re.split(r'\n\n+', text)
        
        result = []
        for para in paragraphs:
            para = para.strip()
            if para:
                # 如果段落太长，进一步按句子分割
                if len(para) > self.chunk_size:
                    sentences = re.split(r'(?<=[.!?。！？])\s+', para)
                    result.extend(sentences)
                else:
                    result.append(para)
        
        return result
    
    def _get_page_number(self, char_pos: int, page_boundaries: List[Dict]) -> int:
        """根据字符位置获取页码"""
        for boundary in page_boundaries:
            if boundary["start"] <= char_pos < boundary["end"]:
                return boundary["page"]
        return 1
    
    def _detect_section(self, text: str) -> Optional[str]:
        """检测切片所属章节"""
        section_patterns = [
            # 英文章节
            (r'^(Abstract)\b', "Abstract"),
            (r'^(Introduction)\b', "Introduction"),
            (r'^(Literature Review)\b', "Literature Review"),
            (r'^(Methodology|Methods?)\b', "Methodology"),
            (r'^(Results?)\b', "Results"),
            (r'^(Discussion)\b', "Discussion"),
            (r'^(Conclusion)\b', "Conclusion"),
            (r'^(References?)\b', "References"),
            # 中文章节
            (r'^(摘要)', "摘要"),
            (r'^(引言|前言)', "引言"),
            (r'^(文献综述)', "文献综述"),
            (r'^(研究方法)', "研究方法"),
            (r'^(研究结果|结果)', "研究结果"),
            (r'^(讨论)', "讨论"),
            (r'^(结论)', "结论"),
            (r'^(参考文献)', "参考文献"),
            # 数字章节
            (r'^(\d+\.?\s+\w+)', None),  # 1. Introduction
        ]
        
        first_line = text.split('\n')[0].strip()
        
        for pattern, section_name in section_patterns:
            match = re.match(pattern, first_line, re.IGNORECASE)
            if match:
                return section_name or match.group(1)
        
        return None
