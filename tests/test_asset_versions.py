"""Only changed resource content should invalidate its cache URL."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("asset_version_shell", ROOT / "scripts/site_shell.py")
shell = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(shell)
CHECK_SPEC = importlib.util.spec_from_file_location("asset_version_check", ROOT / "scripts/check_site.py")
checker = importlib.util.module_from_spec(CHECK_SPEC)
CHECK_SPEC.loader.exec_module(checker)


class AssetVersionTests(unittest.TestCase):
    def test_changing_one_script_preserves_all_other_resource_urls(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, data in (("src/js/site.js", "shared"), ("src/js/home.js", "home"),
                               ("src/css/styles.css", "styles")):
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(data)
            paths = ["src/js/site.js", "src/js/home.js", "src/css/styles.css"]
            with patch.object(shell, "ROOT", root):
                before = {name: shell.versioned_asset(name, "../") for name in paths}
                (root / "src/js/home.js").write_text("home changed")
                after = {name: shell.versioned_asset(name, "../") for name in paths}
                self.assertNotEqual(before["src/js/home.js"], after["src/js/home.js"])
                for name in ("src/js/site.js", "src/css/styles.css"):
                    self.assertEqual(before[name], after[name])
                self.assertTrue(after["src/js/home.js"].startswith("../src/js/home.js?v="))
                (root / "src/js/home.js").write_text("home")
                self.assertEqual(shell.versioned_asset("src/js/home.js", "../"), before["src/js/home.js"])

    def test_external_script_keeps_its_existing_url(self):
        tag = shell.render_script_tag({"external_src": "https://example.com/a.js", "defer": True}, "../", {})
        self.assertIn('src="https://example.com/a.js" defer', tag)
        self.assertNotIn("?v=", tag)

    def test_checker_accepts_different_valid_keys_and_rejects_a_stale_one(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "src/js").mkdir(parents=True)
            for name in ("site", "home"):
                (root / f"src/js/{name}.js").write_text(name)
            with patch.object(shell, "ROOT", root), patch.object(checker, "ROOT", root):
                urls = [shell.versioned_asset(f"src/js/{name}.js") for name in ("site", "home")]
                (root / "index.html").write_text("".join(f'<script src="{url}"></script>' for url in urls))
                errors = []
                checker.check_js_cache_keys(errors)
                self.assertEqual(errors, [])
                (root / "src/js/home.js").write_text("new home")
                checker.check_js_cache_keys(errors)
                self.assertEqual(len(errors), 1)
                self.assertIn("home.js", errors[0])
                self.assertIn("do not match its content", errors[0])
