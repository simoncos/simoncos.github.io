#!/usr/bin/env python3
"""Check that generated blog outputs are current without mutating the repo."""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

GENERATED_DATA = (
    "data/blog_data.json",
    "data/article_groups.json",
    "data/article_index.json",
    "data/backlinks_data.json",
    "data/series_data.json",
    "data/tags_data.json",
    "feed.zh.xml",
    "feed.en.xml",
    "blogs.html",
)


def site_version() -> str:
    try:
        result = subprocess.run(
            ["git", "describe", "--tags", "--always"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip()
    except Exception:
        return "unknown"


def copy_path(source: Path, target: Path) -> None:
    if source.is_dir():
        shutil.copytree(source, target, ignore=shutil.ignore_patterns("__pycache__"))
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def prepare_temp_repo(temp_root: Path) -> None:
    for rel in ("generate_blog_pages.py", "requirements.txt"):
        copy_path(ROOT / rel, temp_root / rel)

    for rel in ("blogs", "templates", "data"):
        copy_path(ROOT / rel, temp_root / rel)

    # A fresh Git checkout does not preserve source mtimes. Normalize them here
    # so the local drift check catches generators that accidentally depend on mtime.
    fixed_timestamp = 946684800  # 2000-01-01T00:00:00Z
    for markdown_path in (temp_root / "blogs").glob("*.md"):
        os.utime(markdown_path, (fixed_timestamp, fixed_timestamp))


def generated_paths() -> list[str]:
    paths = list(GENERATED_DATA)
    for markdown_path in sorted((ROOT / "blogs").glob("*.md")):
        paths.append(f"blogs/{markdown_path.stem}.html")
    return paths


def normalize_for_compare(rel_path: str, text: str) -> str:
    if rel_path.startswith("feed.") and rel_path.endswith(".xml"):
        text = re.sub(r"<lastBuildDate>.*?</lastBuildDate>", "<lastBuildDate>__IGNORED__</lastBuildDate>", text)
    return text


def file_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def compare_outputs(temp_root: Path) -> list[str]:
    errors: list[str] = []
    for rel_path in generated_paths():
        current = ROOT / rel_path
        generated = temp_root / rel_path
        if not current.exists():
            errors.append(f"{rel_path}: current generated file is missing")
            continue
        if not generated.exists():
            errors.append(f"{rel_path}: generator did not produce this file")
            continue

        current_text = normalize_for_compare(rel_path, file_text(current))
        generated_text = normalize_for_compare(rel_path, file_text(generated))
        if current_text != generated_text:
            errors.append(f"{rel_path}: generated output is out of date")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--keep-temp", action="store_true", help="Keep the temporary generation directory for debugging.")
    args = parser.parse_args()

    with tempfile.TemporaryDirectory(prefix="simonc-blog-generation-") as temp_dir:
        temp_root = Path(temp_dir)
        prepare_temp_repo(temp_root)

        env = os.environ.copy()
        env["SITE_VERSION_OVERRIDE"] = site_version()
        result = subprocess.run(
            [sys.executable, "generate_blog_pages.py"],
            cwd=temp_root,
            env=env,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print("Blog generation drift check failed while running generator:")
            if result.stdout.strip():
                print(result.stdout.strip())
            if result.stderr.strip():
                print(result.stderr.strip())
            return result.returncode

        errors = compare_outputs(temp_root)
        if errors:
            print("Generated blog outputs are out of date:")
            for error in errors:
                print(f"- {error}")
            print("Run: python3 generate_blog_pages.py")
            if args.keep_temp:
                kept = Path(tempfile.mkdtemp(prefix="simonc-blog-generation-kept-"))
                shutil.copytree(temp_root, kept, dirs_exist_ok=True)
                print(f"Kept generated copy at: {kept}")
            return 1

    print("Generated blog outputs are current.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
