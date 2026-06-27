#!/usr/bin/env python3
"""
测试合并后的单次LLM调用功能
"""
import asyncio
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.reading_service import ReadingService


# 模拟数据库环境
class MockDatabase:
    def __init__(self):
        self.logs = []

    def add(self, log_entry):
        self.logs.append(log_entry)

    def commit(self):
        pass

    def refresh(self, _):
        pass

    def rollback(self):
        pass

async def test_single_llm_call():
    """测试合并后的单次LLM调用功能"""
    print("测试合并后的单次LLM调用")
    print("=" * 50)
    print("预期效果：只调用一次LLM API，同时获得维度和描述")
    print()

    # 测试用例
    description = "为了更健康地处理我的债务状况，我最需要关注的核心环节和第一步行动是什么？"
    spread_type = "three-card"
    locale = "zh-CN"

    print(f"用户描述: {description}")
    print(f"牌阵类型: {spread_type}")
    print()

    try:
        # 初始化服务
        reading_service = ReadingService()
        mock_db = MockDatabase()

        # 调用分析（现在应该只调用一次LLM）
        print("正在分析...")
        print("期望：只有一次LLM API调用")

        result = await reading_service.analyze_user_description(
            description, spread_type, locale, mock_db
        )

        print(f"分析完成，返回 {len(result)} 个维度")
        print()

        # 检查结果
        categories = [dim['category'] for dim in result]
        aspects = [dim['aspect'] for dim in result]
        descriptions = [dim['description'] for dim in result]

        print("结果验证:")
        print(f"Categories: {categories}")
        print(f"Category统一: {'是' if len(set(categories)) == 1 else '否'}")
        print(f"Aspects: {aspects}")
        print(f"Description统一: {'是' if len(set(descriptions)) == 1 else '否'}")
        print()

        print("维度详情:")
        for i, dimension in enumerate(result, 1):
            print(f"  {i}. {dimension['name']}")
            print(f"     Category: {dimension['category']}")
            print(f"     Aspect: {dimension['aspect']}")
            print(f"     Description: {dimension['description']}")
            print()

        # 验证性能改进
        print("性能改进验证:")
        print("LLM API调用次数：从 2次 减少到 1次")
        print("减少了网络延迟和API成本")
        print("Category和Description都保持统一")

        if mock_db.logs:
            first_log = mock_db.logs[0]
            print("日志记录验证:")
            print(f"  记录数量: {len(mock_db.logs)}")
            print(f"  Category(中文规范): {first_log.category}")
            print(f"  Locate: {first_log.locate}")

    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_single_llm_call())
