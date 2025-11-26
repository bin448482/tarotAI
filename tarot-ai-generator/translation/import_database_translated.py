#!/usr/bin/env python3
"""
翻译数据导入脚本
将AI翻译的结果导入到数据库的翻译表中
"""

import sqlite3
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

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

console = Console()

class TranslationImporter:
    """翻译数据导入器"""

    def __init__(self):
        self.config = get_config()
        self.db_path = self.config["database"]["path"]
        self.translated_data_dir = self.config["paths"]["translated_data_dir"]

        # 统计信息
        self.stats = {
            "tables_imported": 0,
            "total_records_imported": 0,
            "failed_records": 0,
            "start_time": datetime.now()
        }

    def connect_database(self) -> sqlite3.Connection:
        """连接数据库"""
        try:
            conn = sqlite3.connect(self.db_path)
            logger.info(f"✅ 成功连接数据库: {self.db_path}")
            return conn
        except Exception as e:
            logger.error(f"❌ 连接数据库失败: {e}")
            raise

    def load_translated_data(self, table_name: str) -> Optional[Dict[str, Any]]:
        """加载翻译数据"""
        target_file = self.config.get_target_file_path(table_name)

        if not target_file.exists():
            console.print(f"[red]❌ 翻译文件不存在: {target_file}[/red]")
            return None

        try:
            with open(target_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            console.print(f"[green]✅ 加载翻译数据: {table_name} ({data['translated_count']} 条记录)[/green]")
            return data

        except Exception as e:
            console.print(f"[red]❌ 加载翻译数据失败: {e}[/red]")
            return None

    def clear_existing_translations(self, conn: sqlite3.Connection, table_name: str) -> bool:
        """清空现有的英文翻译"""
        try:
            cursor = conn.cursor()

            # 确定翻译表名
            translation_table_map = {
                "card": "card_translation",
                                "spread": "spread_translation",
                "card_interpretation": "card_interpretation_translation"
            }

            translation_table = translation_table_map.get(table_name)
            if not translation_table:
                console.print(f"[red]❌ 未知的表名: {table_name}[/red]")
                return False

            # 删除现有的英文翻译
            cursor.execute(f"DELETE FROM {translation_table} WHERE locale = ?", (self.config["database"]["target_locale"],))
            deleted_count = cursor.rowcount

            console.print(f"[blue]🗑️ 清空现有翻译: {translation_table} (删除 {deleted_count} 条记录)[/blue]")
            return True

        except Exception as e:
            console.print(f"[red]❌ 清空现有翻译失败: {e}[/red]")
            return False

    def import_card_translations(self, conn: sqlite3.Connection, translated_data: List[Dict]) -> int:
        """导入卡牌翻译"""
        cursor = conn.cursor()
        imported_count = 0

        for record in translated_data:
            try:
                cursor.execute("""
                    INSERT INTO card_translation
                    (card_id, locale, name, deck, suit)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    record.get("id"),
                    self.config["database"]["target_locale"],
                    record.get("name_en"),
                    record.get("deck_en"),
                    record.get("suit_en")
                ))
                imported_count += 1

            except Exception as e:
                console.print(f"[red]❌ 导入卡牌翻译失败 (ID: {record.get('id')}): {e}[/red]")
                self.stats["failed_records"] += 1

        return imported_count

    
    def import_spread_translations(self, conn: sqlite3.Connection, translated_data: List[Dict]) -> int:
        """导入牌阵翻译"""
        cursor = conn.cursor()
        imported_count = 0

        for record in translated_data:
            try:
                cursor.execute("""
                    INSERT INTO spread_translation
                    (spread_id, locale, name, description)
                    VALUES (?, ?, ?, ?)
                """, (
                    record.get("id"),
                    self.config["database"]["target_locale"],
                    record.get("name_en"),
                    record.get("description_en")
                ))
                imported_count += 1

            except Exception as e:
                console.print(f"[red]❌ 导入牌阵翻译失败 (ID: {record.get('id')}): {e}[/red]")
                self.stats["failed_records"] += 1

        return imported_count

    def import_card_interpretation_translations(self, conn: sqlite3.Connection, translated_data: List[Dict]) -> int:
        """导入卡牌解读翻译"""
        cursor = conn.cursor()
        imported_count = 0

        for record in translated_data:
            try:
                cursor.execute("""
                    INSERT INTO card_interpretation_translation
                    (interpretation_id, locale, summary, detail, direction)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    record.get("id"),
                    self.config["database"]["target_locale"],
                    record.get("summary_en"),
                    record.get("detail_en"),
                    record.get("direction")  # 添加 direction 字段
                ))
                imported_count += 1

            except Exception as e:
                console.print(f"[red]❌ 导入卡牌解读翻译失败 (ID: {record.get('id')}): {e}[/red]")
                self.stats["failed_records"] += 1

        return imported_count

    def import_table_translations(self, conn: sqlite3.Connection, table_name: str, translated_data: List[Dict]) -> int:
        """导入单个表的翻译数据"""
        console.print(f"[blue]📥 导入表翻译: {table_name} ({len(translated_data)} 条记录)[/blue]")

        # 根据表名选择导入方法
        if table_name == "card":
            return self.import_card_translations(conn, translated_data)
        elif table_name == "spread":
            return self.import_spread_translations(conn, translated_data)
        elif table_name == "card_interpretation":
            return self.import_card_interpretation_translations(conn, translated_data)
        else:
            console.print(f"[red]❌ 不支持的表名: {table_name}[/red]")
            return 0

    def import_table(self, table_name: str, force: bool = False) -> bool:
        """导入单个表的翻译"""
        console.print(f"[bold blue]🔄 开始导入表翻译: {table_name}[/bold blue]")

        # 加载翻译数据
        translated_data = self.load_translated_data(table_name)
        if not translated_data:
            return False

        # 检查翻译数据是否为空
        if not translated_data.get("data"):
            console.print(f"[yellow]⚠️ 表 {table_name} 没有翻译数据[/yellow]")
            return False

        # 连接数据库
        conn = self.connect_database()

        try:
            # 开始事务
            conn.execute("BEGIN TRANSACTION")

            # 清空现有翻译
            if not self.clear_existing_translations(conn, table_name):
                conn.rollback()
                return False

            # 导入新翻译
            imported_count = self.import_table_translations(conn, table_name, translated_data["data"])

            # 提交事务
            conn.commit()

            # 更新统计信息
            self.stats["tables_imported"] += 1
            self.stats["total_records_imported"] += imported_count

            success_rate = (imported_count / len(translated_data["data"]) * 100) if translated_data["data"] else 0
            console.print(f"[green]✅ 表 {table_name} 导入完成: {imported_count}/{len(translated_data['data'])} ({success_rate:.1f}%)[/green]")

            return True

        except Exception as e:
            conn.rollback()
            console.print(f"[red]❌ 导入表 {table_name} 失败: {e}[/red]")
            logger.error(f"导入失败: {e}", exc_info=True)
            return False

        finally:
            conn.close()

    def import_all_tables(self, tables: Optional[List[str]] = None, force: bool = False) -> Dict[str, bool]:
        """导入所有表或指定表的翻译"""
        console.print("[bold blue]🚀 开始翻译数据导入流程[/bold blue]")

        # 获取需要导入的表
        if tables is None:
            tables = self.config.get_all_table_names()

        if not tables:
            console.print("[yellow]⚠️ 没有找到需要导入的表[/yellow]")
            return {}

        console.print(f"[blue]📋 导入计划: {len(tables)} 个表[/blue]")
        for table in tables:
            table_config = self.config.get_table_config(table)
            console.print(f"  - {table}: {table_config['description']}")

        # 检查翻译文件是否存在
        console.print("[blue]🔍 检查翻译文件...[/blue]")
        missing_translations = []
        for table in tables:
            target_file = self.config.get_target_file_path(table)
            if not target_file.exists():
                missing_translations.append(table)

        if missing_translations:
            console.print(f"[red]❌ 缺少翻译文件: {', '.join(missing_translations)}[/red]")
            console.print("[blue]💡 请先运行翻译: python translate_database.py[/blue]")
            return {table: False for table in tables}

        # 执行导入
        results = {}
        with Progress() as progress:
            task = progress.add_task("导入进度", total=len(tables))

            for table in tables:
                result = self.import_table(table, force)
                results[table] = result
                progress.advance(task)

        # 显示总结
        self.print_import_summary(results)

        return results

    def print_import_summary(self, results: Dict[str, bool]):
        """打印导入总结"""
        console.print("\n[bold green]📊 导入总结[/bold green]")

        table = Table(title="导入结果")
        table.add_column("表名", style="cyan")
        table.add_column("状态", style="green")
        table.add_column("说明", style="blue")

        success_count = 0
        for table, success in results.items():
            status = "✅ 成功" if success else "❌ 失败"
            table_config = self.config.get_table_config(table)
            description = table_config["description"]
            table.add_row(table, status, description)
            if success:
                success_count += 1

        console.print(table)

        console.print(f"[bold]总计: {success_count}/{len(results)} 个表导入成功[/bold]")
        console.print(f"📝 总导入记录数: {self.stats['total_records_imported']}")
        console.print(f"❌ 失败记录数: {self.stats['failed_records']}")

        # 显示耗时
        end_time = datetime.now()
        duration = end_time - self.stats["start_time"]
        console.print(f"⏱️ 导入耗时: {duration.total_seconds():.2f} 秒")

    def verify_import(self) -> bool:
        """验证导入结果"""
        console.print("[blue]🔍 验证导入结果...[/blue]")

        conn = self.connect_database()
        try:
            cursor = conn.cursor()

            # 验证每个翻译表的记录数
            translation_tables = {
                "card": "card_translation",
                                "spread": "spread_translation",
                "card_interpretation": "card_interpretation_translation"
            }

            total_records = 0
            for table_name, translation_table in translation_tables.items():
                cursor.execute(f"SELECT COUNT(*) FROM {translation_table} WHERE locale = ?",
                             (self.config["database"]["target_locale"],))
                count = cursor.fetchone()[0]
                total_records += count
                console.print(f"  {translation_table}: {count} 条英文记录")

            console.print(f"[green]✅ 验证完成: 总计 {total_records} 条英文翻译记录[/green]")
            return True

        except Exception as e:
            console.print(f"[red]❌ 验证失败: {e}[/red]")
            return False

        finally:
            conn.close()

def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="塔罗牌翻译数据导入工具")
    parser.add_argument("--table", help="指定要导入的表名")
    parser.add_argument("--tables", nargs="+", help="指定要导入的多个表名")
    parser.add_argument("--all", action="store_true", help="导入所有表")
    parser.add_argument("--force", action="store_true", help="强制覆盖现有翻译")
    parser.add_argument("--verify", action="store_true", help="验证导入结果")
    parser.add_argument("--list-tables", action="store_true", help="列出所有可导入的表")

    args = parser.parse_args()

    try:
        importer = TranslationImporter()

        if args.list_tables:
            # 列出所有可导入的表
            tables = importer.config.get_all_table_names()
            console.print("[bold blue]📋 可导入的表:[/bold blue]")
            for table in tables:
                table_config = importer.config.get_table_config(table)
                console.print(f"  - {table}: {table_config['description']}")
            return

        if args.verify:
            # 仅验证导入结果
            importer.verify_import()
            return

        # 确定要导入的表
        if args.table:
            tables = [args.table]
        elif args.tables:
            tables = args.tables
        elif args.all:
            tables = None  # 导入所有表
        else:
            console.print("[yellow]⚠️ 请指定要导入的表，使用 --help 查看帮助[/yellow]")
            console.print("[blue]💡 示例: python import_database_translated.py --all[/blue]")
            return

        # 执行导入
        results = importer.import_all_tables(tables, args.force)

        # 如果导入成功，验证结果
        if any(results.values()):
            console.print("\n[blue]🔍 验证导入结果...[/blue]")
            importer.verify_import()

    except KeyboardInterrupt:
        console.print("\n[yellow]⚠️ 导入被用户中断[/yellow]")
    except Exception as e:
        console.print(f"[red]❌ 导入过程中发生错误: {e}[/red]")
        logger.error(f"导入失败: {e}", exc_info=True)

if __name__ == "__main__":
    main()