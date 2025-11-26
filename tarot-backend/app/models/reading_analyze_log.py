"""
Reading analyze log SQLAlchemy model.
"""
from sqlalchemy import Column, Integer, String, Text

from ..database import Base


class ReadingAnalyzeLog(Base):
    """记录占卜分析请求的日志表。"""

    __tablename__ = "reading_analyze_logs"

    id = Column(Integer, primary_key=True, index=True)
    questions = Column(Text, nullable=False, comment="用户输入的问题内容")
    category = Column(String(32), nullable=False, comment="归类后的关注类别")
    locate = Column(String(16), nullable=True, comment="语言区域代码")

    def __repr__(self) -> str:
        return f"<ReadingAnalyzeLog(id={self.id}, category='{self.category}', locate='{self.locate}')>"
