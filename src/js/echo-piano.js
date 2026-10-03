"use strict";
/** YDP samples shared with Vocal Coach; attribution lives beside the audio files. */
var EchoPiano;
(function (EchoPiano) {
    EchoPiano.roots = [48, 54, 60, 63, 66, 69, 72];
    /** Shortest and longest chord the piano plays at once (extended chords reach six notes). */
    EchoPiano.minNotes = 3, EchoPiano.maxNotes = 6;
    const validChord = (midis) => midis.length >= EchoPiano.minNotes && midis.length <= EchoPiano.maxNotes && new Set(midis).size === midis.length && midis.every(n => Number.isInteger(n) && n >= 48 && n <= 72);
    const finite = (value, low, high) => typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;
    const nearestRoot = (midi) => EchoPiano.roots.reduce((best, n) => Math.abs(n - midi) < Math.abs(best - midi) ? n : best, EchoPiano.roots[0]);
    const defaultRelease = .6, defaultLevel = .8;
    /**
     * Seconds of a piece kept queued ahead of the audio clock. Far more than a busy page can stall for, far less than a whole piece:
     * creating a long piece's voices in one go (165 for the finale) freezes a slow phone for a moment, and queues what may be cancelled.
     */
    const horizon = 6;
    class Player {
        constructor(onStatus) {
            this.onStatus = onStatus;
            this.context = null;
            this.decoder = null;
            this.preparation = null;
            this.buffers = new Map();
            this.decoded = new Map();
            this.voices = new Map();
            this.bus = null;
            this.busContext = null;
            this.run = null;
            this.request = 0;
            this.status = 'ready';
        }
        report(status) { this.status = status; this.onStatus(status); }
        load(root, context) {
            let pending = this.buffers.get(root);
            if (!pending) {
                pending = fetch(`assets/piano/ydp/root-${String(root).padStart(3, '0')}.mp3`)
                    .then(response => {
                    if (!response.ok)
                        throw new Error('Piano sample unavailable');
                    return response.arrayBuffer();
                })
                    .then(bytes => context.decodeAudioData(bytes))
                    .then(buffer => { this.decoded.set(root, buffer); return buffer; })
                    .catch(error => { this.buffers.delete(root); throw error; });
                this.buffers.set(root, pending);
            }
            return pending;
        }
        prepare() {
            if (this.decoded.size === EchoPiano.roots.length)
                return Promise.resolve(true);
            if (this.preparation)
                return this.preparation;
            const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
            // Decode ahead of the gesture without opening an output device or playing audio.
            // Older browsers can still use the normal interaction-time loading path.
            if (!Offline)
                return Promise.resolve(false);
            try {
                this.decoder ?? (this.decoder = new Offline(1, 1, 44100));
            }
            catch {
                return Promise.resolve(false);
            }
            const request = this.request;
            this.report('loading');
            this.preparation = Promise.allSettled(EchoPiano.roots.map(root => this.load(root, this.decoder)))
                .then(results => {
                const ready = results.every(result => result.status === 'fulfilled');
                // Background completion must not override a newer click, mute or retry.
                if (request === this.request)
                    this.report(ready ? 'ready' : 'failed');
                return ready;
            })
                .finally(() => { this.preparation = null; });
            return this.preparation;
        }
        async play(midis) {
            const request = ++this.request;
            this.endRun(false);
            try {
                if (!validChord(midis))
                    throw new Error('Invalid chord');
                const Audio = window.AudioContext || window.webkitAudioContext;
                if (!Audio) {
                    this.report('unavailable');
                    return;
                }
                // Both context creation and resume start within the user's gesture (including iOS).
                const context = this.context ?? (this.context = new Audio({ latencyHint: 'interactive' }));
                const resume = context.state === 'running' ? null : context.resume();
                // Retire the previous chord together; rapid navigation must not stack harmonies.
                this.releaseVoices();
                const samples = midis.map(nearestRoot);
                const cached = samples.map(root => this.decoded.get(root));
                if (!resume && cached.every(Boolean)) {
                    // Schedule before the caller redraws the graph; a warm click has no await.
                    this.sound(midis, samples, cached, context);
                    return;
                }
                if (samples.some(root => !this.decoded.has(root)))
                    this.report('loading');
                const [, buffers] = await Promise.all([resume, Promise.all(samples.map(root => this.load(root, context)))]);
                // Wait for the entire chord. Never sound a partial chord as samples arrive.
                if (request !== this.request)
                    return;
                if (context.state !== 'running')
                    throw new Error('Piano output suspended');
                this.sound(midis, samples, buffers, context);
            }
            catch {
                if (request === this.request)
                    this.report('failed');
            }
        }
        sound(midis, samples, buffers, context) {
            const now = context.currentTime + .01;
            const level = .22 / Math.sqrt(midis.length);
            for (let i = 0; i < midis.length; i++) {
                const source = context.createBufferSource(), gain = context.createGain();
                source.buffer = buffers[i];
                source.playbackRate.setValueAtTime(Math.pow(2, (midis[i] - samples[i]) / 12), now);
                // One shared start time: a simultaneous chord, never an arpeggio.
                // Scale per-note gain so four notes do not become four times as loud.
                gain.gain.setValueAtTime(.0001, now);
                gain.gain.linearRampToValueAtTime(level, now + .008);
                gain.gain.setValueAtTime(level, now + 1.05);
                gain.gain.exponentialRampToValueAtTime(.0001, now + 1.4);
                source.connect(gain);
                gain.connect(context.destination);
                this.voices.set(source, gain);
                source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); };
                source.start(now);
                source.stop(now + 1.42);
            }
            this.report('ready');
        }
        /**
         * Play a piece: chords at their own times with their own dynamics, notes scheduled on the audio clock a few seconds ahead
         * so a busy page cannot make it stumble. Resolves true when the last chord has faded, false when it was cancelled, failed or superseded.
         * A later play(), playScore() or stop() cancels it, and hooks.onEnd(false) tells the caller.
         */
        async playScore(steps, hooks = {}, options = {}) {
            const request = ++this.request;
            this.endRun(false);
            try {
                const lead = options.lead ?? 0;
                if (!steps.length || steps.length > 256 || !finite(lead, 0, 10))
                    throw new Error('Invalid score');
                let previous = -1;
                for (const step of steps) {
                    if (!validChord(step.midi) || !finite(step.at, 0, 600) || step.at < previous || !finite(step.hold, .05, 60) || !finite(step.level ?? defaultLevel, .01, 1.2)
                        || !finite(step.roll ?? 0, 0, 1) || !finite(step.release ?? defaultRelease, .05, 12))
                        throw new Error('Invalid score step');
                    previous = step.at;
                }
                const Audio = window.AudioContext || window.webkitAudioContext;
                if (!Audio) {
                    this.report('unavailable');
                    return false;
                }
                const context = this.context ?? (this.context = new Audio({ latencyHint: 'interactive' }));
                const resume = context.state === 'running' ? null : context.resume();
                this.releaseVoices();
                const samples = steps.map(step => step.midi.map(nearestRoot));
                const needed = [...new Set(samples.flat())];
                let buffers;
                if (!resume && needed.every(root => this.decoded.has(root)))
                    buffers = this.decoded;
                else {
                    if (needed.some(root => !this.decoded.has(root)))
                        this.report('loading');
                    await Promise.all([resume, Promise.all(needed.map(root => this.load(root, context)))]);
                    // A newer click, score or mute decided the cold start was no longer wanted.
                    if (request !== this.request)
                        return false;
                    if (context.state !== 'running')
                        throw new Error('Piano output suspended');
                    buffers = this.decoded;
                }
                return await new Promise(resolve => this.begin(steps, samples, buffers, context, request, hooks, lead, resolve));
            }
            catch {
                if (request === this.request)
                    this.report('failed');
                return false;
            }
        }
        begin(steps, samples, buffers, context, request, hooks, lead, settle) {
            const out = this.output(context), start = context.currentTime + .08 + lead;
            const bus = this.bus;
            // Fresh bus level: a previous cancellation faded it out.
            bus.gain.cancelScheduledValues(context.currentTime);
            bus.gain.setValueAtTime(1, context.currentTime);
            const latency = Math.min(.25, Math.max(0, Number(context.outputLatency) || 0));
            const run = { request, steps, samples, buffers, context, out, hooks, start, latency, next: 0, queued: 0, timer: 0, settle };
            this.run = run;
            this.queue(run, horizon);
            this.report('ready');
            hooks.onStart?.();
            const last = steps[steps.length - 1], finish = last.at + Math.max(last.hold, .03) + (last.release ?? defaultRelease);
            // The audio clock plays what is queued; this loop keeps the queue topped up and tells the page when each chord is heard.
            const poll = () => {
                if (this.run !== run)
                    return;
                const elapsed = context.currentTime - start, now = elapsed - latency;
                this.queue(run, elapsed + horizon);
                while (run.next < steps.length && steps[run.next].at <= now + .004) {
                    const index = run.next++;
                    hooks.onStep?.(index, steps[index]);
                    if (this.run !== run)
                        return;
                }
                if (now >= finish) {
                    this.endRun(true);
                    return;
                }
                run.timer = setTimeout(poll, 16);
            };
            poll();
        }
        /** Queue the voices of every chord that begins before `until` seconds into the piece and is not queued yet. */
        queue(run, until) {
            const { steps, samples, buffers, context, out, start } = run;
            while (run.queued < steps.length && steps[run.queued].at <= until) {
                const i = run.queued++, step = steps[i];
                const count = step.midi.length, level = .22 * (step.level ?? defaultLevel) / Math.sqrt(count), roll = step.roll ?? 0;
                const fade = start + step.at + Math.max(step.hold, .03), release = step.release ?? defaultRelease;
                for (let j = 0; j < count; j++) {
                    // The roll spreads the chord low to high, like a hand; zero keeps it a block.
                    const when = start + step.at + (count > 1 ? roll * j / (count - 1) : 0), hold = Math.max(fade, when + .02);
                    const source = context.createBufferSource(), gain = context.createGain();
                    source.buffer = buffers.get(samples[i][j]);
                    source.playbackRate.setValueAtTime(Math.pow(2, (step.midi[j] - samples[i][j]) / 12), when);
                    gain.gain.setValueAtTime(.0001, when);
                    gain.gain.linearRampToValueAtTime(level, when + .008);
                    gain.gain.setValueAtTime(level, hold);
                    gain.gain.exponentialRampToValueAtTime(.0001, hold + release);
                    source.connect(gain);
                    gain.connect(out);
                    this.voices.set(source, gain);
                    source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); };
                    source.start(when);
                    source.stop(hold + release + .03);
                }
            }
        }
        /** Every score voice shares one master bus, so a cancelled piece can fade as a whole and overlapping chords cannot clip. */
        output(context) {
            if (!this.bus || this.busContext !== context) {
                const input = context.createGain();
                const compressor = typeof context.createDynamicsCompressor === 'function' ? context.createDynamicsCompressor() : null;
                if (compressor) {
                    compressor.threshold.setValueAtTime(-16, context.currentTime);
                    compressor.knee.setValueAtTime(20, context.currentTime);
                    compressor.ratio.setValueAtTime(3, context.currentTime);
                    compressor.attack.setValueAtTime(.006, context.currentTime);
                    compressor.release.setValueAtTime(.3, context.currentTime);
                    input.connect(compressor);
                    compressor.connect(context.destination);
                }
                else
                    input.connect(context.destination);
                this.bus = input;
                this.busContext = context;
            }
            return this.bus;
        }
        endRun(finished) {
            const run = this.run;
            if (!run)
                return;
            this.run = null;
            clearTimeout(run.timer);
            // A cancelled piece fades with its master bus instead of stopping on a click.
            if (!finished && this.bus && this.context) {
                const now = this.context.currentTime;
                this.bus.gain.cancelScheduledValues(now);
                this.bus.gain.setTargetAtTime(0, now, .02);
            }
            run.hooks.onEnd?.(finished);
            run.settle(finished);
        }
        release(source, gain, now) {
            gain.gain.cancelScheduledValues(now);
            gain.gain.setTargetAtTime(0, now, .008);
            source.stop(now + .04);
        }
        releaseVoices() {
            if (!this.context)
                return;
            for (const [source, gain] of this.voices)
                this.release(source, gain, this.context.currentTime);
            this.voices.clear();
        }
        stop() {
            ++this.request;
            this.endRun(false);
            this.releaseVoices();
            if (this.status === 'loading')
                this.report('ready');
        }
    }
    EchoPiano.Player = Player;
})(EchoPiano || (EchoPiano = {}));
