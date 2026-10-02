"""Load and check editable music-riddle data without extra dependencies."""
import argparse
from datetime import date
import json
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / 'data/music-riddle.json'
EVIDENCE_TYPES = {'author', 'cross-reference', 'archive', 'contextual-alias', 'provisional'}
REVIEW_STATUSES = {'not-requested', 'pending', 'confirmed', 'corrected'}


def normalize_answer(value):
    return re.sub(r'''[\s《》「」『』·.,，。!?！？’'"-]''', '',
                  unicodedata.normalize('NFKC', value).lower())


def validate(data):
    def require(condition, message):
        if not condition:
            raise ValueError(message)

    def text(value, label):
        require(isinstance(value, str) and bool(value.strip()), f'{label}: expected non-empty text')

    def identifier(value, label):
        text(value, label)
        require(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]*', value), f'{label}: use letters, numbers, - or _')

    def bilingual(value, label):
        require(isinstance(value, dict), f'{label}: expected an object')
        for lang in ('zh', 'en'):
            text(value.get(lang), f'{label}.{lang}')

    def strings(value, label):
        require(isinstance(value, list), f'{label}: expected an array')
        for item in value:
            text(item, label)
        require(len(value) == len(set(value)), f'{label}: duplicate entries')

    def iso_date(value, label):
        text(value, label)
        try:
            require(date.fromisoformat(value).isoformat() == value, f'{label}: use YYYY-MM-DD')
        except ValueError as exc:
            raise ValueError(f'{label}: use a valid YYYY-MM-DD date') from exc

    require(isinstance(data, dict), 'The puzzle must be an object')
    require(data.get('schema_version') == 1, 'Unsupported schema_version')
    identifier(data.get('id'), 'id')
    bilingual(data.get('title'), 'title')
    bilingual(data.get('artist'), 'artist')
    iso_date(data.get('date'), 'date')
    if 'restored' in data:
        iso_date(data['restored'], 'restored')
    layout = data.get('map', {})
    for axis in ('width', 'height'):
        require(type(layout.get(axis)) in (int, float) and layout[axis] > 0, f'map.{axis}: expected positive number')
    nodes = data.get('nodes')
    require(isinstance(nodes, list) and bool(nodes), 'nodes: expected a non-empty array')
    by_id = {}
    for node in nodes:
        require(isinstance(node, dict), 'nodes: every entry must be an object')
        node_id = node.get('id')
        identifier(node_id, 'node.id')
        require(node_id not in by_id, f'Duplicate node id: {node_id}')
        by_id[node_id] = node
        text(node.get('title'), f'{node_id}.title')
        strings(node.get('aliases'), f'{node_id}.aliases')
        strings(node.get('next'), f'{node_id}.next')
        strings(node.get('dead_ends', []), f'{node_id}.dead_ends')
        for field in ('clue', 'hint'):
            bilingual(node.get(field), f'{node_id}.{field}')
        position = node.get('position')
        require(isinstance(position, list) and len(position) == 2, f'{node_id}.position: expected [x, y]')
        for coordinate, axis in zip(position, ('width', 'height')):
            require(type(coordinate) in (int, float) and 0 <= coordinate <= layout[axis], f'{node_id}.position: outside the map')
        identity = node.get('identity', {})
        require(identity.get('evidence_type') in EVIDENCE_TYPES, f'{node_id}: unknown evidence_type')
        strings(identity.get('evidence_urls'), f'{node_id}.identity.evidence_urls')
        require(isinstance(identity.get('note'), str), f'{node_id}.identity.note: expected text')
        candidates = identity.get('candidates')
        require(isinstance(candidates, list), f'{node_id}.identity.candidates: expected an array')
        for candidate in candidates:
            text(candidate.get('title'), f'{node_id}.candidate.title')
            text(candidate.get('reason'), f'{node_id}.candidate.reason')
        review = identity.get('review', {})
        require(review.get('status') in REVIEW_STATUSES, f'{node_id}: unknown review status')
        require(isinstance(review.get('note'), str), f'{node_id}.review.note: expected text')
        if review['status'] in ('confirmed', 'corrected'):
            text(review.get('by'), f'{node_id}.review.by')
            iso_date(review.get('date'), f'{node_id}.review.date')
        else:
            require(review.get('by') is None and review.get('date') is None, f'{node_id}: unconfirmed review must not name a reviewer/date')
        if review['status'] == 'pending':
            require(bool(candidates), f'{node_id}: pending identity needs at least one candidate')
        if identity['evidence_type'] == 'archive':
            require(bool(identity['evidence_urls']), f'{node_id}: archive evidence needs a URL')

    for field in ('start', 'ending'):
        require(data.get(field) in by_id, f'{field}: unknown node id')
    require(not by_id[data['ending']]['next'], 'The ending must not have outgoing paths')
    for node_id, node in by_id.items():
        answers = {}
        for target in node['next']:
            require(target in by_id, f'{node_id}.next: unknown node {target}')
            for answer in [by_id[target]['title'], *by_id[target]['aliases']]:
                normalized = normalize_answer(answer)
                require(normalized not in answers or answers[normalized] == target, f'{node_id}: ambiguous answer {answer}')
                answers[normalized] = target
        for answer in node.get('dead_ends', []):
            require(normalize_answer(answer) not in answers, f'{node_id}: detour also matches a next song: {answer}')
        if node_id != data['ending'] and not node['next']:
            require(bool(node.get('dead_ends')), f'{node_id}: a non-ending leaf needs dead_ends answers')
        for predecessor in node.get('source', {}).get('predecessors', []):
            require(predecessor.get('id') in by_id, f'{node_id}: unknown historical predecessor')
            text(predecessor.get('title'), f'{node_id}.source.predecessors.title')
            text(predecessor.get('url'), f'{node_id}.source.predecessors.url')
    reached, pending = set(), [data['start']]
    while pending:
        node_id = pending.pop()
        if node_id not in reached:
            reached.add(node_id)
            pending.extend(by_id[node_id]['next'])
    require(reached == set(by_id), f'Unreachable nodes: {sorted(set(by_id) - reached)}')
    return data


def load(path=DATA_PATH):
    return validate(json.loads(Path(path).read_text(encoding='utf-8')))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('path', nargs='?', type=Path, default=DATA_PATH)
    args = parser.parse_args()
    try:
        puzzle = load(args.path)
    except (ValueError, OSError, TypeError, KeyError, AttributeError) as exc:
        parser.exit(1, f'Invalid puzzle: {exc}\n')
    pending = [n for n in puzzle['nodes'] if n['identity']['review']['status'] == 'pending']
    print(f"Valid: {puzzle['id']} · {len(puzzle['nodes'])} songs · {sum(len(n['next']) for n in puzzle['nodes'])} paths · {len(pending)} pending identities")
    for node in pending:
        print(f"  {node['id']}: {node['title']}")
