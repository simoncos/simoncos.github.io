"""Protect loading behavior and prevent accidental restoration of unused data."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PerformanceTests(unittest.TestCase):
    def test_chart_loading_lifecycle(self):
        subprocess.run(["node", "tests/sleep_chart_loader.cjs"], cwd=ROOT, check=True,
                       capture_output=True, text=True)

    def test_sleep_script_budget(self):
        for language in ("", ".en"):
            with self.subTest(language=language):
                self.assertLess((ROOT / f"projects/assets/sleep-2016-2026{language}.js").stat().st_size,
                                1_500_000)
