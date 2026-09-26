#!/usr/bin/env python3
"""Synchronize the shared head resources, header and footer on every page.

The blocks themselves are defined in scripts/site_shell.py; the pages and
their per-page settings (section, script profile, asset prefix) are listed in
data/site_shell.json.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from site_shell import ROOT, apply_shell, load_config  # noqa: E402


def validate_config(config: dict) -> list[str]:
    errors: list[str] = []
    profiles = config.get("script_profiles") or {}
    for page in config.get("pages", []):
        rel_path = page.get("path", "<missing>")
        if not (ROOT / rel_path).exists():
            errors.append(f"data/site_shell.json: page does not exist: {rel_path}")
        profile = page.get("script_profile")
        if profile not in profiles:
            errors.append(f"data/site_shell.json: {rel_path} references missing profile {profile!r}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if shared shell output is out of date.")
    args = parser.parse_args()

    config = load_config()
    errors = validate_config(config)
    if errors:
        print("Site shell config validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    changed = []
    for page in config.get("pages", []):
        path = ROOT / page["path"]
        text = path.read_text(encoding="utf-8")
        try:
            updated = apply_shell(text, config, page, page["path"])
        except ValueError as error:
            print(error)
            return 1
        if updated == text:
            continue
        changed.append(page["path"])
        if not args.check:
            path.write_text(updated, encoding="utf-8")

    if args.check and changed:
        print("Shared site shell is out of date:")
        for rel in changed:
            print(f"- {rel}")
        print("Run: python3 scripts/update_site_shell.py")
        return 1

    if changed:
        print("Updated shared site shell:")
        for rel in changed:
            print(f"- {rel}")
    else:
        print("Shared site shell is current.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
