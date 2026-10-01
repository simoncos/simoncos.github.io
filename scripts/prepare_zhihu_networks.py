#!/usr/bin/env python3
"""Manually prepare anonymous, real follow networks from the verified archive.

Requires NumPy only during preparation. Normal site builds need neither the
private database nor a layout dependency. No account IDs or URLs are exported.
Only names already printed in the original articles may label a unique node.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import random
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHA = '1ea3f6f2a3ecc8f220a36e9c9b8463501af5b62eb1cb7ec3674bf0e7105c903d'
PALETTE = ['#71c9de', '#f39178', '#e6cc78', '#aa9ed8', '#91c9a5', '#e598bd', '#8cafd9', '#c6bc91']


def communities(n, edges):
    """Deterministic multilevel modularity optimization of the undirected view."""
    graph = [defaultdict(float) for _ in range(n)]
    for a, b in edges:
        graph[a][b] += 1
        graph[b][a] += 1
    members = [{i} for i in range(n)]
    rng = random.Random(2015)
    for _ in range(12):
        degree = [sum(row.values()) for row in graph]
        total = sum(degree)
        labels = list(range(len(graph)))
        totals = degree[:]
        for _ in range(40):
            moved = False
            order = list(range(len(graph)))
            rng.shuffle(order)
            for node in order:
                old = labels[node]
                totals[old] -= degree[node]
                weights = defaultdict(float)
                for neighbor, weight in graph[node].items():
                    if neighbor != node:
                        weights[labels[neighbor]] += weight
                best = old
                gain = weights[old] - degree[node] * totals[old] / total
                for group in sorted(weights):
                    candidate = weights[group] - degree[node] * totals[group] / total
                    if candidate > gain + 1e-9:
                        best, gain = group, candidate
                labels[node] = best
                totals[best] += degree[node]
                moved |= best != old
            if not moved:
                break
        ids = sorted(set(labels))
        if len(ids) == len(graph):
            break
        remap = {group: i for i, group in enumerate(ids)}
        next_graph = [defaultdict(float) for _ in ids]
        next_members = [set() for _ in ids]
        for node, row in enumerate(graph):
            a = remap[labels[node]]
            next_members[a].update(members[node])
            for neighbor, weight in row.items():
                next_graph[a][remap[labels[neighbor]]] += weight
        graph, members = next_graph, next_members
    groups = sorted(members, key=lambda m: (-len(m), min(m)))
    assignment = [0] * n
    for group, nodes in enumerate(groups):
        for node in nodes:
            assignment[node] = group
    return assignment


def layout(n, edges, groups):
    """Fixed-seed multilevel force layout; direction retained in the edge data."""
    import numpy as np
    rng = np.random.default_rng(2015)
    counts = Counter(groups)
    # Structural groups form the coarse level; each fine level uses its actual
    # internal links. Group spacing is for reading, never a measured distance.
    visible_groups = sorted(counts, key=lambda g: (-counts[g], g))
    centers = {}
    for i, group in enumerate(visible_groups):
        angle = -math.pi / 2 + i * math.tau / len(visible_groups)
        radius = 0.29 if len(visible_groups) > 1 else 0
        centers[group] = np.array([.5 + radius * math.cos(angle), .5 + radius * math.sin(angle)])
    positions = np.zeros((n, 2))
    for group in visible_groups:
        ids = [i for i in range(n) if groups[i] == group]
        m = len(ids)
        local = {node: i for i, node in enumerate(ids)}
        adjacency = np.zeros((m, m))
        for a, b in edges:
            if a in local and b in local:
                adjacency[local[a], local[b]] += 1
                adjacency[local[b], local[a]] += 1
        pos = rng.uniform(-.5, .5, (m, 2))
        k = math.sqrt(1 / max(m, 1))
        for iteration in range(110):
            delta = pos[:, None, :] - pos[None, :, :]
            distance = np.maximum(np.linalg.norm(delta, axis=2), .005)
            force = k * k / distance ** 2 - adjacency * distance / k
            np.fill_diagonal(force, 0)
            movement = (delta * force[:, :, None]).sum(axis=1)
            length = np.maximum(np.linalg.norm(movement, axis=1), .001)
            temperature = .07 * (1 - iteration / 110)
            pos += movement / length[:, None] * np.minimum(length, temperature)[:, None]
            pos -= pos.mean(axis=0)
        extent = max(float(np.linalg.norm(pos, axis=1).max()), .001)
        group_radius = .12 + .12 * math.sqrt(m / n)
        positions[ids] = centers[group] + pos / extent * group_radius
    # Uniform transform preserves the force geometry and leaves label margins.
    lo, hi = positions.min(axis=0), positions.max(axis=0)
    positions = (positions - (lo + hi) / 2) / max(hi - lo) * .82 + .5
    return [[round(float(x), 5), round(float(y), 5)] for x, y in positions]


def svg(network, width=960, height=760, cover=False):
    nodes, edges = network['nodes'], network['edges']
    scale = min(width, height)
    ox, oy = (width - scale) / 2, (height - scale) / 2
    points = [(ox + row[0] * scale, oy + row[1] * scale) for row in nodes]
    maximum = max(row[3] for row in nodes)
    # The static overview uses reciprocal pairs only, once per pair.
    pairs = set(zip(edges[::2], edges[1::2]))
    reciprocal = [(a, b) for a, b in sorted(pairs) if a < b and (b, a) in pairs]
    # Keep background ink bounded; every drawn line is a true reciprocal pair.
    step = max(1, math.ceil(len(reciprocal) / 12000))
    reciprocal = reciprocal[::step]
    paths = defaultdict(list)
    for a, b in reciprocal:
        x, y = points[a]; xx, yy = points[b]
        group = nodes[a][2] if nodes[a][2] == nodes[b][2] else -1
        paths[group].append(f'M{x:.1f},{y:.1f}L{xx:.1f},{yy:.1f}')
    lines = ''.join(f'<path d="{"".join(path)}" stroke="{PALETTE[group % len(PALETTE)] if group >= 0 else "#829fb4"}" opacity="{.22 if group >= 0 else .21}"/>' for group, path in paths.items())
    circles = ''.join(f'<circle cx="{points[i][0]:.1f}" cy="{points[i][1]:.1f}" r="{1.6 + math.sqrt(row[3] / maximum) * 5:.2f}" fill="{PALETTE[row[2] % len(PALETTE)]}" stroke="#111d2b" stroke-width=".8"/>' for i, row in sorted(enumerate(nodes), key=lambda item: item[1][3]))
    text = ''
    if cover:
        text = '<text x="54" y="60" fill="#d7e1e9" font-family="monospace" font-size="17" letter-spacing="4">ZHIHU / 2015</text><text x="54" y="88" fill="#d7e1e9" font-family="monospace" font-size="13">375 USERS / 27,324 FOLLOWING LINKS</text><text x="54" y="111" fill="#94a9b8" font-family="monospace" font-size="11">RECIPROCAL VIEW · 6,414 REAL PAIRS</text>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img"><title>Real 2015 Zhihu network · anonymous users · reciprocal overview</title><rect width="{width}" height="{height}" fill="#111d2b"/><g fill="none" stroke-width=".75">{lines}</g>{circles}{text}</svg>'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', required=True, type=Path)
    args = parser.parse_args()
    with args.db.open('rb') as stream:
        if hashlib.file_digest(stream, 'sha256').hexdigest() != SOURCE_SHA:
            raise ValueError('Unverified archive')
    con = sqlite3.connect(args.db.resolve().as_uri() + '?mode=ro&immutable=1', uri=True)
    profiles = dict(con.execute('SELECT user_url, agree_num FROM User WHERE agree_num > 10000 ORDER BY user_url'))
    raw_edges = {(a, b) for a, b in con.execute('SELECT user_url, followee_url FROM Following') if a in profiles and b in profiles and a != b}
    published = json.loads((ROOT/'data/zhihu-2015.json').read_text())
    allowed_names = {r['name'] for group in published['rankings'].values() for rows in group.values() for r in rows}
    named = {name:{row[0] for row in con.execute('SELECT user_url FROM User WHERE user_id=?',(name,))} for name in sorted(allowed_names)}
    con.close()
    assets = ROOT / 'gallery/research/assets'
    for cohort, threshold, expected_n, expected_e in [('Net50k', 50000, 375, 27324), ('Net10k', 10000, 1896, 231416)]:
        selected = {url for url, votes in profiles.items() if votes > threshold}
        selected_edges = {(a, b) for a, b in raw_edges if a in selected and b in selected}
        # Net10k recount has 1,896 endpoints, one more than the published table.
        # Keep the archive intact and disclose the difference on the page.
        endpoints = {url for edge in selected_edges for url in edge}
        incoming = Counter(b for _, b in selected_edges)
        outgoing = Counter(a for a, _ in selected_edges)
        urls = sorted(endpoints, key=lambda u: (-incoming[u], -outgoing[u], u))
        remap = {url: i for i, url in enumerate(urls)}
        anchors = {name:remap[next(iter(matches))]+1 for name,accounts in named.items() if len(matches:=accounts & endpoints)==1}
        edges = sorted((remap[a], remap[b]) for a, b in selected_edges)
        assert (len(urls), len(edges)) == (expected_n, expected_e)
        groups = communities(len(urls), edges)
        positions = layout(len(urls), edges, groups)
        rows = [[*positions[i], groups[i], incoming[url], outgoing[url]] for i, url in enumerate(urls)]
        reciprocal = sum((b, a) in selected_edges for a, b in selected_edges) // 2
        sizes = Counter(groups)
        group_links = [[0 for _ in sizes] for _ in sizes]
        for a, b in edges:
            group_links[groups[a]][groups[b]] += 1
        network = {'cohort':cohort, 'threshold':threshold, 'source_sha256':SOURCE_SHA,
                   'computed':'2026-10-01', 'node_fields':['x','y','group','in_degree','out_degree'],
                   'node_count':len(rows), 'edge_count':len(edges), 'reciprocal_pairs':reciprocal,
                   'groups':[{'id':g,'size':sizes[g],'color':PALETTE[g % len(PALETTE)]} for g in sorted(sizes)],
                   'group_links':group_links,
                   'anchors':anchors,
                   'method':'Anonymous indices ordered by in-degree. Directed internal following edges; fixed-seed multilevel modularity grouping on the symmetrized graph; within-group force layout. Coordinates are not measured distances. Only uniquely matched names already printed in the original articles are labels. No account IDs or URLs.',
                   'nodes':rows, 'edges':[i for edge in edges for i in edge]}
        (assets / f'zhihu-{cohort.lower()}.json').write_text(json.dumps(network,separators=(',',':'))+'\n')
        (assets / f'zhihu-{cohort.lower()}.svg').write_text(svg(network)+'\n')
        if cohort == 'Net50k':
            (assets / 'zhihu-network-card.svg').write_text(svg(network, cover=True)+'\n')
        print(cohort,len(rows),len(edges),'groups',dict(sizes),'reciprocal',reciprocal,flush=True)


if __name__ == '__main__':
    main()
