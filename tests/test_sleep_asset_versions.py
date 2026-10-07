"""Reject missing chart entrypoints and keep legal HTML quoting intact."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('sleep_asset_versions', ROOT / 'scripts/update_sleep_assets.py')
updater = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(updater)
CHECK = importlib.util.spec_from_file_location('sleep_asset_refs', ROOT / 'scripts/check_site.py')
checker = importlib.util.module_from_spec(CHECK)
CHECK.loader.exec_module(checker)


class SleepAssetVersionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.assets = self.root / 'gallery/research/assets'
        self.assets.mkdir(parents=True)
        self.patch = patch.object(updater, 'ASSETS', self.assets)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        for name in ('sleep-charts.js', *updater.SCRIPT_ASSETS):
            (self.assets / name).write_text(name)
        self.pages = [self.assets.parent / name for name in ('sleep-2016-2026.html', 'sleep-2016-2026.en.html')]
        self.original = ('<!-- src="assets/sleep-essay-ui.js?v=comment" -->\n'
                         '<script defer src="assets/sleep-chart-loader.js?v=stale" '
                         'data-runtime="assets/sleep-charts.js?v=stale"></script>\n'
                         '<script src="assets/sleep-essay-ui.js?v=stale"></script>\n'
                         '<script type="module" src="assets/sleep-essay-pretext-lab.js?v=stale"></script>')
        self.write(self.original)

    def write(self, text):
        for page in self.pages:
            page.write_text(text)

    def test_single_quotes_update_and_valid_check_is_read_only(self):
        original = self.original.replace('"', "'")
        self.write(original)
        with self.assertRaisesRegex(ValueError, 'out of date'):
            updater.update(check=True)
        self.assertEqual(self.pages[0].read_text(), original)
        updater.update()
        output = self.pages[0].read_text()
        self.assertIn("<!-- src='assets/sleep-essay-ui.js?v=comment' -->", output)
        self.assertIn(f"data-runtime='assets/sleep-charts.js?v={updater.version('sleep-charts.js')}'", output)
        updater.update(check=True)
        self.assertEqual(self.pages[0].read_text(), output)

    def test_missing_wrong_and_duplicate_references_fail_without_partial_writes(self):
        mutations = [
            self.original.replace(' data-runtime="assets/sleep-charts.js?v=stale"', ''),
            self.original.replace('assets/sleep-charts.js', 'assets/sleep-missing.js'),
            self.original.replace('assets/sleep-chart-loader.js', 'assets/missing-loader.js'),
            self.original.replace('assets/sleep-essay-ui.js', 'assets/missing-ui.js'),
            self.original.replace('assets/sleep-essay-pretext-lab.js', 'assets/missing-lab.js'),
            self.original + '<script src="assets/sleep-essay-ui.js"></script>',
            self.original.replace('data-runtime=', 'data-runtime="assets/sleep-charts.js" data-runtime='),
        ]
        for invalid in mutations:
            for check in (False, True):
                with self.subTest(invalid=invalid, check=check):
                    self.pages[0].write_text(self.original)
                    self.pages[1].write_text(invalid)
                    with self.assertRaises(ValueError):
                        updater.update(check)
                    self.assertEqual(self.pages[0].read_text(), self.original)
                    self.assertEqual(self.pages[1].read_text(), invalid)

    def test_old_runtime_urls_are_migrated(self):
        for old in ('sleep-2016-2026.js', 'sleep-2016-2026.en.js'):
            with self.subTest(old=old):
                self.write(self.original.replace('sleep-charts.js', old))
                updater.update()
                self.assertIn(f'data-runtime="assets/sleep-charts.js?v={updater.version("sleep-charts.js")}"',
                              self.pages[0].read_text())
                updater.update(check=True)

    def test_only_changed_resource_key_is_updated(self):
        updater.update()
        before = self.pages[0].read_text()
        old_key = updater.version('sleep-essay-ui.js')
        (self.assets / 'sleep-essay-ui.js').write_text('changed UI')
        updater.update()
        self.assertEqual(self.pages[0].read_text(), before.replace(old_key, updater.version('sleep-essay-ui.js')))

    def test_static_checker_checks_data_runtime(self):
        self.write(self.original.replace('sleep-charts.js', 'sleep-missing.js'))
        with patch.object(checker, 'ROOT', self.root):
            errors = []
            checker.check_local_refs(errors)
        self.assertEqual(len(errors), 2)
        self.assertTrue(all('missing local data-runtime target' in error for error in errors))
