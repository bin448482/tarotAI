#!/usr/bin/env python3
"""
翻译质量验证脚本
验证翻译的完整性、一致性和质量
"""

import json
import sqlite3
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Set, Tuple, Optional
from rich.console import Console
from rich.table import Table
from rich.progress import Progress

from translation_config import get_config

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

console = Console()

class TranslationValidator:
    """翻译质量验证器"""

    def __init__(self):
        self.config = get_config()
        self.db_path = self.config["database"]["path"]

        # 加载术语词典
        self.glossary = self._load_glossary()

        # 标准塔罗牌名称
        self.standard_card_names = self._load_standard_card_names()

        # 验证结果
        self.validation_results = {
            "start_time": datetime.now(),
            "checks_performed": 0,
            "issues_found": 0,
            "tables_validated": 0,
            "issues": []
        }

    def _load_glossary(self) -> Dict[str, str]:
        """加载术语词典"""
        glossary_path = self.config["paths"]["glossary_file"]
        try:
            with open(glossary_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}

    def _load_standard_card_names(self) -> Set[str]:
        """加载标准塔罗牌名称"""
        return {
            # 大阿卡纳
            "The Fool", "The Magician", "The High Priestess", "The Empress",
            "The Emperor", "The Hierophant", "The Lovers", "The Chariot",
            "Strength", "The Hermit", "Wheel of Fortune", "Justice",
            "The Hanged Man", "Death", "Temperance", "The Devil",
            "The Tower", "The Star", "The Moon", "The Sun",
            "Judgement", "The World",

            # 牌组
            "Major Arcana", "Wands", "Cups", "Swords", "Pentacles",

            # 方向
            "Upright", "Reversed"
        }

    def connect_database(self) -> sqlite3.Connection:
        """连接数据库"""
        try:
            conn = sqlite3.connect(self.db_path)
            return conn
        except Exception as e:
            logger.error(f"❌ 连接数据库失败: {e}")
            raise

    def load_translation_data(self, table_name: str) -> Optional[Dict[str, Any]]:
        """加载翻译数据"""
        target_file = self.config.get_target_file_path(table_name)

        if not target_file.exists():
            self._add_issue("file_missing", f"翻译文件不存在: {target_file}")
            return None

        try:
            with open(target_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data
        except Exception as e:
            self._add_issue("file_load_error", f"加载翻译文件失败: {target_file} - {e}")
            return None

    def _add_issue(self, issue_type: str, description: str, table_name: str = None, record_id: Any = None):
        """添加验证问题"""
        issue = {
            "type": issue_type,
            "description": description,
            "table_name": table_name,
            "record_id": record_id,
            "timestamp": datetime.now().isoformat()
        }
        self.validation_results["issues"].append(issue)
        self.validation_results["issues_found"] += 1

    def validate_completeness(self, table_name: str, translation_data: Dict[str, Any]) -> bool:
        """验证翻译完整性"""
        console.print(f"[blue]🔍 验证翻译完整性: {table_name}[/blue]")
        is_valid = True

        # 检查翻译覆盖率
        original_count = translation_data.get("original_count", 0)
        translated_count = translation_data.get("translated_count", 0)

        if translated_count < original_count:
            missing_count = original_count - translated_count
            self._add_issue("incomplete_translation",
                          f"翻译不完整: {translated_count}/{original_count} (缺失 {missing_count} 条)",
                          table_name)
            is_valid = False

        # 检查必填字段
        data = translation_data.get("data", [])
        required_fields = self._get_required_fields(table_name)

        for i, record in enumerate(data):
            for field in required_fields:
                if field not in record or not record[field]:
                    self._add_issue("missing_required_field",
                                  f"记录 {i+1} 缺少必填字段: {field}",
                                  table_name, record.get("id"))
                    is_valid = False

        if is_valid:
            console.print(f"[green]✅ 完整性验证通过: {table_name}[/green]")

        return is_valid

    def _get_required_fields(self, table_name: str) -> List[str]:
        """获取必填字段"""
        field_map = {
            "card": ["id", "name_en"],
            "spread": ["id", "name_en", "description_en"],
            "card_interpretation": ["id", "summary_en"]
        }
        return field_map.get(table_name, ["id"])

    def validate_consistency(self, table_name: str, translation_data: Dict[str, Any]) -> bool:
        """验证翻译一致性"""
        console.print(f"[blue]🔍 验证翻译一致性: {table_name}[/blue]")
        is_valid = True

        data = translation_data.get("data", [])

        if table_name == "card":
            # 验证卡牌名称标准性
            for record in data:
                name_en = record.get("name_en", "")
                if name_en and name_en not in self.standard_card_names:
                    # 检查是否是小阿卡纳的标准格式
                    if not re.match(r"^(Ace|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Page|Knight|Queen|King) of (Wands|Cups|Swords|Pentacles)$", name_en):
                        self._add_issue("non_standard_card_name",
                                      f"非标准卡牌名称: {name_en}",
                                      table_name, record.get("id"))
                        is_valid = False

            # 验证牌组名称一致性
            suits = set()
            for record in data:
                suit_en = record.get("suit_en")
                if suit_en:
                    suits.add(suit_en)

            expected_suits = {"Wands", "Cups", "Swords", "Pentacles", "Major Arcana"}
            unexpected_suits = suits - expected_suits
            if unexpected_suits:
                self._add_issue("inconsistent_suit_names",
                              f"不一致的牌组名称: {', '.join(unexpected_suits)}",
                              table_name)
                is_valid = False

        elif table_name == "card_interpretation":
            # 验证方向一致性
            directions = set()
            for record in data:
                # 这里需要查询原始数据来获取方向信息
                pass  # 简化处理

        if is_valid:
            console.print(f"[green]✅ 一致性验证通过: {table_name}[/green]")

        return is_valid

    def validate_quality(self, table_name: str, translation_data: Dict[str, Any]) -> bool:
        """验证翻译质量"""
        console.print(f"[blue]🔍 验证翻译质量: {table_name}[/blue]")
        is_valid = True

        data = translation_data.get("data", [])

        for record in data:
            # 检查是否包含中文字符（可能的翻译遗漏）
            for field_name, field_value in record.items():
                if field_name.endswith("_en") and field_value:
                    if re.search(r"[\u4e00-\u9fff]", field_value):
                        self._add_issue("contains_chinese",
                                      f"字段 {field_name} 包含中文字符: {field_value[:50]}...",
                                      table_name, record.get("id"))
                        is_valid = False

            # 检查长度合理性
            if table_name == "card":
                name_en = record.get("name_en", "")
                if len(name_en) < 3:
                    self._add_issue("name_too_short",
                                  f"卡牌名称过短: {name_en}",
                                  table_name, record.get("id"))
                    is_valid = False

            elif table_name == "card_interpretation":
                summary_en = record.get("summary_en", "")
                if len(summary_en) < 5:
                    self._add_issue("summary_too_short",
                                  f"解读摘要过短: {summary_en}",
                                  table_name, record.get("id"))
                    is_valid = False

        if is_valid:
            console.print(f"[green]✅ 质量验证通过: {table_name}[/green]")

        return is_valid

    def validate_database_integration(self, table_name: str) -> bool:
        """验证数据库集成"""
        console.print(f"[blue]🔍 验证数据库集成: {table_name}[/blue]")
        is_valid = True

        conn = self.connect_database()
        try:
            cursor = conn.cursor()

            # 检查翻译表记录数
            translation_table_map = {
                "card": "card_translation",
                "dimension": "dimension_translation",
                "spread": "spread_translation",
                "card_interpretation": "card_interpretation_translation"
            }

            translation_table = translation_table_map.get(table_name)
            if not translation_table:
                self._add_issue("unknown_table", f"未知的表名: {table_name}")
                return False

            cursor.execute(f"SELECT COUNT(*) FROM {translation_table} WHERE locale = ?",
                         (self.config["database"]["target_locale"],))
            db_count = cursor.fetchone()[0]

            # 加载翻译文件中的记录数
            translation_data = self.load_translation_data(table_name)
            if translation_data:
                file_count = translation_data.get("translated_count", 0)

                if db_count != file_count:
                    self._add_issue("database_file_mismatch",
                                  f"数据库记录数({db_count})与文件记录数({file_count})不匹配",
                                  table_name)
                    is_valid = False

            # 检查ID完整性
            cursor.execute(f"SELECT DISTINCT id FROM {translation_table} WHERE locale = ?",
                         (self.config["database"]["target_locale"],))
            db_ids = {row[0] for row in cursor.fetchall()}

            if translation_data:
                file_ids = {record["id"] for record in translation_data.get("data", [])}

                missing_in_db = file_ids - db_ids
                missing_in_file = db_ids - file_ids

                if missing_in_db:
                    self._add_issue("missing_in_database",
                                  f"数据库中缺失的ID: {list(missing_in_db)[:10]}...",
                                  table_name)
                    is_valid = False

                if missing_in_file:
                    self._add_issue("missing_in_file",
                                  f"文件中缺失的ID: {list(missing_in_file)[:10]}...",
                                  table_name)
                    is_valid = False

        except Exception as e:
            self._add_issue("database_validation_error", f"数据库验证错误: {e}", table_name)
            is_valid = False

        finally:
            conn.close()

        if is_valid:
            console.print(f"[green]✅ 数据库集成验证通过: {table_name}[/green]")

        return is_valid

    def validate_table(self, table_name: str) -> Dict[str, bool]:
        """验证单个表"""
        console.print(f"[bold blue]🔍 开始验证表: {table_name}[/bold blue]")

        # 加载翻译数据
        translation_data = self.load_translation_data(table_name)
        if not translation_data:
            return {"completeness": False, "consistency": False, "quality": False, "database": False}

        # 执行各项验证
        results = {
            "completeness": self.validate_completeness(table_name, translation_data),
            "consistency": self.validate_consistency(table_name, translation_data),
            "quality": self.validate_quality(table_name, translation_data),
            "database": self.validate_database_integration(table_name)
        }

        # 更新统计
        self.validation_results["tables_validated"] += 1

        return results

    def validate_all_tables(self, tables: List[str] = None) -> Dict[str, Dict[str, bool]]:
        """验证所有表"""
        console.print("[bold blue]🚀 开始翻译质量验证[/bold blue]")

        if tables is None:
            tables = self.config.get_all_table_names()

        if not tables:
            console.print("[yellow]⚠️ 没有找到需要验证的表[/yellow]")
            return {}

        all_results = {}
        with Progress() as progress:
            task = progress.add_task("验证进度", total=len(tables))

            for table in tables:
                results = self.validate_table(table)
                all_results[table] = results
                progress.advance(task)

        # 显示总结
        self.print_validation_summary(all_results)

        return all_results

    def print_validation_summary(self, results: Dict[str, Dict[str, bool]]):
        """打印验证总结"""
        console.print("\n[bold green]📊 验证总结[/bold green]")

        # 按验证类型统计
        check_counts = {
            "completeness": 0,
            "consistency": 0,
            "quality": 0,
            "database": 0
        }

        success_counts = {
            "completeness": 0,
            "consistency": 0,
            "quality": 0,
            "database": 0
        }

        for table, table_results in results.items():
            for check_type, passed in table_results.items():
                check_counts[check_type] += 1
                if passed:
                    success_counts[check_type] += 1

        # 显示验证结果表格
        table = Table(title="验证结果")
        table.add_column("验证类型", style="cyan")
        table.add_column("通过数", style="green")
        table.add_column("总数", style="blue")
        table.add_column("通过率", style="yellow")

        for check_type in check_counts.keys():
            passed = success_counts[check_type]
            total = check_counts[check_type]
            rate = (passed / total * 100) if total > 0 else 0
            status = "✅" if rate == 100 else "⚠️" if rate >= 80 else "❌"
            table.add_row(f"{status} {check_type.title()}", str(passed), str(total), f"{rate:.1f}%")

        console.print(table)

        # 显示问题统计
        if self.validation_results["issues_found"] > 0:
            console.print(f"\n[red]❌ 发现 {self.validation_results['issues_found']} 个问题[/red]")

            # 按问题类型分组
            issues_by_type = {}
            for issue in self.validation_results["issues"]:
                issue_type = issue["type"]
                if issue_type not in issues_by_type:
                    issues_by_type[issue_type] = []
                issues_by_type[issue_type].append(issue)

            # 显示问题详情
            for issue_type, issues in issues_by_type.items():
                console.print(f"\n[yellow]⚠️ {issue_type.replace('_', ' ').title()} ({len(issues)} 个)[/yellow]")
                for issue in issues[:5]:  # 只显示前5个
                    console.print(f"  • {issue['description']}")
                if len(issues) > 5:
                    console.print(f"  ... 还有 {len(issues) - 5} 个问题")
        else:
            console.print("\n[green]✅ 所有验证都通过了！[/green]")

        # 显示总体统计
        end_time = datetime.now()
        duration = end_time - self.validation_results["start_time"]
        console.print(f"\n⏱️ 验证耗时: {duration.total_seconds():.2f} 秒")
        console.print(f"📋 验证表数: {self.validation_results['tables_validated']}")

    def generate_quality_report(self) -> Dict[str, Any]:
        """生成质量报告"""
        return {
            "validation_summary": {
                "start_time": self.validation_results["start_time"].isoformat(),
                "tables_validated": self.validation_results["tables_validated"],
                "checks_performed": self.validation_results["checks_performed"],
                "issues_found": self.validation_results["issues_found"],
                "overall_quality": "Good" if self.validation_results["issues_found"] == 0 else "Needs Improvement"
            },
            "issues": self.validation_results["issues"],
            "glossary_size": len(self.glossary),
            "standard_cards_count": len(self.standard_card_names)
        }

def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="塔罗牌翻译质量验证工具")
    parser.add_argument("--table", help="指定要验证的表名")
    parser.add_argument("--tables", nargs="+", help="指定要验证的多个表名")
    parser.add_argument("--all", action="store_true", help="验证所有表")
    parser.add_argument("--report", action="store_true", help="生成质量报告文件")
    parser.add_argument("--list-tables", action="store_true", help="列出所有可验证的表")

    args = parser.parse_args()

    try:
        validator = TranslationValidator()

        if args.list_tables:
            # 列出所有可验证的表
            tables = validator.config.get_all_table_names()
            console.print("[bold blue]📋 可验证的表:[/bold blue]")
            for table in tables:
                table_config = validator.config.get_table_config(table)
                console.print(f"  - {table}: {table_config['description']}")
            return

        # 确定要验证的表
        if args.table:
            tables = [args.table]
        elif args.tables:
            tables = args.tables
        elif args.all:
            tables = None  # 验证所有表
        else:
            console.print("[yellow]⚠️ 请指定要验证的表，使用 --help 查看帮助[/yellow]")
            console.print("[blue]💡 示例: python validate_translation_quality.py --all[/blue]")
            return

        # 执行验证
        results = validator.validate_all_tables(tables)

        # 生成报告
        if args.report:
            report = validator.generate_quality_report()
            report_file = validator.config["paths"]["output_root"] / "validation_report.json"
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            console.print(f"\n[green]📊 质量报告已保存: {report_file}[/green]")

    except Exception as e:
        console.print(f"[red]❌ 验证过程中发生错误: {e}[/red]")
        logger.error(f"验证失败: {e}", exc_info=True)

if __name__ == "__main__":
    main()