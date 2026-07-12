import importlib.util
import copy
import json
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_script(name, relative_path):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def gallery_item(item_id, title, memberships):
    return {
        "id": item_id,
        "type": "artifact",
        "date": "2026-07-11",
        "title": {"en": title, "zh": title},
        "subtitle": {"en": "", "zh": ""},
        "summary": {"en": f"{title} summary", "zh": f"{title} summary"},
        "paths": {"en": f"gallery/{item_id}.html", "zh": f"gallery/{item_id}.html"},
        "surfaceMembership": memberships,
    }


def run_recent_posts(projects_payload, gallery_payload):
    runtime_path = json.dumps(str(ROOT / "src/js/load-recent-posts.js"))
    projects = json.dumps(projects_payload)
    gallery = json.dumps(gallery_payload)
    script = f"""
const rendered = [];
const postList = {{
  innerHTML: '',
  appendChild(node) {{ rendered.push(node.innerHTML); }}
}};
global.document = {{
  addEventListener(name, callback) {{ if (name === 'DOMContentLoaded') callback(); }},
  getElementById(id) {{ return id === 'post-list' ? postList : null; }},
  createElement() {{ return {{ className: '', innerHTML: '' }}; }}
}};
global.window = {{
  SITE_CONFIG: {{ resolvePath: (path) => path }},
  SITE_I18N: {{
    getCurrentLanguage: () => 'en',
    formatDate: (value) => value,
    applyLanguageStateToInternalLinks: () => {{}},
    t: (key) => key
  }},
  SITE_ARTICLE_GROUPS: {{
    fetchArticleGroups: () => Promise.resolve({{ groups: [] }}),
    getPreferredEntry: () => null,
    getSecondaryEntry: () => null
  }},
  addEventListener: () => {{}}
}};
global.fetch = (path) => Promise.resolve({{
  ok: true,
  json: () => Promise.resolve(path.includes('projects_data') ? {projects} : {gallery})
}});
require({runtime_path});
setTimeout(() => process.stdout.write(JSON.stringify(rendered)), 0);
"""
    result = subprocess.run(
        ["node", "-e", script],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return "\n".join(json.loads(result.stdout))


class GalleryHomeSurfaceTests(unittest.TestCase):
    def test_gallery_manifest_requires_localized_descriptive_alt_text(self):
        surface_data = load_script("gallery_alt_validation", "scripts/update_surface_data.py")
        manifest = json.loads((ROOT / "data/content_manifest.json").read_text())

        for item in manifest["items"]:
            if "gallery" not in item["surfaces"]:
                continue
            projected = surface_data.project_item(item, "gallery")
            with self.subTest(item=item["id"]):
                self.assertEqual(
                    surface_data.validate_manifest({"items": [copy.deepcopy(item)]}),
                    [],
                )
                self.assertIn("alt", projected)
                if "alt" in projected:
                    self.assertEqual(set(projected["alt"]), {"en", "zh"})
                    self.assertTrue(all(projected["alt"][language].strip() for language in ("en", "zh")))

    def test_gallery_manifest_rejects_attribute_injection_metadata(self):
        surface_data = load_script("gallery_metadata_validation", "scripts/update_surface_data.py")
        manifest = json.loads((ROOT / "data/content_manifest.json").read_text())
        gallery_item_record = next(item for item in manifest["items"] if "gallery" in item["surfaces"])

        cases = (
            ("galleryCardClass", 'gallery-card--safe\" data-pwned=\"yes'),
            ("sectionId", 'gallery-safe\" onclick=\"alert(1)'),
        )
        for field, value in cases:
            with self.subTest(field=field):
                candidate = copy.deepcopy(gallery_item_record)
                candidate.setdefault("surfaceOverrides", {}).setdefault("gallery", {})[field] = value
                errors = surface_data.validate_manifest({"items": [candidate]})
                self.assertTrue(any(field in error and "safe" in error for error in errors), errors)

    def test_gallery_manifest_rejects_duplicate_section_ids_and_order(self):
        surface_data = load_script("gallery_duplicate_validation", "scripts/update_surface_data.py")
        manifest = json.loads((ROOT / "data/content_manifest.json").read_text())
        gallery_items = [copy.deepcopy(item) for item in manifest["items"] if "gallery" in item["surfaces"]][:2]
        first = surface_data.project_item(gallery_items[0], "gallery")
        second_override = gallery_items[1].setdefault("surfaceOverrides", {}).setdefault("gallery", {})
        second_override["galleryOrder"] = first["galleryOrder"]
        second_override["sectionId"] = first.get("sectionId") or "gallery-duplicate"
        gallery_items[0].setdefault("surfaceOverrides", {}).setdefault("gallery", {})["sectionId"] = second_override["sectionId"]

        errors = surface_data.validate_manifest({"items": gallery_items})

        self.assertTrue(any("duplicate Gallery order" in error for error in errors), errors)
        self.assertTrue(any("duplicate Gallery section id" in error for error in errors), errors)

    def test_gallery_fallback_escapes_metadata_attributes_at_output_boundary(self):
        static_fallbacks = load_script("gallery_fallback_escaping", "scripts/update_static_fallbacks.py")
        payload = json.loads((ROOT / "data/gallery_data.json").read_text())
        item = copy.deepcopy(payload["items"][0])
        item["galleryCardClass"] = 'gallery-card--safe\" data-pwned=\"yes'
        item["sectionId"] = 'gallery-safe\" onclick=\"alert(1)'

        rendered = static_fallbacks.render_gallery_cards({"items": [item]})

        self.assertNotRegex(rendered, r'\sonclick="')
        self.assertNotRegex(rendered, r'\sdata-pwned="')
        self.assertIn("&quot; onclick=&quot;alert(1)", rendered)
        self.assertIn("&quot; data-pwned=&quot;yes", rendered)

    def test_gallery_projection_preserves_explicit_surface_membership(self):
        surface_data = load_script("gallery_home_surface_data", "scripts/update_surface_data.py")
        manifest = json.loads((ROOT / "data/content_manifest.json").read_text())
        payload = surface_data.build_surface_payload(manifest, "gallery")
        memberships = {item["id"]: item.get("surfaceMembership") for item in payload["items"]}

        self.assertEqual(memberships["hermes-agent-hv-analysis"], ["gallery"])
        self.assertIn("home", memberships["pkm-2026-06-07-talk"])

    def test_static_home_recent_excludes_gallery_only_records(self):
        static_fallbacks = load_script("gallery_home_static", "scripts/update_static_fallbacks.py")
        gallery_payload = {
            "items": [
                gallery_item("gallery-only", "Gallery only", ["gallery"]),
                gallery_item("home-gallery", "Home gallery", ["gallery", "home"]),
            ]
        }

        rendered = static_fallbacks.render_home({"groups": []}, {"projects": []}, gallery_payload)

        self.assertNotIn("Gallery only", rendered)
        self.assertIn("Home gallery", rendered)

    def test_runtime_home_recent_excludes_gallery_only_records(self):
        gallery_payload = {
            "items": [
                gallery_item("gallery-only", "Gallery only", ["gallery"]),
                gallery_item("home-gallery", "Home gallery", ["gallery", "home"]),
            ]
        }

        rendered = run_recent_posts({"projects": []}, gallery_payload)

        self.assertNotIn("Gallery only", rendered)
        self.assertIn("Home gallery", rendered)

    def test_static_home_recent_prefers_project_for_shared_identity_or_target(self):
        static_fallbacks = load_script("gallery_home_dedup_static", "scripts/update_static_fallbacks.py")
        fixture = json.loads((ROOT / "tests/fixtures/home_recent_cross_surface.json").read_text())

        rendered = static_fallbacks.render_home(
            {"groups": []},
            fixture["projectsPayload"],
            fixture["galleryPayload"],
        )

        self.assertEqual(rendered.count("sleep-toolkit-production.up.railway.app"), 1)
        self.assertIn("meta-pill--project", rendered)
        self.assertIn("May 6, 2026", rendered)
        self.assertNotIn("Sleep Toolkit gallery view", rendered)
        self.assertIn("Unique project", rendered)
        self.assertIn("Unique gallery", rendered)

    def test_runtime_home_recent_prefers_project_for_shared_identity_or_target(self):
        fixture = json.loads((ROOT / "tests/fixtures/home_recent_cross_surface.json").read_text())

        rendered = run_recent_posts(fixture["projectsPayload"], fixture["galleryPayload"])

        self.assertEqual(rendered.count("sleep-toolkit-production.up.railway.app"), 1)
        self.assertIn("meta-pill--project", rendered)
        self.assertIn("2026-05-06", rendered)
        self.assertNotIn("Sleep Toolkit gallery view", rendered)
        self.assertIn("Unique project", rendered)
        self.assertIn("Unique gallery", rendered)


if __name__ == "__main__":
    unittest.main()
