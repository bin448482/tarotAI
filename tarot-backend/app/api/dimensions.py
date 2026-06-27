"""
Dimensions API endpoints placeholder.
"""
from fastapi import APIRouter, HTTPException, status, Query
from typing import Optional

from ..schemas.reading import DimensionInfo

router = APIRouter(prefix="/dimensions", tags=["Dimensions"])

_DIMENSION_UNAVAILABLE_MESSAGE = "Dimension definitions are generated dynamically through /readings/analyze."
_SUPPORTED_CATEGORIES = [
    "时间",
    "情感",
    "事业",
    "决策",
    "健康",
    "财富",
    "人际关系",
    "学业",
    "运势",
    "灵性",
    "类比",
    "精神",
]


@router.get("/", response_model=list[DimensionInfo])
async def get_dimensions(
    category: Optional[str] = Query(None, description="筛选类别"),
    aspect_type: Optional[int] = Query(None, description="筛选子项类型"),
    limit: int = Query(50, ge=1, le=100, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量"),
):
    """
    已弃用：维度数据通过实时分析生成，此接口返回空列表以保持兼容。
    """
    return []


@router.get("/{dimension_id}", response_model=DimensionInfo)
async def get_dimension_detail(dimension_id: int):
    """
    单独的维度定义已移除，统一通过实时分析生成。
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail=_DIMENSION_UNAVAILABLE_MESSAGE
    )


@router.get("/categories/list")
async def get_dimension_categories():
    """
    返回支持的分类列表（用于前端展示或兜底文案）。
    """
    return {
        "categories": _SUPPORTED_CATEGORIES,
        "total": len(_SUPPORTED_CATEGORIES),
        "message": _DIMENSION_UNAVAILABLE_MESSAGE,
    }
