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


if __name__ == '__main__':
    unittest.main()
