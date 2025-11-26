"""
Reading service for tarot card interpretation business logic.
"""
import hashlib
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from ..models import ReadingAnalyzeLog
from ..utils.locale import is_english_locale
from ..utils.logger import api_logger  # 添加日志导入
from .llm_service import get_llm_service


CATEGORY_DEFINITIONS = [
    ("时间", "Time", {"时间", "time", "timing", "timeline", "temporal"}),
    ("情感", "Emotion", {"情感", "emotion", "emotions", "love", "romance", "emotional"}),
    ("事业", "Career", {"事业", "career", "work", "business", "profession"}),
    ("决策", "Decision", {"决策", "decision", "decisions", "choice", "choices", "action"}),
    ("健康", "Health", {"健康", "health", "wellness"}),
    ("财富", "Wealth", {"财富", "wealth", "finance", "financial", "money", "resources"}),
    ("人际关系", "Interpersonal Relationships", {"人际关系", "relationships", "relationship", "social", "communication", "cooperation"}),
    ("学业", "Study", {"学业", "study", "learning", "education", "academics"}),
    ("运势", "Fortune", {"运势", "fortune", "luck", "trend", "fate"}),
    ("灵性", "Spirituality", {"灵性", "spirituality", "spiritual", "faith"}),
    ("类比", "Analogy", {"类比", "analogy", "symbolism", "metaphor"}),
    ("精神", "Spirit", {"精神", "spirit", "willpower", "drive", "mindset"}),
]

CANONICAL_CATEGORY_BY_ALIAS: Dict[str, str] = {}
CATEGORY_EN_BY_CANONICAL: Dict[str, str] = {}
for canonical, english, aliases in CATEGORY_DEFINITIONS:
    CATEGORY_EN_BY_CANONICAL[canonical] = english
    for alias in aliases | {canonical, english}:
        CANONICAL_CATEGORY_BY_ALIAS[alias.lower()] = canonical


class ReadingService:
    """解读服务 - 处理塔罗牌解读的业务逻辑"""

    def __init__(self):
        self.llm_service = get_llm_service()

    @staticmethod
    def _generate_dimension_id(name: str, locale: str) -> int:
        """Generate a stable dimension id based on name and locale."""
        digest = hashlib.md5(f"{locale}|{name}".encode("utf-8")).hexdigest()
        return int(digest[:8], 16)

    @staticmethod
    def _split_dimension_name(raw_name: str) -> tuple[str, Optional[str]]:
        """Split dimension name into category and aspect."""
        if not raw_name:
            return "", None
        for separator in ("-", "—", "–", ":", "："):
            if separator in raw_name:
                left, right = raw_name.split(separator, 1)
                return left.strip(), right.strip() or None
        return raw_name.strip(), None

    def _resolve_canonical_category(self, label: Optional[str]) -> str:
        """Resolve any label to canonical Chinese category."""
        if not label:
            return "运势"
        normalized = label.strip().lower()
        return CANONICAL_CATEGORY_BY_ALIAS.get(normalized, "运势")

    def _localized_category(self, canonical: str, locale: str) -> str:
        """Return localized category label based on locale."""
        if is_english_locale(locale):
            return CATEGORY_EN_BY_CANONICAL.get(canonical, "Fortune")
        return canonical

    def _build_dimension_entry(
        self,
        base_name: str,
        description: str,
        order: int,
        locale: str
    ) -> Dict[str, Any]:
        """Create a dimension dictionary without database dependency."""
        category_label, aspect = self._split_dimension_name(base_name)
        canonical = self._resolve_canonical_category(category_label)
        localized_category = self._localized_category(canonical, locale)

        display_name = localized_category
        if aspect:
            display_name = f"{localized_category}-{aspect}"

        return {
            "id": self._generate_dimension_id(display_name, locale),
            "name": display_name,
            "category": localized_category,
            "description": description,
            "aspect": aspect,
            "aspect_type": order,
        }

    def resolve_primary_category(self, dimensions: List[Dict[str, Any]], locale: str) -> str:
        """Determine the primary canonical category for logging."""
        for dimension in dimensions:
            category_label = dimension.get("category") or ""
            canonical = self._resolve_canonical_category(category_label)
            if canonical:
                return canonical
        return "运势"

    def _save_analyze_log(
        self,
        db: Session,
        questions: str,
        locale: str,
        dimensions: List[Dict[str, Any]]
    ) -> None:
        """Persist analyze request information for analytics."""
        if db is None:
            return

        try:
            canonical_category = self.resolve_primary_category(dimensions, locale)
            log_entry = ReadingAnalyzeLog(
                questions=questions,
                category=canonical_category,
                locate=locale,
            )
            db.add(log_entry)
            db.commit()
        except Exception as exc:
            db.rollback()
            api_logger.log_error(
                "save_analyze_log",
                exc,
                {
                    "locate": locale,
                    "questions_length": len(questions or ""),
                    "category": canonical_category if 'canonical_category' in locals() else None,
                },
            )

    async def analyze_user_description(
        self,
        description: str,
        spread_type: str,
        locale: str,
        db: Session
    ) -> List[Dict[str, Any]]:
        """
        第一步：分析用户描述，返回推荐的维度信息。

        Args:
            description: 用户描述（200字以内）
            spread_type: 牌阵类型（当前仅支持 three-card）
            locale: 客户端期望的语言
            db: 数据库会话

        Returns:
            推荐的维度信息列表
        """
        if spread_type != "three-card":
            raise ValueError(f"Unsupported spread type: {spread_type}")

        limit = 3

        try:
            # 调用 LLM 分析，获取推荐的维度名称和统一描述
            recommended_names, unified_description = await self.llm_service.analyze_user_description(
                description=description,
                spread_type=spread_type,
                locale=locale
            )

            dimensions_result = await self._process_three_card_dimensions(
                recommended_names=recommended_names,
                unified_description=unified_description,
                limit=limit,
                locale=locale
            )

        except Exception as e:
            api_logger.log_error("analyze_user_description", e, {"description": description[:100]})
            default_names, default_description = self._get_default_three_card_dimensions_with_description(locale)
            fallback_dimensions = await self._process_three_card_dimensions(
                recommended_names=default_names,
                unified_description=default_description,
                limit=limit,
                locale=locale
            )

            self._save_analyze_log(db, description, locale, fallback_dimensions)
            return fallback_dimensions

        self._save_analyze_log(db, description, locale, dimensions_result)
        return dimensions_result

    async def _process_three_card_dimensions(
        self,
        recommended_names: List[str],
        unified_description: str,
        limit: int,
        locale: str
    ) -> List[Dict[str, Any]]:
        """
        处理三牌阵维度：根据推荐名称生成维度信息，并在不足时补充默认值。
        """
        dimensions: List[Dict[str, Any]] = []
        fallback_names, fallback_description = self._get_default_three_card_dimensions_with_description(locale)
        description_text = unified_description or fallback_description

        processed_names = [name for name in (recommended_names or []) if name]
        seen_names: set[str] = set()

        for index, name in enumerate(processed_names[:limit], start=1):
            entry = self._build_dimension_entry(name, description_text, index, locale)
            identity = entry["name"].lower()
            if identity in seen_names:
                continue
            seen_names.add(identity)
            dimensions.append(entry)

        for fallback_name in fallback_names:
            if len(dimensions) >= limit:
                break
            entry = self._build_dimension_entry(fallback_name, description_text, len(dimensions) + 1, locale)
            identity = entry["name"].lower()
            if identity in seen_names:
                continue
            seen_names.add(identity)
            dimensions.append(entry)

        return dimensions[:limit]

    def _get_default_three_card_dimensions_with_description(self, locale: str) -> tuple[List[str], str]:
        """根据语言返回默认的三牌阵维度及统一描述"""
        if is_english_locale(locale):
            return (
                ["General-Past", "General-Present", "General-Future"],
                "A holistic three-card spread that follows the situation from its origins to the likely outcome."
            )
        return (
            ["整体-过去", "整体-现在", "整体-将来"],
            "三牌阵综合分析，探索问题的时间发展脉络"
        )

    async def generate_interpretation(
        self,
        cards: List[Dict[str, Any]],
        dimensions: List[Dict[str, Any]],
        user_description: str,
        spread_type: str,
        locale: str
    ) -> Dict[str, Any]:
        """
        生成多维度解读（重构版本）。
        Args:
            cards: 卡牌信息列表（CardInfo格式）
            dimensions: 维度信息列表（DimensionInfo格式）
            user_description: 用户原始描述
            spread_type: 牌阵类型
        Returns:
            多维度解读结果字典
        """
        if spread_type != "three-card":
            raise ValueError(f"Unsupported spread type: {spread_type}")

        try:
            all_interpretation_result = await self._generate_complete_interpretation(
                cards=cards,
                dimensions=dimensions,
                user_description=user_description,
                spread_type=spread_type,
                locale=locale
            )

            return all_interpretation_result

        except Exception as e:
            api_logger.log_error(
                "generate_reading",
                e,
                {
                    "spread_type": spread_type,
                    "card_count": len(cards),
                    "dimension_count": len(dimensions),
                },
            )
            raise

    async def _generate_complete_interpretation(
        self,
        cards: List[Dict[str, Any]],
        dimensions: List[Dict[str, Any]],
        user_description: str,
        spread_type: str,
        locale: str
    ) -> Dict[str, Any]:
        """一次性生成所有维度和卡牌的完整解读"""
        try:
            normalized_dimensions = self._normalize_dimensions_for_output(dimensions, locale)
            llm_payload = await self.llm_service.generate_three_card_interpretation(
                cards=cards,
                dimensions=normalized_dimensions,
                user_description=user_description,
                spread_type=spread_type,
                locale=locale
            )

            return self._build_interpretation_response(
                llm_payload=llm_payload,
                dimensions=normalized_dimensions,
                user_description=user_description,
                spread_type=spread_type,
                locale=locale,
            )

        except Exception as e:
            api_logger.log_error(
                "generate_complete_reading",
                e,
                {"card_count": len(cards), "dimension_count": len(dimensions)}
            )
            raise

    def _normalize_dimensions_for_output(
        self,
        dimensions: List[Dict[str, Any]],
        locale: str
    ) -> List[Dict[str, Any]]:
        """标准化维度结构，补全缺失字段。"""
        normalized: List[Dict[str, Any]] = []
        for index, dim in enumerate(dimensions, start=1):
            if hasattr(dim, "model_dump"):
                dimension_dict = dim.model_dump()
            elif isinstance(dim, dict):
                dimension_dict = {**dim}
            else:
                dimension_dict = dict(dim)

            if not dimension_dict.get("aspect_type"):
                dimension_dict["aspect_type"] = index
            if "description" not in dimension_dict or not dimension_dict["description"]:
                dimension_dict["description"] = ""
            if "aspect" not in dimension_dict:
                dimension_dict["aspect"] = None
            if "category" not in dimension_dict or not dimension_dict["category"]:
                canonical = self._resolve_canonical_category(dimension_dict.get("name"))
                dimension_dict["category"] = self._localized_category(canonical, locale)

            normalized.append(dimension_dict)

        return normalized

    def _build_interpretation_response(
        self,
        llm_payload: Dict[str, Any],
        dimensions: List[Dict[str, Any]],
        user_description: str,
        spread_type: str,
        locale: str
    ) -> Dict[str, Any]:
        """构建最终返回的解读结果。"""
        card_interpretations = llm_payload.get("card_interpretations", [])
        if not isinstance(card_interpretations, list):
            card_interpretations = []

        insights = llm_payload.get("insights", [])
        if isinstance(insights, str):
            insights = [insights]
        elif not isinstance(insights, list):
            insights = []

        return {
            "dimensions": dimensions,
            "user_description": user_description,
            "spread_type": spread_type,
            "card_interpretations": card_interpretations,
            "overall_summary": llm_payload.get("overall_summary", ""),
            "insights": insights,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "metadata": {"locale": locale}
        }


# 全局读书服务实例
_reading_service = None


def get_reading_service() -> ReadingService:
    """获取解读服务实例（单例模式）"""
    global _reading_service
    if _reading_service is None:
        _reading_service = ReadingService()
    return _reading_service
