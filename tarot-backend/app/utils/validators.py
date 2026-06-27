"""
验证器 - 负责验证请求数据的一致性和有效性
"""
from typing import List
from ..schemas.reading import CardInfo, DimensionInfoV2


class ReadingValidator:
    """解读请求验证器"""

    @staticmethod
    def validate_cards_consistency(cards: List[CardInfo]) -> List[str]:
        """验证卡牌列表的一致性"""
        errors = []

        # 检查位置连续性
        positions = [card.position for card in cards]
        if sorted(positions) != list(range(1, len(cards) + 1)):
            errors.append("卡牌位置必须从1开始连续")

        # 检查卡牌重复
        card_ids = [card.id for card in cards if card.id]
        if len(card_ids) != len(set(card_ids)):
            errors.append("存在重复的卡牌")

        # 检查名称重复
        card_names = [card.name for card in cards]
        if len(card_names) != len(set(card_names)):
            errors.append("存在重复的卡牌名称")

        return errors

    @staticmethod
    def validate_dimensions_for_spread(
        dimensions: List[DimensionInfoV2],
        spread_type: str
    ) -> List[str]:
        """验证维度配置是否适合指定牌阵"""
        errors = []

        if spread_type != "three-card":
            errors.append("当前仅支持三牌阵解读")
            return errors

        if len(dimensions) != 3:
            errors.append("三牌阵需要且仅需要3个维度")

        # 检查aspect_type是否为1,2,3
        aspect_types = [d.aspect_type for d in dimensions if d.aspect_type]
        if len(aspect_types) == 3 and sorted(aspect_types) != [1, 2, 3]:
            errors.append("三牌阵的维度aspect_type应为1,2,3")

        return errors

    @staticmethod
    def validate_card_arcana_consistency(cards: List[CardInfo]) -> List[str]:
        """验证卡牌大小牌类型的一致性"""
        errors = []

        for card in cards:
            # 大牌验证
            if card.arcana == "Major":
                if not (0 <= card.number <= 21):
                    errors.append(f"大牌 {card.name} 的序号 {card.number} 超出范围 (0-21)")
                if card.suit is not None:
                    errors.append(f"大牌 {card.name} 不应该有花色")

            # 小牌验证
            elif card.arcana == "Minor":
                if not (1 <= card.number <= 14):
                    errors.append(f"小牌 {card.name} 的序号 {card.number} 超出范围 (1-14)")
                if card.suit is None:
                    errors.append(f"小牌 {card.name} 必须指定花色")
                elif card.suit not in ["权杖", "圣杯", "宝剑", "金币"]:
                    errors.append(f"小牌 {card.name} 的花色 {card.suit} 无效")

        return errors

    @staticmethod
    def validate_dimension_weights(dimensions: List[DimensionInfoV2]) -> List[str]:
        """验证维度权重的合理性"""
        errors = []

        # 检查权重范围
        for dim in dimensions:
            if not (0.1 <= dim.weight <= 3.0):
                errors.append(f"维度 {dim.name} 的权重 {dim.weight} 超出合理范围 (0.1-3.0)")

        # 检查权重总和是否合理
        total_weight = sum(dim.weight for dim in dimensions)
        if total_weight > 10.0:
            errors.append(f"维度权重总和 {total_weight:.2f} 过高，建议控制在10以内")

        return errors

    @staticmethod
    def validate_complete_request(
        cards: List[CardInfo],
        dimensions: List[DimensionInfoV2],
        spread_type: str
    ) -> List[str]:
        """完整的请求验证"""
        all_errors = []

        # 卡牌一致性验证
        all_errors.extend(ReadingValidator.validate_cards_consistency(cards))

        # 卡牌大小牌验证
        all_errors.extend(ReadingValidator.validate_card_arcana_consistency(cards))

        # 维度与牌阵匹配验证
        all_errors.extend(ReadingValidator.validate_dimensions_for_spread(dimensions, spread_type))

        # 维度权重验证
        all_errors.extend(ReadingValidator.validate_dimension_weights(dimensions))

        return all_errors
