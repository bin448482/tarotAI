#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json

def test_generate_reading():
    """测试修复后的 generate_reading API"""
    url = "http://localhost:8000/api/v1/readings/generate"

    # 使用之前生成的测试数据
    test_data = {
        "cards": [
            {
                "name": "圣杯王后",
                "arcana": "Minor",
                "number": 13,
                "direction": "正位",
                "position": 1
            },
            {
                "name": "权杖五",
                "arcana": "Minor",
                "number": 5,
                "direction": "正位",
                "position": 2
            },
            {
                "name": "圣杯六",
                "arcana": "Minor",
                "number": 6,
                "direction": "正位",
                "position": 3
            }
        ],
        "dimensions": [
            {
                "id": 46,
                "name": "情感-情感需求",
                "category": "情感",
                "description": "探究未来婚姻中情感需求的满足、沟通障碍的解决及情感稳定性的维护。",
                "aspect": "情感需求",
                "aspect_type": 1
            },
            {
                "id": 47,
                "name": "情感-沟通障碍",
                "category": "情感",
                "description": "探究未来婚姻中情感需求的满足、沟通障碍的解决及情感稳定性的维护。",
                "aspect": "沟通障碍",
                "aspect_type": 2
            },
            {
                "id": 48,
                "name": "情感-情感稳定性",
                "category": "情感",
                "description": "探究未来婚姻中情感需求的满足、沟通障碍的解决及情感稳定性的维护。",
                "aspect": "情感稳定性",
                "aspect_type": 3
            }
        ],
        "description": "关于情感相关的困惑和疑问",
        "spread_type": "three-card"
    }

    try:
        print("发送请求到:", url)
        print("请求数据:")
        print(json.dumps(test_data, ensure_ascii=False, indent=2))
        print("\n" + "="*50 + "\n")

        response = requests.post(url, json=test_data, timeout=30)

        print(f"状态码: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print("响应成功!")
            print(json.dumps(result, ensure_ascii=False, indent=2))

            # 验证修复的问题
            print("\n" + "="*50)
            print("验证修复结果:")

            # 检查 dimensions 是否包含 aspect 和 aspect_type
            print("\n1. 检查 dimensions 中的 aspect 和 aspect_type:")
            for dim in result.get("dimensions", []):
                print(f"   - {dim['name']}: aspect={dim.get('aspect')}, aspect_type={dim.get('aspect_type')}")

            # 检查 card_interpretations 结构
            print("\n2. 检查 card_interpretations 结构:")
            for card_interp in result.get("card_interpretations", []):
                print(f"   - 位置{card_interp.get('position')}: {card_interp.get('card_name')}")
                print(f"     AI解读长度: {len(card_interp.get('ai_interpretation', ''))}")
                dimension_aspect = card_interp.get('dimension_aspect', {})
                if isinstance(dimension_aspect, dict):
                    print(f"     维度: {dimension_aspect.get('dimension_name')}")
                    print(f"     维度解读长度: {len(dimension_aspect.get('interpretation', ''))}")
                print()

        else:
            print("请求失败:")
            print(response.text)

    except requests.exceptions.RequestException as e:
        print(f"请求异常: {e}")
    except Exception as e:
        print(f"其他错误: {e}")

if __name__ == "__main__":
    test_generate_reading()