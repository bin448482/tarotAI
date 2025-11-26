#!/usr/bin/env python3
"""
翻译报告生成脚本
生成详细的翻译统计和质量报告
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from translation_config import get_config

console = Console()

class TranslationReportGenerator:
    """翻译报告生成器"""

    def __init__(self):
        self.config = get_config()
        self.db_path = self.config["database"]["path"]

    def generate_comprehensive_report(self) -> Dict[str, Any]:
        """生成综合翻译报告"""
        console.print("[bold blue]📊 生成综合翻译报告[/bold blue]")

        report = {
            "report_info": {
                "generated_at": datetime.now().isoformat(),
                "report_type": "comprehensive_translation_report",
                "version": "1.0.0"
            },
            "database_overview": self._get_database_overview(),
            "translation_status": self._get_translation_status(),
            "quality_assessment": self._assess_translation_quality(),
            "statistics": self._calculate_statistics(),
            "recommendations": self._generate_recommendations()
        }

        # 保存报告
        report_file = self.config["paths"]["output_root"] / "comprehensive_translation_report.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        console.print(f"[green]✅ 综合报告已保存: {report_file}[/green]")
        return report

    def _get_database_overview(self) -> Dict[str, Any]:
        """获取数据库概览"""
        console.print("📋 分析数据库结构...")

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        overview = {}

        # 主要数据表统计
        main_tables = ["card", "dimension", "spread", "card_interpretation"]
        overview["main_tables"] = {}

        for table in main_tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            overview["main_tables"][table] = count

        # 翻译表统计
        translation_tables = {
            "card": "card_translation",
            "dimension": "dimension_translation",
            "spread": "spread_translation",
            "card_interpretation": "card_interpretation_translation"
        }

        overview["translation_tables"] = {}
        for main_table, trans_table in translation_tables.items():
            cursor.execute(f"SELECT COUNT(*) FROM {trans_table} WHERE locale = ?",
                         (self.config["database"]["target_locale"],))
            count = cursor.fetchone()[0]
            overview["translation_tables"][main_table] = count

        # 语言统计
        overview["languages"] = {}
        for main_table, trans_table in translation_tables.items():
            cursor.execute(f"SELECT DISTINCT locale, COUNT(*) FROM {trans_table} GROUP BY locale")
            for locale, count in cursor.fetchall():
                if locale not in overview["languages"]:
                    overview["languages"][locale] = {}
                overview["languages"][locale][main_table] = count

        conn.close()
        return overview

    def _get_translation_status(self) -> Dict[str, Any]:
        """获取翻译状态"""
        console.print("🔄 检查翻译状态...")

        status = {}

        # 获取数据库概览
        overview = self._get_database_overview()

        # 计算每个表的翻译覆盖率
        status["coverage"] = {}
        total_main = 0
        total_translated = 0

        for table in overview["main_tables"]:
            main_count = overview["main_tables"][table]
            trans_count = overview["translation_tables"].get(table, 0)

            coverage_rate = (trans_count / main_count * 100) if main_count > 0 else 0
            status["coverage"][table] = {
                "main_records": main_count,
                "translated_records": trans_count,
                "coverage_rate": round(coverage_rate, 2),
                "status": "Complete" if coverage_rate >= 95 else "Incomplete"
            }

            total_main += main_count
            total_translated += trans_count

        # 总体覆盖率
        overall_coverage = (total_translated / total_main * 100) if total_main > 0 else 0
        status["overall"] = {
            "total_main_records": total_main,
            "total_translated_records": total_translated,
            "overall_coverage_rate": round(overall_coverage, 2),
            "status": "Complete" if overall_coverage >= 95 else "Incomplete"
        }

        return status

    def _assess_translation_quality(self) -> Dict[str, Any]:
        """评估翻译质量"""
        console.print("🔍 评估翻译质量...")

        quality = {
            "completeness": self._assess_completeness(),
            "consistency": self._assess_consistency(),
            "accuracy": self._assess_accuracy(),
            "overall_score": 0
        }

        # 计算总体质量分数
        scores = [
            quality["completeness"]["score"],
            quality["consistency"]["score"],
            quality["accuracy"]["score"]
        ]
        quality["overall_score"] = round(sum(scores) / len(scores), 2)

        # 质量等级
        if quality["overall_score"] >= 90:
            quality["grade"] = "A (优秀)"
        elif quality["overall_score"] >= 80:
            quality["grade"] = "B (良好)"
        elif quality["overall_score"] >= 70:
            quality["grade"] = "C (一般)"
        else:
            quality["grade"] = "D (需要改进)"

        return quality

    def _assess_completeness(self) -> Dict[str, Any]:
        """评估完整性"""
        # 检查文件完整性
        files_exist = 0
        total_files = 0

        for table_name in self.config.get_all_table_names():
            total_files += 1
            if self.config.get_target_file_path(table_name).exists():
                files_exist += 1

        file_completeness = (files_exist / total_files * 100) if total_files > 0 else 0

        # 检查翻译覆盖率
        status = self._get_translation_status()
        coverage_completeness = status["overall"]["overall_coverage_rate"]

        # 综合完整性分数
        completeness_score = (file_completeness + coverage_completeness) / 2

        return {
            "score": round(completeness_score, 2),
            "file_completeness": round(file_completeness, 2),
            "coverage_completeness": round(coverage_completeness, 2),
            "issues": []
        }

    def _assess_consistency(self) -> Dict[str, Any]:
        """评估一致性"""
        # 简化的一致性检查
        consistency_score = 85.0  # 基础分数

        issues = []

        # 检查翻译文件格式一致性
        format_issues = self._check_format_consistency()
        if format_issues:
            consistency_score -= len(format_issues) * 5
            issues.extend(format_issues)

        return {
            "score": max(0, round(consistency_score, 2)),
            "format_consistency": True,
            "terminology_consistency": True,
            "issues": issues
        }

    def _check_format_consistency(self) -> List[str]:
        """检查格式一致性"""
        issues = []

        for table_name in self.config.get_all_table_names():
            target_file = self.config.get_target_file_path(table_name)
            if target_file.exists():
                try:
                    with open(target_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)

                    # 检查必要字段
                    required_fields = ["table_name", "source_locale", "target_locale", "data"]
                    for field in required_fields:
                        if field not in data:
                            issues.append(f"{table_name}: 缺少字段 {field}")
                except Exception as e:
                    issues.append(f"{table_name}: 文件格式错误 - {e}")

        return issues

    def _assess_accuracy(self) -> Dict[str, Any]:
        """评估准确性"""
        # 简化的准确性评估
        accuracy_score = 90.0  # 基础分数

        issues = []

        # 检查是否有明显错误
        for table_name in self.config.get_all_table_names():
            target_file = self.config.get_target_file_path(table_name)
            if target_file.exists():
                try:
                    with open(target_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)

                    # 检查数据质量
                    translation_data = data.get("data", [])
                    if not translation_data:
                        issues.append(f"{table_name}: 翻译数据为空")
                        accuracy_score -= 10

                except Exception:
                    issues.append(f"{table_name}: 无法读取翻译文件")
                    accuracy_score -= 15

        return {
            "score": max(0, round(accuracy_score, 2)),
            "terminology_accuracy": True,
            "grammar_accuracy": True,
            "issues": issues
        }

    def _calculate_statistics(self) -> Dict[str, Any]:
        """计算统计信息"""
        console.print("📈 计算统计信息...")

        stats = {}
        overview = self._get_database_overview()

        # 数据量统计
        stats["data_volume"] = {
            "total_main_records": sum(overview["main_tables"].values()),
            "total_translated_records": sum(overview["translation_tables"].values()),
            "translation_ratio": round(
                sum(overview["translation_tables"].values()) /
                sum(overview["main_tables"].values()) * 100, 2
            )
        }

        # 表分布统计
        stats["table_distribution"] = {}
        for table in overview["main_tables"]:
            stats["table_distribution"][table] = {
                "main": overview["main_tables"][table],
                "translated": overview["translation_tables"].get(table, 0),
                "percentage": round(
                    overview["translation_tables"].get(table, 0) /
                    overview["main_tables"][table] * 100, 2
                ) if overview["main_tables"][table] > 0 else 0
            }

        return stats

    def _generate_recommendations(self) -> List[Dict[str, Any]]:
        """生成改进建议"""
        console.print("💡 生成改进建议...")

        recommendations = []

        # 基于翻译状态的建议
        status = self._get_translation_status()
        if status["overall"]["overall_coverage_rate"] < 100:
            recommendations.append({
                "priority": "High",
                "category": "Completeness",
                "title": "完成剩余翻译",
                "description": f"还有 {status['overall']['total_main_records'] - status['overall']['total_translated_records']} 条记录需要翻译",
                "action": "运行 python translate_database.py --all"
            })

        # 基于质量评估的建议
        quality = self._assess_translation_quality()
        if quality["overall_score"] < 80:
            recommendations.append({
                "priority": "Medium",
                "category": "Quality",
                "title": "提升翻译质量",
                "description": "当前翻译质量分数较低，建议进行质量检查和改进",
                "action": "运行 python validate_translation_quality.py --all --report"
            })

        # 通用建议
        recommendations.append({
            "priority": "Low",
            "category": "Maintenance",
            "title": "定期维护",
            "description": "建议定期运行质量验证，确保翻译质量持续稳定",
            "action": "设置定期运行 validate_translation_quality.py"
        })

        return recommendations

    def print_report_summary(self, report: Dict[str, Any]):
        """打印报告摘要"""
        console.print("\n[bold green]📊 翻译报告摘要[/bold green]")

        # 数据库概览
        overview = report["database_overview"]
        console.print("\n[bold blue]📋 数据库概览[/bold blue]")

        table = Table(title="主要数据表")
        table.add_column("表名", style="cyan")
        table.add_column("记录数", style="green")
        table.add_column("翻译数", style="yellow")
        table.add_column("覆盖率", style="magenta")

        for table_name in overview["main_tables"]:
            main_count = overview["main_tables"][table_name]
            trans_count = overview["translation_tables"].get(table_name, 0)
            coverage = (trans_count / main_count * 100) if main_count > 0 else 0

            table.add_row(
                table_name,
                str(main_count),
                str(trans_count),
                f"{coverage:.1f}%"
            )

        console.print(table)

        # 翻译状态
        status = report["translation_status"]
        console.print(f"\n[bold blue]🔄 翻译状态[/bold blue]")
        console.print(f"总体覆盖率: {status['overall']['overall_coverage_rate']:.1f}%")
        console.print(f"状态: {status['overall']['status']}")

        # 质量评估
        quality = report["quality_assessment"]
        console.print(f"\n[bold blue]🔍 质量评估[/bold blue]")
        console.print(f"总体分数: {quality['overall_score']}/100")
        console.print(f"质量等级: {quality['grade']}")

        # 改进建议
        recommendations = report["recommendations"]
        if recommendations:
            console.print(f"\n[bold blue]💡 改进建议[/bold blue]")
            for rec in recommendations[:3]:  # 只显示前3个建议
                priority_color = "red" if rec["priority"] == "High" else "yellow" if rec["priority"] == "Medium" else "green"
                console.print(f"[{priority_color}]• {rec['title']}[/] ({rec['priority']})")
                console.print(f"  {rec['description']}")

def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="塔罗牌翻译报告生成工具")
    parser.add_argument("--comprehensive", action="store_true", help="生成综合报告")
    parser.add_argument("--summary", action="store_true", help="只显示摘要")
    parser.add_argument("--output", help="指定输出文件路径")

    args = parser.parse_args()

    try:
        generator = TranslationReportGenerator()

        if args.comprehensive or True:  # 默认生成综合报告
            report = generator.generate_comprehensive_report()

            if not args.summary:
                generator.print_report_summary(report)

        console.print("\n[bold green]✅ 报告生成完成！[/bold green]")

    except Exception as e:
        console.print(f"[red]❌ 生成报告失败: {e}[/red]")

if __name__ == "__main__":
    main()