"""A heavy initial resource or layout expansion must trip the budget guard."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("performance_budgets", ROOT / "scripts/check_performance.py")
performance = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(performance)


class PerformanceBudgetTests(unittest.TestCase):
    def test_initial_assets_are_deduplicated_and_lazy_images_are_excluded(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "nested").mkdir()
            (root / "app.js").write_bytes(b"function app() {}")
            (root / "screen.css").write_bytes(b"body { color: red; }")
            (root / "image.jpg").write_bytes(b"image")
            (root / "nested/index.html").write_text(
                '<link rel="stylesheet" href="../screen.css?v=one">'
                '<script src="/app.js?v=one"></script><script src="../app.js?v=two"></script>'
                '<script src="https://example.com/external.js"></script>'
                '<img src="../image.jpg"><img src="../image.jpg" loading="lazy">'
                '<img src="missing.jpg" loading="lazy">')
            result = performance.measure_page(root, "nested/index.html")
            self.assertEqual(result["initial_js_gzip_bytes"], performance.gzip_size((root / "app.js").read_bytes()))
            self.assertEqual(result["initial_css_gzip_bytes"], performance.gzip_size((root / "screen.css").read_bytes()))
            self.assertEqual(result["eager_image_bytes"], 5)

    def test_growth_is_reported_without_silently_resetting_the_limit(self):
        budgets = {"pages": {"index.html": {"limits": {"html_gzip_bytes": 100}}}, "assets": {}}
        self.assertEqual(performance.check_limits({"pages": {"index.html": {"html_gzip_bytes": 100}}, "assets": {}}, budgets), [])
        errors = performance.check_limits({"pages": {"index.html": {"html_gzip_bytes": 101}}, "assets": {}}, budgets)
        self.assertEqual(len(errors), 1)
        self.assertIn("101 exceeds budget 100", errors[0])
        self.assertEqual(budgets["pages"]["index.html"]["limits"]["html_gzip_bytes"], 100)

    def test_missing_initial_asset_blocks_the_check(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "index.html").write_text('<script src="missing.js"></script>')
            with self.assertRaisesRegex(ValueError, "missing or invalid local asset"):
                performance.measure_page(root, "index.html")
