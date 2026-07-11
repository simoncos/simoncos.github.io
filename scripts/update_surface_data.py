#!/usr/bin/env python3
"""Generate Projects and Gallery data from the unified content manifest."""

from __future__ import annotations

import argparse
import copy
import json
import sys
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "data/content_manifest.json"

SURFACE_SPECS = {
    "projects": {
        "path": ROOT / "data/projects_data.json",
        "collection_key": "projects",
    },
    "gallery": {
        "path": ROOT / "data/gallery_data.json",
        "collection_key": "items",
    },
}

PROJECTED_FIELDS = (
    "id",
    "type",
    "date",
    "cover",
    "title",
    "subtitle",
    "summary",
    "paths",
    "skipLangRewrite",
    "featured",
    "status",
    "featuredDetail",
    "facts",
    "actions",
)

SURFACE_OVERRIDE_FIELDS = PROJECTED_FIELDS + ("surfaces",)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(payload: dict) -> str:
    return json.dumps(payload, indent=2, ensure_ascii=False) + "\n"


def parse_date(value: str) -> datetime:
    try:
        return datetime.strptime(value or "", "%Y-%m-%d")
    except ValueError:
        return datetime.min


def validate_manifest(manifest: dict) -> list[str]:
    errors: list[str] = []
    seen_ids: set[str] = set()
    items = manifest.get("items")
    if not isinstance(items, list):
        return ["data/content_manifest.json: items must be a list"]

    for index, item in enumerate(items):
        item_id = item.get("id")
        label = item_id or f"item[{index}]"
        if not item_id:
            errors.append(f"data/content_manifest.json: {label} is missing id")
        elif item_id in seen_ids:
            errors.append(f"data/content_manifest.json: duplicate id {item_id}")
        seen_ids.add(item_id)

        surfaces = item.get("surfaces")
        if not isinstance(surfaces, list) or not surfaces:
            errors.append(f"data/content_manifest.json: {label} surfaces must be a non-empty list")
        else:
            unknown = sorted(set(surfaces) - {"projects", "gallery", "home"})
            if unknown:
                errors.append(f"data/content_manifest.json: {label} has unknown surfaces {unknown}")

        surface_overrides = item.get("surfaceOverrides")
        if surface_overrides is not None:
            if not isinstance(surface_overrides, dict):
                errors.append(f"data/content_manifest.json: {label} surfaceOverrides must be an object")
            else:
                unknown_override_surfaces = sorted(set(surface_overrides) - {"projects", "gallery", "home"})
                if unknown_override_surfaces:
                    errors.append(
                        f"data/content_manifest.json: {label} has unknown surfaceOverrides {unknown_override_surfaces}"
                    )
                for override_surface, override_value in surface_overrides.items():
                    if not isinstance(override_value, dict):
                        errors.append(
                            f"data/content_manifest.json: {label} surfaceOverrides.{override_surface} must be an object"
                        )

        for field in ("type", "date", "title", "subtitle", "summary", "paths"):
            if field not in item:
                errors.append(f"data/content_manifest.json: {label} is missing {field}")

        if item.get("date") and parse_date(item.get("date")) == datetime.min:
            errors.append(f"data/content_manifest.json: {label} has invalid date {item.get('date')!r}")

    return errors


def project_item(item: dict, surface: str) -> dict:
    projected = {}
    for field in PROJECTED_FIELDS:
        if field in item:
            projected[field] = copy.deepcopy(item[field])

    surface_overrides = item.get("surfaceOverrides") or {}
    for field, value in (surface_overrides.get(surface) or {}).items():
        if field in SURFACE_OVERRIDE_FIELDS:
            projected[field] = copy.deepcopy(value)

    return projected


def latest_date(items: list[dict]) -> str:
    dates = sorted((item.get("date", "") for item in items if item.get("date")), reverse=True)
    return dates[0] if dates else ""


def build_surface_payload(manifest: dict, surface: str) -> dict:
    spec = SURFACE_SPECS[surface]
    items = [
        project_item(item, surface)
        for item in manifest.get("items", [])
        if surface in (item.get("surfaces") or [])
    ]
    items.sort(key=lambda item: parse_date(item.get("date", "")), reverse=True)

    surface_last_updated = manifest.get("surface_last_updated") or {}
    last_updated = surface_last_updated.get(surface) or latest_date(items) or manifest.get("last_updated", "")

    return {
        "last_updated": last_updated,
        spec["collection_key"]: items,
    }


def build_all_surfaces(manifest: dict) -> dict[Path, dict]:
    return {
        spec["path"]: build_surface_payload(manifest, surface)
        for surface, spec in SURFACE_SPECS.items()
    }


def update_file(path: Path, payload: dict, *, check: bool) -> bool:
    expected = dump_json(payload)
    current = path.read_text(encoding="utf-8") if path.exists() else ""
    if current == expected:
        return False

    if check:
        return True

    path.write_text(expected, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if generated surface data is out of date.")
    args = parser.parse_args()

    manifest = load_json(MANIFEST_PATH)
    errors = validate_manifest(manifest)
    if errors:
        print("Content manifest validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    changed = []
    for path, payload in build_all_surfaces(manifest).items():
        if update_file(path, payload, check=args.check):
            changed.append(path.relative_to(ROOT))

    if args.check and changed:
        print("Surface data is out of date:")
        for path in changed:
            print(f"- {path}")
        print("Run: python3 scripts/update_surface_data.py")
        return 1

    if changed:
        print("Updated surface data:")
        for path in changed:
            print(f"- {path}")
    else:
        print("Surface data is current.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
