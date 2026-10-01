"""Guard zero counts and magnitude boundaries in the public aggregate export."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('zhihu_bins', Path(__file__).resolve().parents[1] / 'scripts/prepare_zhihu_distributions.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class MagnitudeBinsTest(unittest.TestCase):
    def test_boundary_values_are_counted_exactly_once(self):
        values = [0, 1, 9, 10, 99, 100, 999, 1000, 9999, 10000, 99999, 100000, 999999, 1000000]
        bins = module.aggregate(values)
        self.assertEqual([b['count'] for b in bins], [1, 2, 2, 2, 2, 2, 2, 1])
        self.assertEqual(sum(b['count'] for b in bins), len(values))

    def test_missing_or_invalid_counts_are_not_treated_as_zero(self):
        for values in [[], [None], [-1], [1.5], ['0']]:
            with self.subTest(values=values), self.assertRaises(ValueError):
                module.aggregate(values)
