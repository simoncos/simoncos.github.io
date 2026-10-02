"""Guard the recovered source graph and its usable routes, not the layout."""
import json
import copy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from music_riddle_data import load, validate


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
        actual = {(n['id'], target) for n in self.nodes.values() for target in n['next']}
        expected = {(source['id'], n['id']) for n in self.nodes.values() for source in n['source']['predecessors']}
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

    def test_editable_data_and_new_puzzle_template_are_valid(self):
        load()
        template = load(ROOT / 'docs/templates/music-riddle.json')
        self.assertNotEqual(template['id'], self.data['id'])

    def test_renaming_a_song_preserves_routes_and_historical_evidence(self):
        data = copy.deepcopy(self.data)
        renamed = next(n for n in data['nodes'] if n['id'] == '8GcTLDedcc6')
        renamed['title'] = '校正后的歌名'
        validate(data)
        ending = next(n for n in data['nodes'] if n['id'] == data['ending'])
        self.assertEqual(ending['source']['predecessors'][0]['title'], '花花世界')
        self.assertIn(ending['id'], renamed['next'])

    def test_authoring_errors_are_rejected(self):
        template = load(ROOT / 'docs/templates/music-riddle.json')
        for case in ('duplicate', 'missing-target', 'unreachable', 'ambiguous', 'false-confirmation'):
            with self.subTest(case=case):
                data = copy.deepcopy(template)
                if case == 'duplicate':
                    data['nodes'].append(copy.deepcopy(data['nodes'][0]))
                elif case == 'missing-target':
                    data['nodes'][0]['next'] = ['does-not-exist']
                elif case in ('unreachable', 'ambiguous'):
                    node = copy.deepcopy(data['nodes'][1])
                    node.update(id='song-003', dead_ends=['岔路'])
                    data['nodes'].append(node)
                    if case == 'ambiguous':
                        data['nodes'][0]['next'].append('song-003')
                else:
                    data['nodes'][0]['identity']['review']['status'] = 'confirmed'
                with self.assertRaises(ValueError):
                    validate(data)


if __name__ == '__main__':
    unittest.main()
