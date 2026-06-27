人工测试 analyze_user_description API 有几种方式：

  1. 使用 FastAPI 自带的交互式文档

  首先启动服务器：
  cd D:\0-development\projects\MySixth\tarot-backend
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

  然后访问：http://localhost:8000/docs

  在 Swagger UI 中找到 POST /readings/analyze 接口，点击 "Try it
  out"，输入测试数据：

  {
    "description": "我和男朋友最近关系紧张，经常吵架，不知道我们的关系走向如何",    
    "spread_type": "three-card"
  }

  2. 使用 curl 命令

  curl -X POST "http://localhost:8000/readings/analyze" \
    -H "Content-Type: application/json" \
    -d '{
      "description":
  "我和男朋友最近关系紧张，经常吵架，不知道我们的关系走向如何",
      "spread_type": "three-card"
    }'

  3. 使用 Python requests

  创建一个简单的测试脚本：

  import requests
  import json

  # 确保服务器运行在 localhost:8000
  url = "http://localhost:8000/readings/analyze"

  test_cases = [
      {
          "description":
  "我和男朋友最近关系紧张，经常吵架，不知道我们的关系走向如何",
          "spread_type": "three-card"
      },
      {
          "description": "工作压力很大，想知道是否应该换工作，求职业发展指导",      
          "spread_type": "three-card"
      }
  ]

  for i, test_case in enumerate(test_cases, 1):
      print(f"\n测试用例 {i}:")
      print(f"描述: {test_case['description']}")

      response = requests.post(url, json=test_case)

      if response.status_code == 200:
          result = response.json()
          print("✓ 成功")
          print(f"返回维度数量: {len(result['recommended_dimensions'])}")
          for dim in result['recommended_dimensions']:
              print(f"  {dim['aspect_type']}. {dim['name']} (aspect:
  {dim['aspect']})")
      else:
          print(f"✗ 失败: {response.status_code} - {response.text}")

  4. 使用 Postman

  1. 创建新的 POST 请求
  2. URL: http://localhost:8000/readings/analyze
  3. Headers: Content-Type: application/json
  4. Body (raw JSON):
  {
    "description": "我和男朋友最近关系紧张，经常吵架，不知道我们的关系走向如何",    
    "spread_type": "three-card"
  }

  验证要点

  测试时应验证：
  1. 返回3个维度
  2. aspect_type 为 1, 2, 3
  3. 维度名称格式为 "类别-aspect"
  4. LLM 实际被调用 (会有延迟)
  5. 不同描述返回不同维度

  注意事项

  1. 需要配置 LLM API 密钥 (在 .env 文件中)
  2. 确保数据库连接正常
  3. 网络连接正常 (调用外部 LLM API)

  最简单的方式是先启动服务器，然后直接访问 http://localhost:8000/docs 使用
  Swagger UI 进行测试！