#!/usr/bin/env python3
"""
Import generated card interpretation dimensions into SQLite.

The script consumes JSON outputs from the multi-language generator
(`debug-sample`, `dimension`, or `question` subcommands) and writes
the contents into the `card_interpretation_dimension` and
`card_interpretation_dimension_translation` tables.

Usage example:
    python scripts/import_dimension_results.py \
        --json output/dimensions/dimension_74.json \
        --root-locale zh-CN \
        --locales zh-CN en-US \
        --dry-run
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from config import Config
except Exception:  # pragma: no cover - fallback when Config import fails
    Config = None  # type: ignore


@dataclass
class LocaleRecord:
    interpretation_id: int
    dimension_id: int
    locale: str
    aspect: Optional[str]
    aspect_type: Optional[int]
    content: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import generated dimension interpretations into SQLite."
    )
    parser.add_argument(
        "--json",
        required=True,
        help="Path to generator output JSON (debug-sample/dimension/question).",
    )
    parser.add_argument(
        "--db",
        help="Path to tarot_config.db (default: value from config.settings.yaml).",
    )
    parser.add_argument(
        "--root-locale",
        help="Root locale corresponding to card_interpretation_dimension content (default from config).",
    )
    parser.add_argument(
        "--locales",
        nargs="*",
        help="Restrict import to specific locales (default: all locales present in JSON).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without writing to the database.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print detailed progress information.",
    )
    return parser.parse_args()


def load_payload(path: Path) -> Dict[str, object]:
    if not path.exists():
        raise FileNotFoundError(f"JSON 文件不存在: {path}")
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def parse_int(value: object) -> Optional[int]:
    if value in (None, "", "null"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValueError(f"无法将值转换为整数: {value!r}")


def collect_records(payload: Dict[str, object], root_locale: str) -> Tuple[List[LocaleRecord], List[str]]:
    """Extract per-locale records from generator payload."""
    errors: List[str] = []

    def iter_entries() -> Iterable[Dict[str, object]]:
        if "items" in payload and isinstance(payload["items"], list):
            return payload["items"]  # debug-sample structure
        if "records" in payload and isinstance(payload["records"], list):
            return payload["records"]  # dimension output
        raise ValueError("无法识别 JSON 结构：缺少 `items` 或 `records` 字段")

    entries = iter_entries()
    default_dimension_id = parse_int(payload.get("dimension_id"))
    records: List[LocaleRecord] = []

    for index, entry in enumerate(entries, start=1):
        if not isinstance(entry, dict):
            errors.append(f"第 {index} 条记录不是对象")
            continue

        interpretation_id = entry.get("interpretation_id")
        dimension_id = entry.get("dimension_id", default_dimension_id)

        if interpretation_id is None or dimension_id is None:
            errors.append(f"第 {index} 条记录缺少 interpretation_id 或 dimension_id")
            continue

        try:
            interpretation_id = int(interpretation_id)
            dimension_id = int(dimension_id)
        except (TypeError, ValueError):
            errors.append(f"第 {index} 条记录的 ID 无法转换为整数: {interpretation_id}, {dimension_id}")
            continue

        dimension_meta = entry.get("dimension") or entry.get("dimensions") or {}
        if not isinstance(dimension_meta, dict):
            errors.append(f"第 {index} 条记录的 `dimension` 字段不是对象")
            continue

        results = entry.get("results") or {}
        if not isinstance(results, dict):
            errors.append(f"第 {index} 条记录的 `results` 字段不是对象")
            continue

        root_dimension = dimension_meta.get(root_locale) or {}
        if not isinstance(root_dimension, dict):
            root_dimension = {}

        if not root_dimension:
            errors.append(f"第 {index} 条记录缺少根语言 {root_locale} 的维度信息")
            continue

        root_result = results.get(root_locale) or {}
        if not isinstance(root_result, dict) or not root_result.get("content"):
            errors.append(f"第 {index} 条记录缺少根语言 {root_locale} 的生成内容")
            continue

        root_aspect = root_dimension.get("aspect")
        root_aspect_type = parse_int(root_dimension.get("aspect_type"))

        # Root locale record
        records.append(
            LocaleRecord(
                interpretation_id=interpretation_id,
                dimension_id=dimension_id,
                locale=root_locale,
                aspect=root_aspect,
                aspect_type=root_aspect_type,
                content=str(root_result["content"]),
            )
        )

        # Translations
        for locale, meta in results.items():
            if locale == root_locale:
                continue
            if not isinstance(meta, dict):
                errors.append(f"第 {index} 条记录的语言 {locale} 内容不是对象")
                continue
            content = meta.get("content")
            if not content:
                continue  # skip empty outputs

            dim_meta = dimension_meta.get(locale) or {}
            if not isinstance(dim_meta, dict):
                dim_meta = {}

            records.append(
                LocaleRecord(
                    interpretation_id=interpretation_id,
                    dimension_id=dimension_id,
                    locale=locale,
                    aspect=dim_meta.get("aspect") or root_aspect,
                    aspect_type=parse_int(dim_meta.get("aspect_type")) or root_aspect_type,
                    content=str(content),
                )
            )

    return records, errors


def ensure_connection(db_path: Path) -> sqlite3.Connection:
    if not db_path.exists():
        raise FileNotFoundError(f"数据库不存在: {db_path}")
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def upsert_dimension(
    cursor: sqlite3.Cursor,
    interpretation_id: int,
    dimension_id: int,
    aspect: Optional[str],
    aspect_type: Optional[int],
    content: str,
) -> int:
    cursor.execute(
        """
        INSERT INTO card_interpretation_dimension
            (interpretation_id, dimension_id, aspect, aspect_type, content)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(interpretation_id, dimension_id)
        DO UPDATE SET
            aspect = excluded.aspect,
            aspect_type = excluded.aspect_type,
            content = excluded.content
        """,
        (interpretation_id, dimension_id, aspect, aspect_type, content),
    )

    cursor.execute(
        """
        SELECT id
        FROM card_interpretation_dimension
        WHERE interpretation_id = ? AND dimension_id = ?
        """,
        (interpretation_id, dimension_id),
    )
    row = cursor.fetchone()
    if not row:
        raise RuntimeError(
            f"未找到 card_interpretation_dimension 记录 (interpretation_id={interpretation_id}, dimension_id={dimension_id})"
        )
    return int(row["id"])


def upsert_translation(
    cursor: sqlite3.Cursor,
    dimension_interpretation_id: int,
    locale: str,
    aspect: Optional[str],
    content: str,
) -> None:
    cursor.execute(
        """
        INSERT INTO card_interpretation_dimension_translation
            (dimension_interpretation_id, locale, aspect, content)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(dimension_interpretation_id, locale)
        DO UPDATE SET
            aspect = excluded.aspect,
            content = excluded.content
        """,
        (dimension_interpretation_id, locale, aspect, content),
    )


def main() -> None:
    args = parse_args()
    cfg = Config() if Config else None

    json_path = Path(args.json)
    payload = load_payload(json_path)

    root_locale = args.root_locale or (cfg.ROOT_LOCALE if cfg else None)
    if not root_locale:
        raise ValueError("请通过 --root-locale 指定根语言，或在 config/settings.yaml 中配置 database.root_locale")

    records, errors = collect_records(payload, root_locale=root_locale)
    if errors:
        for line in errors:
            print(f"[警告] {line}")
        if not records:
            raise SystemExit("提取不到有效记录，终止导入。")

    if args.locales:
        allowed = {loc for loc in args.locales}
        records = [rec for rec in records if rec.locale in allowed]

    if not records:
        raise SystemExit("没有符合条件的记录可供导入。")

    db_path = Path(args.db) if args.db else Path(cfg.DATABASE_PATH) if cfg else Path("data/tarot_config.db")
    conn = ensure_connection(db_path)
    cursor = conn.cursor()

    counters = defaultdict(int)

    try:
        grouped: Dict[Tuple[int, int], List[LocaleRecord]] = defaultdict(list)
        for rec in records:
            grouped[(rec.interpretation_id, rec.dimension_id)].append(rec)

        for (interpretation_id, dimension_id), recs in grouped.items():
            # Process root locale first
            root_entry = next((r for r in recs if r.locale == root_locale), None)
            if not root_entry:
                print(f"[跳过] interpretation_id={interpretation_id}, dimension_id={dimension_id} 缺少根语言 {root_locale}")
                continue

            dimension_row_id = upsert_dimension(
                cursor,
                interpretation_id=interpretation_id,
                dimension_id=dimension_id,
                aspect=root_entry.aspect,
                aspect_type=root_entry.aspect_type,
                content=root_entry.content,
            )
            counters["upsert_root"] += 1

            for rec in recs:
                if rec.locale == root_locale:
                    continue
                upsert_translation(
                    cursor,
                    dimension_interpretation_id=dimension_row_id,
                    locale=rec.locale,
                    aspect=rec.aspect,
                    content=rec.content,
                )
                counters["upsert_translation"] += 1

        if args.dry_run:
            conn.rollback()
            action = "Dry run 已完成，未写入数据库。"
        else:
            conn.commit()
            action = "导入已提交。"

    finally:
        conn.close()

    print(action)
    print(f"根语言记录写入/更新: {counters['upsert_root']}")
    print(f"翻译记录写入/更新: {counters['upsert_translation']}")


if __name__ == "__main__":
    main()
