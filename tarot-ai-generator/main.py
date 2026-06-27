#!/usr/bin/env python3
"""
多语言塔罗维度解读 CLI

提供三种核心功能：
1. debug-sample  —— 随机抽样 10 个卡牌×维度组合，便于调试提示词模板；
2. dimension     —— 为指定维度生成完整的多语言解读；
3. question      —— 基于问题描述查询关联维度，并批量生成多语言解读。
"""

from __future__ import annotations

import argparse
import asyncio
from pathlib import Path
from typing import Sequence

from rich.console import Console
from rich.traceback import install as install_rich_traceback

from config import Config
from services.generation_service import GenerationService
from multilingual import MultilingualDimensionGenerator
from import_multilingual_dimensions import import_multilingual_dimensions as import_multilingual_dimensions_into_db

install_rich_traceback(show_locals=False)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="tarot-dimension-generator",
        description="塔罗牌维度解读多语言生成工具",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # ------------------------------------------------------------------ #
    # debug-sample
    # ------------------------------------------------------------------ #
    debug_parser = subparsers.add_parser(
        "debug-sample",
        help="随机抽取卡牌×维度组合生成样本，便于调试提示词。",
    )
    debug_parser.add_argument(
        "--count",
        type=int,
        default=10,
        help="样本数量（默认 10）。",
    )
    debug_parser.add_argument(
        "--locales",
        nargs="+",
        help="覆盖默认语言列表（使用 config.database.locales）。",
    )
    debug_parser.add_argument(
        "--output-dir",
        type=Path,
        help="自定义输出目录，默认写入 output/debug_samples。",
    )

    # ------------------------------------------------------------------ #
    # dimension
    # ------------------------------------------------------------------ #
    dimension_parser = subparsers.add_parser(
        "dimension",
        help="为指定维度生成全量多语言解读。",
    )
    dimension_parser.add_argument(
        "--name",
        required=True,
        help="维度名称或 ID（根语言）。",
    )
    dimension_parser.add_argument(
        "--locales",
        nargs="+",
        help="覆盖默认语言列表（使用 config.database.locales）。",
    )
    dimension_parser.add_argument(
        "--no-persist",
        action="store_true",
        help="仅返回结果，不写入输出文件。",
    )

    # ------------------------------------------------------------------ #
    # multilingual
    # ------------------------------------------------------------------ #
    multilingual_parser = subparsers.add_parser(
        "multilingual",
        help="根据单个问题生成多语言维度定义（dimension 表描述数据）。",
    )
    multilingual_parser.add_argument(
        "--text",
        required=True,
        help="问题描述文本，会写入维度 description 以供 question 流程匹配。",
    )
    multilingual_parser.add_argument(
        "--spread-type",
        help="可选牌阵类型，默认读取配置文件。",
    )
    multilingual_parser.add_argument(
        "--output",
        type=Path,
        help="自定义输出文件路径（默认 config.general.multilingual_output_path）。",
    )
    multilingual_parser.add_argument(
        "--db",
        type=Path,
        help="自定义数据库路径，默认读取 config.database.path。",
    )
    multilingual_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="仅生成并预览导入效果，不写入数据库。",
    )
    multilingual_parser.add_argument(
        "--no-import",
        action="store_true",
        help="只生成 JSON，不执行数据库导入。",
    )

    # ------------------------------------------------------------------ #
    # question
    # ------------------------------------------------------------------ #
    question_parser = subparsers.add_parser(
        "question",
        help="根据问题描述（维度 description 字段）批量生成关联维度解读。",
    )
    question_parser.add_argument(
        "--text",
        required=True,
        help="问题描述文本，将匹配 dimension.description 或对应翻译。",
    )
    question_parser.add_argument(
        "--question-locale",
        help="问题文本所属语言，默认使用根语言。",
    )
    question_parser.add_argument(
        "--locales",
        nargs="+",
        help="覆盖默认生成语言列表。",
    )
    question_parser.add_argument(
        "--spread-type",
        help="牌阵类型标记，默认 three-card。",
    )

    return parser


async def async_main(args: argparse.Namespace, console: Console) -> None:
    config = Config()
    config.validate()
    service = GenerationService(config, console)

    if args.command == "debug-sample":
        await service.generate_debug_samples(
            count=args.count,
            locales=args.locales,
            output_dir=args.output_dir,
        )
        return

    if args.command == "dimension":
        persist = not args.no_persist
        await service.generate_dimension(
            args.name,
            locales=args.locales,
            persist=persist,
        )
        return

    if args.command == "multilingual":
        generator = MultilingualDimensionGenerator(config, console)
        output_path = await asyncio.to_thread(
            generator.generate,
            args.text,
            spread_type=args.spread_type,
            output_path=str(args.output) if args.output else None,
        )
        console.print(f"[green]多语言维度定义已生成: {output_path}[/green]")
        if args.no_import:
            return

        db_target = str(args.db) if args.db else config.DATABASE_PATH
        console.print(f"[blue]正在导入维度描述至数据库: {db_target}[/blue]")

        result = await asyncio.to_thread(
            import_multilingual_dimensions_into_db,
            output_path,
            db_path=db_target,
            dry_run=args.dry_run,
            verbose=True,
        )
        status = "Dry run 完成" if result["dry_run"] else "导入完成"
        console.print(
            f"[green]{status}[/green] "
            f"(新增 {result['inserted']} / 更新 {result['updated']} / 翻译 {result['translations']})"
        )
        return

    if args.command == "question":
        await service.generate_question(
            question=args.text,
            question_locale=args.question_locale,
            locales=args.locales,
            spread_type=args.spread_type,
        )
        return

    raise ValueError(f"未知命令: {args.command}")


def main(argv: Sequence[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    console = Console(force_terminal=True, width=120)

    try:
        asyncio.run(async_main(args, console))
    except KeyboardInterrupt:  # pragma: no cover - CLI interruption
        console.print("[red]操作被用户中止。[/red]")
    except Exception as exc:  # pragma: no cover - display friendly error
        console.print(f"[red]执行失败: {exc}[/red]")
        raise


if __name__ == "__main__":
    main()
