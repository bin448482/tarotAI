"""
Spreads API endpoints.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from ..database import get_db

router = APIRouter(prefix="/spreads", tags=["Spreads"])


class SpreadInfo(BaseModel):
    """牌阵信息"""
    id: int
    name: str
    description: str
    card_count: int


# @router.get("/", response_model=List[SpreadInfo])
# async def get_spreads(db: Session = Depends(get_db)):
#     """
#     获取所有牌阵信息。

#     Args:
#         db: 数据库会话

#     Returns:
#         List[SpreadInfo]: 牌阵列表
#     """
#     try:
#         spreads = db.query(Spread).all()

#         spread_infos = []
#         for spread in spreads:
#             spread_info = SpreadInfo(
#                 id=spread.id,
#                 name=spread.name,
#                 description=spread.description,
#                 card_count=spread.card_count
#             )
#             spread_infos.append(spread_info)

#         return spread_infos

#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Failed to fetch spreads: {str(e)}"
#         )


# @router.get("/{spread_id}", response_model=SpreadInfo)
# async def get_spread_detail(
#     spread_id: int,
#     db: Session = Depends(get_db)
# ):
#     """
#     获取单个牌阵的详细信息。

#     Args:
#         spread_id: 牌阵ID
#         db: 数据库会话

#     Returns:
#         SpreadInfo: 牌阵详情
#     """
#     try:
#         spread = db.query(Spread).filter(Spread.id == spread_id).first()
#         if not spread:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail=f"Spread with id {spread_id} not found"
#             )

#         return SpreadInfo(
#             id=spread.id,
#             name=spread.name,
#             description=spread.description,
#             card_count=spread.card_count
#         )

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Failed to fetch spread detail: {str(e)}"
#         )
