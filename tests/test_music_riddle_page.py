"""Guard the Endless Echoes page against the phone and loading faults found on 2026-10-03.

The browser measurements behind each rule are in docs/qa/2026-10-03-echoes-mobile-fixes.md; these tests only pin the rules that
made them pass, so a later edit cannot quietly bring a fault back."""
import re
import sys
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from music_riddle_data import load


class Tags(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, {key: value or '' for key, value in attrs}))


def tags(html):
    parser = Tags()
    parser.feed(html)
    return parser.tags


def rule_bodies(css, selector):
    """Declarations of every rule whose selector is exactly `selector` (the stylesheet nests nothing but @media)."""
    return re.findall(r'(?:^|[{};/])\s*' + re.escape(selector) + r'\s*\{([^{}]*)\}', css)


class EchoesPageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = load()
        cls.page = (ROOT / 'gallery/music/endless-echoes.html').read_text()
        cls.css = (ROOT / 'gallery/music/assets/endless-echoes.css').read_text()
        cls.ts = (ROOT / 'src/ts/music-riddle.ts').read_text()
        cls.js = (ROOT / 'src/js/music-riddle.js').read_text()

    def test_map_is_named_in_the_page_language_not_in_both_at_once(self):
        from build_music_riddle import map_svg
        drawn = re.search(r'<svg class="echo-map".*?</svg>', self.page, re.S).group(0)
        for svg in (map_svg(self.data), drawn):
            with self.subTest(source='builder' if svg is not drawn else 'built page'):
                songs = svg.count('class="echo-hit"') - (1 if self.data.get('bonus') else 0)
                paths = svg.count('class="echo-route"')
                self.assertEqual((songs, paths), (36, 47))
                (_, svg_tag), = [t for t in tags(svg) if t[0] == 'svg']
                self.assertEqual(svg_tag['role'], 'group')
                self.assertEqual(svg_tag['aria-label'], f'{songs} songs connected by {paths} paths')
                self.assertEqual(svg_tag['data-zh-aria-label'], f'{songs} 首歌，{paths} 条路径')
                self.assertEqual(svg_tag['data-i18n'], 'aria-label')
                self.assertNotIn('aria-labelledby', svg_tag)
                self.assertNotIn('<title', svg)

    def test_tip_is_in_the_first_paint_between_intro_and_game_with_a_labelled_close_button(self):
        found = [attrs for tag, attrs in tags(self.page) if 'data-device-hint' in attrs]
        self.assertEqual(len(found), 1)
        # No hidden attribute: a tip that appears only once script runs would push the clue down for every first-time visitor.
        self.assertNotIn('hidden', found[0])
        self.assertEqual(found[0]['role'], 'note')
        start = self.page.index('data-device-hint')
        self.assertGreater(start, self.page.index('class="echo-intro"'))
        self.assertLess(start, self.page.index('id="echo-game"'))
        block = self.page[start:self.page.index('</div>', start)]
        for lang in ('en', 'zh'):
            self.assertIn(f'<span data-l="{lang}"', block)
        (button,) = [attrs for tag, attrs in tags(block) if tag == 'button']
        self.assertEqual(button['type'], 'button')
        self.assertIn('data-hint-dismiss', button)
        self.assertTrue(button['aria-label'] and button['data-zh-aria-label'])
        self.assertEqual(button['data-i18n'], 'aria-label')

    def test_tip_shows_only_where_the_layout_is_stacked_and_is_closable_only_once_script_armed_it(self):
        self.assertIn('display:none', ' '.join(rule_bodies(self.css, '.echo-device-hint')))
        # Touch on the stacked layout (<= 900 px, where the clue and the map are not side by side) or a phone-narrow window (<= 650 px).
        shown = re.search(r'@media\(max-width:900px\) and \(pointer:coarse\),\(max-width:650px\)\{[^@]*?\.echo-device-hint:not\(\[hidden\]\)\{display:flex', self.css)
        self.assertTrue(shown, 'the tip must be switched on by a media query, not by script, and only where the layout is stacked')
        self.assertTrue(rule_bodies(self.css, '.echo-device-hint:not(.is-armed) button'))
        self.assertIn('visibility:hidden', rule_bodies(self.css, '.echo-device-hint:not(.is-armed) button')[0])

    def test_tip_storage_access_survives_blocked_storage(self):
        # Private windows and blocked site data make localStorage throw on read or write; the tip must still show and close.
        for name, source in (('ts', self.ts), ('js', self.js)):
            for access in ('getItem(tipKey)', 'setItem(tipKey'):
                with self.subTest(source=name, access=access):
                    at = source.index(access)
                    before = source[:at]
                    self.assertGreater(before.rfind('try'), before.rfind('catch'), 'storage call outside try')
                    self.assertIn('catch', source[at:at + 200])

    def test_riddle_starts_when_the_piano_script_fails_to_load(self):
        # echo-piano.js is a separate deferred script. If it never arrives the riddle must still start, with sound reported unavailable.
        for name, source in (('ts', self.ts), ('js', self.js)):
            with self.subTest(source=name):
                code = re.sub(r'//[^\n]*', '', source)
                self.assertEqual(len(re.findall(r'new EchoPiano\.Player\(', code)), 1)
                self.assertRegex(code, r"typeof EchoPiano\s*===?\s*'undefined'\s*\?\s*null\s*:\s*new EchoPiano\.Player\(")
                # (EchoPiano.Status and EchoPiano.Step are type annotations in the .ts and are erased from the .js.)
                self.assertEqual(re.findall(r'EchoPiano\.(?!Player\(|Status\b|Step\b)\w+', code), [])
                # The player may be null: every call that is not optional-chained comes after a check on it in the same function,
                # either `if(...piano...) void piano.x(` or an early `if(!...piano...)return;`.
                bare = list(re.finditer(r'(?<![\w?-])piano\.(\w+)', code))
                self.assertEqual(sorted({m.group(1) for m in bare}), ['play', 'playScore', 'prepare'])
                for m in bare:
                    # From the start of the enclosing function up to the call.
                    body = code[code.rfind('function', 0, m.start()):m.start()]
                    self.assertRegex(body, r'if\s*\([^)]*\bpiano\b[^)]*\)',
                                     f'piano.{m.group(1)} has no check on the player before it')

    def test_main_column_and_hero_art_have_a_width_before_their_images_and_fonts_arrive(self):
        # With only auto side margins a flex or grid item shrinks to its content, so the column measured itself from whatever had
        # loaded and then jumped (cold-load layout shift 0.21-0.42 on a desktop); the hero art was 0 high until its image arrived.
        for selector in ('.echo-main', '.echo-hero-art'):
            with self.subTest(selector=selector):
                base = rule_bodies(self.css, selector)[0]  # the base rule comes before any @media override
                self.assertRegex(base, r'margin:[^;}]*\bauto\b')
                self.assertIn('width:100%', base, f'{selector} needs an explicit width beside its auto margin')

    def test_replay_cue_is_positioned_as_one_label_not_as_each_language_span(self):
        # The old rule `.echo-clue-flower span{position:absolute;top:100%}` also caught the language spans inside the cue and placed
        # each against a 7 px box, so Chinese wrapped one character per line and the English cue sat off-centre.
        self.assertNotRegex(self.css, r'\.echo-clue-flower\s+span\s*\{')
        (body,) = rule_bodies(self.css, ':root.js .echo-clue-flower>.echo-replay-cue')
        for declaration in ('position:absolute', 'top:100%', 'left:50%', 'transform:translateX(-50%)', 'white-space:nowrap'):
            self.assertIn(declaration, body)

    def test_page_links_answer_a_thumb_with_a_44px_area_without_changing_how_they_look(self):
        touch = re.search(r'@media\(pointer:coarse\),\(max-width:650px\)\{(?P<body>[^@]*?)\n\}', self.css, re.S)
        body = touch.group('body') if touch else ''
        self.assertRegex(body, r"\.echo-source-links a::after\{content:'';position:absolute;inset:-13px 0\}")
        self.assertRegex(body, r'\.echo-source-links a\{position:relative\}')
        # Stacked areas must not overlap: two 44 px areas around 18 px lines need a row gap of at least 44 - 18 = 26 px.
        self.assertRegex(body, r'\.echo-source-links\{row-gap:(\d+)px\}')
        self.assertGreaterEqual(int(re.search(r'\.echo-source-links\{row-gap:(\d+)px\}', body).group(1)), 26)
        self.assertRegex(self.css, r"\.echo-device-hint button::after\{content:'';position:absolute;inset:-10px\}")


    def test_keyboard_resizes_the_page_and_the_typing_layout_keeps_the_clue_in_view(self):
        # Without it Android Chrome pans the whole view 250 px up when the keyboard opens and back when it closes.
        (meta,) = [attrs for tag, attrs in tags(self.page) if tag == 'meta' and attrs.get('name') == 'viewport']
        self.assertIn('interactive-widget=resizes-content', meta['content'])
        self.assertRegex(self.css, r'@media\(max-width:900px\) and \(max-height:480px\)\{\s*\.music-riddle \.hdr\{position:relative\}')
        # Only this page asks for it.
        self.assertNotIn('interactive-widget', (ROOT / 'index.html').read_text())

if __name__ == '__main__':
    unittest.main()
