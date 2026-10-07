import { isRecord, finite } from '../lib/data';
export type NetworkNode = [number, number, number, number, number];
export interface Network {
    cohort: string; node_count: number; edge_count: number; reciprocal_pairs: number;
    nodes: NetworkNode[]; edges: number[];
    groups: Array<{id: number; size: number; color: string}>;
    group_links: number[][]; anchors: Record<string, number>;
}
/** Check IDs before they index node/group arrays, including cached fetch results. */
export function parseNetwork(value: unknown, cohort: string): Network {
    if (!isRecord(value) || value.cohort !== cohort || !Number.isInteger(value.node_count) || !Number.isInteger(value.edge_count) || !finite(value.reciprocal_pairs) || !Array.isArray(value.nodes) || !Array.isArray(value.edges) || !Array.isArray(value.groups) || !Array.isArray(value.group_links) || !isRecord(value.anchors)) throw new Error('Invalid network');
    const count = value.node_count as number;
    const groups = value.groups;
    if (count <= 0 || value.nodes.length !== count || value.edges.length !== Number(value.edge_count) * 2 || !groups.length) throw new Error('Invalid network counts');
    if (!groups.every((group, i) => isRecord(group) && group.id === i && finite(group.size) && group.size > 0 && typeof group.color === 'string')) throw new Error('Invalid network groups');
    if (!value.nodes.every(node => Array.isArray(node) && node.length === 5 && node.every(finite) && Number.isInteger(node[2]) && node[2] >= 0 && node[2] < groups.length)) throw new Error('Invalid network nodes');
    if (!value.edges.every(id => Number.isInteger(id) && id >= 0 && id < count) || !Object.values(value.anchors).every(id => finite(id) && Number.isInteger(id) && id >= 1 && id <= count)) throw new Error('Invalid network IDs');
    if (value.group_links.length !== groups.length || !value.group_links.every(row => Array.isArray(row) && row.length === groups.length && row.every(finite))) throw new Error('Invalid network group links');
    return value as unknown as Network;
}
export function indexNetwork(data: Network) {
    const incoming = data.nodes.map(() => new Set<number>()), outgoing = data.nodes.map(() => new Set<number>());
    for (let i = 0; i < data.edges.length; i += 2) {const a = data.edges[i], b = data.edges[i + 1]; outgoing[a].add(b); incoming[b].add(a);}
    const reciprocal: number[] = [];
    outgoing.forEach((rows, a) => rows.forEach(b => {if (a < b && outgoing[b].has(a)) reciprocal.push(a, b);}));
    return {incoming, outgoing, reciprocal};
}
