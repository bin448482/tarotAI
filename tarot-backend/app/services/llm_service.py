"""
LLM integration service for tarot reading generation.
"""
import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional

from ..utils.locale import is_english_locale
from ..utils.logger import api_logger  # 添加日志导入
try:
    from zhipuai import ZhipuAI
except ImportError:
    ZhipuAI = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

from ..config import settings


class LLMService:
    """LLM服务，支持智谱AI和OpenAI"""

    def __init__(self):
        self.config = settings
        self.clients: Dict[str, Any] = {}
        self.default_provider = self.config.API_PROVIDER or "zhipu"
        self._initialize_clients()

    def _initialize_clients(self):
        """初始化可用的 LLM 客户端"""
        if ZhipuAI and self.config.ZHIPUAI_API_KEY:
            self.clients['zhipu'] = ZhipuAI(api_key=self.config.ZHIPUAI_API_KEY)

        if OpenAI and self.config.OPENAI_API_KEY:
            self.clients['openai'] = OpenAI(
                api_key=self.config.OPENAI_API_KEY,
                base_url=self.config.OPENAI_BASE_URL
            )

        if not self.clients:
            raise ValueError("No LLM providers are configured. Please set API keys for at least one provider.")

        if self.default_provider not in self.clients:
            # 回退到第一个可用的提供方
            self.default_provider = next(iter(self.clients.keys()))

    async def call_ai_api(
        self,
        prompt: str,
        locale: Optional[str] = None,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        force_json: bool = False
    ) -> Optional[str]:
        """调用AI API生成内容（异步版本）"""
        resolved_provider, resolved_model = self._resolve_provider_and_model(locale, provider, model)
        try:
            # 在线程池中执行同步API调用
            return await asyncio.to_thread(
                self._call_ai_api_sync,
                prompt,
                resolved_provider,
                resolved_model,
                force_json
            )
        except Exception as e:
            api_logger.log_error(
                "llm_api_call",
                e,
                {"prompt_length": len(prompt), "provider": resolved_provider, "model": resolved_model}
            )
            return None

    def _call_ai_api_sync(self, prompt: str, provider: str, model: str, force_json: bool) -> Optional[str]:
        """同步版本的AI API调用"""
        client = self.clients.get(provider)
        if not client:
            raise ValueError(f"LLM provider '{provider}' is not initialized")

        try:
            if provider == 'zhipu':
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=self.config.TEMPERATURE,
                    max_tokens=self.config.MAX_TOKENS
                )
            elif provider == 'openai':
                create_kwargs = {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": self.config.TEMPERATURE,
                    "max_tokens": self.config.MAX_TOKENS
                }
                if force_json:
                    create_kwargs["response_format"] = {"type": "json_object"}
                response = client.chat.completions.create(
                    **create_kwargs
                )
            else:
                raise ValueError(f"Unsupported provider: {provider}")

            return response.choices[0].message.content.strip()
        except Exception as e:
            api_logger.log_error(
                f"{provider}_api_call",
                e,
                {"prompt_length": len(prompt), "model": model}
            )
            return None

    def _resolve_provider_and_model(
        self,
        locale: Optional[str],
        provider: Optional[str],
        model: Optional[str]
    ) -> tuple[str, str]:
        """根据 locale 和配置决定使用的模型和服务商"""
        resolved_provider = provider
        if not resolved_provider:
            if is_english_locale(locale) and 'openai' in self.clients:
                resolved_provider = 'openai'
            else:
                resolved_provider = self.default_provider if self.default_provider in self.clients else next(iter(self.clients))

        if resolved_provider == 'openai':
            resolved_model = model or self.config.OPENAI_MODEL_NAME or self.config.MODEL_NAME
        elif resolved_provider == 'zhipu':
            resolved_model = model or self.config.ZHIPU_MODEL_NAME or self.config.MODEL_NAME
        else:
            resolved_model = model or self.config.MODEL_NAME

        return resolved_provider, resolved_model

    @staticmethod
    def _clean_dimension_name(line: str) -> str:
        """Normalize a single line returned by the model into a dimension name."""
        cleaned = line.strip()
        leading_markers = {'-', '*', '•', '●', '·'}

        while cleaned and cleaned[0] in leading_markers:
            cleaned = cleaned[1:].lstrip()

        index = 0
        while index < len(cleaned) and cleaned[index].isdigit():
            index += 1

        while index < len(cleaned) and cleaned[index] in {'.', ')', ' '}:
            index += 1

        return cleaned[index:].strip()

    async def analyze_user_description(
        self,
        description: str,
        spread_type: str = "three-card",
        locale: str = "zh-CN"
    ) -> tuple[List[str], str]:
        """
        分析用户描述，返回推荐的维度名称列表和统一的描述。
        """
        if spread_type != "three-card":
            raise ValueError(f"Unsupported spread type: {spread_type}")

        try:
            return await self._analyze_for_three_card(description, locale)
        except Exception as e:
            api_logger.log_error("analyze_user_description", e, {"description_length": len(description)})
            raise

    async def _analyze_for_three_card(self, description: str, locale: str) -> tuple[List[str], str]:
        """
        三牌阵专用分析：基于因果率和发展趋势动态确定三个维度
        """
        is_english = is_english_locale(locale)
        if is_english:
            analysis_prompt = f"""You are a seasoned tarot reader. Based on the client's question, determine the most aligned three-card dimensions and produce a unified summary (30-50 words).

Client Question:
{description}

Instructions:
1. Select one overarching category that best matches the client's concern.
2. Generate three specific aspects (category-aspect) that describe the evolution of the issue from cause to outcome.
3. Ensure all three aspects share the exact same category prefix (e.g., Career-Root Cause, Career-Current Status, Career-Next Step).
4. Provide a concise summary (30-50 words) capturing the overall theme.

Available categories:
- Time : Explores how the past, present, and future influence your current situation.
- Emotion : Reflects your emotional landscape, relationships, and inner feelings.
- Career : Relates to your work path, ambitions, and sense of achievement.
- Decision : Illuminates your choices, judgments, and direction of action.
- Health : Concerns your physical and mental balance, and daily life rhythm.
- Wealth : Focuses on finances, material stability, and resource flow.
- Interpersonal Relationships : Highlights social interactions, communication, and collaboration.
- Study : Represents learning progress, academic focus, and personal growth in knowledge or skills.
- Fortune : Reveals overall trends, opportunities, and the flow of luck around you.
- Spirituality : Connects to awareness, beliefs, and personal inner growth.
- Analogy : Interprets symbolic meanings, metaphors, and subconscious messages.
- Spirit : Expresses willpower, purpose, and inner drive that moves you forward.

Output format:
DIMENSIONS:
Category-Aspect1
Category-Aspect2
Category-Aspect3

DESCRIPTION:
[Unified summary]

Respond in English and keep the category names consistent."""
        else:
            analysis_prompt = f"""你是一位资深的塔罗牌解读师。请结合用户的问题，为三牌阵分析生成最合适的三个维度，并给出统一的问题概要（30-50字）。

用户描述：{description}

分析要求：
1. 找出最契合问题的一个主要类别。
2. 生成三个细化的分析角度（类别-aspect），体现问题从起因到结果的发展。
3. 三个维度必须具有相同的类别前缀。
4. 输出一个概括性的概要描述（30-50字），体现整体主题。

可选类别：
- 时间：关注过去、现在与未来
- 情感：关注关系、情绪与内在状态
- 事业：关注工作、职涯与成就
- 决策：关注选择、判断与行动方向
- 健康：关注身心状态与生活节律
- 财富：关注资金、资源与物质基础
- 人际关系：关注社交、沟通与合作
- 学业：关注学习、考试与技能成长
- 运势：关注整体趋势、外部机缘与运气流动
- 灵性：关注觉察、信念与内在成长
- 类比：关注象征意义、隐喻与潜意识联结
- 精神：关注意志力、目标感与内在驱动力

输出格式：
DIMENSIONS:
类别-aspect1
类别-aspect2
类别-aspect3

DESCRIPTION:
[统一概要描述]

请使用简体中文输出，确保三个维度类别名称完全一致。"""

        try:
            result = await self.call_ai_api(analysis_prompt, locale=locale)
            if result:
                dimensions, summary = self._parse_combined_result(result)
                if dimensions:
                    return dimensions[:3], summary
            raise ValueError("LLM returned empty analysis result")
        except Exception as e:
            api_logger.log_error("analyze_three_card_question", e, {"description_length": len(description)})
            raise

    def _parse_combined_result(self, result: str) -> tuple[List[str], str]:
        """解析合并的LLM结果，提取维度和描述"""
        try:
            lines = result.strip().split('\n')
            dimensions = []
            description = ""

            # 查找DIMENSIONS和DESCRIPTION部分
            in_dimensions = False
            in_description = False

            for line in lines:
                line = line.strip()
                if line.upper().startswith('DIMENSIONS:'):
                    in_dimensions = True
                    in_description = False
                    continue
                elif line.upper().startswith('DESCRIPTION:'):
                    in_dimensions = False
                    in_description = True
                    continue
                elif line and in_dimensions:
                    # 处理维度行
                    cleaned = self._clean_dimension_name(line)
                    if cleaned and cleaned not in dimensions:
                        dimensions.append(cleaned)
                        if len(dimensions) >= 3:
                            in_dimensions = False
                elif line and in_description:
                    # 处理描述行
                    if description:
                        description += " " + line
                    else:
                        description = line

            return dimensions, description.strip()
        except Exception as e:
            api_logger.log_error("parse_combined_result", e, {"result_length": len(result)})
            return [], ""

    async def generate_three_card_interpretation(
        self,
        cards: List[Dict[str, Any]],
        dimensions: List[Dict[str, Any]],
        user_description: str,
        spread_type: str,
        locale: str
    ) -> Dict[str, Any]:
        """构建三牌阵完整解读并解析结果。"""
        if spread_type != "three-card":
            raise ValueError(f"Unsupported spread type: {spread_type}")

        cards_payload = self._prepare_cards_for_prompt(cards, locale)
        dimensions_payload = self._prepare_dimensions_for_prompt(dimensions)
        prompt = self._build_three_card_prompt(
            cards_info=cards_payload,
            dimensions=dimensions_payload,
            user_description=user_description,
            spread_type=spread_type,
            locale=locale
        )

        raw_result = await self.call_ai_api(
            prompt=prompt,
            locale=locale,
            force_json=True
        )
        if not raw_result:
            raise ValueError("LLM调用失败，未返回解读内容")

        return self._parse_three_card_interpretation(raw_result)

    def _prepare_cards_for_prompt(self, cards: List[Dict[str, Any]], locale: str) -> List[Dict[str, Any]]:
        """规范化卡牌数据以用于提示词构建。"""
        prepared: List[Dict[str, Any]] = []
        for card in cards:
            if hasattr(card, "model_dump"):
                card_data = card.model_dump()
            elif isinstance(card, dict):
                card_data = {**card}
            else:
                card_data = dict(card)

            card_id = card_data.get("card_id") or card_data.get("id")
            name = card_data.get("name") or ""
            direction = card_data.get("direction") or ""
            position = card_data.get("position") or 0
            summary = card_data.get("summary") or card_data.get("basic_summary") or ""
            detail = card_data.get("detail") or ""

            prepared.append(
                {
                    "card_id": card_id,
                    "name": name,
                    "direction": direction,
                    "direction_localized": self._direction_to_locale(direction, locale),
                    "position": position,
                    "summary": summary,
                    "detail": detail,
                }
            )
        return prepared

    def _prepare_dimensions_for_prompt(self, dimensions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """规范化维度数据以用于提示词构建。"""
        prepared: List[Dict[str, Any]] = []
        for index, dim in enumerate(dimensions, start=1):
            if hasattr(dim, "model_dump"):
                dim_dict = dim.model_dump()
            elif isinstance(dim, dict):
                dim_dict = {**dim}
            else:
                dim_dict = dict(dim)

            if not dim_dict.get("aspect_type"):
                dim_dict["aspect_type"] = index
            prepared.append(dim_dict)
        return prepared

    def _build_three_card_prompt(
        self,
        cards_info: List[Dict[str, Any]],
        dimensions: List[Dict[str, Any]],
        user_description: str,
        spread_type: str,
        locale: str
    ) -> str:
        """构建一次性完整解读的提示词。"""
        is_english = is_english_locale(locale)
        sorted_dimensions = sorted(dimensions, key=lambda item: item.get("aspect_type", 0) or 0)

        card_ids: List[str] = []
        example_card_id_value: Optional[str] = None
        cards_lines: List[str] = []
        for card in cards_info:
            card_id_value = card.get("card_id") or card.get("id")
            if card_id_value is not None:
                card_ids.append(str(card_id_value))
                if example_card_id_value is None:
                    example_card_id_value = str(card_id_value)
            card_id = card_id_value
            position_label = self._format_position_label(card.get("position") or 0, locale)
            direction_label = card.get("direction_localized") or card.get("direction") or ""
            summary = card.get("summary") or ""
            identifier = f"[Card ID {card_id}]" if is_english and card_id is not None else ""
            identifier = identifier or (f"[卡牌ID {card_id}]" if card_id is not None else "")
            if is_english:
                line = f"{position_label}: {identifier} {card.get('name', '')} ({direction_label}) - Traditional summary (Chinese): {summary}"
            else:
                line = f"{position_label}: {identifier} {card.get('name', '')}({direction_label}) - {summary}"
            cards_lines.append(line.strip())
        cards_section = "\n".join(cards_lines) if cards_lines else ""

        dimensions_lines: List[str] = []
        for idx, dim in enumerate(sorted_dimensions):
            order = dim.get("aspect_type", idx + 1)
            description = dim.get("description") or ""
            if is_english:
                line = f"Dimension {order}: {dim.get('name', '')} - {description}"
            else:
                line = f"维度{order}: {dim.get('name', '')} - {description}"
            dimensions_lines.append(line.strip())
        dimensions_section = "\n".join(dimensions_lines)

        mapping_lines: List[str] = []
        for idx, dim in enumerate(sorted_dimensions):
            order = dim.get("aspect_type", idx + 1)
            position_label = self._format_position_label(idx + 1, locale)
            if is_english:
                line = f"{position_label} corresponds to Dimension {order} ({dim.get('name', '')})"
            else:
                line = f"{position_label}的卡牌对应维度{order}({dim.get('name', '')})"
            mapping_lines.append(line)
        position_mapping = "\n".join(mapping_lines)

        card_ids_en = ", ".join(card_ids) if card_ids else "the provided card IDs"
        card_ids_zh = "、".join(card_ids) if card_ids else "输入提供的编号"
        try:
            example_card_id = int(example_card_id_value) if example_card_id_value is not None else 1
        except ValueError:
            example_card_id = 1

        if is_english:
            return f"""You are a professional tarot reader. Craft a complete interpretation for the following three-card spread.

## Client Question
{user_description}

## Drawn Cards
{cards_section}

## Interpretation Dimensions
{dimensions_section}

## Card-to-Dimension Mapping
{position_mapping}

## Output Requirements
Return a JSON document that matches this structure:

```json
{{
    "card_interpretations": [
        {{
            "card_id": {example_card_id},
            "card_name": "Card Name (Upright/Reversed)",
            "direction": "Upright or Reversed",
            "position": 1,
            "basic_summary": "Short traditional meaning translated into English",
            "ai_interpretation": "150-300 word detailed guidance in English for the assigned dimension",
            "dimension_aspect": {{
                "dimension_name": "Dimension label",
                "interpretation": "150-300 word explanation in English describing how this card expresses the dimension"
            }}
        }}
    ],
    "overall_summary": "200-300 word overall synthesis in English",
    "insights": ["Actionable insight 1", "Actionable insight 2", "Actionable insight 3"]
}}
```

Guidelines:
1. Each card must map to exactly one dimension.
2. Keep the narrative coherent across the three cards and their dimensions.
3. Insights must be specific and actionable, not vague platitudes.
4. Use the exact card_id values from the drawn cards ({card_ids_en}); do not renumber or invent new IDs.
Always respond in English."""

        return f"""你是一位专业的塔罗牌解读师，请为以下三牌阵抽牌结果生成完整的解读。

## 用户问题
{user_description}

## 抽到的卡牌
{cards_section}

## 解读维度
{dimensions_section}

## 位置-维度对应关系
{position_mapping}

## 输出要求
请按照以下 JSON 结构返回结果：

```json
{{
    "card_interpretations": [
        {{
            "card_id": {example_card_id},
            "card_name": "卡牌名称(正位/逆位)",
            "direction": "正位或逆位",
            "position": 1,
            "basic_summary": "基础牌意概述（简体中文）",
            "ai_interpretation": "150-300字的详细解读（简体中文），说明该卡牌在对应维度下的含义与指导",
            "dimension_aspect": {{
                "dimension_name": "维度名称",
                "interpretation": "150-300字的详细说明（简体中文），描述该卡牌如何体现该维度"
            }}
        }}
    ],
    "overall_summary": "200-300字的整体总结（简体中文）",
    "insights": ["关键洞察1", "关键洞察2", "关键洞察3"]
}}
```

注意事项：
1. 每张卡牌只能对应一个维度。
2. 解读要体现维度之间的关联与发展脉络。
3. 洞察要具体可执行，避免空泛表达。
4. card_id 必须严格使用抽牌列表中的编号（{card_ids_zh}），不要改成 1、2、3。
请使用简体中文输出。"""

    def _direction_to_locale(self, direction: str, locale: str) -> str:
        """根据语言返回牌位方向描述。"""
        if not direction:
            return ""
        if is_english_locale(locale):
            normalized = direction.strip().lower()
            if normalized in {"正位", "upright"}:
                return "Upright"
            if normalized in {"逆位", "reversed"}:
                return "Reversed"
        return direction

    def _format_position_label(self, position: int, locale: str) -> str:
        """构建位置描述。"""
        if is_english_locale(locale):
            return f"Position {position}"
        return f"位置{position}"

    def _parse_three_card_interpretation(self, raw_result: str) -> Dict[str, Any]:
        """解析LLM返回的完整解读结果。"""
        try:
            json_match = re.search(r'```json\s*(.*?)\s*```', raw_result, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = raw_result.strip()

            payload = self._parse_json_payload(json_str, raw_result)

            card_interpretations = payload.get("card_interpretations", [])
            if not isinstance(card_interpretations, list):
                card_interpretations = []

            insights = payload.get("insights", [])
            if isinstance(insights, str):
                insights = [insights]
            elif not isinstance(insights, list):
                insights = []

            return {
                "card_interpretations": card_interpretations,
                "overall_summary": payload.get("overall_summary", ""),
                "insights": insights,
            }
        except Exception as exc:
            api_logger.log_error(
                "parse_three_card_interpretation",
                exc,
                {
                    "result_length": len(raw_result),
                    "result_preview": raw_result[:600],
                }
            )
            raise ValueError(f"解析LLM返回结果失败: {exc}") from exc

    def _parse_json_payload(self, json_str: str, raw_result: str) -> Dict[str, Any]:
        """尝试以多种方式从LLM结果中解析JSON。"""
        candidates: List[str] = []

        if json_str:
            candidates.append(json_str.strip())

        if json_str:
            first_brace = json_str.find('{')
            last_brace = json_str.rfind('}')
            if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                candidates.append(json_str[first_brace:last_brace + 1].strip())

        if raw_result and raw_result not in candidates:
            trimmed = raw_result.strip()
            if trimmed:
                candidates.append(trimmed)
            first_brace = raw_result.find('{')
            last_brace = raw_result.rfind('}')
            if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                brace_candidate = raw_result[first_brace:last_brace + 1].strip()
                if brace_candidate and brace_candidate not in candidates:
                    candidates.append(brace_candidate)

        decoder = json.JSONDecoder()
        errors: List[str] = []
        api_debug_logger = logging.getLogger("api")

        for candidate in candidates:
            if not candidate:
                continue
            candidate_clean = candidate.lstrip('\ufeff').strip()
            if not candidate_clean:
                continue
            try:
                parsed, _ = decoder.raw_decode(candidate_clean)
                return parsed
            except json.JSONDecodeError as error:
                errors.append(str(error))
                api_debug_logger.debug(
                    "LLM JSON parsing attempt failed | error=%s | preview=%s",
                    str(error),
                    candidate_clean[:400]
                )
                continue

        raise ValueError(f"无法解析LLM返回的JSON内容: {'; '.join(errors[:2])}")


# 全局LLM服务实例
_llm_service = None


def get_llm_service() -> LLMService:
    """获取LLM服务实例（单例模式）"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
