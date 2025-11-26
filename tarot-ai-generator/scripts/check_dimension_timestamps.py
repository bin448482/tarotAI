#!/usr/bin/env python3
"""
Scan tarot_config.db for timestamp-like phrases inside dimension contents.

The script inspects both card_interpretation_dimension and
card_interpretation_dimension_translation, flagging any content values that
appear to contain concrete dates, timestamps, or similar timeline hints. It
reports the affected dimension_id values together with basic context so we
can fix the generated text before re-importing.

Usage:
    python scripts/check_dimension_timestamps.py
    python scripts/check_dimension_timestamps.py --db data/tarot_config.db --no-snippet
"""

from __future__ import annotations

import argparse
import re
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from config import Config
except Exception:  # pragma: no cover - fallback when Config import fails
    Config = None  # type: ignore


PATTERN_DEFS: Sequence[Tuple[str, str]] = (
    ("iso_datetime", r"\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?\b"),
    ("iso_date", r"\b\d{4}-\d{2}-\d{2}\b"),
    ("slash_date", r"\b\d{4}/\d{1,2}/\d{1,2}\b"),
    ("compact_digits", r"\b\d{8,}\b"),
    ("underscored_stamp", r"_[0-9]{6,}"),
    ("chinese_date", r"\d{4}年\d{1,2}月\d{1,2}日"),
)
PATTERNS = [(name, re.compile(expr)) for name, expr in PATTERN_DEFS]


@dataclass
class MatchRecord:
    table: str
    dimension_id: int
    interpretation_id: int
    locale: str
    patterns: List[str]
    snippet: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="检查维度内容中是否含有具体日期或时间戳描述"
    )
    parser.add_argument(
        "--db",
        help="指定 tarot_config.db 路径，默认读取 config/settings.yaml 中的配置",
    )
    parser.add_argument(
        "--context",
        type=int,
        default=60,
        help="内容片段上下文字符数（默认 60）",
    )
    parser.add_argument(
        "--no-snippet",
        action="store_true",
        help="只输出命中列表，不附带内容片段",
    )
    return parser.parse_args()


def detect_markers(text: str) -> List[Tuple[str, str, Tuple[int, int]]]:
    hits: List[Tuple[str, str, Tuple[int, int]]] = []
    for name, regex in PATTERNS:
        for match in regex.finditer(text):
            hits.append((name, match.group(0), match.span()))
    return hits


def make_snippet(text: str, span: Tuple[int, int], context: int) -> str:
    start = max(span[0] - context, 0)
    end = min(span[1] + context, len(text))
    snippet = text[start:end].replace("\n", " ").replace("\r", " ")
    return snippet.strip()


def ensure_connection(db_path: Path) -> sqlite3.Connection:
    if not db_path.exists():
        raise FileNotFoundError(f"数据库不存在: {db_path}")
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def scan_root(cursor: sqlite3.Cursor, context: int) -> Iterable[MatchRecord]:
    query = """
        SELECT id, interpretation_id, dimension_id, content
        FROM card_interpretation_dimension
    """
    for row in cursor.execute(query):
        content = row["content"] or ""
        markers = detect_markers(content)
        if not markers:
            continue
        snippet = make_snippet(content, markers[0][2], context)
        yield MatchRecord(
            table="card_interpretation_dimension",
            dimension_id=int(row["dimension_id"]),
            interpretation_id=int(row["interpretation_id"]),
            locale="root",
            patterns=sorted({name for name, _, _ in markers}),
            snippet=snippet,
        )


def scan_translations(cursor: sqlite3.Cursor, context: int) -> Iterable[MatchRecord]:
    query = """
        SELECT
            d.dimension_id,
            d.interpretation_id,
            t.locale,
            t.content
        FROM card_interpretation_dimension_translation AS t
        INNER JOIN card_interpretation_dimension AS d
            ON d.id = t.dimension_interpretation_id
    """
    for row in cursor.execute(query):
        content = row["content"] or ""
        markers = detect_markers(content)
        if not markers:
            continue
        snippet = make_snippet(content, markers[0][2], context)
        yield MatchRecord(
            table="card_interpretation_dimension_translation",
            dimension_id=int(row["dimension_id"]),
            interpretation_id=int(row["interpretation_id"]),
            locale=str(row["locale"]),
            patterns=sorted({name for name, _, _ in markers}),
            snippet=snippet,
        )


def main() -> None:
    args = parse_args()
    cfg = Config() if Config else None
    db_path = Path(args.db) if args.db else Path(cfg.DATABASE_PATH) if cfg else PROJECT_ROOT / "data/tarot_config.db"

    conn = ensure_connection(db_path)
    cursor = conn.cursor()

    matches: List[MatchRecord] = []
    matches.extend(scan_root(cursor, context=args.context))
    matches.extend(scan_translations(cursor, context=args.context))
    conn.close()

    if not matches:
        print("未检测到包含日期或时间戳表达的内容。")
        return

    affected_ids = sorted({rec.dimension_id for rec in matches})
    print(f"检测到 {len(matches)} 条可疑记录，涉及 dimension_id: {', '.join(str(i) for i in affected_ids)}")

    for rec in matches:
        print(
            f"- table={rec.table}, dimension_id={rec.dimension_id}, "
            f"interpretation_id={rec.interpretation_id}, locale={rec.locale}, "
            f"patterns={','.join(rec.patterns)}"
        )
        if not args.no_snippet:
            print(f"  snippet: {rec.snippet}")


if __name__ == "__main__":
    main()
