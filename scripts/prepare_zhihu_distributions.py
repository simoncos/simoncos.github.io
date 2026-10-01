#!/usr/bin/env python3
"""Export only coarse profile-count histograms from the private 2015 database.

Manual preparation, not a build dependency. Never emits identifiers or edges.
The site's normal build consumes the reviewed, committed aggregate JSON.
"""
import argparse
import hashlib
import json
import sqlite3
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHA256 = '1ea3f6f2a3ecc8f220a36e9c9b8463501af5b62eb1cb7ec3674bf0e7105c903d'
BOUNDS = [(0, 1), (1, 10), (10, 100), (100, 1000), (1000, 10000),
          (10000, 100000), (100000, 1000000), (1000000, None)]


def aggregate(values):
    if not values or any(type(v) is not int or v < 0 for v in values):
        raise ValueError('Every profile count must be a nonnegative integer')
    bins = [{'min': lo, 'max_exclusive': hi,
             'count': sum(lo <= v and (hi is None or v < hi) for v in values)}
            for lo, hi in BOUNDS]
    assert sum(b['count'] for b in bins) == len(values)
    return bins


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', type=Path, required=True)
    args = parser.parse_args()
    db = args.db.resolve()
    with db.open('rb') as f:
        digest = hashlib.file_digest(f, 'sha256').hexdigest()
    if digest != SOURCE_SHA256:
        raise ValueError('Unknown database; review its provenance before exporting')
    path = ROOT / 'data/zhihu-2015.json'
    payload = json.loads(path.read_text())
    connection = sqlite3.connect(db.as_uri() + '?mode=ro&immutable=1', uri=True)
    histograms = {}
    for metric in payload['metrics']:
        key = metric['id']
        if key not in {'followee', 'follower', 'answer', 'agree', 'thanks'}:
            raise ValueError('Unknown profile column')
        values = [row[0] for row in connection.execute(f'SELECT {key}_num FROM User')]
        bins = aggregate(values)
        if len(values) != 26161:
            raise ValueError('Unexpected sample size')
        if round(statistics.mean(values), 1) != metric['mean'] or statistics.median(values) != metric['median']:
            raise ValueError(f'{key}: published mean or median differs from the archive')
        histograms[key] = bins
    connection.close()
    payload['recovered_distribution'] = {
        'computed': '2026-10-01', 'snapshot': '2015-10', 'sample_size': 26161,
        'database_sha256': digest,
        'method': 'Counts in disjoint magnitude bins, over all User records; no user-level records exported.',
        'published_mean_median_check': 'All five means (one decimal) and medians match the 2016 table.',
        'bins': histograms,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
    print('Verified 5 means, 5 medians; exported 40 aggregate bins covering 26,161 users each.')


if __name__ == '__main__':
    main()
