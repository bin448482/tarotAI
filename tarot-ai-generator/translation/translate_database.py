#!/usr/bin/env python3
"""
数据库翻译主脚本
协调数据导出、AI翻译和结果导入的完整流程
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from rich.console import Console
from rich.table import Table
from rich.progress import Progress
from rich.prompt import Confirm

from translation_config import get_config
from export_database_raw import DatabaseExporter
from ai_translation_engine import AITranslationEngine

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

console = Console()

class DatabaseTranslator:
    """数据库翻译协调器"""

    def __init__(self):
        self.config = get_config()
        self.exporter = DatabaseExporter()
        self.engine = AITranslationEngine()

        # 统计信息
        self.stats = {
            "start_time": datetime.now(),
            "tables_processed": 0,
            "total_records_translated": 0,
            "total_tokens_used": 0
        }

    def load_raw_data(self, table_name: str) -> Optional[Dict[str, Any]]:
        """加载原始数据"""
        source_file = self.config.get_source_file_path(table_name)

        if not source_file.exists():
            console.print(f"[red]❌ 原始数据文件不存在: {source_file}[/red]")
            return None

        try:
            with open(source_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            console.print(f"[green]✅ 加载原始数据: {table_name} ({data['total_count']} 条记录)[/green]")
            return data

        except Exception as e:
            console.print(f"[red]❌ 加载原始数据失败: {e}[/red]")
            return None

    def save_translated_data(self, table_name: str, translated_data: List[Dict], original_data: Dict) -> None:
        """保存翻译结果"""
        target_file = self.config.get_target_file_path(table_name)

        # 构建翻译数据结构
        output_data = {
            "table_name": table_name,
            "source_locale": self.config["database"]["source_locale"],
            "target_locale": self.config["database"]["target_locale"],
            "original_count": original_data["total_count"],
            "translated_count": len(translated_data),
            "translation_rate": (len(translated_data) / original_data["total_count"] * 100) if original_data["total_count"] > 0 else 0,
            "translated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "model_used": self.engine.ai_config["model"],
            "description": f"Translation of {original_data['description']}",
            "data": translated_data
        }

        try:
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)

            console.print(f"[green]✅ 翻译结果已保存: {target_file}[/green]")

        except Exception as e:
            console.print(f"[red]❌ 保存翻译结果失败: {e}[/red]")
            raise

    async def translate_table(self, table_name: str, force: bool = False) -> bool:
        """翻译单个表"""
        console.print(f"[bold blue]🔄 开始翻译表: {table_name}[/bold blue]")

        # 检查是否已有翻译结果
        target_file = self.config.get_target_file_path(table_name)
        if target_file.exists() and not force:
            console.print(f"[yellow]⚠️ 翻译文件已存在: {target_file}[/yellow]")
            console.print("[yellow]使用 --force 参数覆盖现有翻译[/yellow]")
            return False

        # 加载原始数据
        raw_data = self.load_raw_data(table_name)
        if not raw_data:
            return False

        # 检查数据是否为空
        if not raw_data.get("data"):
            console.print(f"[yellow]⚠️ 表 {table_name} 没有数据需要翻译[/yellow]")
            return False

        # 估算成本
        record_count = len(raw_data["data"])
        estimated_tokens = record_count * 500  # 估算每条记录500 tokens
        console.print(f"[blue]📊 翻译预估: {record_count} 条记录，约 {estimated_tokens:,} tokens[/blue]")

        # 确认是否继续
        if not force and not Confirm.ask("确认开始翻译？"):
            console.print("[yellow]翻译已取消[/yellow]")
            return False

        try:
            # 执行翻译
            translated_data = await self.engine.translate_batch(raw_data["data"], table_name)

            # 保存翻译结果
            self.save_translated_data(table_name, translated_data, raw_data)

            # 更新统计信息
            self.stats["tables_processed"] += 1
            self.stats["total_records_translated"] += len(translated_data)

            # 显示翻译统计
            success_rate = (len(translated_data) / record_count * 100) if record_count > 0 else 0
            console.print(f"[green]✅ 表 {table_name} 翻译完成: {len(translated_data)}/{record_count} ({success_rate:.1f}%)[/green]")

            return True

        except Exception as e:
            console.print(f"[red]❌ 翻译表 {table_name} 失败: {e}[/red]")
            logger.error(f"翻译失败: {e}", exc_info=True)
            return False

    async def translate_all_tables(self, tables: Optional[List[str]] = None, force: bool = False) -> Dict[str, bool]:
        """翻译所有表或指定表"""
        console.print("[bold blue]🚀 开始数据库翻译流程[/bold blue]")

        # 获取需要翻译的表
        if tables is None:
            tables = self.config.get_all_table_names()

        if not tables:
            console.print("[yellow]⚠️ 没有找到需要翻译的表[/yellow]")
            return {}

        console.print(f"[blue]📋 翻译计划: {len(tables)} 个表[/blue]")
        for table in tables:
            table_config = self.config.get_table_config(table)
            console.print(f"  - {table}: {table_config['description']}")

        # 检查原始数据是否存在
        console.print("[blue]🔍 检查原始数据...[/blue]")
        missing_raw_data = []
        for table in tables:
            source_file = self.config.get_source_file_path(table)
            if not source_file.exists():
                missing_raw_data.append(table)

        if missing_raw_data:
            console.print(f"[red]❌ 缺少原始数据: {', '.join(missing_raw_data)}[/red]")
            console.print("[blue]💡 请先运行: python export_database_raw.py[/blue]")
            return {table: False for table in tables}

        # 执行翻译
        results = {}
        with Progress() as progress:
            task = progress.add_task("翻译进度", total=len(tables))

            for table in tables:
                result = await self.translate_table(table, force)
                results[table] = result
                progress.advance(task)

        # 显示总结
        self.print_translation_summary(results)

        return results

    def print_translation_summary(self, results: Dict[str, bool]):
        """打印翻译总结"""
        console.print("\n[bold green]📊 翻译总结[/bold green]")

        table = Table(title="翻译结果")
        table.add_column("表名", style="cyan")
        table.add_column("状态", style="green")
        table.add_column("说明", style="blue")

        success_count = 0
        for table, success in results.items():
            status = "✅ 成功" if success else "❌ 失败"
            description = self.config.get_table_config(table)["description"]
            table.add_row(table, status, description)
            if success:
                success_count += 1

        console.print(table)

        console.print(f"[bold]总计: {success_count}/{len(results)} 个表翻译成功[/bold]")

        # 显示翻译引擎统计
        self.engine.print_statistics()

        # 显示总体统计
        end_time = datetime.now()
        duration = end_time - self.stats["start_time"]
        console.print(f"⏱️ 总耗时: {duration.total_seconds():.2f} 秒")
        console.print(f"📝 总翻译记录数: {self.stats['total_records_translated']}")

    def export_first_if_needed(self) -> bool:
        """如果需要，先导出原始数据"""
        tables = self.config.get_all_table_names()
        missing_raw_data = []

        for table in tables:
            source_file = self.config.get_source_file_path(table)
            if not source_file.exists():
                missing_raw_data.append(table)

        if missing_raw_data:
            console.print(f"[yellow]⚠️ 检测到缺少原始数据: {', '.join(missing_raw_data)}[/yellow]")

            if Confirm.ask("是否现在导出原始数据？"):
                try:
                    self.exporter.export_all_tables()
                    console.print("[green]✅ 原始数据导出完成[/green]")
                    return True
                except Exception as e:
                    console.print(f"[red]❌ 导出原始数据失败: {e}[/red]")
                    return False
            else:
                console.print("[yellow]⚠️ 缺少原始数据，无法进行翻译[/yellow]")
                return False

        return True

def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="塔罗牌数据库翻译工具")
    parser.add_argument("--table", help="指定要翻译的表名")
    parser.add_argument("--tables", nargs="+", help="指定要翻译的多个表名")
    parser.add_argument("--all", action="store_true", help="翻译所有表")
    parser.add_argument("--force", action="store_true", help="强制覆盖现有翻译")
    parser.add_argument("--export-only", action="store_true", help="仅导出原始数据")
    parser.add_argument("--list-tables", action="store_true", help="列出所有可翻译的表")

    args = parser.parse_args()

    try:
        translator = DatabaseTranslator()

        if args.list_tables:
            # 列出所有可翻译的表
            tables = translator.config.get_all_table_names()
            console.print("[bold blue]📋 可翻译的表:[/bold blue]")
            for table in tables:
                table_config = translator.config.get_table_config(table)
                console.print(f"  - {table}: {table_config['description']}")
            return

        if args.export_only:
            # 仅导出原始数据
            translator.exporter.export_all_tables()
            return

        # 检查是否需要先导出原始数据
        if not translator.export_first_if_needed():
            return

        # 确定要翻译的表
        if args.table:
            tables = [args.table]
        elif args.tables:
            tables = args.tables
        elif args.all:
            tables = None  # 翻译所有表
        else:
            console.print("[yellow]⚠️ 请指定要翻译的表，使用 --help 查看帮助[/yellow]")
            console.print("[blue]💡 示例: python translate_database.py --all[/blue]")
            return

        # 执行翻译
        asyncio.run(translator.translate_all_tables(tables, args.force))

    except KeyboardInterrupt:
        console.print("\n[yellow]⚠️ 翻译被用户中断[/yellow]")
    except Exception as e:
        console.print(f"[red]❌ 翻译过程中发生错误: {e}[/red]")
        logger.error(f"翻译失败: {e}", exc_info=True)

if __name__ == "__main__":
    main()