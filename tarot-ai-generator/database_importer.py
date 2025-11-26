#!/usr/bin/env python3
"""
塔罗牌数据库导入器
Tarot Database Importer

从 config_jsons 目录下的 JSON 文件导入数据到 SQLite 数据库
Import data from JSON files in config_jsons directory to SQLite database
"""

import sqlite3
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

class TarotDatabaseImporter:
    def __init__(self, db_path: str = "data/tarot_config.db"):
        """初始化数据库导入器"""
        self.db_path = db_path
        self.config_jsons_dir = Path("data/config_jsons")
        
        # 确保数据目录存在
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        # 连接数据库
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        
        print(f"数据库连接已建立: {db_path}")

    def create_tables(self):
        """创建数据库表结构"""
        print("正在创建数据库表...")
        
        # 1. card_style 表 - 牌面风格
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS card_style (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                image_base_url TEXT NOT NULL
            );
        """)
        
        # 2. card 表 - 卡牌基础信息
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS card (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                arcana TEXT NOT NULL,
                suit TEXT,
                number INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                style_id INTEGER,
                deck TEXT NOT NULL,
                FOREIGN KEY (style_id) REFERENCES card_style (id)
            );
        """)
        
        # 3. dimension 表 - 解读维度定义
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS dimension (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                aspect TEXT,
                aspect_type INTEGER
            );
        """)
        
        # 4. card_interpretation 表 - 牌意主表
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS card_interpretation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_id INTEGER NOT NULL,
                direction TEXT NOT NULL CHECK (direction IN ('正位', '逆位')),
                summary TEXT NOT NULL,
                detail TEXT,
                FOREIGN KEY (card_id) REFERENCES card (id),
                UNIQUE(card_id, direction)
            );
        """)
        
        # 5. card_interpretation_dimension 表 - 牌意维度关联
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS card_interpretation_dimension (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                interpretation_id INTEGER NOT NULL,
                dimension_id INTEGER NOT NULL,
                aspect TEXT,
                aspect_type INTEGER,
                content TEXT NOT NULL,
                FOREIGN KEY (interpretation_id) REFERENCES card_interpretation (id),
                FOREIGN KEY (dimension_id) REFERENCES dimension (id),
                UNIQUE(interpretation_id, dimension_id)
            );
        """)
        
        # 6. spread 表 - 牌阵定义
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS spread (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT NOT NULL,
                card_count INTEGER NOT NULL
            );
        """)
        
        # 创建索引
        indexes = [
            'CREATE INDEX IF NOT EXISTS idx_card_arcana ON card (arcana);',
            'CREATE INDEX IF NOT EXISTS idx_card_deck ON card (deck);',
            'CREATE INDEX IF NOT EXISTS idx_dimension_category ON dimension (category);',
            'CREATE INDEX IF NOT EXISTS idx_interpretation_card_direction ON card_interpretation (card_id, direction);'
        ]
        
        for index_sql in indexes:
            self.cursor.execute(index_sql)
        
        self.conn.commit()
        print("数据库表创建完成")

    def load_json_file(self, filename: str) -> Dict[str, Any]:
        """加载 JSON 文件"""
        file_path = self.config_jsons_dir / filename
        if not file_path.exists():
            print(f"警告: 文件不存在 {file_path}")
            return {}
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                print(f"已加载 {filename}: {len(data.get('data', []))} 条记录")
                return data
        except Exception as e:
            print(f"错误: 无法加载 {filename}: {e}")
            return {}

    def import_card_styles(self):
        """导入牌面风格数据"""
        print("正在导入牌面风格数据...")
        
        # 从 cards.json 中提取风格信息
        cards_data = self.load_json_file("cards.json")
        if not cards_data:
            return
        
        styles = set()
        for card in cards_data.get('data', []):
            style_name = card.get('style_name')
            if style_name:
                styles.add(style_name)
        
        # 插入风格数据
        for style_name in styles:
            try:
                self.cursor.execute("""
                    INSERT OR IGNORE INTO card_style (name, image_base_url) 
                    VALUES (?, ?)
                """, (style_name, f"assets/images/"))
            except Exception as e:
                print(f"插入风格数据失败 {style_name}: {e}")
        
        self.conn.commit()
        print(f"牌面风格数据导入完成: {len(styles)} 个风格")

    def import_cards(self):
        """导入卡牌数据"""
        print("正在导入卡牌数据...")
        
        cards_data = self.load_json_file("cards.json")
        if not cards_data:
            return
        
        for card in cards_data.get('data', []):
            try:
                # 获取 style_id
                style_name = card.get('style_name')
                style_id = None
                if style_name:
                    self.cursor.execute("SELECT id FROM card_style WHERE name = ?", (style_name,))
                    result = self.cursor.fetchone()
                    if result:
                        style_id = result[0]
                
                self.cursor.execute("""
                    INSERT OR IGNORE INTO card (name, arcana, suit, number, image_url, style_id, deck)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    card.get('name'),
                    card.get('arcana'),
                    card.get('suit'),
                    card.get('number'),
                    card.get('image_url'),
                    style_id,
                    card.get('deck')
                ))
            except Exception as e:
                print(f"插入卡牌数据失败 {card.get('name')}: {e}")
        
        self.conn.commit()
        print(f"卡牌数据导入完成: {len(cards_data.get('data', []))} 张卡牌")

    def import_dimensions(self):
        """导入维度数据"""
        print("正在导入维度数据...")
        
        dimensions_data = self.load_json_file("dimensions.json")
        if not dimensions_data:
            return
        
        for dimension in dimensions_data.get('data', []):
            try:
                self.cursor.execute("""
                    INSERT OR IGNORE INTO dimension (name, category, description, aspect, aspect_type)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    dimension.get('name'),
                    dimension.get('category'),
                    dimension.get('description'),
                    dimension.get('aspect'),
                    dimension.get('aspect_type')
                ))
            except Exception as e:
                print(f"插入维度数据失败 {dimension.get('name')}: {e}")
        
        self.conn.commit()
        print(f"维度数据导入完成: {len(dimensions_data.get('data', []))} 个维度")

    def import_card_interpretations(self):
        """导入卡牌解读数据"""
        print("正在导入卡牌解读数据...")
        
        interpretations_data = self.load_json_file("card_interpretations.json")
        if not interpretations_data:
            return
        
        for interpretation in interpretations_data.get('data', []):
            try:
                # 获取 card_id
                card_name = interpretation.get('card_name')
                self.cursor.execute("SELECT id FROM card WHERE name = ?", (card_name,))
                result = self.cursor.fetchone()
                if not result:
                    print(f"警告: 找不到卡牌 {card_name}")
                    continue
                
                card_id = result[0]
                
                self.cursor.execute("""
                    INSERT OR REPLACE INTO card_interpretation (card_id, direction, summary, detail)
                    VALUES (?, ?, ?, ?)
                """, (
                    card_id,
                    interpretation.get('direction'),
                    interpretation.get('summary'),
                    interpretation.get('detail')
                ))
            except Exception as e:
                print(f"插入解读数据失败 {interpretation.get('card_name')} {interpretation.get('direction')}: {e}")
        
        self.conn.commit()
        print(f"卡牌解读数据导入完成: {len(interpretations_data.get('data', []))} 条解读")

    def import_card_interpretation_dimensions(self):
        """导入卡牌解读维度关联数据"""
        print("正在导入卡牌解读维度关联数据...")
        
        dimensions_data = self.load_json_file("card_interpretation_dimensions.json")
        if not dimensions_data:
            return
        
        for item in dimensions_data.get('data', []):
            try:
                # 获取 interpretation_id
                card_name = item.get('card_name')
                direction = item.get('direction')
                
                self.cursor.execute("""
                    SELECT ci.id FROM card_interpretation ci
                    JOIN card c ON ci.card_id = c.id
                    WHERE c.name = ? AND ci.direction = ?
                """, (card_name, direction))
                result = self.cursor.fetchone()
                if not result:
                    print(f"警告: 找不到解读记录 {card_name} {direction}")
                    continue
                
                interpretation_id = result[0]
                
                # 获取 dimension_id
                dimension_name = item.get('dimension_name')
                self.cursor.execute("SELECT id FROM dimension WHERE name = ?", (dimension_name,))
                result = self.cursor.fetchone()
                if not result:
                    print(f"警告: 找不到维度 {dimension_name}")
                    continue
                
                dimension_id = result[0]
                
                self.cursor.execute("""
                    INSERT OR REPLACE INTO card_interpretation_dimension 
                    (interpretation_id, dimension_id, aspect, aspect_type, content)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    interpretation_id,
                    dimension_id,
                    item.get('aspect'),
                    item.get('aspect_type'),
                    item.get('content')
                ))
            except Exception as e:
                print(f"插入维度关联数据失败 {item.get('card_name')} {item.get('dimension_name')}: {e}")
        
        self.conn.commit()
        print(f"卡牌解读维度关联数据导入完成: {len(dimensions_data.get('data', []))} 条关联")

    def import_spreads(self):
        """导入牌阵数据"""
        print("正在导入牌阵数据...")
        
        spreads_data = self.load_json_file("spreads.json")
        if not spreads_data:
            return
        
        for spread in spreads_data.get('data', []):
            try:
                self.cursor.execute("""
                    INSERT OR IGNORE INTO spread (name, description, card_count)
                    VALUES (?, ?, ?)
                """, (
                    spread.get('name'),
                    spread.get('description'),
                    spread.get('card_count')
                ))
            except Exception as e:
                print(f"插入牌阵数据失败 {spread.get('name')}: {e}")
        
        self.conn.commit()
        print(f"牌阵数据导入完成: {len(spreads_data.get('data', []))} 个牌阵")

    def import_all_data(self):
        """导入所有数据"""
        print("开始导入所有数据...")
        print("=" * 50)
        
        # 按依赖关系顺序导入
        self.create_tables()
        # self.import_card_styles()
        # self.import_cards()
        self.import_dimensions()
        # self.import_card_interpretations()
        self.import_card_interpretation_dimensions()
        # self.import_spreads()
        
        print("=" * 50)
        print("所有数据导入完成!")
        
        # 显示统计信息
        self.show_statistics()

    def show_statistics(self):
        """显示数据库统计信息"""
        print("\n数据库统计信息:")
        print("-" * 30)
        
        tables = [
            ('card_style', '牌面风格'),
            ('card', '卡牌'),
            ('dimension', '维度'),
            ('card_interpretation', '卡牌解读'),
            ('card_interpretation_dimension', '解读维度关联'),
            ('spread', '牌阵')
        ]
        
        for table_name, description in tables:
            self.cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = self.cursor.fetchone()[0]
            print(f"{description}: {count} 条记录")

    def close(self):
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()
            print("数据库连接已关闭")

def main():
    """主函数"""
    print("塔罗牌数据库导入器")
    print("=" * 50)
    
    # 创建导入器实例
    importer = TarotDatabaseImporter()
    
    try:
        # 导入所有数据
        importer.import_all_data()
    except Exception as e:
        print(f"导入过程中发生错误: {e}")
    finally:
        # 关闭数据库连接
        importer.close()

if __name__ == "__main__":
    main()