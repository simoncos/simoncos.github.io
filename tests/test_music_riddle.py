"""Guard the recovered source graph and its usable routes, not the layout."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class MusicRiddleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / 'data/music-riddle.json').read_text())
        cls.nodes = {n['id']: n for n in cls.data['nodes']}

    def test_original_collection_size_and_unique_sources(self):
        self.assertEqual(len(self.nodes), 26)
        self.assertEqual(len({n['source']['douban_item'] for n in self.nodes.values()}), 26)
        self.assertEqual(self.nodes[self.data['start']]['title'], '不来也不去')

    def test_every_song_is_reachable_from_the_start(self):
        reached = set()
        pending = [self.data['start']]
        while pending:
            song = pending.pop()
            if song in reached:
                continue
            self.assertIn(song, self.nodes)
            reached.add(song)
            pending.extend(self.nodes[song]['next'])
        self.assertEqual(reached, set(self.nodes))

    def test_edges_preserve_doulist_predecessors(self):
        actual = {(n['title'], target) for n in self.nodes.values() for target in n['next']}
        expected = {(name.strip(), n['id']) for n in self.nodes.values() for name, _ in n['source']['predecessors']}
        self.assertEqual(actual, expected)
        self.assertEqual(len(actual), 31)

    def test_single_ending_and_explained_detours(self):
        ending = self.nodes[self.data['ending']]
        self.assertFalse(ending['next'])
        self.assertNotIn('dead_ends', ending)
        for node in self.nodes.values():
            if node['id'] != ending['id'] and not node['next']:
                self.assertTrue(node.get('dead_ends'), node['title'])

    def test_every_clue_and_hint_is_bilingual(self):
        for node in self.nodes.values():
            for field in ('clue', 'hint'):
                for lang in ('zh', 'en'):
                    self.assertTrue(node[field][lang].strip(), (node['title'], field, lang))


if __name__ == '__main__':
    unittest.main()
