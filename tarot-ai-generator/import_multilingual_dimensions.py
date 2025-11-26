#!/usr/bin/env python3
"""
Import multilingual dimension data into the tarot_config.db SQLite database.

Expected input is the JSON output produced by running:
    python main.py --multilingual-question "..."
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, Tuple, Union


def load_multilingual_payload(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"输出文件不存在: {path}")

    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    if "dimensions" not in data:
        raise ValueError("JSON 中缺少 `dimensions` 字段，无法解析。")
    if "root_dimension_locale" not in data:
        raise ValueError("JSON 中缺少 `root_dimension_locale` 字段，无法解析。")

    return data


def upsert_dimension(
    cursor: sqlite3.Cursor,
    *,
    name: str,
    category: str,
    description: str,
    aspect: str | None,
    aspect_type: int | None,
) -> Tuple[int, bool, bool]:
    cursor.execute(
        "SELECT id, category, description, aspect, aspect_type "
        "FROM dimension WHERE name = ?",
        (name,),
    )
    existing = cursor.fetchone()

    if existing:
        dimension_id = existing[0]
        changed = not (
            existing[1] == category
            and existing[2] == description
            and existing[3] == aspect
            and existing[4] == aspect_type
        )
        if not changed:
            return dimension_id, False, False

        cursor.execute(
            """
            UPDATE dimension
            SET category = ?, description = ?, aspect = ?, aspect_type = ?
            WHERE id = ?
            """,
            (category, description, aspect, aspect_type, dimension_id),
        )
        return dimension_id, False, True

    cursor.execute(
        """
        INSERT INTO dimension (name, category, description, aspect, aspect_type)
        VALUES (?, ?, ?, ?, ?)
        """,
        (name, category, description, aspect, aspect_type),
    )
    return cursor.lastrowid, True, True


def upsert_dimension_translation(
    cursor: sqlite3.Cursor,
    *,
    dimension_id: int,
    locale: str,
    name: str,
    description: str,
    aspect: str | None,
    category: str | None,
) -> bool:
    cursor.execute(
        """
        INSERT INTO dimension_translation (dimension_id, locale, name, description, aspect, category)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(dimension_id, locale)
        DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            aspect = excluded.aspect,
            category = excluded.category
        """,
        (dimension_id, locale, name, description, aspect, category),
    )
    return cursor.rowcount == 1


def iter_localizations(record: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
    localizations = record.get("localizations", [])
    if not isinstance(localizations, list):
        raise ValueError("`localizations` 字段不是列表。")
    for entry in localizations:
        if not isinstance(entry, dict):
            raise ValueError("`localizations` 条目必须是对象。")
        yield entry


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="将 multilingual_dimensions.json 导入 SQLite 数据库的 dimension 与 dimension_translation 表。"
    )
    parser.add_argument(
        "--json",
        default="output/multilingual_dimensions.json",
        help="多语言输出 JSON 路径（默认: output/multilingual_dimensions.json）",
    )
    parser.add_argument(
        "--db",
        default="data/tarot_config.db",
        help="SQLite 数据库路径（默认: data/tarot_config.db）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="仅打印导入动作，不写入数据库。",
    )
    return parser.parse_args()


def import_multilingual_dimensions(  # type: ignore[override]
    json_path: Union[str, Path],
    *,
    db_path: Union[str, Path] = "data/tarot_config.db",
    dry_run: bool = False,
    verbose: bool = False,
) -> Dict[str, Any]:
    payload = load_multilingual_payload(Path(json_path))
    root_locale = payload["root_dimension_locale"]
    source_locale = payload.get("source_locale") or root_locale
    source_question = payload.get("source_question") or ""
    dimensions = payload.get("dimensions", [])

    locale_questions: Dict[str, str] = {}
    if source_locale and source_question:
        locale_questions[source_locale] = source_question
    for locale_meta in payload.get("locales", []):
        if not isinstance(locale_meta, dict):
            continue
        loc = locale_meta.get("locale")
        question_text = locale_meta.get("question")
        if loc and isinstance(question_text, str) and question_text:
            locale_questions[loc] = question_text

    if not dimensions:
        return {
            "inserted": 0,
            "updated": 0,
            "translations": 0,
            "dry_run": dry_run,
            "message": "没有可导入的维度记录。",
        }

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    inserted_dimensions = 0
    updated_dimensions = 0
    upserted_translations = 0

    timestamp_suffix = datetime.utcnow().strftime("_%Y%m%d%H%M%S")

    try:
        for idx, record in enumerate(dimensions, start=1):
            localizations = list(iter_localizations(record))

            root_entry = next((loc for loc in localizations if loc.get("locale") == root_locale), None)
            if not root_entry:
                raise ValueError(f"第 {idx} 条记录缺少根语言 {root_locale} 的本地化数据。")

            category = root_entry.get("category") or record.get("dimension_key", {}).get("category")
            aspect = root_entry.get("aspect") or record.get("dimension_key", {}).get("aspect")
            aspect_type_raw = root_entry.get("aspect_type") or record.get("dimension_key", {}).get("aspect_type")
            aspect_type = int(aspect_type_raw) if aspect_type_raw not in (None, "") else None

            name = root_entry.get("name")
            description = locale_questions.get(root_locale)

            if not name:
                raise ValueError(f"第 {idx} 条记录的根语言名称为空。")

            unique_name = f"{name}{timestamp_suffix}"

            dim_id, created, changed = upsert_dimension(
                cursor,
                name=unique_name,
                category=category or "",
                description=description,
                aspect=aspect,
                aspect_type=aspect_type,
            )

            if created:
                inserted_dimensions += 1
            elif changed:
                updated_dimensions += 1

            for entry in localizations:
                locale = entry.get("locale")
                if locale == root_locale:
                    continue

                translation_name = entry.get("name", "")
                if translation_name:
                    translation_name = f"{translation_name}{timestamp_suffix}"

                translation_written = upsert_dimension_translation(
                    cursor,
                    dimension_id=dim_id,
                    locale=locale,
                    name=translation_name,
                    description=locale_questions.get(locale),
                    aspect=entry.get("aspect"),
                    category=entry.get("category"),
                )

                if translation_written:
                    upserted_translations += 1

        if dry_run:
            conn.rollback()
            message = "Dry run 完成，未对数据库进行修改。"
        else:
            conn.commit()
            message = "导入已提交。"

    finally:
        conn.close()

    if verbose:
        print(message)
        print(f"维度新增: {inserted_dimensions}")
        print(f"维度更新: {updated_dimensions}")
        print(f"翻译写入/更新: {upserted_translations}")
        print("提示: JSON 中的 `summary` 字段当前未写入数据库，如需保留请扩展 schema 或额外处理。")

    return {
        "inserted": inserted_dimensions,
        "updated": updated_dimensions,
        "translations": upserted_translations,
        "dry_run": dry_run,
        "message": message,
    }


def main() -> None:
    args = parse_args()
    import_multilingual_dimensions(
        json_path=Path(args.json),
        db_path=Path(args.db),
        dry_run=args.dry_run,
        verbose=True,
    )


if __name__ == "__main__":
    main()
