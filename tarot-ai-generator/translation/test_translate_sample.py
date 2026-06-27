#!/usr/bin/env python3
"""
测试翻译样本
"""

import asyncio
import json
from ai_translation_engine import AITranslationEngine
from translation_config import get_config
from export_database_raw import DatabaseExporter

async def test_sample_translation():
    """测试样本翻译"""
    try:
        # 加载配置
        config = get_config()

        # 导出原始数据
        exporter = DatabaseExporter()

        # 加载卡牌数据
        with open(config.get_source_file_path("card"), 'r', encoding='utf-8') as f:
            cards_data = json.load(f)

        # 取前3张卡牌进行测试
        sample_cards = cards_data["data"][:3]

        print(f"🧪 测试翻译 {len(sample_cards)} 张卡牌...")

        # 创建翻译引擎
        engine = AITranslationEngine()

        # 测试翻译
        results = await engine.translate_batch(sample_cards, "card")

        print(f"\n✅ 翻译完成: {len(results)} 条结果")

        # 显示结果
        for i, result in enumerate(results):
            if result:
                print(f"\n--- 翻译结果 {i+1} ---")
                print(f"ID: {result.get('id')}")
                print(f"Name EN: {result.get('name_en')}")
                print(f"Deck EN: {result.get('deck_en')}")
                print(f"Suit EN: {result.get('suit_en')}")

        # 保存测试结果
        output_file = config["paths"]["translated_data_dir"] / "card_test_sample.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                "version": "1.0.0",
                "generated_at": "2025-10-13T00:00:00",
                "model": config.get_ai_config()["model"],
                "count": len(results),
                "data": results
            }, f, ensure_ascii=False, indent=2)

        print(f"\n💾 测试结果已保存: {output_file}")

        # 显示统计信息
        engine.print_statistics()

        return len(results) > 0

    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_sample_translation())
    if success:
        print("\n🎉 翻译测试成功！")
    else:
        print("\n💥 翻译测试失败！")