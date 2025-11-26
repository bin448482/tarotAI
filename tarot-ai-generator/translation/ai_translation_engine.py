#!/usr/bin/env python3
"""
独立的AI翻译引擎
完全独立，不依赖main.py或其他外部模块
"""

import asyncio
import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import openai
from rich.console import Console
from rich.progress import Progress, TaskID
from rich.table import Table

from translation_config import get_config

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

console = Console()

class AITranslationEngine:
    """独立的AI翻译引擎"""

    def __init__(self):
        self.config = get_config()
        self.ai_config = self.config.get_ai_config()
        self.client = self._init_client()
        self.batch_config = self.config["batch_config"]

        # 加载术语词典
        self.glossary = self._load_glossary()

        # 统计信息
        self.stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_tokens_used": 0,
            "start_time": datetime.now()
        }

    def _init_client(self) -> openai.OpenAI:
        """初始化OpenAI客户端"""
        try:
            client = openai.OpenAI(
                api_key=self.ai_config["api_key"],
                base_url=self.ai_config["base_url"]
            )
            logger.info(f"✅ OpenAI客户端初始化成功，模型: {self.ai_config['model']}")
            return client
        except Exception as e:
            logger.error(f"❌ OpenAI客户端初始化失败: {e}")
            raise

    def _load_glossary(self) -> Dict[str, str]:
        """加载术语词典"""
        glossary_path = self.config["paths"]["glossary_file"]

        # 如果词典文件不存在，创建默认词典
        if not glossary_path.exists():
            default_glossary = {
                # 大阿卡纳
                "愚者": "The Fool", "魔术师": "The Magician", "女祭司": "The High Priestess",
                "皇后": "The Empress", "皇帝": "The Emperor", "教皇": "The Hierophant",
                "恋人": "The Lovers", "战车": "The Chariot", "力量": "Strength",
                "隐者": "The Hermit", "命运之轮": "Wheel of Fortune", "正义": "Justice",
                "倒吊人": "The Hanged Man", "死神": "Death", "节制": "Temperance",
                "恶魔": "The Devil", "塔": "The Tower", "星星": "The Star",
                "月亮": "The Moon", "太阳": "The Sun", "审判": "Judgement", "世界": "The World",

                # 小阿卡纳 - 权杖
                "权杖王牌": "Ace of Wands", "权杖一": "Ace of Wands", "权杖二": "Two of Wands",
                "权杖三": "Three of Wands", "权杖四": "Four of Wands", "权杖五": "Five of Wands",
                "权杖六": "Six of Wands", "权杖七": "Seven of Wands", "权杖八": "Eight of Wands",
                "权杖九": "Nine of Wands", "权杖十": "Ten of Wands", "权杖侍者": "Page of Wands",
                "权杖骑士": "Knight of Wands", "权杖王后": "Queen of Wands", "权杖国王": "King of Wands",

                # 小阿卡纳 - 圣杯
                "圣杯王牌": "Ace of Cups", "圣杯一": "Ace of Cups", "圣杯二": "Two of Cups",
                "圣杯三": "Three of Cups", "圣杯四": "Four of Cups", "圣杯五": "Five of Cups",
                "圣杯六": "Six of Cups", "圣杯七": "Seven of Cups", "圣杯八": "Eight of Cups",
                "圣杯九": "Nine of Cups", "圣杯十": "Ten of Cups", "圣杯侍者": "Page of Cups",
                "圣杯骑士": "Knight of Cups", "圣杯王后": "Queen of Cups", "圣杯国王": "King of Cups",

                # 小阿卡纳 - 宝剑
                "宝剑王牌": "Ace of Swords", "宝剑一": "Ace of Swords", "宝剑二": "Two of Swords",
                "宝剑三": "Three of Swords", "宝剑四": "Four of Swords", "宝剑五": "Five of Swords",
                "宝剑六": "Six of Swords", "宝剑七": "Seven of Swords", "宝剑八": "Eight of Swords",
                "宝剑九": "Nine of Swords", "宝剑十": "Ten of Swords", "宝剑侍者": "Page of Swords",
                "宝剑骑士": "Knight of Swords", "宝剑王后": "Queen of Swords", "宝剑国王": "King of Swords",

                # 小阿卡纳 - 星币
                "星币王牌": "Ace of Pentacles", "星币一": "Ace of Pentacles", "星币二": "Two of Pentacles",
                "星币三": "Three of Pentacles", "星币四": "Four of Pentacles", "星币五": "Five of Pentacles",
                "星币六": "Six of Pentacles", "星币七": "Seven of Pentacles", "星币八": "Eight of Pentacles",
                "星币九": "Nine of Pentacles", "星币十": "Ten of Pentacles", "星币侍者": "Page of Pentacles",
                "星币骑士": "Knight of Pentacles", "星币王后": "Queen of Pentacles", "星币国王": "King of Pentacles",

                # 牌组
                "权杖": "Wands", "圣杯": "Cups", "宝剑": "Swords", "星币": "Pentacles",
                "大阿卡纳": "Major Arcana", "小阿卡纳": "Minor Arcana",

                # 方向
                "正位": "Upright", "逆位": "Reversed",

                # 维度类别
                "情感": "Emotional", "事业": "Career", "精神": "Spiritual",
                "决策": "Decision Making", "健康": "Health", "人际关系": "Relationships",
                "财富": "Wealth", "智慧": "Wisdom"
            }

            with open(glossary_path, 'w', encoding='utf-8') as f:
                json.dump(default_glossary, f, ensure_ascii=False, indent=2)

            logger.info(f"📝 创建默认术语词典: {glossary_path}")
            return default_glossary

        # 加载现有词典
        try:
            with open(glossary_path, 'r', encoding='utf-8') as f:
                glossary = json.load(f)
            logger.info(f"📖 加载术语词典: {len(glossary)} 个条目")
            return glossary
        except Exception as e:
            logger.error(f"❌ 加载术语词典失败: {e}")
            return {}

    def _load_prompt_template(self, table_name: str) -> str:
        """加载翻译提示词模板"""
        prompt_path = self.config.get_prompt_file_path(table_name)

        if not prompt_path.exists():
            # 创建默认提示词模板
            default_prompt = self._create_default_prompt(table_name)
            with open(prompt_path, 'w', encoding='utf-8') as f:
                f.write(default_prompt)
            logger.info(f"📝 创建默认提示词模板: {prompt_path}")
            return default_prompt

        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                template = f.read()
            logger.info(f"📖 加载提示词模板: {prompt_path}")
            return template
        except Exception as e:
            logger.error(f"❌ 加载提示词模板失败: {e}")
            raise

    def _create_default_prompt(self, table_name: str) -> str:
        """创建默认提示词模板"""
        if table_name == "card":
            return """将以下塔罗牌信息翻译为英文JSON格式：

{input_content}

输出格式：
{
  "name_en": "英文卡牌名称",
  "deck_en": "英文牌组名称",
  "suit_en": "英文花色名称"
}"""
        elif table_name == "dimension":
            return """将以下维度信息翻译为英文JSON格式：

{input_content}

输出格式：
{
  "name_en": "英文维度名称",
  "category_en": "英文维度类别",
  "description_en": "英文维度描述"
}"""
        elif table_name == "spread":
            return """将以下牌阵信息翻译为英文JSON格式：

{input_content}

输出格式：
{
  "name_en": "英文牌阵名称",
  "description_en": "英文牌阵描述"
}"""
        elif table_name == "card_interpretation":
            return """将以下卡牌解读翻译为英文JSON格式：

{input_content}

输出格式：
{
  "summary_en": "英文解读摘要",
  "detail_en": "英文详细解读"
}"""
        else:
            return """将以下内容翻译为英文JSON格式：

{input_content}

输出格式：{"translation_en": "英文翻译"}"""

    def _call_ai_api(self, prompt: str) -> Optional[str]:
        """调用AI API进行翻译"""
        try:
            self.stats["total_requests"] += 1

            # 简化的系统提示词，专注于JSON输出
            system_prompt = """你是一位专业的塔罗牌翻译专家。请将中文内容翻译为英文，并严格按照JSON格式输出。
不要添加任何解释文字，直接输出JSON对象。"""

            response = self.client.chat.completions.create(
                model=self.ai_config["model"],
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.ai_config["temperature"],
                max_tokens=self.ai_config["max_tokens"],
                timeout=self.ai_config["timeout"]
            )

            if response.choices:
                choice = response.choices[0]
                content = choice.message.content

                # 检查content是否为空
                if not content or not content.strip():
                    logger.warning(f"⚠️ API返回空内容，finish_reason: {choice.finish_reason}")
                    self.stats["failed_requests"] += 1
                    return None

                content = content.strip()
                self.stats["successful_requests"] += 1

                # 统计token使用量
                if hasattr(response.usage, 'total_tokens'):
                    self.stats["total_tokens_used"] += response.usage.total_tokens

                logger.info(f"✅ API响应成功，内容长度: {len(content)}")
                return content

            self.stats["failed_requests"] += 1
            logger.error("❌ API响应中没有choices")
            return None

        except Exception as e:
            self.stats["failed_requests"] += 1
            logger.error(f"❌ API调用失败: {e}")
            return None

    def _apply_glossary(self, text: str) -> str:
        """应用术语词典进行预翻译"""
        for chinese, english in self.glossary.items():
            text = text.replace(chinese, english)
        return text

    def _create_translation_prompt(self, item: Dict, template: str, table_name: str) -> str:
        """创建翻译提示词"""
        # 使用非常简单的直接翻译方式
        if table_name == "card":
            return f"""Translate this tarot card information to English:
Chinese name: {item.get('name', '')}
Deck: {item.get('deck', '')}
Suit: {item.get('suit', '')}

Output JSON format:
{{"name_en": "English name", "deck_en": "English deck name", "suit_en": "English suit name"}}"""
        elif table_name == "dimension":
            return f"""Translate this dimension information to English:
Chinese name: {item.get('name', '')}
Category: {item.get('category', '')}
Description: {item.get('description', '')}

Output JSON format:
{{"name_en": "English name", "category_en": "English category", "description_en": "English description"}}"""
        elif table_name == "spread":
            return f"""Translate this spread information to English:
Chinese name: {item.get('name', '')}
Description: {item.get('description', '')}

Output JSON format:
{{"name_en": "English name", "description_en": "English description"}}"""
        elif table_name == "card_interpretation":
            summary = item.get('summary', '')[:100] + "..." if len(item.get('summary', '')) > 100 else item.get('summary', '')
            detail = item.get('detail', '')[:200] + "..." if len(item.get('detail', '')) > 200 else item.get('detail', '')
            return f"""Translate this tarot interpretation to English:
Card: {item.get('card_name', '')}
Direction: {item.get('direction', '')}
Summary: {summary}
Detail: {detail}

Output JSON format:
{{"summary_en": "English summary", "detail_en": "English detail"}}"""
        else:
            return f"""Translate this to English: {str(item)}

Output JSON format:
{{"translation_en": "English translation"}}"""

    def _parse_translation_response(self, response: str, table_name: str) -> Dict[str, Any]:
        """解析AI翻译响应"""
        try:
            # 尝试解析JSON响应
            if response.strip().startswith('{'):
                return json.loads(response)

            # 如果不是JSON格式，尝试提取JSON部分
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1

            if start_idx != -1 and end_idx != -1:
                json_str = response[start_idx:end_idx]
                return json.loads(json_str)

            # 如果无法解析，返回默认结构
            logger.warning(f"⚠️ 无法解析AI响应，返回默认结构: {response[:100]}...")
            return self._create_fallback_translation(response, table_name)

        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON解析失败: {e}")
            return self._create_fallback_translation(response, table_name)

    def _create_fallback_translation(self, response: str, table_name: str) -> Dict[str, Any]:
        """创建备用翻译结构"""
        if table_name == "card":
            return {"name_en": response[:100], "deck_en": "Tarot", "suit_en": None}
        elif table_name == "dimension":
            return {"name_en": response[:100], "category_en": "General", "description_en": response[:200]}
        elif table_name == "spread":
            return {"name_en": response[:100], "description_en": response[:200]}
        elif table_name == "card_interpretation":
            return {"summary_en": response[:100], "detail_en": response[:300]}
        else:
            return {"translation_en": response[:200]}

    async def translate_item(self, item: Dict, template: str, table_name: str) -> Optional[Dict[str, Any]]:
        """翻译单个项目"""
        try:
            # 创建提示词
            prompt = self._create_translation_prompt(item, template, table_name)

            # 应用术语词典预翻译
            prompt = self._apply_glossary(prompt)

            # 调用AI API
            response = self._call_ai_api(prompt)

            if response:
                # 解析响应
                translation = self._parse_translation_response(response, table_name)

                # 添加原始ID
                translation["id"] = item.get("id")

                return translation

            return None

        except Exception as e:
            logger.error(f"❌ 翻译项目失败 (ID: {item.get('id')}): {e}")
            return None

    async def translate_batch(self, items: List[Dict], table_name: str) -> List[Dict[str, Any]]:
        """批量翻译"""
        if not items:
            return []

        console.print(f"[blue]🔄 开始翻译表 {table_name}，共 {len(items)} 条记录[/blue]")

        # 加载提示词模板
        template = self._load_prompt_template(table_name)

        # 初始化进度条
        results = []

        with Progress() as progress:
            task = progress.add_task(f"翻译 {table_name} 中...", total=len(items))

            # 创建异步任务
            sem = asyncio.Semaphore(self.batch_config["batch_size"])
            min_interval = 60 / self.batch_config["rate_limit_per_minute"]
            rate_lock = asyncio.Lock()
            next_allowed = 0.0

            async def worker(item: Dict) -> Optional[Dict[str, Any]]:
                nonlocal next_allowed

                async with sem:
                    # 速率限制
                    if min_interval > 0:
                        async with rate_lock:
                            now = asyncio.get_running_loop().time()
                            wait = max(0.0, next_allowed - now)
                            if wait > 0:
                                await asyncio.sleep(wait)
                            next_allowed = asyncio.get_running_loop().time() + min_interval

                    # 重试机制
                    for attempt in range(self.batch_config["max_retries"]):
                        try:
                            result = await self.translate_item(item, template, table_name)
                            if result:
                                return result
                        except Exception as e:
                            logger.warning(f"⚠️ 翻译失败，第 {attempt + 1} 次重试: {e}")
                            if attempt < self.batch_config["max_retries"] - 1:
                                await asyncio.sleep(self.batch_config["retry_delay"])

                    # 所有重试都失败
                    logger.error(f"❌ 翻译最终失败: ID {item.get('id')}")
                    return None

            # 执行所有翻译任务
            tasks = [asyncio.create_task(worker(item)) for item in items]

            for coro in asyncio.as_completed(tasks):
                result = await coro
                if result:
                    results.append(result)
                progress.advance(task)

        success_count = len(results)
        total_count = len(items)
        success_rate = (success_count / total_count * 100) if total_count > 0 else 0

        console.print(f"[green]✅ {table_name} 翻译完成: {success_count}/{total_count} ({success_rate:.1f}%)[/green]")

        return results

    def get_statistics(self) -> Dict[str, Any]:
        """获取翻译统计信息"""
        end_time = datetime.now()
        duration = end_time - self.stats["start_time"]

        return {
            "total_requests": self.stats["total_requests"],
            "successful_requests": self.stats["successful_requests"],
            "failed_requests": self.stats["failed_requests"],
            "success_rate": (self.stats["successful_requests"] / self.stats["total_requests"] * 100) if self.stats["total_requests"] > 0 else 0,
            "total_tokens_used": self.stats["total_tokens_used"],
            "duration_seconds": duration.total_seconds(),
            "requests_per_minute": (self.stats["total_requests"] / duration.total_seconds() * 60) if duration.total_seconds() > 0 else 0,
            "start_time": self.stats["start_time"].isoformat(),
            "end_time": end_time.isoformat()
        }

    def print_statistics(self):
        """打印翻译统计信息"""
        stats = self.get_statistics()

        table = Table(title="🤖 AI翻译统计")
        table.add_column("指标", style="cyan")
        table.add_column("数值", style="green")

        table.add_row("总请求数", str(stats["total_requests"]))
        table.add_row("成功请求数", str(stats["successful_requests"]))
        table.add_row("失败请求数", str(stats["failed_requests"]))
        table.add_row("成功率", f"{stats['success_rate']:.1f}%")
        table.add_row("总Token数", str(stats["total_tokens_used"]))
        table.add_row("处理时长", f"{stats['duration_seconds']:.1f}秒")
        table.add_row("请求速率", f"{stats['requests_per_minute']:.1f}次/分钟")

        console.print(table)

if __name__ == "__main__":
    # 测试翻译引擎
    async def test_engine():
        engine = AITranslationEngine()

        # 测试单个翻译
        test_item = {"id": 1, "name": "愚者", "deck": "莱德-韦特塔罗牌", "suit": None}
        template = engine._create_default_prompt("card")

        result = await engine.translate_item(test_item, template, "card")
        console.print(f"测试结果: {result}")

        # 打印统计信息
        engine.print_statistics()

    asyncio.run(test_engine())