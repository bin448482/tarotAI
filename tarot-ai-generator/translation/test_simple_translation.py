#!/usr/bin/env python3
"""
测试简单翻译
"""

import openai
from translation_config import get_config

def test_simple_translation():
    """测试简单翻译"""
    try:
        config = get_config()
        ai_config = config.get_ai_config()

        client = openai.OpenAI(
            api_key=ai_config["api_key"],
            base_url=ai_config["base_url"]
        )

        # 非常简单的翻译请求
        response = client.chat.completions.create(
            model=ai_config["model"],
            messages=[
                {"role": "system", "content": "Translate Chinese to English. Return only JSON."},
                {"role": "user", "content": """Translate this tarot card information:
Chinese name: 愚者
Deck: 莱德-韦特塔罗牌

Output JSON format:
{"name_en": "English name", "deck_en": "English deck name"}"""}
            ],
            temperature=0.1,
            max_tokens=100
        )

        if response.choices:
            content = response.choices[0].message.content
            print(f"响应内容: {repr(content)}")
            print(f"响应长度: {len(content) if content else 0}")

            if content:
                try:
                    import json
                    parsed = json.loads(content)
                    print(f"✅ JSON解析成功: {parsed}")
                    return True
                except json.JSONDecodeError as e:
                    print(f"❌ JSON解析失败: {e}")
                    print(f"原始内容: {content}")
                    return False
            else:
                print("❌ 响应内容为空")
                return False
        else:
            print("❌ 没有响应选择项")
            return False

    except Exception as e:
        print(f"❌ 翻译测试失败: {e}")
        return False

if __name__ == "__main__":
    test_simple_translation()