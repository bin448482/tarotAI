"""
Card-related Pydantic schemas.
"""
from typing import Optional
from pydantic import BaseModel


class CardStyleInfo(BaseModel):
    """卡牌风格信息"""
    id: int
    name: str
    image_base_url: str


class CardInfo(BaseModel):
    """卡牌基础信息"""
    id: int
    name: str
    arcana: str
    suit: Optional[str] = None
    number: int
    image_url: str
    style_id: Optional[int] = None
    deck: str
    style: Optional[CardStyleInfo] = None


class CardListResponse(BaseModel):
    """卡牌列表响应"""
    cards: list[CardInfo]
    total: int


class CardDetailResponse(BaseModel):
    """卡牌详情响应"""
    card: CardInfo
    interpretations: list[dict] = []  # 可选：包含解读信息