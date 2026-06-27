#!/usr/bin/env python3
"""
Verify that each dimension has the expected number of interpretation rows and translations.

This script helps confirm data integrity after importing generated dimension
interpretations. It checks both `card_interpretation_dimension` and
`card_interpretation_dimension_translation` tables to ensure every dimension ID
has the expected number of records.
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from config import Config
except Exception:  # pragma: no cover - fallback when Config import fails
    Config = None  # type: ignore


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate interpretation counts per dimension and locale."
    )
    parser.add_argument(
        "--dimension-ids",
        nargs="+",
        type=int,
        required=True,
        help="Dimension IDs to verify.",
    )
    parser.add_argument(
        "--expected-count",
        type=int,
        default=156,
        help="Expected number of interpretation records per dimension.",
    )
    parser.add_argument(
        "--locales",
        nargs="*",
        help="Translation locales to verify (default: config locales excluding root locale).",
    )
    parser.add_argument(
        "--db",
        help="Path to tarot_config.db (default: value from config/settings.yaml).",
    )
    return parser.parse_args()


def ensure_connection(path: Path) -> sqlite3.Connection:
    if not path.exists():
        raise FileNotFoundError(f"数据库文件不存在: {path}")
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    return conn


def normalize_dimension_ids(values: Iterable[int]) -> List[int]:
    unique = sorted({int(v) for v in values})
    if not unique:
        raise ValueError("请至少提供一个 dimension_id。")
    return unique


def fetch_root_counts(cursor: sqlite3.Cursor, dimension_ids: Sequence[int]) -> Dict[int, Tuple[int, int]]:
    placeholders = ",".join("?" for _ in dimension_ids)
    query = f"""
        SELECT
            dimension_id,
            COUNT(*) AS total_rows,
            COUNT(DISTINCT interpretation_id) AS distinct_interpretations
        FROM card_interpretation_dimension
        WHERE dimension_id IN ({placeholders})
        GROUP BY dimension_id
    """
    cursor.execute(query, tuple(dimension_ids))
    return {
        int(row["dimension_id"]): (int(row["total_rows"]), int(row["distinct_interpretations"]))
        for row in cursor.fetchall()
    }


def fetch_translation_counts(
    cursor: sqlite3.Cursor, dimension_ids: Sequence[int], locale: str
) -> Dict[int, int]:
    placeholders = ",".join("?" for _ in dimension_ids)
    query = f"""
        SELECT
            d.dimension_id,
            COUNT(*) AS total_rows
        FROM card_interpretation_dimension AS d
        JOIN card_interpretation_dimension_translation AS t
            ON t.dimension_interpretation_id = d.id
        WHERE d.dimension_id IN ({placeholders})
          AND t.locale = ?
        GROUP BY d.dimension_id
    """
    cursor.execute(query, (*dimension_ids, locale))
    return {int(row["dimension_id"]): int(row["total_rows"]) for row in cursor.fetchall()}


def main() -> None:
    args = parse_args()
    cfg = Config() if Config else None

    dimension_ids = normalize_dimension_ids(args.dimension_ids)
    expected_count = args.expected_count

    if args.db:
        db_path = Path(args.db)
    elif cfg:
        db_path = Path(cfg.DATABASE_PATH)
    else:
        db_path = Path("data/tarot_config.db")

    if args.locales:
        seen = []
        for loc in args.locales:
            if not loc:
                continue
            if cfg and loc == cfg.ROOT_LOCALE:
                continue
            if loc not in seen:
                seen.append(loc)
        locales = seen
    elif cfg:
        locales = [loc for loc in cfg.TARGET_LOCALES if loc != cfg.ROOT_LOCALE]
    else:
        locales = []

    conn = ensure_connection(db_path)
    cursor = conn.cursor()

    root_counts = fetch_root_counts(cursor, dimension_ids)

    root_failures: List[str] = []
    for dimension_id in dimension_ids:
        total_rows, distinct_rows = root_counts.get(dimension_id, (0, 0))
        if total_rows != expected_count:
            root_failures.append(
                f"dimension_id={dimension_id} 在 card_interpretation_dimension 中的行数为 {total_rows}，期望 {expected_count}。"
            )
        if distinct_rows != expected_count:
            root_failures.append(
                f"dimension_id={dimension_id} 拥有 {distinct_rows} 个唯一 interpretation_id，期望 {expected_count}。"
            )

    translation_failures: List[str] = []
    for locale in locales:
        translation_counts = fetch_translation_counts(cursor, dimension_ids, locale)
        for dimension_id in dimension_ids:
            count = translation_counts.get(dimension_id, 0)
            if count != expected_count:
                translation_failures.append(
                    f"dimension_id={dimension_id} 在 locale {locale} 的翻译记录数为 {count}，期望 {expected_count}。"
                )

    if not root_failures and not translation_failures:
        print("验证通过：所有指定 dimension 在根语言与翻译表中均包含预期数量的记录。")
        if locales:
            summary_locales = ", ".join(locales)
            print(f"校验的 locales: {summary_locales}")
        conn.close()
        raise SystemExit(0)

    print("验证失败：")
    for line in root_failures:
        print(f"- {line}")
    for line in translation_failures:
        print(f"- {line}")

    conn.close()
    raise SystemExit(1)


if __name__ == "__main__":
    main()
