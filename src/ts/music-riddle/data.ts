import { isRecord, strings, finite } from '../lib/data';
import type { Riddle, Song } from './types';
const label = (value: unknown) => isRecord(value) && typeof value.en === 'string' && typeof value.zh === 'string';
const openAnswer = (value: unknown) => isRecord(value) && typeof value.title === 'string' && strings(value.aliases);
function isSong(value: unknown): value is Song {
    if (!isRecord(value) || typeof value.id !== 'string' || typeof value.title !== 'string' || !strings(value.aliases) || !strings(value.next)) return false;
    if (!Array.isArray(value.position) || value.position.length !== 2 || !value.position.every(finite) || !label(value.clue) || !label(value.hint)) return false;
    const presentation = value.presentation;
    if (!isRecord(presentation) || typeof presentation.flower !== 'string' || !isRecord(presentation.chord) || !Array.isArray(presentation.chord.midi) || !presentation.chord.midi.every(finite)) return false;
    if (value.dead_ends !== undefined && !strings(value.dead_ends)) return false;
    if (value.open_answers !== undefined && (!Array.isArray(value.open_answers) || !value.open_answers.every(openAnswer))) return false;
    if (value.decoys !== undefined && (!Array.isArray(value.decoys) || !value.decoys.every(item => openAnswer(item) && isRecord(item) && label(item.message)))) return false;
    return (value.terminal === undefined || value.terminal === 'dead-end' || value.terminal === 'epilogue') && (value.quote === undefined || typeof value.quote === 'string') && (value.clue_format === undefined || value.clue_format === 'prose' || value.clue_format === 'quote');
}
export function parseRiddle(value: unknown): Riddle {
    if (!isRecord(value) || typeof value.id !== 'string' || typeof value.start !== 'string' || typeof value.ending !== 'string' || !Array.isArray(value.nodes) || !value.nodes.length || !value.nodes.every(isSong)) throw new Error('Invalid riddle data');
    const ids = new Set(value.nodes.map(node => node.id));
    if (ids.size !== value.nodes.length || !ids.has(value.start) || !ids.has(value.ending) || (value.bonus !== undefined && (typeof value.bonus !== 'string' || !ids.has(value.bonus))) || value.nodes.some(node => node.next.some(id => !ids.has(id)))) throw new Error('Invalid riddle routes');
    if (value.finale !== undefined) {
        const finale = value.finale;
        if (!isRecord(finale) || !finite(finale.beat) || finale.beat <= 0 || !Array.isArray(finale.steps) || !finale.steps.every(step => isRecord(step) && typeof step.node === 'string' && ids.has(step.node) && finite(step.beats) && step.beats > 0 && finite(step.level) && ['roll', 'release', 'gate', 'every'].every(key => step[key] === undefined || finite(step[key])) && (step.shape === undefined || ['up', 'down', 'bass', 'skip'].includes(String(step.shape))))) throw new Error('Invalid finale data');
    }
    // All fields consumed by the game, including graph references, have been validated above.
    return value as unknown as Riddle;
}
