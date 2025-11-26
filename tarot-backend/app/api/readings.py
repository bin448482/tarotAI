"""
Reading API endpoints for tarot card interpretation.
"""
import logging
from fastapi import APIRouter, HTTPException, status, Depends, Header
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..schemas.reading import (
    AnalyzeRequest, AnalyzeResponse,
    GenerateRequest, GenerateResponse,
    BasicInterpretationRequest, BasicInterpretationResponse,
    CardInfo, DimensionInfo
)
from ..services.reading_service import get_reading_service
from ..api.auth import get_current_user_id
from ..services.user_service import UserService
from ..models.user import User
from ..config import settings

router = APIRouter(prefix="/readings", tags=["Readings"])

logger = logging.getLogger(__name__)

_SUPPORTED_LOCALE_PREFIXES = {
    "en": "en",
    "zh": "zh-CN"
}


def _normalize_locale_value(raw: Optional[str]) -> Optional[str]:
    """Normalize locale strings from body or Accept-Language header."""
    if not raw:
        return None
    value = raw.strip()
    if not value:
        return None
    # Accept-Language header may contain multiple locales and weights.
    if ',' in value:
        value = value.split(',', 1)[0]
    if ';' in value:
        value = value.split(';', 1)[0]
    value = value.replace('_', '-').strip()
    if not value:
        return None
    lower = value.lower()
    for prefix, mapped in _SUPPORTED_LOCALE_PREFIXES.items():
        if lower.startswith(prefix):
            return mapped
    return value


def _resolve_locale(request_locale: Optional[str], accept_language: Optional[str]) -> str:
    """Resolve the effective locale using request body and Accept-Language header."""
    for candidate in (request_locale, accept_language):
        normalized = _normalize_locale_value(candidate)
        if normalized:
            return normalized
    return settings.DEFAULT_LOCALE


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_user_description(
    request: AnalyzeRequest,
    accept_language: Optional[str] = Header(default=None, alias="Accept-Language"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    第一步：分析用户描述，返回推荐维度。

    支持的牌阵类型：
    - three-card: 三牌阵，基于因果率和发展趋势分析出3个维度

    Args:
        request: 包含用户描述和牌阵类型的请求
        db: 数据库会话
        user_id: 用户ID（必需认证）

    Returns:
        AnalyzeResponse: 推荐的维度列表

    Raises:
        402 Payment Required: 积分不足
        404 Not Found: 用户不存在
        500 Internal Server Error: LLM调用失败
    """
    locale = _resolve_locale(request.locale, accept_language)

    # 获取用户信息
    user = db.query(User).filter(User.installation_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 检查积分余额
    user_service = UserService()
    balance = user_service.get_user_balance(db, user.id)
    if not balance or balance.credits < 1:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="积分不足，请充值后再使用AI分析功能"
        )

    # 调试断点 - 在这里设置断点
    logger.debug(
        "Received analyze request: description_prefix=%s spread_type=%s user_id=%s credits=%d locale=%s",
        request.description[:50],
        request.spread_type,
        user_id,
        balance.credits,
        locale
    )

    try:
        reading_service = get_reading_service()

        # 验证牌阵类型
        if request.spread_type != "three-card":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无效的牌阵类型，当前仅支持 three-card"
            )

        # 分析用户描述 - 在这里也可以设置断点
        logger.debug("Starting LLM analysis for spread_type=%s", request.spread_type)
        recommended_dimensions = await reading_service.analyze_user_description(
            description=request.description,
            spread_type=request.spread_type,
            locale=locale,
            db=db
        )
        logger.debug(
            "LLM analysis completed with %d dimensions",
            len(recommended_dimensions) if recommended_dimensions else 0
        )

        if not recommended_dimensions:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to analyze user description"
            )

        # LLM调用成功后扣除积分
        try:
            user_service.update_user_balance(
                db=db,
                user_id=user.id,
                credit_change=-1,
                transaction_type="consume",
                reference_type="reading_analyze",
                description=f"AI分析用户描述: {request.description[:50]}..."
            )
            logger.info(
                "Successfully deducted 1 credit for user %s (remaining: %d)",
                user_id, balance.credits - 1
            )
        except Exception as e:
            logger.error("Failed to deduct credit for user %s: %s", user_id, str(e))
            # 积分扣除失败，但不影响返回结果（因为LLM调用已成功）
            # 可以考虑记录到异常日志中进行后续处理

        return AnalyzeResponse(
            recommended_dimensions=recommended_dimensions,
            user_description=request.description,
            metadata={"locale": locale}
        )

    except ValueError as e:
        logger.warning("Invalid analyze request: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to analyze user description")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.post("/generate", response_model=GenerateResponse)
async def generate_reading(
    request: GenerateRequest,
    accept_language: Optional[str] = Header(default=None, alias="Accept-Language"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """

    生成多维度解读内容。

    Args:
        request: 包含卡牌信息、维度信息和用户描述的请求
        db: 数据库会话
        user_id: 用户ID（必需认证）

    Returns:
        GenerateResponse: 详细的多维度解读结果

    Raises:
        402 Payment Required: 积分不足
        404 Not Found: 用户不存在
        400 Bad Request: 请求参数验证失败
        500 Internal Server Error: LLM调用失败
    """
    locale = _resolve_locale(request.locale, accept_language)

    # 获取用户信息
    user = db.query(User).filter(User.installation_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 检查积分余额
    user_service = UserService()
    balance = user_service.get_user_balance(db, user.id)
    if not balance or balance.credits < 1:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="积分不足，请充值后再使用AI解读功能"
        )

    logger.info(
        "Generating reading for spread_type=%s cards=%d dimensions=%d user_id=%s credits=%d locale=%s",
        request.spread_type, len(request.cards), len(request.dimensions), user_id, balance.credits, locale
    )

    try:
        reading_service = get_reading_service()

        # 验证请求数据
        if not request.cards or not request.dimensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="卡牌信息和维度信息都不能为空"
            )

        # 验证维度数量与牌阵类型的匹配
        if request.spread_type != "three-card":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无效的牌阵类型，当前仅支持 three-card"
            )

        if len(request.dimensions) != 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="三牌阵必须选择3个维度"
            )

        # 转换为服务层需要的格式
        cards_data = []
        for card in request.cards:
            cards_data.append({
                "id": card.id,
                "name": card.name,
                "arcana": card.arcana,
                "suit": card.suit,
                "number": card.number,
                "direction": card.direction,
                "position": card.position,
                "image_url": card.image_url,
                "deck": card.deck,
                "summary": card.summary,
                "detail": card.detail
            })

        dimensions_data = []
        for dimension in request.dimensions:
            dimensions_data.append({
                "id": dimension.id,
                "name": dimension.name,
                "category": dimension.category,
                "description": dimension.description,
                "aspect": dimension.aspect,
                "aspect_type": dimension.aspect_type
            })

        # 生成多维度解读
        interpretation_result = await reading_service.generate_interpretation(
            cards=cards_data,
            dimensions=dimensions_data,
            user_description=request.description,
            spread_type=request.spread_type,
            locale=locale
        )

        # LLM调用成功后扣除积分
        try:
            user_service.update_user_balance(
                db=db,
                user_id=user.id,
                credit_change=-1,
                transaction_type="consume",
                reference_type="reading_generate",
                description=f"AI生成解读: {request.spread_type} ({len(request.cards)}张卡牌)"
            )
            logger.info(
                "Successfully deducted 1 credit for user %s (remaining: %d)",
                user_id, balance.credits - 1
            )
        except Exception as e:
            logger.error("Failed to deduct credit for user %s: %s", user_id, str(e))
            # 积分扣除失败，但不影响返回结果（因为LLM调用已成功）
            # 可以考虑记录到异常日志中进行后续处理

        result_payload = {
            **interpretation_result,
            "metadata": {
                **interpretation_result.get("metadata", {}),
                "locale": locale
            }
        }

        return GenerateResponse(**result_payload)

    except ValueError as e:
        logger.warning("Reading generation failed due to validation error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception("Unexpected error during reading generation")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generation failed: {str(e)}"
        )


# @router.post("/basic", response_model=BasicInterpretationResponse)
# async def get_basic_interpretation(
#     request: BasicInterpretationRequest,
#     db: Session = Depends(get_db)
# ):
#     """
#     获取卡牌的基础解读（不使用LLM）。

#     Args:
#         request: 包含卡牌ID和方向的请求
#         db: 数据库会话

#     Returns:
#         BasicInterpretationResponse: 基础解读信息
#     """
#     try:
#         reading_service = get_reading_service()

#         result = reading_service.get_basic_interpretation(
#             card_id=request.card_id,
#             direction=request.direction,
#             db=db
#         )

#         if not result:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail=f"Interpretation not found for card {request.card_id} ({request.direction})"
#             )

#         return BasicInterpretationResponse(**result)

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Failed to get basic interpretation: {str(e)}"
#         )
