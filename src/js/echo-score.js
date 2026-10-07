"use strict";
/** The pure side of the score player: which chords a path or the finale plays, and when. No DOM and no audio, so Node can test it. */
var EchoScore;
(function (EchoScore) {
    /**
     * When each note of a broken chord enters, in seconds from the step, for `count` notes low to high, one note every `every`
     * seconds (an eighth or a sixteenth of the finale's beat), so the figure keeps the bar's pulse.
     * up: low to high. down: high to low. bass: the bass on the step, then the upper notes twice as fast from the next note on,
     * like a left hand and a right. skip: bass, top, then the middle notes upward, a figure that leaps across the voicing.
     */
    function figure(shape, count, every) {
        if (count < 2)
            return [0];
        const at = (k) => k * every;
        if (shape === 'down')
            return Array.from({ length: count }, (_, k) => at(count - 1 - k));
        if (shape === 'bass')
            return [0, ...Array.from({ length: count - 1 }, (_, k) => every + k * every / 2)];
        if (shape === 'skip') {
            const order = [0, count - 1, ...Array.from({ length: count - 2 }, (_, k) => k + 1)], out = [];
            order.forEach((note, k) => { out[note] = at(k); });
            return out;
        }
        return Array.from({ length: count }, (_, k) => at(k));
    }
    EchoScore.figure = figure;
    /** Share of a chord's span that it sounds before its fade begins; the rest overlaps the next chord, like a sustain pedal. */
    EchoScore.legato = .92;
    /** Seconds per chord when a player's own path is played back, before the closing ritardando. */
    EchoScore.pulse = .7;
    /**
     * The way the player came from the start to `target`, over the paths they have actually walked ("from:to" strings, kept in
     * the order they were last walked). Traced back from the target, each song is entered by the path walked into it most
     * recently, so a song reached two ways replays the latest one (seen 2026-10-04: 喜帖街 then 花花世界 into 贝多芬 replayed
     * 喜帖街). No song repeats. The hidden coda has no path of its own: it follows the ending. Empty when no walked route exists.
     */
    function route(edges, start, target, ending, bonus) {
        if (bonus && target === bonus) {
            const base = route(edges, start, ending, ending);
            return base.length ? [...base, bonus] : [];
        }
        const onward = new Map(), into = new Map();
        for (let i = edges.length - 1; i >= 0; i--) {
            const [from, to] = edges[i].split(':');
            if (!from || !to)
                continue;
            const onwardRows = onward.get(from) || [];
            onwardRows.push(to);
            onward.set(from, onwardRows);
            const intoRows = into.get(to) || [];
            intoRows.push(from);
            into.set(to, intoRows);
        }
        // Only songs the start reaches can lie on the way back, which keeps the search from wandering.
        const reached = new Set([start]), queue = [start];
        for (let i = 0; i < queue.length; i++)
            for (const next of onward.get(queue[i]) || [])
                if (!reached.has(next)) {
                    reached.add(next);
                    queue.push(next);
                }
        if (!reached.has(target))
            return [];
        const ids = [target], used = new Set([target]);
        const back = (id) => {
            if (id === start)
                return true;
            for (const from of into.get(id) || []) {
                if (used.has(from) || !reached.has(from))
                    continue;
                used.add(from);
                ids.unshift(from);
                if (back(from))
                    return true;
                ids.shift();
                used.delete(from);
            }
            return false;
        };
        return back(target) ? ids : [];
    }
    EchoScore.route = route;
    /**
     * A walked route as one phrase: a steady pulse that gathers (louder, a little slower over the last two chords) and settles
     * on the song the player is standing in, held like a fermata.
     */
    function pathSteps(ids, midiOf) {
        const count = ids.length, steps = [];
        let at = 0;
        ids.forEach((id, i) => {
            const last = i === count - 1;
            const stretch = i === count - 2 ? 1.3 : i === count - 3 ? 1.12 : 1;
            const span = EchoScore.pulse * stretch;
            steps.push({ at, midi: midiOf(id), hold: last ? 1.8 : span * EchoScore.legato, level: .5 + .38 * (count > 1 ? i / (count - 1) : 1), roll: last ? .14 : .045, release: last ? 2.4 : undefined });
            at += span;
        });
        return steps;
    }
    EchoScore.pathSteps = pathSteps;
    /** The finale's own tempo, dynamics and spread for each chord, in the order the author arranged them. */
    function finaleSteps(finale, midiOf) {
        const steps = [];
        let at = 0;
        for (const step of finale.steps) {
            const span = step.beats * finale.beat;
            // `gate` is the share of its span a chord sounds: short gates are stabs that leave air before the next chord.
            const midi = midiOf(step.node);
            steps.push({ at, midi, hold: span * (step.gate ?? EchoScore.legato), level: step.level, roll: step.roll, release: step.release, offsets: step.shape ? figure(step.shape, midi.length, (step.every ?? .5) * finale.beat) : undefined });
            at += span;
        }
        return steps;
    }
    EchoScore.finaleSteps = finaleSteps;
    /** Seconds from the start until the last chord has faded. */
    function length(steps) {
        const last = steps[steps.length - 1];
        return last ? last.at + last.hold + (last.release ?? .6) : 0;
    }
    EchoScore.length = length;
})(EchoScore || (EchoScore = {}));
