import { isRecord } from '../lib/data';
import type { Riddle, Trail } from './types';
export const freshTrail = (data: Riddle): Trail => ({current: data.start, found: [data.start], edges: [], history: []});
/** Restore discoveries, while discarding routes/IDs removed by later author revisions. */
export function restoreTrail(value: unknown, data: Riddle): Trail {
    const trail = freshTrail(data);
    if (!isRecord(value) || !Array.isArray(value.found) || !Array.isArray(value.edges) || !Array.isArray(value.history)) return trail;
    const ids = new Set(data.nodes.map(node => node.id));
    const routes = new Set(data.nodes.flatMap(node => node.next.map(id => node.id + ':' + id)));
    trail.found = [...new Set([data.start, ...value.found.filter((id): id is string => typeof id === 'string' && id !== data.start && id !== data.bonus && ids.has(id))])];
    trail.edges = value.edges.filter((edge): edge is string => typeof edge === 'string' && routes.has(edge) && edge.split(':').every(id => trail.found.includes(id)));
    if (data.bonus && data.nodes.filter(node => node.id !== data.bonus).every(node => trail.found.includes(node.id))) trail.found.push(data.bonus);
    trail.current = typeof value.current === 'string' && trail.found.includes(value.current) ? value.current : data.start;
    trail.history = value.history.filter((id): id is string => typeof id === 'string' && trail.found.includes(id)).slice(-100);
    return trail;
}
