#!/usr/bin/env python3
"""
调试API连接问题
"""

import openai
from translation_config import get_config

def test_api():
    """测试API连接"""
    try:
        config = get_config()
        ai_config = config.get_ai_config()

        print(f"API配置:")
        print(f"  API Key: {ai_config['api_key'][:20]}...")
        print(f"  Base URL: {ai_config['base_url']}")
        print(f"  Model: {ai_config['model']}")

        client = openai.OpenAI(
            api_key=ai_config["api_key"],
            base_url=ai_config["base_url"]
        )

        # 测试简单请求
        try:
            response = client.chat.completions.create(
                model=ai_config["model"],
                messages=[
                    {"role": "user", "content": "Say 'Hello, API is working!' in JSON format like {\"message\": \"text\"}"}
                ],
                temperature=0.1,
                max_tokens=50
            )

            print(f"完整响应对象: {response}")
            print(f"响应类型: {type(response)}")

            if hasattr(response, 'choices') and response.choices:
                choice = response.choices[0]
                print(f"选择对象: {choice}")

                if hasattr(choice, 'message') and choice.message:
                    message = choice.message
                    print(f"消息对象: {message}")

                    if hasattr(message, 'content'):
                        content = message.content
                        print(f"API响应内容: {repr(content)}")
                        print(f"API响应类型: {type(content)}")
                        print(f"响应长度: {len(content) if content else 0}")
                        return True

            print("API响应结构异常")
            return False

        except Exception as api_error:
            print(f"API调用异常: {api_error}")
            print(f"异常类型: {type(api_error)}")
            return False

    except Exception as e:
        print(f"API测试失败: {e}")
        return False

if __name__ == "__main__":
    test_api()