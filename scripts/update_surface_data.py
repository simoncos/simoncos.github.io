#!/usr/bin/env python3
"""Generate Projects and Gallery data from the unified content manifest."""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit


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
    "alt",
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
    "galleryCardClass",
    "galleryOrder",
    "sectionId",
)

SURFACE_OVERRIDE_FIELDS = PROJECTED_FIELDS + ("surfaces",)
PROJECTS_FORBIDDEN_OVERRIDE_FIELDS = ("id", "date")
PROJECTS_OVERRIDE_FIELDS = tuple(
    field for field in SURFACE_OVERRIDE_FIELDS if field not in PROJECTS_FORBIDDEN_OVERRIDE_FIELDS
)
GALLERY_CARD_CLASS_RE = re.compile(r"^gallery-card--[a-z0-9]+(?:-[a-z0-9]+)*$")
GALLERY_SECTION_ID_RE = re.compile(r"^gallery-[a-z0-9]+(?:-[a-z0-9]+)*$")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(payload: dict) -> str:
    return json.dumps(payload, indent=2, ensure_ascii=False) + "\n"


def parse_date(value: str) -> datetime:
    for date_format in ("%Y-%m-%d", "%Y"):
        try:
            return datetime.strptime(value or "", date_format)
        except ValueError:
            continue
    return datetime.min


def non_empty_string(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def validate_localized(value: object, path: str, errors: list[str], *, allow_plain: bool = False) -> None:
    if allow_plain and non_empty_string(value):
        return
    if not isinstance(value, dict) or not all(non_empty_string(value.get(language)) for language in ("en", "zh")):
        errors.append(f"{path} must contain non-empty en and zh strings")


def safe_content_path(value: object) -> bool:
    if not non_empty_string(value):
        return False
    candidate = value.strip()
    if any(character in candidate for character in ('"', "'", "<", ">", "\\")):
        return False
    if any(character.isspace() for character in candidate) or re.search(r"%(?![0-9a-fA-F]{2})", candidate):
        return False
    try:
        parsed = urlsplit(candidate)
    except ValueError:
        return False
    if parsed.scheme:
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
    if candidate.startswith("//") or not parsed.path:
        return False
    return not any(segment in {".", ".."} for segment in parsed.path.split("/"))


def validate_paths(value: object, path: str, errors: list[str]) -> None:
    if not isinstance(value, dict):
        errors.append(f"{path} must be an object with en and zh paths")
        return
    for language in ("en", "zh"):
        if not safe_content_path(value.get(language)):
            errors.append(f"{path}.{language} must be a safe path or HTTP(S) URL")


def validate_project_override(override: object, path: str, errors: list[str]) -> None:
    if not isinstance(override, dict):
        errors.append(f"{path} must be an object")
        return

    required_fields = ("status", "featuredDetail", "facts", "actions", "surfaces")
    for field in required_fields:
        if field not in override:
            errors.append(f"{path} is missing {field}")

    for field in PROJECTS_FORBIDDEN_OVERRIDE_FIELDS:
        if field in override:
            errors.append(f"{path} cannot override {field}")

    unknown_fields = sorted(
        set(override) - set(PROJECTS_OVERRIDE_FIELDS) - set(PROJECTS_FORBIDDEN_OVERRIDE_FIELDS)
    )
    if unknown_fields:
        errors.append(f"{path} has unknown fields {unknown_fields}")

    for field in ("title", "subtitle", "summary", "status"):
        if field in override:
            validate_localized(override[field], f"{path}.{field}", errors)
    if "paths" in override:
        validate_paths(override["paths"], f"{path}.paths", errors)

    detail = override.get("featuredDetail")
    if not isinstance(detail, dict):
        if "featuredDetail" in override:
            errors.append(f"{path}.featuredDetail must be an object")
    else:
        for field in ("kicker", "body", "media", "metrics"):
            if field not in detail:
                errors.append(f"{path}.featuredDetail is missing {field}")
        for field in ("kicker", "body"):
            if field in detail:
                validate_localized(detail[field], f"{path}.featuredDetail.{field}", errors)

        media = detail.get("media")
        if isinstance(media, dict):
            for field in ("src", "alt", "kicker", "title"):
                if field not in media:
                    errors.append(f"{path}.featuredDetail.media is missing {field}")
            if not non_empty_string(media.get("src")):
                errors.append(f"{path}.featuredDetail.media.src must be a non-empty string")
            for field in ("alt", "kicker", "title"):
                if field in media:
                    validate_localized(media[field], f"{path}.featuredDetail.media.{field}", errors)
        elif "media" in detail:
            errors.append(f"{path}.featuredDetail.media must be an object")

        metrics = detail.get("metrics")
        if not isinstance(metrics, list) or not metrics:
            if "metrics" in detail:
                errors.append(f"{path}.featuredDetail.metrics must be a non-empty list")
        else:
            for index, metric in enumerate(metrics):
                metric_path = f"{path}.featuredDetail.metrics[{index}]"
                if not isinstance(metric, dict):
                    errors.append(f"{metric_path} must be an object")
                    continue
                validate_localized(metric.get("label"), f"{metric_path}.label", errors)
                validate_localized(metric.get("value"), f"{metric_path}.value", errors, allow_plain=True)

    actions = override.get("actions")
    action_ids: set[str] = set()
    duplicate_action_ids = False
    if not isinstance(actions, list) or not actions:
        if "actions" in override:
            errors.append(f"{path}.actions must be a non-empty list")
    else:
        for index, action in enumerate(actions):
            action_path = f"{path}.actions[{index}]"
            if not isinstance(action, dict):
                errors.append(f"{action_path} must be an object")
                continue
            action_id = action.get("id")
            if not non_empty_string(action_id):
                errors.append(f"{action_path}.id must be a non-empty string")
            elif action_id in action_ids:
                duplicate_action_ids = True
            else:
                action_ids.add(action_id)
            validate_localized(action.get("label"), f"{action_path}.label", errors)
            validate_paths(action.get("paths"), f"{action_path}.paths", errors)
        if duplicate_action_ids:
            errors.append(f"{path}.action ids must be unique")

    facts = override.get("facts")
    if not isinstance(facts, list) or not facts:
        if "facts" in override:
            errors.append(f"{path}.facts must be a non-empty list")
    else:
        for index, fact in enumerate(facts):
            fact_path = f"{path}.facts[{index}]"
            if not isinstance(fact, dict):
                errors.append(f"{fact_path} must be an object")
                continue
            validate_localized(fact.get("label"), f"{fact_path}.label", errors)
            validate_localized(fact.get("value"), f"{fact_path}.value", errors)
            if "meta" in fact:
                validate_localized(fact["meta"], f"{fact_path}.meta", errors, allow_plain=True)
            action_id = fact.get("actionId")
            if action_id is not None and action_id not in action_ids:
                errors.append(f"{fact_path} has unknown actionId {action_id!r}")

    project_surfaces = override.get("surfaces")
    if not isinstance(project_surfaces, list) or not project_surfaces:
        if "surfaces" in override:
            errors.append(f"{path}.surfaces must be a non-empty list")
    else:
        for index, surface in enumerate(project_surfaces):
            surface_path = f"{path}.surfaces[{index}]"
            if not isinstance(surface, dict):
                errors.append(f"{surface_path} must be an object")
                continue
            if not non_empty_string(surface.get("label")):
                errors.append(f"{surface_path}.label must be a non-empty string")
            validate_localized(surface.get("title"), f"{surface_path}.title", errors)
            validate_localized(surface.get("summary"), f"{surface_path}.summary", errors)
            action_id = surface.get("actionId")
            if action_id not in action_ids:
                errors.append(f"{surface_path} has unknown actionId {action_id!r}")


def validate_project_projection(project: dict, path: str, errors: list[str]) -> None:
    for field in ("id", "type", "date", "cover"):
        if not non_empty_string(project.get(field)):
            errors.append(f"{path}.{field} must be a non-empty string")
    for field in ("title", "subtitle", "summary", "status"):
        validate_localized(project.get(field), f"{path}.{field}", errors)
    validate_paths(project.get("paths"), f"{path}.paths", errors)
    if not isinstance(project.get("featured"), bool):
        errors.append(f"{path}.featured must be a boolean")


def validate_gallery_projection(item: dict, path: str, errors: list[str]) -> None:
    for field in ("id", "type", "date"):
        if not non_empty_string(item.get(field)):
            errors.append(f"{path}.{field} must be a non-empty string")
    if not safe_content_path(item.get("cover")):
        errors.append(f"{path}.cover must be a safe path or HTTP(S) URL")
    for field in ("title", "summary", "alt"):
        validate_localized(item.get(field), f"{path}.{field}", errors)
    validate_paths(item.get("paths"), f"{path}.paths", errors)
    gallery_card_class = item.get("galleryCardClass")
    if not non_empty_string(gallery_card_class) or not GALLERY_CARD_CLASS_RE.fullmatch(gallery_card_class):
        errors.append(f"{path}.galleryCardClass must be a safe gallery-card--* token")
    if not isinstance(item.get("galleryOrder"), int) or item["galleryOrder"] < 1:
        errors.append(f"{path}.galleryOrder must be a positive integer")
    if "sectionId" in item:
        section_id = item["sectionId"]
        if not non_empty_string(section_id) or not GALLERY_SECTION_ID_RE.fullmatch(section_id):
            errors.append(f"{path}.sectionId must be a safe gallery-* token when provided")


def validate_manifest(manifest: dict) -> list[str]:
    errors: list[str] = []
    seen_ids: set[str] = set()
    projected_project_ids: set[str] = set()
    gallery_orders: set[int] = set()
    gallery_section_ids: set[str] = set()
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

        if isinstance(surfaces, list) and "projects" in surfaces:
            projects_override = surface_overrides.get("projects") if isinstance(surface_overrides, dict) else None
            validate_project_override(
                projects_override,
                f"data/content_manifest.json: {label} surfaceOverrides.projects",
                errors,
            )
            if isinstance(projects_override, dict):
                projected_project = project_item(item, "projects")
                validate_project_projection(
                    projected_project,
                    f"data/content_manifest.json: {label} project",
                    errors,
                )
                projected_id = projected_project.get("id")
            else:
                projected_id = item.get("id")

            if non_empty_string(projected_id):
                if projected_id in projected_project_ids:
                    errors.append(f"data/content_manifest.json: duplicate projected Projects id {projected_id}")
                else:
                    projected_project_ids.add(projected_id)

        if isinstance(surfaces, list) and "gallery" in surfaces:
            gallery_item = project_item(item, "gallery")
            validate_gallery_projection(
                gallery_item,
                f"data/content_manifest.json: {label} gallery",
                errors,
            )
            gallery_order = gallery_item.get("galleryOrder")
            if isinstance(gallery_order, int):
                if gallery_order in gallery_orders:
                    errors.append(f"data/content_manifest.json: duplicate Gallery order {gallery_order}")
                gallery_orders.add(gallery_order)
            gallery_section_id = gallery_item.get("sectionId")
            if non_empty_string(gallery_section_id):
                if gallery_section_id in gallery_section_ids:
                    errors.append(
                        f"data/content_manifest.json: duplicate Gallery section id {gallery_section_id}"
                    )
                gallery_section_ids.add(gallery_section_id)

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

    if surface == "gallery":
        projected["surfaceMembership"] = copy.deepcopy(item.get("surfaces") or [])

    surface_overrides = item.get("surfaceOverrides") or {}
    allowed_override_fields = PROJECTS_OVERRIDE_FIELDS if surface == "projects" else SURFACE_OVERRIDE_FIELDS
    for field, value in (surface_overrides.get(surface) or {}).items():
        if field in allowed_override_fields:
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
