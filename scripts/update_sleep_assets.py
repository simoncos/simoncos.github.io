#!/usr/bin/env python3
"""Keep hand-authored bilingual Sleep pages on the same fingerprinted chart runtime."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import argparse
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'gallery/research/assets'
SCRIPT_ASSETS = ('sleep-chart-loader.js', 'sleep-essay-ui.js', 'sleep-essay-pretext-lab.js')
RUNTIMES = {'assets/sleep-charts.js', 'assets/sleep-2016-2026.js', 'assets/sleep-2016-2026.en.js'}
ATTRIBUTE = re.compile(r'''([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))''')


class ScriptTags(HTMLParser):
    """Locate real script attributes without rewriting the hand-authored HTML."""

    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.scripts = []
        self.lines = [0, *(match.end() for match in re.finditer('\n', text))]
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        if tag != 'script':
            return
        line, column = self.getpos()
        self.scripts.append((attrs, self.get_starttag_text(), self.lines[line - 1] + column))


def refresh_page(text):
    scripts = ScriptTags(text).scripts
    edits = []

    def value(script, attribute):
        values = [value for name, value in script[0] if name == attribute]
        if len(values) != 1 or not values[0]:
            raise ValueError(f'Expected one nonempty {attribute} attribute on required script')
        return values[0]

    def replace(script, attribute, asset):
        raw, offset = script[1:]
        matches = [match for match in ATTRIBUTE.finditer(raw) if match[1].lower() == attribute]
        if len(matches) != 1:
            raise ValueError(f'Cannot locate unique {attribute} value')
        match = matches[0]
        group = next(group for group in (2, 3, 4) if match[group] is not None)
        start, end = match.span(group)
        edits.append((offset + start, offset + end, f'assets/{asset}?v={version(asset)}'))

    for asset in SCRIPT_ASSETS:
        expected_path = f'assets/{asset}'
        candidates = [script for script in scripts if any(
            (name == 'src' and urlsplit(raw or '').path == expected_path)
            or (asset == 'sleep-chart-loader.js' and name == 'data-runtime')
            for name, raw in script[0])]
        if len(candidates) != 1:
            raise ValueError(f'Expected exactly one script reference to {expected_path}')
        script = candidates[0]
        src = value(script, 'src')
        if urlsplit(src).path != expected_path or urlsplit(src).netloc or urlsplit(src).scheme:
            raise ValueError(f'Unexpected script src: {src!r}')
        replace(script, 'src', asset)
        if asset == 'sleep-chart-loader.js':
            runtime = value(script, 'data-runtime')
            parsed = urlsplit(runtime)
            if parsed.path not in RUNTIMES or parsed.scheme or parsed.netloc:
                raise ValueError(f'Unexpected chart runtime: {runtime!r}')
            replace(script, 'data-runtime', 'sleep-charts.js')

    for start, end, replacement in sorted(edits, reverse=True):
        text = text[:start] + replacement + text[end:]
    return text


def version(name):
    return hashlib.sha256((ASSETS / name).read_bytes()).hexdigest()[:12]


def update(check=False):
    errors = []
    updates = []
    for name in ('sleep-2016-2026.html', 'sleep-2016-2026.en.html'):
        path = ASSETS.parent / name
        text = path.read_text()
        try:
            output = refresh_page(text)
        except ValueError as error:
            errors.append(f'{name}: {error}')
            continue
        if output != text:
            if check:
                errors.append(f'{name}: asset references are out of date')
            else:
                updates.append((path, output))
    if errors:
        raise ValueError('Sleep asset reference check failed: ' + '; '.join(errors))
    for path, output in updates:
        path.write_text(output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    update(args.check)
    print('Sleep asset references are current.')
