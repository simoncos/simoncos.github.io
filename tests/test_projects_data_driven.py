import importlib.util
import copy
import json
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests/fixtures/projects_multiple.json"


def load_script(name, relative_path):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ProjectsDataDrivenTests(unittest.TestCase):
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
        node_test = f"""
const fs = require('fs');
const vm = require('vm');
const payload = JSON.parse(fs.readFileSync({json.dumps(str(FIXTURE))}, 'utf8'));
const elements = {{
  'project-featured': {{ innerHTML: '' }},
  'projects-ledger': {{ innerHTML: '' }},
  'projects-summary': {{ textContent: '' }}
}};
let ready;
global.document = {{
  addEventListener: (name, callback) => {{ if (name === 'DOMContentLoaded') ready = callback; }},
  getElementById: (id) => elements[id] || null
}};
global.window = {{
  SITE_CONFIG: {{ resolvePath: (path) => path }},
  SITE_I18N: {{
    getCurrentLanguage: () => 'en',
    formatDate: (value) => value,
    resolveLocalizedUrl: (value) => value,
    applyLanguageStateToInternalLinks: () => {{}},
    t: (key) => key
  }},
  addEventListener: () => {{}}
}};
global.fetch = async () => ({{ ok: true, json: async () => payload }});
vm.runInThisContext(fs.readFileSync({json.dumps(str(ROOT / 'src/js/load-projects.js'))}, 'utf8'));
ready();
setTimeout(() => {{
  const featured = elements['project-featured'].innerHTML;
  const ledger = elements['projects-ledger'].innerHTML;
  if (!featured.includes('Alpha Project')) process.exit(2);
  if ((ledger.match(/class="project-ledger-row"/g) || []).length !== 2) process.exit(3);
  if (!ledger.includes('Alpha Project') || !ledger.includes('Beta Project')) process.exit(4);
}}, 0);
"""
        result = subprocess.run(["node", "-e", node_test], cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)


if __name__ == "__main__":
    unittest.main()
