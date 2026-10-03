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
FLOWERS = ('poppy', 'blue', 'ivory', 'dahlia')


def presentation(node):
    """Stable fallback for older v1 puzzles; never derive art or sound from order."""
    return node.get('presentation', {'flower': 'blue', 'chord': {'midi': [48, 55, 62]}})


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
        if 'quote' in node:
            text(node['quote'], f'{node_id}.quote')
        require(node.get('clue_format', 'prose') in ('prose', 'quote'), f'{node_id}: unknown clue_format')
        require(not (node.get('clue_format') == 'quote' and node.get('quote')), f'{node_id}: use either a quoted clue or a separate quote')
        if 'presentation' in node:
            art = node['presentation']
            require(isinstance(art, dict), f'{node_id}.presentation: expected an object')
            require(art.get('flower') in FLOWERS, f'{node_id}: unknown flower')
            text(art.get('flower_reason'), f'{node_id}.flower_reason')
            chord = art.get('chord')
            require(isinstance(chord, dict), f'{node_id}.chord: expected an object')
            for field in ('name', 'reason'):
                text(chord.get(field), f'{node_id}.chord.{field}')
            midi = chord.get('midi')
            require(isinstance(midi, list) and 3 <= len(midi) <= 4, f'{node_id}.chord.midi: expected 3–4 simultaneous notes')
            require(all(type(n) is int and 48 <= n <= 72 for n in midi), f'{node_id}.chord.midi: use integers inside C3–C5')
            require(midi == sorted(set(midi)), f'{node_id}.chord.midi: notes must be unique and ascending')
        if 'terminal' in node:
            require(node['terminal'] in ('dead-end', 'epilogue'), f'{node_id}: unknown terminal kind')
            require(not node['next'] and node_id != data.get('ending'), f'{node_id}: a terminal branch cannot continue or be the ending')
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

    routes = layout.get('routes', {})
    require(isinstance(routes, dict), 'map.routes: expected an object')
    actual_edges = {n['id'] + ':' + target for n in nodes for target in n['next']}
    for edge, waypoints in routes.items():
        require(edge in actual_edges, f'map.routes: unknown path {edge}')
        require(isinstance(waypoints, list), f'{edge}: expected waypoint array')
        for waypoint in waypoints:
            require(isinstance(waypoint, list) and len(waypoint) == 2, f'{edge}: expected [x, y] waypoint')
            for coordinate, axis in zip(waypoint, ('width', 'height')):
                require(type(coordinate) in (int, float) and 0 <= coordinate <= layout[axis], f'{edge}: waypoint outside the map')

    for field in ('start', 'ending'):
        require(data.get(field) in by_id, f'{field}: unknown node id')
    if 'bonus' in data:
        require(data['bonus'] in by_id and data['bonus'] not in (data['start'], data['ending']), 'bonus: unknown or primary node')
        require(by_id[data['bonus']].get('terminal') == 'epilogue', 'bonus: expected epilogue terminal')
    for node in nodes:
        if node.get('terminal') == 'epilogue':
            require(node['id'] == data.get('bonus'), 'epilogue must be the bonus node')
        require(data.get('bonus') not in node['next'], 'bonus must be unlocked by collection, not a path')
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
            answers[normalize_answer(answer)] = 'dead-end'
        open_answers = node.get('open_answers', [])
        require(isinstance(open_answers, list), f'{node_id}.open_answers: expected an array')
        for index, answer in enumerate(open_answers):
            text(answer.get('title'), f'{node_id}.open_answers.title')
            strings(answer.get('aliases'), f'{node_id}.open_answers.aliases')
            require('clue' in answer and answer['clue'] is None and 'next' in answer and answer['next'] is None,
                    f'{node_id}: an open answer must keep its unknown clue and next empty')
            review = answer.get('review', {})
            require(review.get('status') == 'confirmed', f'{node_id}: an open answer needs author confirmation')
            for field in ('by', 'note'):
                text(review.get(field), f'{node_id}.open_answers.review.{field}')
            iso_date(review.get('date'), f'{node_id}.open_answers.review.date')
            for value in [answer['title'], *answer['aliases']]:
                normalized = normalize_answer(value)
                identity = f'open-{index}'
                require(normalized not in answers or answers[normalized] == identity,
                        f'{node_id}: ambiguous open answer {value}')
                answers[normalized] = identity
        if 'route_audit' in node:
            audit = node['route_audit']
            iso_date(audit.get('date'), f'{node_id}.route_audit.date')
            text(audit.get('note'), f'{node_id}.route_audit.note')
            require(isinstance(audit.get('confirmed_additions'), list), f'{node_id}: expected confirmed_additions array')
            for addition in audit['confirmed_additions']:
                require(addition.get('target') in node['next'], f'{node_id}: confirmed route is absent from next')
                for field in ('by', 'note'):
                    text(addition.get(field), f'{node_id}.confirmed_additions.{field}')
                iso_date(addition.get('date'), f'{node_id}.confirmed_additions.date')
            for retired in audit.get('retired_routes', []):
                require(retired.get('target') in by_id and retired['target'] not in node['next'], f'{node_id}: invalid retired route')
                for field in ('by', 'note'):
                    text(retired.get(field), f'{node_id}.retired_routes.{field}')
                iso_date(retired.get('date'), f'{node_id}.retired_routes.date')
            require(isinstance(audit.get('candidates'), list), f'{node_id}: expected route candidates array')
            for candidate in audit['candidates']:
                text(candidate.get('title'), f'{node_id}.route_candidate.title')
                text(candidate.get('reason'), f'{node_id}.route_candidate.reason')
        if node_id != data['ending'] and not node['next']:
            require(bool(node.get('dead_ends') or open_answers or node.get('terminal') in ('dead-end', 'epilogue')), f'{node_id}: a non-ending leaf needs an explained answer')
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
    expected = set(by_id) - {data.get('bonus')}
    require(reached == expected, f'Unreachable nodes: {sorted(expected - reached)}')
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
    candidates = sum(len(n.get('route_audit', {}).get('candidates', [])) for n in puzzle['nodes'])
    open_answers = sum(len(n.get('open_answers', [])) for n in puzzle['nodes'])
    print(f"Valid: {puzzle['id']} · {len(puzzle['nodes'])} songs · {sum(len(n['next']) for n in puzzle['nodes'])} paths · {len(pending)} pending identities · {candidates} candidate routes · {open_answers} open answers")
    for node in pending:
        print(f"  {node['id']}: {node['title']}")
