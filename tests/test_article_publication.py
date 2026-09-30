"""Guard the owner's requirement that articles publish in both languages."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ArticlePublicationTests(unittest.TestCase):
    def check_groups(self, groups):
        spec = importlib.util.spec_from_file_location('publication_check_site', ROOT / 'scripts/check_site.py')
        checker = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(checker)
        with tempfile.TemporaryDirectory() as directory:
            checker.ROOT = Path(directory)
            (checker.ROOT / 'data').mkdir()
            (checker.ROOT / 'data/article_index.json').write_text(json.dumps({'groups': groups}))
            errors = []
            checker.check_article_translations(errors)
            return errors

    @staticmethod
    def entry(slug):
        return {'file': slug + '.html', 'markdown': slug + '.md', 'available': True}

    def test_complete_pair_is_ready(self):
        self.assertEqual(self.check_groups([{'id': 'essay', 'languages': {
            'zh': self.entry('essay'), 'en': self.entry('essay.en'),
        }}]), [])

    def test_untranslated_article_blocks_publication(self):
        errors = self.check_groups([{'id': 'essay', 'languages': {'zh': self.entry('essay')}}])
        self.assertEqual(len(errors), 1)
        self.assertIn('essay', errors[0])
        self.assertIn('missing en translation', errors[0])

    def test_placeholder_translation_is_not_a_complete_pair(self):
        for placeholder in ({}, {'file': 'essay.en.html'}, {**self.entry('essay.en'), 'available': False}):
            with self.subTest(placeholder=placeholder):
                errors = self.check_groups([{'id': 'essay', 'languages': {
                    'zh': self.entry('essay'), 'en': placeholder,
                }}])
                self.assertEqual(len(errors), 1)
                self.assertIn('missing en translation', errors[0])

    def test_missing_chinese_also_blocks_publication(self):
        errors = self.check_groups([{'id': 'essay', 'languages': {'en': self.entry('essay.en')}}])
        self.assertEqual(len(errors), 1)
        self.assertIn('missing zh translation', errors[0])


class ArticleDateTests(unittest.TestCase):
    """An article has one date, when it was written; older pieces keep theirs."""

    def check_frontmatter(self, frontmatter):
        spec = importlib.util.spec_from_file_location('date_check_site', ROOT / 'scripts/check_site.py')
        checker = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(checker)
        with tempfile.TemporaryDirectory() as directory:
            checker.ROOT = Path(directory)
            (checker.ROOT / 'blogs').mkdir()
            (checker.ROOT / 'blogs/essay.md').write_text(f'---\n{frontmatter}\n---\n\n# Essay\n', encoding='utf-8')
            errors = []
            checker.check_article_dates(errors)
            return errors

    def test_historical_date_passes(self):
        self.assertEqual(self.check_frontmatter('date: 2016-10-24'), [])

    def test_missing_date_is_rejected(self):
        errors = self.check_frontmatter('tags: life')
        self.assertEqual(len(errors), 1)
        self.assertIn('the day the piece was written', errors[0])

    def test_written_is_retired(self):
        # Owner's call, 2026-09-30: one date, when the piece was written.
        for value in ('2012-12', '原日期未详'):
            with self.subTest(value=value):
                errors = self.check_frontmatter(f'date: 2014-01-04\nwritten: {value}')
                self.assertEqual(len(errors), 1)
                self.assertIn('written is retired', errors[0])


if __name__ == '__main__':
    unittest.main()
