"""Guard the recovered source graph and its usable routes, not the layout."""
import json
import copy
import re
import sys
import subprocess
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
        self.assertEqual(len(self.nodes), 37)
        self.assertEqual(len({n['source']['douban_item'] for n in self.nodes.values() if n['source'].get('douban_item')}), 26)
        self.assertEqual(self.nodes[self.data['start']]['title'], '不来也不去')

    def test_sampled_piano_replay_and_async_cancellation(self):
        subprocess.run(['node', 'tests/echo_piano_runtime.cjs'], cwd=ROOT, check=True,
                       capture_output=True, text=True)

    def test_curated_presentation_survives_reordering_and_matches_the_map(self):
        from build_music_riddle import map_svg
        from html.parser import HTMLParser
        class MapImages(HTMLParser):
            def __init__(self):
                super().__init__()
                self.node = None
                self.images = {}

            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                if 'data-node' in attrs:
                    self.node = attrs['data-node']
                if tag == 'image' and self.node:
                    self.images[self.node] = attrs['href']
                    self.node = None

        for ordered in (self.data, dict(self.data, nodes=list(reversed(self.data['nodes'])))):
            parser = MapImages()
            parser.feed(map_svg(ordered))
            self.assertEqual(set(parser.images), set(self.nodes))
            for node_id, href in parser.images.items():
                node = self.nodes[node_id]
                art = node['presentation']
                self.assertTrue(art['flower_reason'].strip())
                self.assertTrue(art['chord']['reason'].strip())
                self.assertEqual(href, f"assets/echo-flower-{art['flower']}.webp")

    def test_chord_data_rejects_unplayable_or_ambiguous_values(self):
        # A chord is three to six distinct notes, low to high, inside the sampled range C3-C5 (MIDI 48-72).
        for midi in ([48], [48, 55], [48, 50, 52, 54, 56, 58, 60], [47, 55, 64], [48, 55, 73], [48, 55, 55], [60, 55, 48], [48, 55, 60.5]):
            with self.subTest(midi=midi):
                data = copy.deepcopy(self.data)
                data['nodes'][0]['presentation']['chord']['midi'] = midi
                with self.assertRaises(ValueError):
                    validate(data)

    def test_extended_chords_are_valid_and_the_table_is_not_monotonous(self):
        for midi in ([48, 55, 64], [48, 55, 64, 67, 72], [48, 55, 59, 62, 64, 71]):
            with self.subTest(midi=midi):
                data = copy.deepcopy(self.data)
                data['nodes'][0]['presentation']['chord']['midi'] = midi
                validate(data)
        chords = [n['presentation']['chord'] for n in self.nodes.values()]
        # The author asked for richer harmony than triads and sevenths: keep the table from collapsing back to them.
        self.assertGreaterEqual(len({c['name'] for c in chords}), 20, 'distinct chord names')
        self.assertGreaterEqual(sum(len(c['midi']) >= 5 for c in chords), 8, 'chords of five or six notes')
        self.assertTrue(all(3 <= len(c['midi']) <= 6 for c in chords))

    def test_finale_is_a_complete_arrangement_of_every_song(self):
        finale = self.data['finale']
        steps = finale['steps']
        self.assertEqual({s['node'] for s in steps}, set(self.nodes), 'every song, the hidden coda included, is lit at least once')
        self.assertEqual(steps[0]['node'], self.data['start'])
        self.assertEqual(steps[-2]['node'], self.data['ending'])
        self.assertEqual(steps[-1]['node'], self.data['bonus'])
        seconds = sum(s['beats'] for s in steps) * finale['beat']
        self.assertTrue(30 <= seconds <= 60, f'a piece to sit through once: {seconds:.1f} s')
        # Where the arrangement follows a path of the graph the page lights that path; most of it should.
        edges = {(n['id'], t) for n in self.nodes.values() for t in n['next']} | {(self.data['ending'], self.data['bonus'])}
        followed = sum((a['node'], b['node']) in edges for a, b in zip(steps, steps[1:]))
        self.assertGreaterEqual(followed, len(steps) * 0.6)

    def test_finale_rejects_broken_arrangements(self):
        def broken(mutate):
            data = copy.deepcopy(self.data)
            mutate(data['finale'])
            with self.assertRaises(ValueError):
                validate(data)
        broken(lambda f: f['steps'][3].update(node='no-such-song'))
        broken(lambda f: f.update(beat=0.1))
        broken(lambda f: f.update(beat=2))
        broken(lambda f: f['steps'][3].pop('level'))
        broken(lambda f: f['steps'][3].update(level=1.5))
        broken(lambda f: f['steps'][3].update(beats=0.1))
        broken(lambda f: f['steps'][3].update(roll=0.9))
        broken(lambda f: f['steps'][3].update(release=0.05))
        broken(lambda f: f['steps'][3].update(volume=1))
        broken(lambda f: f.update(extra=1))
        broken(lambda f: f.update(steps=f['steps'][:1]))
        broken(lambda f: f.update(beat=1.5, steps=[dict(s, beats=16) for s in f['steps'][:6]] + f['steps'][-2:]))  # longer than the cap
        broken(lambda f: f['steps'].pop())  # no longer closes on the hidden coda
        broken(lambda f: f['steps'].__setitem__(-2, dict(f['steps'][-2], node=self.data['start'])))  # the ending does not precede the coda

    def test_score_player_and_finale_runtime(self):
        subprocess.run(['node', 'tests/echo_score_runtime.cjs'], cwd=ROOT, check=True, capture_output=True, text=True)

    def test_generated_page_wires_the_path_player_and_the_finale(self):
        html = (ROOT / 'gallery/music/endless-echoes.html').read_text(encoding='utf-8')
        for hook in ('data-path-play', 'data-path-beads', 'data-finale-bar', 'data-finale-play', 'id="echo-score-status"', 'data-finale-status'):
            with self.subTest(hook=hook):
                self.assertEqual(html.count(hook), 1)
        scripts = re.findall(r'src="[^"]*src/js/([a-z-]+\.js)', html)
        self.assertLess(scripts.index('echo-piano.js'), scripts.index('echo-score.js'))
        self.assertLess(scripts.index('echo-score.js'), scripts.index('music-riddle.js'))
        payload = json.loads(re.search(r'<script type="application/json" id="echo-data">(.*?)</script>', html, re.S).group(1))
        self.assertEqual(payload['finale'], self.data['finale'])
        self.assertTrue(all(len(n['presentation']['chord']['midi']) >= 3 for n in payload['nodes']))

    def test_quote_format_cannot_replace_a_separate_epigraph(self):
        for node_id in ('matchless', 'next-year-today', 'today'):
            self.assertEqual(self.nodes[node_id]['clue_format'], 'quote')
        data = copy.deepcopy(self.data)
        song = next(n for n in data['nodes'] if n['id'] == 'mian-mian')
        song['clue_format'] = 'quote'
        with self.assertRaises(ValueError):
            validate(data)

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
        self.assertEqual(reached, set(self.nodes) - {self.data['bonus']})

    def test_edges_preserve_sources_without_treating_backlinks_as_exhaustive(self):
        actual = {(n['id'], target) for n in self.nodes.values() for target in n['next']}
        expected = {(source['id'], n['id']) for n in self.nodes.values() for source in n['source']['predecessors']}
        additions = {(n['id'], route['target']) for n in self.nodes.values()
                     for route in n.get('route_audit', {}).get('confirmed_additions', [])}
        retired = {(n['id'], route['target']) for n in self.nodes.values()
                   for route in n.get('route_audit', {}).get('retired_routes', [])}
        self.assertEqual(actual, (expected - retired) | additions)
        self.assertIn(('2113245', self.data['start']), actual)
        self.assertIn(('2113245', 'hmuda8eb'), actual)

    def test_mian_mian_is_a_collectible_dead_end_with_the_author_quote(self):
        song = self.nodes['mian-mian']
        self.assertIn('mian-mian', self.nodes['kavMc624b']['next'])
        self.assertNotIn('open_answers', self.nodes['kavMc624b'])
        self.assertEqual(song['terminal'], 'dead-end')
        self.assertFalse(song['next'])
        self.assertNotEqual(song['id'], self.data['ending'])
        self.assertIn('綿綿', song['aliases'])
        self.assertEqual(song['quote'], '从来没细心数清楚，一个夏雨天，一次愉快的睡眠，断多少发线')

    def test_the_spellings_a_player_would_type_are_accepted(self):
        # The input says "简繁体均可"; these three were rejected until 2026-10-03 (浮夸 and 红玫瑰 had no traditional
        # spelling, and 囍帖街 is the title's official form). Each alias must belong to the one node it names.
        spellings = {'exaggerated': '浮誇', 'red-rose': '紅玫瑰', 'wedding-card-street': '囍帖街'}
        for node_id, spelling in spellings.items():
            self.assertIn(spelling, self.nodes[node_id]['aliases'], node_id)
            owners = [n['id'] for n in self.nodes.values() if spelling in (n['title'], *n['aliases'])]
            self.assertEqual(owners, [node_id], spelling)

    def test_dead_end_cannot_continue_or_replace_the_ending(self):
        for case in ('outgoing', 'ending'):
            data = copy.deepcopy(self.data)
            song = next(n for n in data['nodes'] if n['id'] == 'mian-mian')
            if case == 'outgoing':
                song['next'] = [data['start']]
            else:
                data['ending'] = song['id']
            with self.assertRaises(ValueError):
                validate(data)

    def test_open_answers_cannot_shadow_a_path_or_claim_unconfirmed_authorship(self):
        for case in ('ambiguous', 'unconfirmed', 'invented-clue', 'unrecorded-route'):
            with self.subTest(case=case):
                data = copy.deepcopy(self.data)
                nodes = {n['id']: n for n in data['nodes']}
                branch = {'title':'待补歌曲','aliases':[],'clue':None,'next':None,'review':{'status':'confirmed','by':'simoncos','date':'2026-10-02','note':'test fixture'}}
                nodes['kavMc624b']['open_answers'] = [branch]
                if case == 'ambiguous':
                    branch['aliases'].append('约定')
                elif case == 'unconfirmed':
                    branch['review']['status'] = 'pending'
                elif case == 'invented-clue':
                    branch['clue'] = {'zh': '新写的谜面', 'en': 'Invented clue'}
                else:
                    nodes['2113245']['next'].remove(data['start'])
                with self.assertRaises(ValueError):
                    validate(data)

    def test_decoys_answer_near_misses_without_hiding_a_path(self):
        # 2026-10-04: a twin with other lyrics, or a better-known song on the same theme, gets its own line; never accepted.
        twins = {'孤独患者': {'白玫瑰', '不如不见'}, '红玫瑰': {'月黑风高', '爱情转移'}, '富士山下': {'好久不见'}, '不如不见': {'明年今日'}}
        by_title = {n['title']: n for n in self.data['nodes']}
        for title, expected in twins.items():
            with self.subTest(node=title):
                self.assertEqual({d['title'] for d in by_title[title]['decoys']}, expected)
        html = (ROOT / 'gallery/music/endless-echoes.html').read_text(encoding='utf-8')
        payload = json.loads(re.search(r'<script type="application/json" id="echo-data">(.*?)</script>', html, re.S).group(1))
        shipped = {n['id']: n.get('decoys') for n in payload['nodes'] if n.get('decoys')}
        self.assertEqual(set(shipped), {n['id'] for n in self.data['nodes'] if n.get('decoys')})
        self.assertTrue(all(set(d) == {'title', 'aliases', 'message'} for ds in shipped.values() for d in ds))
        for case in ('shadows-path', 'is-current-song', 'no-message', 'no-note'):
            with self.subTest(case=case):
                data = copy.deepcopy(self.data)
                node = next(n for n in data['nodes'] if n['title'] == '孤独患者')
                decoy = node['decoys'][0]
                if case == 'shadows-path':
                    decoy['aliases'].append('紅玫瑰')
                elif case == 'is-current-song':
                    decoy['aliases'].append('孤獨患者' if '孤獨患者' in node['aliases'] else node['title'])
                elif case == 'no-message':
                    del decoy['message']
                else:
                    del decoy['note']
                with self.assertRaises(ValueError):
                    validate(data)

    def test_single_ending_and_explained_detours(self):
        ending = self.nodes[self.data['ending']]
        self.assertFalse(ending['next'])
        self.assertNotIn('dead_ends', ending)
        for node in self.nodes.values():
            if node['id'] != ending['id'] and not node['next']:
                self.assertTrue(node.get('dead_ends') or node.get('terminal') in ('dead-end', 'epilogue'), node['title'])

    def test_expansion_routes_and_hidden_epilogue(self):
        expected = {
            '9lmK42c6b': ['ten-years'], 'ten-years': ['next-year-today'],
            '8Gmn27f4280': ['exaggerated'], 'exaggerated': ['mQ9j8d7b7b0'],
            'red-rose': ['8GcTLDedcc6', 'kau7b16d6', 'black-zek-ming'],
            'black-zek-ming': ['the-end'], 'the-end': ['rAx50113'],
            'wedding-card-street': ['rAx50113'], 'today': ['mQKhoF955e4'],
            'mQ9j8i76fc8': ['matchless'],
        }
        for source, targets in expected.items():
            self.assertEqual(self.nodes[source]['next'], targets)
        for source, target in [('hmuda8eb', 'today'), ('mQ9j8d7b7b0', 'red-rose'), ('fOld7b901', 'wedding-card-street')]:
            self.assertIn(target, self.nodes[source]['next'])
        self.assertEqual(self.data['bonus'], 'allegro')
        self.assertEqual(self.nodes['allegro']['terminal'], 'epilogue')
        self.assertFalse(self.nodes['allegro']['next'])
        self.assertTrue(all('allegro' not in n['next'] for n in self.nodes.values()))
        self.assertEqual(len(self.nodes) - 1, 36)

    def test_bonus_cannot_be_guessed_or_replace_the_main_ending(self):
        for case in ('path', 'ending', 'missing', 'ordinary-leaf'):
            data = copy.deepcopy(self.data)
            if case == 'path':
                data['nodes'][0]['next'].append(data['bonus'])
            elif case == 'ending':
                data['bonus'] = data['ending']
            elif case == 'missing':
                data['bonus'] = 'unknown'
            else:
                next(n for n in data['nodes'] if n['id'] == data['bonus'])['terminal'] = 'dead-end'
            with self.assertRaises(ValueError):
                validate(data)

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
