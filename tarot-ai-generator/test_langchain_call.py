#!/usr/bin/env python3
"""
按配置测试可用的 LLM 提供商连通性。
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Callable, Dict, List, Tuple

import ollama
from openai import OpenAI
from rich.console import Console

try:
    from zhipuai import ZhipuAI
except ImportError:  # pragma: no cover - optional dependency
    ZhipuAI = None

from config import Config

console = Console()


def test_zhipu(config: Config) -> Tuple[bool, str]:
    """测试智谱 AI 聊天接口。"""
    if not config.ZHIPUAI_API_KEY:
        return False, "缺少 ZHIPUAI_API_KEY，跳过"
    if not ZhipuAI:
        return False, "未安装 zhipuai 库"

    client = ZhipuAI(api_key=config.ZHIPUAI_API_KEY)
    try:
        model = config.ZHIPU_MODEL_NAME or config.MODEL_NAME
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": "请只回复：连接正常"}
            ],
            temperature=min(config.TEMPERATURE, 0.3),
            max_tokens=32,
        )
        content = response.choices[0].message.content.strip()
        normalized = content.rstrip("。.!！").strip()
        return normalized == "连接正常", f"返回: {content}"
    except Exception as exc:  # pylint: disable=broad-except
        return False, f"调用失败: {exc}"


def test_openai_provider(config: Config) -> Tuple[bool, str]:
    """测试 OpenAI 兼容接口。"""
    if not config.OPENAI_API_KEY:
        return False, "缺少 OPENAI_API_KEY，跳过"

    print(config.OPENAI_BASE_URL)
    client = OpenAI(api_key=config.OPENAI_API_KEY, base_url=config.OPENAI_BASE_URL)
    try:
        response = client.chat.completions.create(
            model=config.OPENAI_MODEL_NAME or config.MODEL_NAME,
            messages=[
                {"role": "user", "content": "Reply with only the text: OK"}
            ],
            temperature=0.1,
            max_tokens=4,
        )
        content = response.choices[0].message.content.strip()
        return content.upper() == "OK", f"返回: {content}"
    except Exception as exc:  # pylint: disable=broad-except
        return False, f"调用失败: {exc}"


def test_ollama(config: Config) -> Tuple[bool, str]:
    """测试 Ollama 本地模型。"""
    try:
        client = ollama.Client(host=config.OLLAMA_BASE_URL)
    except Exception as exc:  # pylint: disable=broad-except
        return False, f"创建客户端失败: {exc}"

    try:
        response = client.chat(
            model=config.OLLAMA_MODEL,
            messages=[
                {"role": "user", "content": "Reply only with YES"}
            ],
            options={"temperature": 0.1, "num_predict": 8},
        )
        content = (response.get("message") or {}).get("content", "").strip().upper()
        return content == "YES", f"返回: {content}"
    except Exception as exc:  # pylint: disable=broad-except
        return False, f"调用失败: {exc}"


def main() -> None:
    """主测试入口。"""
    console.print("[bold yellow]🚀 LLM 连通性自检[/bold yellow]")
    console.print(f"测试时间: {datetime.now():%Y-%m-%d %H:%M:%S}")
    console.print("=" * 60)

    config = Config()
    try:
        config.validate()
    except Exception as exc:  # pylint: disable=broad-except
        console.print(f"[red]⚠️ 配置校验警告: {exc}[/red]")

    tests: Dict[str, Callable[[Config], Tuple[bool, str]]] = {
        "zhipu": test_zhipu,
        "openai": test_openai_provider,
        "ollama": test_ollama,
    }

    results: List[Tuple[str, bool, str]] = []

    for provider, tester in tests.items():
        console.print(f"\n[bold blue]🧪 测试提供商: {provider}[/bold blue]")
        success, message = tester(config)
        status = "[green]✅ 成功[/green]" if success else "[red]❌ 失败[/red]"
        console.print(f"{status} {message}")
        results.append((provider, success, message))

    console.print("\n" + "=" * 60)
    console.print("[bold yellow]📊 测试总结[/bold yellow]")

    success_count = sum(1 for _, ok, _ in results if ok)
    for provider, ok, message in results:
        status = "成功" if ok else "失败/跳过"
        console.print(f"{provider:<10}: {status}  ({message})")

    console.print(f"\n通过数量: {success_count}/{len(results)}")
    console.print("[green]🎉 全部通过[/green]" if success_count == len(results) else "[yellow]ℹ️ 请根据结果检查密钥或服务状态[/yellow]")


if __name__ == "__main__":
    main()
