#!/usr/bin/env python3
"""Join authored CSS sections in cascade order, preserving their exact bytes."""
from pathlib import Path
import argparse
import json

ROOT = Path(__file__).resolve().parents[1]


def build_styles(check=False):
    directory = ROOT / 'src/css'
    sources = json.loads((directory / 'styles.sources.json').read_text())
    output = b''.join((directory / name).read_bytes() for name in sources)
    target = directory / 'styles.css'
    if check:
        if not target.is_file() or target.read_bytes() != output:
            raise ValueError('Shared CSS is out of date; run python3 scripts/build_styles.py')
    else:
        target.write_bytes(output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    build_styles(args.check)
    print('Shared CSS is current.' if args.check else 'Built shared CSS.')
