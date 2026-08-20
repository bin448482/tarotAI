#!/usr/bin/env python3
"""Publish the approved static portfolio into TarotAI's nginx web root.

The portfolio source checkout is intentionally not a web root.  This script
copies only the frozen allowlist, validates it, and atomically swaps the
published directory so that docs, governance files, and Git metadata cannot
become public assets.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import re
import shutil
import sys
import uuid


ROOT_FILES = (
    "index.html",
    "resume.html",
    "resume.zh.html",
    "resume.en.html",
    "styles.css",
    "resume.css",
    "site.js",
)
ARTICLE_FILES = (
    "index.html",
    "agentic-boundary-paradox.html",
    "loop-engineering.html",
)
PROJECT_FILES = (
    "index.html",
    "coding-agent-delivery.html",
    "data-platform-case.html",
    "rag-knowledge-assets.html",
    "static-sql-lineage.html",
)
ALLOWED_EMAILS = {"76626123@qq.com"}
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
FORBIDDEN_PATTERNS = {
    "mainland China phone number": re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)"),
    "Windows local path": re.compile(r"[A-Za-z]:\\\\"),
    "Unix server path": re.compile(r"(?<![A-Za-z0-9_])/srv/"),
    "private key marker": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    "local file URL": re.compile(r"file://", re.IGNORECASE),
}


def allowed_paths() -> tuple[Path, ...]:
    return tuple(Path(name) for name in ROOT_FILES) + tuple(
        Path("articles") / name for name in ARTICLE_FILES
    ) + tuple(Path("projects") / name for name in PROJECT_FILES)


def validate_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    errors: list[str] = []
    for email in EMAIL_RE.findall(text):
        if email.lower() not in ALLOWED_EMAILS:
            errors.append(f"unapproved email {email}")
    for label, pattern in FORBIDDEN_PATTERNS.items():
        if pattern.search(text):
            errors.append(label)
    return errors


def validate_source(source: Path) -> tuple[Path, ...]:
    files = allowed_paths()
    errors: list[str] = []
    for relative in files:
        candidate = source / relative
        if not candidate.is_file():
            errors.append(f"missing required asset: {relative.as_posix()}")
            continue
        for issue in validate_file(candidate):
            errors.append(f"{relative.as_posix()}: {issue}")
    if errors:
        raise ValueError("Publication refused:\n- " + "\n- ".join(errors))
    return files


def copy_to_stage(source: Path, stage: Path, files: tuple[Path, ...]) -> None:
    for relative in files:
        target = stage / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source / relative, target)


def replace_published_directory(stage: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    backup = destination.parent / f".{destination.name}.previous-{uuid.uuid4().hex}"
    moved_previous = False
    try:
        if destination.exists():
            os.replace(destination, backup)
            moved_previous = True
        os.replace(stage, destination)
    except Exception:
        if moved_previous and not destination.exists() and backup.exists():
            os.replace(backup, destination)
        raise
    else:
        if backup.exists():
            shutil.rmtree(backup)


def main() -> int:
    parser = argparse.ArgumentParser(description="Publish approved portfolio assets atomically.")
    parser.add_argument("--source", required=True, type=Path, help="Portfolio Git checkout.")
    parser.add_argument("--destination", required=True, type=Path, help="Nginx portal directory.")
    parser.add_argument("--check", action="store_true", help="Validate only; do not write files.")
    args = parser.parse_args()

    source = args.source.resolve()
    destination = args.destination.resolve()
    if not source.is_dir():
        raise SystemExit(f"Source checkout does not exist: {source}")
    if source == destination or source in destination.parents:
        raise SystemExit("Destination must not be inside the source checkout.")

    try:
        files = validate_source(source)
    except ValueError as error:
        raise SystemExit(str(error)) from error
    print(f"[ok] Validated {len(files)} approved assets from {source}")
    if args.check:
        return 0

    stage = destination.parent / f".{destination.name}.staging-{uuid.uuid4().hex}"
    try:
        copy_to_stage(source, stage, files)
        replace_published_directory(stage, destination)
    finally:
        if stage.exists():
            shutil.rmtree(stage)
    print(f"[ok] Published {len(files)} assets to {destination}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
