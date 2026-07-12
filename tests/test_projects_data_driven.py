import importlib.util
import copy
import json
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests/fixtures/projects_multiple.json"
MANIFEST = ROOT / "data/content_manifest.json"


def load_script(name, relative_path):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def project_manifest():
    manifest = json.loads(MANIFEST.read_text())
    project = next(item for item in manifest["items"] if item["id"] == "sleep-toolkit")
    return {"items": [copy.deepcopy(project)]}


def projects_override(manifest):
    return manifest["items"][0]["surfaceOverrides"]["projects"]


def run_projects_runtime(payload, *, fetch_error="", rerender_language=""):
    payload_json = json.dumps(payload, ensure_ascii=False)
    fetch_setup = (
        f"global.fetch = async () => {{ throw new Error({json.dumps(fetch_error)}); }};"
        if fetch_error
        else f"global.fetch = async (url) => {{ fetchUrl = url; return {{ ok: true, json: async () => ({payload_json}) }}; }};"
    )
    node_test = f"""
const fs = require('fs');
const vm = require('vm');
const elements = {{
  'project-featured': {{ innerHTML: '<p>FEATURE FALLBACK</p>' }},
  'projects-ledger': {{ innerHTML: '<article>LEDGER FALLBACK</article>' }},
  'projects-summary': {{ textContent: 'SUMMARY FALLBACK' }},
  'projects-updated': {{ textContent: 'UPDATED FALLBACK' }}
}};
const events = {{}};
const errors = [];
let language = 'en';
let ready;
let fetchUrl = '';
global.document = {{
  addEventListener: (name, callback) => {{ if (name === 'DOMContentLoaded') ready = callback; }},
  getElementById: (id) => elements[id] || null
}};
global.window = {{
  SITE_CONFIG: {{ resolvePath: (path) => `/base/${{path}}`, assetVersion: 'fixture-v1' }},
  SITE_I18N: {{
    getCurrentLanguage: () => language,
    formatDate: (value) => `date:${{value}}`,
    resolveLocalizedUrl: (target, lang) => {{
      if (/^https?:/.test(target)) return target;
      const hashAt = target.indexOf('#');
      const base = hashAt >= 0 ? target.slice(0, hashAt) : target;
      const hash = hashAt >= 0 ? target.slice(hashAt) : '';
      return `${{base}}${{base.includes('?') ? '&' : '?'}}lang=${{lang}}${{hash}}`;
    }},
    applyLanguageStateToInternalLinks: () => {{}},
    t: (key) => ({{
      project_details_label: language === 'zh' ? '项目详情' : 'Project details',
      project_signals_suffix: language === 'zh' ? '信号' : 'signals',
      project_surfaces_title: language === 'zh' ? '项目入口' : 'Project surfaces',
      projects_count_singular: language === 'zh' ? '1 个项目' : '1 project',
      projects_count_plural: language === 'zh' ? '{{count}} 个项目' : '{{count}} projects',
      projects_updated_prefix: language === 'zh' ? '更新于' : 'Updated'
    }})[key] || key
  }},
  addEventListener: (name, callback) => {{ events[name] = callback; }}
}};
console.error = (...args) => errors.push(args.map((value) => value instanceof Error ? value.message : String(value)).join(' '));
{fetch_setup}
vm.runInThisContext(fs.readFileSync({json.dumps(str(ROOT / 'src/js/load-projects.js'))}, 'utf8'));
(async () => {{
  ready();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const before = JSON.parse(JSON.stringify(elements));
  if ({json.dumps(bool(rerender_language))}) {{
    language = {json.dumps(rerender_language or 'en')};
    events['site-language-change']();
  }}
  const after = JSON.parse(JSON.stringify(elements));
  process.stdout.write(JSON.stringify({{ before, after, errors, fetchUrl }}));
}})();
"""
    result = subprocess.run(["node", "-e", node_test], cwd=ROOT, text=True, capture_output=True)
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)
    return json.loads(result.stdout)


class ProjectsDataDrivenTests(unittest.TestCase):
    def test_project_manifest_accepts_complete_projects_override(self):
        surface_data = load_script("update_surface_data_valid", "scripts/update_surface_data.py")
        self.assertEqual(surface_data.validate_manifest(project_manifest()), [])

    def test_project_manifest_requires_complete_projects_override(self):
        surface_data = load_script("update_surface_data_required", "scripts/update_surface_data.py")
        required_fields = ("status", "featuredDetail", "facts", "actions", "surfaces")

        for field in required_fields:
            with self.subTest(field=field):
                manifest = project_manifest()
                projects_override(manifest).pop(field)
                errors = surface_data.validate_manifest(manifest)
                self.assertTrue(any(f"surfaceOverrides.projects is missing {field}" in error for error in errors), errors)

    def test_project_manifest_rejects_invalid_localized_values_and_shapes(self):
        surface_data = load_script("update_surface_data_shapes", "scripts/update_surface_data.py")
        cases = []

        manifest = project_manifest()
        projects_override(manifest)["status"] = {"en": "Maintained"}
        cases.append(("status languages", manifest, "status must contain non-empty en and zh strings"))

        manifest = project_manifest()
        manifest["items"][0]["title"] = {"en": "Sleep Toolkit"}
        cases.append(("project title languages", manifest, "project.title must contain non-empty en and zh strings"))

        manifest = project_manifest()
        projects_override(manifest)["featuredDetail"] = []
        cases.append(("featured detail shape", manifest, "featuredDetail must be an object"))

        manifest = project_manifest()
        projects_override(manifest)["facts"] = {}
        cases.append(("facts shape", manifest, "facts must be a non-empty list"))

        manifest = project_manifest()
        projects_override(manifest)["actions"] = "open"
        cases.append(("actions shape", manifest, "actions must be a non-empty list"))

        manifest = project_manifest()
        projects_override(manifest)["surfaces"] = []
        cases.append(("surfaces shape", manifest, "surfaces must be a non-empty list"))

        for label, candidate, expected in cases:
            with self.subTest(case=label):
                errors = surface_data.validate_manifest(candidate)
                self.assertTrue(any(expected in error for error in errors), errors)

    def test_project_manifest_requires_featured_media_and_metrics(self):
        surface_data = load_script("update_surface_data_feature", "scripts/update_surface_data.py")
        cases = []

        manifest = project_manifest()
        projects_override(manifest)["featuredDetail"].pop("media")
        cases.append(("missing media", manifest, "featuredDetail is missing media"))

        manifest = project_manifest()
        projects_override(manifest)["featuredDetail"]["media"]["src"] = ""
        cases.append(("empty media source", manifest, "media.src must be a non-empty string"))

        manifest = project_manifest()
        projects_override(manifest)["featuredDetail"]["metrics"] = {}
        cases.append(("metrics shape", manifest, "metrics must be a non-empty list"))

        for label, candidate, expected in cases:
            with self.subTest(case=label):
                errors = surface_data.validate_manifest(candidate)
                self.assertTrue(any(expected in error for error in errors), errors)

    def test_project_manifest_rejects_duplicate_actions_and_invalid_paths(self):
        surface_data = load_script("update_surface_data_actions", "scripts/update_surface_data.py")

        manifest = project_manifest()
        actions = projects_override(manifest)["actions"]
        actions[1]["id"] = actions[0]["id"]
        errors = surface_data.validate_manifest(manifest)
        self.assertTrue(any("action ids must be unique" in error for error in errors), errors)

        manifest = project_manifest()
        projects_override(manifest)["actions"][0]["paths"]["zh"] = "javascript:alert(1)"
        errors = surface_data.validate_manifest(manifest)
        self.assertTrue(any("paths.zh must be a safe path or HTTP(S) URL" in error for error in errors), errors)

    def test_project_manifest_forbids_identity_and_order_overrides(self):
        surface_data = load_script("update_surface_data_identity", "scripts/update_surface_data.py")

        for field, value in (("id", "replacement-id"), ("date", "not-a-date")):
            with self.subTest(field=field):
                manifest = project_manifest()
                projects_override(manifest)[field] = value
                errors = surface_data.validate_manifest(manifest)
                self.assertTrue(
                    any(f"surfaceOverrides.projects cannot override {field}" in error for error in errors),
                    errors,
                )

    def test_project_manifest_rejects_duplicate_projected_project_ids(self):
        surface_data = load_script("update_surface_data_project_ids", "scripts/update_surface_data.py")
        manifest = project_manifest()
        duplicate = copy.deepcopy(manifest["items"][0])
        duplicate["date"] = "2026-05-05"
        manifest["items"].append(duplicate)

        errors = surface_data.validate_manifest(manifest)

        self.assertTrue(any("duplicate projected Projects id sleep-toolkit" in error for error in errors), errors)

    def test_project_manifest_rejects_unknown_action_references(self):
        surface_data = load_script("update_surface_data_refs", "scripts/update_surface_data.py")

        for collection in ("facts", "surfaces"):
            with self.subTest(collection=collection):
                manifest = project_manifest()
                projects_override(manifest)[collection][-1]["actionId"] = "missing-action"
                errors = surface_data.validate_manifest(manifest)
                self.assertTrue(
                    any(f"{collection}" in error and "unknown actionId 'missing-action'" in error for error in errors),
                    errors,
                )

    def test_project_projection_preserves_structured_detail_fields(self):
        surface_data = load_script("update_surface_data", "scripts/update_surface_data.py")
        fixture = json.loads(FIXTURE.read_text())
        project = fixture["projects"][0]
        detail_fields = ("status", "featuredDetail", "facts", "actions", "surfaces")
        manifest_item = copy.deepcopy(project)
        manifest_item["surfaces"] = ["projects"]
        manifest_item["surfaceOverrides"] = {
            "projects": {field: copy.deepcopy(project[field]) for field in detail_fields}
        }
        projected = surface_data.project_item(manifest_item, "projects")

        for field in detail_fields:
            with self.subTest(field=field):
                self.assertEqual(projected[field], fixture["projects"][0][field])

    def test_projects_page_has_runtime_targets_and_generated_english_fallback(self):
        html = (ROOT / "projects.html").read_text()

        self.assertIn('src="src/js/load-projects.js?', html)
        self.assertIn('id="project-featured"', html)
        self.assertIn('id="projects-ledger"', html)
        self.assertIn('static-fallback:start projects-content', html)
        self.assertIn('data-i18n="project_ledger_title"', html)
        self.assertIn("Sleep Toolkit", html)
        self.assertIn("Open Sleep Toolkit", html)
        self.assertIn("Ten years of sleep records", html)

    def test_projects_i18n_keeps_only_consumed_generic_ui_keys(self):
        i18n = (ROOT / "src/ts/i18n.ts").read_text()
        required_keys = (
            "projects_kicker",
            "projects_title",
            "projects_overview_note",
            "projects_maintained_label",
            "projects_updated_label",
            "projects_updated_prefix",
            "projects_count_singular",
            "projects_count_plural",
            "projects_index_action",
            "project_details_label",
            "project_surfaces_title",
            "project_ledger_title",
        )
        obsolete_keys = (
            "projects_overview_title",
            "projects_featured_kicker",
            "project_observatory_title",
            "project_feature_body",
            "project_action_open",
            "project_report_title",
            "project_metric_nights",
            "project_fact_input",
            "project_index_title",
            "project_row_summary",
        )

        for key in required_keys:
            with self.subTest(required=key):
                self.assertEqual(i18n.count(f"{key}:"), 2)
        for key in obsolete_keys:
            with self.subTest(obsolete=key):
                self.assertNotIn(f"{key}:", i18n)

    def test_static_fallback_renders_feature_and_every_fixture_ledger_record(self):
        fallbacks = load_script("update_static_fallbacks", "scripts/update_static_fallbacks.py")
        fixture = json.loads(FIXTURE.read_text())
        rendered = fallbacks.render_projects_content(fixture)

        self.assertIn('data-project-id="alpha-project"', rendered)
        self.assertIn('id="project-feature-title"', rendered)
        self.assertEqual(rendered.count('class="project-ledger-row"'), 2)
        self.assertIn("Alpha Project", rendered)
        self.assertIn("Beta Project", rendered)

    def test_runtime_renders_feature_and_every_fixture_ledger_record(self):
        result = run_projects_runtime(json.loads(FIXTURE.read_text()))
        featured = result["after"]["project-featured"]["innerHTML"]
        ledger = result["after"]["projects-ledger"]["innerHTML"]

        self.assertIn("Alpha Project", featured)
        self.assertEqual(ledger.count('class="project-ledger-row"'), 2)
        self.assertIn("Alpha Project", ledger)
        self.assertIn("Beta Project", ledger)
        self.assertEqual(result["fetchUrl"], "/base/data/projects_data.json?v=fixture-v1")

    def test_runtime_preserves_fallback_on_fetch_rejection(self):
        result = run_projects_runtime({}, fetch_error="network down")

        self.assertEqual(result["after"]["project-featured"]["innerHTML"], "<p>FEATURE FALLBACK</p>")
        self.assertEqual(result["after"]["projects-ledger"]["innerHTML"], "<article>LEDGER FALLBACK</article>")
        self.assertTrue(any("preserving static fallback" in error and "network down" in error for error in result["errors"]))

    def test_runtime_preserves_fallback_for_malformed_http_200_payloads(self):
        malformed_payloads = (
            {},
            {"projects": {}},
            {"projects": []},
            {"projects": [{}]},
        )

        for payload in malformed_payloads:
            with self.subTest(payload=payload):
                result = run_projects_runtime(payload)
                self.assertEqual(result["after"]["project-featured"]["innerHTML"], "<p>FEATURE FALLBACK</p>")
                self.assertEqual(result["after"]["projects-ledger"]["innerHTML"], "<article>LEDGER FALLBACK</article>")
                self.assertEqual(result["after"]["projects-summary"]["textContent"], "SUMMARY FALLBACK")
                self.assertTrue(any("Invalid projects payload" in error for error in result["errors"]), result["errors"])

    def test_runtime_preserves_fallback_for_duplicate_project_ids(self):
        payload = json.loads(FIXTURE.read_text())
        payload["projects"][1]["id"] = payload["projects"][0]["id"]

        result = run_projects_runtime(payload)

        self.assertEqual(result["after"]["project-featured"]["innerHTML"], "<p>FEATURE FALLBACK</p>")
        self.assertEqual(result["after"]["projects-ledger"]["innerHTML"], "<article>LEDGER FALLBACK</article>")
        self.assertEqual(result["after"]["projects-summary"]["textContent"], "SUMMARY FALLBACK")
        self.assertTrue(
            any("Invalid projects payload" in error and "project ids must be unique" in error for error in result["errors"]),
            result["errors"],
        )

    def test_runtime_rerenders_chinese_and_preserves_query_hash_paths(self):
        result = run_projects_runtime(json.loads(FIXTURE.read_text()), rerender_language="zh")
        featured = result["after"]["project-featured"]["innerHTML"]
        ledger = result["after"]["projects-ledger"]["innerHTML"]

        self.assertIn("Alpha 精选详情。", featured)
        self.assertIn("持续维护", ledger)
        self.assertIn('href="projects/alpha.html?view=full&amp;lang=zh#results"', featured)
        self.assertNotIn("projects/alpha.en.html", featured)

    def test_runtime_localizes_featured_metrics_aria_label_in_chinese(self):
        result = run_projects_runtime(json.loads(FIXTURE.read_text()), rerender_language="zh")
        featured = result["after"]["project-featured"]["innerHTML"]

        self.assertIn('aria-label="Alpha 项目 信号"', featured)
        self.assertNotIn('aria-label="Alpha 项目 signals"', featured)

    def test_runtime_escapes_hostile_text_and_attribute_values(self):
        payload = json.loads(FIXTURE.read_text())
        project = payload["projects"][0]
        project["id"] = 'alpha" onmouseover="alert(1)'
        project["title"]["en"] = '<img src=x onerror="alert(1)">'
        project["subtitle"]["en"] = 'Quote " <b>bad</b> & more'
        project["status"]["en"] = '<script>alert(1)</script>'
        project["featuredDetail"]["body"]["en"] = '<svg onload="alert(1)">'
        project["featuredDetail"]["media"]["alt"]["en"] = '" onerror="alert(1)'
        project["actions"][0]["label"]["en"] = '<Open & "unsafe">'

        result = run_projects_runtime(payload)
        rendered = result["after"]["project-featured"]["innerHTML"] + result["after"]["projects-ledger"]["innerHTML"]

        self.assertNotIn("<script>", rendered)
        self.assertNotIn("<svg onload", rendered)
        self.assertNotIn("<img src=x", rendered)
        self.assertIn("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;", rendered)
        self.assertIn('data-project-id="alpha&quot; onmouseover=&quot;alert(1)"', rendered)
        self.assertIn('alt="&quot; onerror=&quot;alert(1)"', rendered)


if __name__ == "__main__":
    unittest.main()
