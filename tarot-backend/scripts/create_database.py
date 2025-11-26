#!/usr/bin/env python3
"""
创建空的后台数据库文件

只创建表结构，不复制数据。
"""
import sys
from pathlib import Path

# 添加父目录到 Python 路径，以便导入 app 模块
sys.path.append(str(Path(__file__).parent.parent))

from app.database import create_tables

def main():
    """主函数"""
    print("开始创建后台数据库...")

    try:
        # 创建数据库表结构
        create_tables()
        print("后台数据库创建完成！")
        print("数据库文件: ./backend_tarot.db")

    except Exception as e:
        print(f"数据库创建失败: {e}")
        return 1

    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)