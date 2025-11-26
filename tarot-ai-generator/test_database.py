#!/usr/bin/env python3
"""
测试塔罗牌数据库
Test Tarot Database

验证数据库中的数据是否正确导入
Verify that data was correctly imported into the database
"""

import sqlite3
from pathlib import Path

def test_database():
    """测试数据库数据"""
    db_path = "tarot-ai-generator/data/tarot_config.db"
    
    if not Path(db_path).exists():
        print(f"错误: 数据库文件不存在 {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("塔罗牌数据库测试")
    print("=" * 50)
    
    # 测试1: 检查表结构
    print("1. 检查表结构:")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    for table in tables:
        print(f"   - {table[0]}")
    
    print()
    
    # 测试2: 检查数据统计
    print("2. 数据统计:")
    tables_info = [
        ('card_style', '牌面风格'),
        ('card', '卡牌'),
        ('dimension', '维度'),
        ('card_interpretation', '卡牌解读'),
        ('card_interpretation_dimension', '解读维度关联'),
        ('spread', '牌阵')
    ]
    
    for table_name, description in tables_info:
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"   {description}: {count} 条记录")
    
    print()
    
    # 测试3: 查看样本数据
    print("3. 样本数据:")
    
    # 查看几张卡牌
    print("   卡牌样本:")
    cursor.execute("SELECT name, arcana, suit, number FROM card LIMIT 5")
    cards = cursor.fetchall()
    for card in cards:
        print(f"     - {card[0]} ({card[1]}, {card[2] or 'N/A'}, {card[3]})")
    
    print()
    
    # 查看几个维度
    print("   维度样本:")
    cursor.execute("SELECT name, category, aspect FROM dimension LIMIT 5")
    dimensions = cursor.fetchall()
    for dim in dimensions:
        print(f"     - {dim[0]} (类别: {dim[1]}, 方面: {dim[2]})")
    
    print()
    
    # 查看几条解读
    print("   解读样本:")
    cursor.execute("""
        SELECT c.name, ci.direction, ci.summary 
        FROM card_interpretation ci
        JOIN card c ON ci.card_id = c.id
        LIMIT 5
    """)
    interpretations = cursor.fetchall()
    for interp in interpretations:
        print(f"     - {interp[0]} {interp[1]}: {interp[2]}")
    
    print()
    
    # 测试4: 检查关联数据
    print("4. 关联数据测试:")
    cursor.execute("""
        SELECT COUNT(*) FROM card_interpretation_dimension cid
        JOIN card_interpretation ci ON cid.interpretation_id = ci.id
        JOIN dimension d ON cid.dimension_id = d.id
    """)
    relation_count = cursor.fetchone()[0]
    print(f"   有效的解读-维度关联: {relation_count} 条")
    
    # 查看一个具体的关联示例
    cursor.execute("""
        SELECT c.name, ci.direction, d.name, SUBSTR(cid.content, 1, 50) as content_preview
        FROM card_interpretation_dimension cid
        JOIN card_interpretation ci ON cid.interpretation_id = ci.id
        JOIN card c ON ci.card_id = c.id
        JOIN dimension d ON cid.dimension_id = d.id
        LIMIT 3
    """)
    relations = cursor.fetchall()
    print("   关联示例:")
    for rel in relations:
        print(f"     - {rel[0]} {rel[1]} -> {rel[2]}: {rel[3]}...")
    
    print()
    print("=" * 50)
    print("数据库测试完成!")
    
    conn.close()

if __name__ == "__main__":
    test_database()