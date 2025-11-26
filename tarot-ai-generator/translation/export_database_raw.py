#!/usr/bin/env python3
"""
数据库原始数据导出脚本
从 tarot_config.db 导出所有需要翻译的中文原始数据
"""

import sqlite3
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
from rich.console import Console
from rich.table import Table
from rich.progress import Progress

from translation_config import get_config

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

console = Console()

class DatabaseExporter:
    """数据库原始数据导出器"""

    def __init__(self):
        self.config = get_config()
        self.db_path = self.config["database"]["path"]
        self.output_dir = self.config["paths"]["raw_data_dir"]

        # 确保输出目录存在
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # 统计信息
        self.stats = {
            "tables_exported": 0,
            "total_records": 0,
            "start_time": datetime.now()
        }

    def connect_database(self) -> sqlite3.Connection:
        """连接数据库"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row  # 使结果可以按列名访问
            logger.info(f"✅ 成功连接数据库: {self.db_path}")
            return conn
        except Exception as e:
            logger.error(f"❌ 连接数据库失败: {e}")
            raise

    def export_table(self, conn: sqlite3.Connection, table_name: str) -> Dict[str, Any]:
        """导出单个表的数据"""
        console.print(f"[blue]📤 导出表: {table_name}[/blue]")

        try:
            cursor = conn.cursor()

            # 根据表名执行不同的查询
            if table_name == "card":
                query = """
                    SELECT id, name, arcana, suit, number, image_url, style_id, deck
                    FROM card
                    ORDER BY id
                """
            elif table_name == "spread":
                query = """
                    SELECT id, name, description, card_count
                    FROM spread
                    ORDER BY id
                """
            elif table_name == "card_interpretation":
                query = """
                    SELECT ci.id, ci.card_id, ci.direction, ci.summary, ci.detail, c.name as card_name
                    FROM card_interpretation ci
                    JOIN card c ON ci.card_id = c.id
                    ORDER BY ci.id
                """
            else:
                raise ValueError(f"不支持的表名: {table_name}")

            cursor.execute(query)
            rows = cursor.fetchall()

            # 转换为字典列表
            data = [dict(row) for row in rows]

            # 构建导出数据结构
            export_data = {
                "table_name": table_name,
                "source_locale": self.config["database"]["source_locale"],
                "total_count": len(data),
                "exported_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "description": self._get_table_description(table_name),
                "data": data
            }

            # 保存到文件
            output_file = self.output_dir / f"{table_name}_raw.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)

            console.print(f"[green]✅ 表 {table_name} 导出完成: {len(data)} 条记录 → {output_file}[/green]")

            # 更新统计信息
            self.stats["tables_exported"] += 1
            self.stats["total_records"] += len(data)

            return export_data

        except Exception as e:
            logger.error(f"❌ 导出表 {table_name} 失败: {e}")
            raise

    def _get_table_description(self, table_name: str) -> str:
        """获取表的描述信息"""
        descriptions = {
            "card": "塔罗牌基础信息，包括78张大阿卡纳和小阿卡纳牌",
            "spread": "牌阵定义，包括三牌阵等经典塔罗牌阵",
            "card_interpretation": "卡牌解读信息，包括每张牌的正位和逆位解读"
        }
        return descriptions.get(table_name, f"{table_name} 表的数据")

    def export_all_tables(self) -> Dict[str, Any]:
        """导出所有需要翻译的表"""
        console.print("[bold blue]🚀 开始导出数据库原始数据[/bold blue]")

        # 获取所有需要翻译的表名
        table_names = self.config.get_all_table_names()

        if not table_names:
            console.print("[yellow]⚠️ 没有找到需要导出的表[/yellow]")
            return {}

        # 显示导出计划
        console.print(f"[blue]📋 导出计划: {len(table_names)} 个表[/blue]")
        for table_name in table_names:
            table_config = self.config.get_table_config(table_name)
            console.print(f"  - {table_name}: {table_config['description']}")

        # 连接数据库
        conn = self.connect_database()

        try:
            exported_data = {}

            # 使用进度条
            with Progress() as progress:
                task = progress.add_task("导出数据中...", total=len(table_names))

                for table_name in table_names:
                    try:
                        # 导出单个表
                        table_data = self.export_table(conn, table_name)
                        exported_data[table_name] = table_data
                        progress.advance(task)

                    except Exception as e:
                        console.print(f"[red]❌ 导出表 {table_name} 失败: {e}[/red]")
                        continue

            # 创建导出总结
            summary = self._create_export_summary(exported_data)

            # 保存导出总结
            summary_file = self.output_dir / "export_summary.json"
            with open(summary_file, 'w', encoding='utf-8') as f:
                json.dump(summary, f, ensure_ascii=False, indent=2)

            console.print(f"[green]📊 导出总结已保存: {summary_file}[/green]")

            return exported_data

        finally:
            conn.close()

    def _create_export_summary(self, exported_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建导出总结"""
        end_time = datetime.now()
        duration = end_time - self.stats["start_time"]

        summary = {
            "export_summary": {
                "tables_exported": self.stats["tables_exported"],
                "total_records": self.stats["total_records"],
                "source_locale": self.config["database"]["source_locale"],
                "target_locale": self.config["database"]["target_locale"],
                "export_duration_seconds": duration.total_seconds(),
                "start_time": self.stats["start_time"].isoformat(),
                "end_time": end_time.isoformat(),
                "database_path": str(self.db_path),
                "output_directory": str(self.output_dir)
            },
            "table_details": {}
        }

        # 添加每个表的详细信息
        for table_name, table_data in exported_data.items():
            summary["table_details"][table_name] = {
                "record_count": table_data["total_count"],
                "exported_at": table_data["exported_at"],
                "description": table_data["description"],
                "file_path": str(self.output_dir / f"{table_name}_raw.json")
            }

        return summary

    def print_export_summary(self, exported_data: Dict[str, Any]):
        """打印导出总结"""
        console.print("\n[bold green]📊 数据导出总结[/bold green]")

        table = Table(title="导出统计")
        table.add_column("表名", style="cyan")
        table.add_column("记录数", style="green")
        table.add_column("文件", style="blue")

        total_records = 0
        for table_name, table_data in exported_data.items():
            record_count = table_data["total_count"]
            file_name = f"{table_name}_raw.json"
            table.add_row(table_name, str(record_count), file_name)
            total_records += record_count

        console.print(table)

        console.print(f"[bold]总计: {self.stats['tables_exported']} 个表，{total_records} 条记录[/bold]")

        # 显示导出时间
        end_time = datetime.now()
        duration = end_time - self.stats["start_time"]
        console.print(f"⏱️ 导出耗时: {duration.total_seconds():.2f} 秒")

    def validate_export(self, exported_data: Dict[str, Any]) -> bool:
        """验证导出结果"""
        console.print("[blue]🔍 验证导出结果...[/blue]")

        # 获取所有需要翻译的表名
        expected_tables = set(self.config.get_all_table_names())
        exported_tables = set(exported_data.keys())

        # 检查表完整性
        missing_tables = expected_tables - exported_tables
        if missing_tables:
            console.print(f"[red]❌ 缺少表: {', '.join(missing_tables)}[/red]")
            return False

        # 检查数据完整性
        for table_name, table_data in exported_data.items():
            data = table_data.get("data", [])
            if not data:
                console.print(f"[red]❌ 表 {table_name} 没有数据[/red]")
                return False

            # 检查必填字段
            if table_name == "card":
                required_fields = ["id", "name"]
            elif table_name == "spread":
                required_fields = ["id", "name", "description"]
            elif table_name == "card_interpretation":
                required_fields = ["id", "card_id", "direction", "summary"]
            else:
                required_fields = ["id"]

            for i, record in enumerate(data[:5]):  # 只检查前5条记录
                for field in required_fields:
                    if field not in record or not record[field]:
                        console.print(f"[red]❌ 表 {table_name} 第 {i+1} 条记录缺少必填字段: {field}[/red]")
                        return False

        console.print("[green]✅ 导出验证通过[/green]")
        return True

def main():
    """主函数"""
    try:
        # 创建导出器
        exporter = DatabaseExporter()

        # 导出所有表
        exported_data = exporter.export_all_tables()

        if not exported_data:
            console.print("[red]❌ 没有数据被导出[/red]")
            return

        # 打印总结
        exporter.print_export_summary(exported_data)

        # 验证导出结果
        if exporter.validate_export(exported_data):
            console.print("[bold green]🎉 数据导出成功完成！[/bold green]")
            console.print(f"[blue]📁 输出目录: {exporter.output_dir}[/blue]")
        else:
            console.print("[red]❌ 导出验证失败[/red]")

    except Exception as e:
        console.print(f"[red]❌ 导出过程中发生错误: {e}[/red]")
        logger.error(f"导出失败: {e}", exc_info=True)

if __name__ == "__main__":
    main()