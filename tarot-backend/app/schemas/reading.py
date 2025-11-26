"""
Reading-related Pydantic schemas.
"""
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime


class AnalyzeRequest(BaseModel):
    """分析用户描述的请求"""
    description: str = Field(..., max_length=200, description="用户描述，最多200字")
    spread_type: str = Field(default="three-card", description="牌阵类型：当前仅支持 three-card（三牌阵）")
    locale: Optional[str] = Field(default=None, description="首选语言区域标识，例如 zh-CN、en-US")


class DimensionInfo(BaseModel):
    """维度信息"""
    id: int
    name: str
    category: str
    description: str
    aspect: Optional[str] = None
    aspect_type: Optional[int] = None


class AnalyzeResponse(BaseModel):
    """分析用户描述的响应"""
    recommended_dimensions: List[DimensionInfo]
    user_description: str
    metadata: Dict[str, Any] = Field(default_factory=dict, description="额外的元信息，例如 locale")


class CardInfo(BaseModel):
    """客户端传递的完整卡牌信息"""
    id: Optional[int] = Field(None, description="数据库ID，可选")
    name: str = Field(..., min_length=1, max_length=50, description="卡牌名称")
    arcana: str = Field(..., pattern="^(Major|Minor)$", description="大牌/小牌")
    suit: Optional[str] = Field(None, description="花色（小牌）")
    number: int = Field(..., ge=0, le=78, description="牌序号")
    direction: str = Field("正位", pattern="^(正位|逆位)$", description="牌位方向")
    position: int = Field(..., ge=1, le=10, description="在牌阵中的位置")
    image_url: Optional[str] = Field(None, description="图片URL")
    deck: Optional[str] = Field("default", description="牌组类型")
    summary: Optional[str] = Field(None, description="卡牌基础解读摘要（可选）")
    detail: Optional[str] = Field(None, description="卡牌基础解读详情（可选）")

    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "愚者",
                "arcana": "Major",
                "number": 0,
                "direction": "正位",
                "position": 1,
                "deck": "default"
            }
        }


class GenerateRequest(BaseModel):
    """生成解读的请求"""
    cards: List[CardInfo] = Field(..., min_items=1, max_items=10, description="抽到的卡牌信息列表")
    dimensions: List[DimensionInfo] = Field(..., min_items=1, max_items=3, description="用户选择的维度列表")
    description: str = Field(..., max_length=200, description="用户原始描述")
    spread_type: str = Field(default="three-card", description="牌阵类型（当前仅支持 three-card）")
    locale: Optional[str] = Field(default=None, description="首选语言区域标识，例如 zh-CN、en-US")


class DimensionAspectInfo(BaseModel):
    """维度方面信息"""
    dimension_name: str
    interpretation: str


class CardInterpretationInfo(BaseModel):
    """单张卡牌解读信息"""
    card_id: int
    card_name: str
    direction: str
    position: int
    basic_summary: str
    ai_interpretation: str
    dimension_aspect: DimensionAspectInfo


class GenerateResponse(BaseModel):
    """生成解读的响应"""
    dimensions: List[DimensionInfo]
    user_description: str
    spread_type: str
    card_interpretations: List[CardInterpretationInfo]
    overall_summary: str
    insights: List[str] = Field(default=[], description="关键洞察点")
    generated_at: str
    metadata: Dict[str, Any] = Field(default_factory=dict, description="额外的元信息，例如 locale")


class BasicInterpretationRequest(BaseModel):
    """基础解读请求"""
    card_id: int
    direction: str = Field(default="正位", description="牌位方向")


class BasicInterpretationResponse(BaseModel):
    """基础解读响应"""
    card_id: int
    card_name: str
    arcana: str
    direction: str
    summary: str
    detail: Optional[str] = None
