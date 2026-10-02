"use strict";
/** YDP samples shared with Vocal Coach; attribution lives beside the audio files. */
var EchoPiano;
(function (EchoPiano) {
    EchoPiano.roots = [48, 54, 60, 63, 66, 69, 72];
    class Player {
        constructor(onStatus) {
            this.onStatus = onStatus;
            this.context = null;
            this.buffers = new Map();
            this.decoded = new Set();
            this.voices = new Map();
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
                    .then(buffer => { this.decoded.add(root); return buffer; })
                    .catch(error => { this.buffers.delete(root); throw error; });
                this.buffers.set(root, pending);
            }
            return pending;
        }
        async play(midi) {
            const request = ++this.request;
            try {
                const Audio = window.AudioContext || window.webkitAudioContext;
                if (!Audio) {
                    this.report('unavailable');
                    return;
                }
                // Both context creation and resume start within the user's gesture (including iOS).
                const context = this.context ?? (this.context = new Audio());
                const resume = context.state === 'running' ? Promise.resolve() : context.resume();
                const root = EchoPiano.roots.reduce((best, n) => Math.abs(n - midi) < Math.abs(best - midi) ? n : best, EchoPiano.roots[0]);
                if (!this.decoded.has(root))
                    this.report('loading');
                const [, buffer] = await Promise.all([resume, this.load(root, context)]);
                // A newer click, mute, reset or hidden tab cancels a note waiting on the network.
                if (request !== this.request)
                    return;
                if (context.state !== 'running')
                    throw new Error('Piano output suspended');
                const now = context.currentTime;
                if (this.voices.size >= 6) {
                    const [oldest, gain] = this.voices.entries().next().value;
                    this.release(oldest, gain, now);
                    this.voices.delete(oldest);
                }
                const source = context.createBufferSource(), gain = context.createGain();
                source.buffer = buffer;
                source.playbackRate.setValueAtTime(Math.pow(2, (midi - root) / 12), now);
                // Preserve the recorded attack and natural decay; fade only the short cue's tail.
                gain.gain.setValueAtTime(.0001, now);
                gain.gain.linearRampToValueAtTime(.22, now + .008);
                gain.gain.setValueAtTime(.22, now + 1.05);
                gain.gain.exponentialRampToValueAtTime(.0001, now + 1.4);
                source.connect(gain);
                gain.connect(context.destination);
                this.voices.set(source, gain);
                source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); };
                source.start(now);
                source.stop(now + 1.42);
                this.report('ready');
            }
            catch {
                if (request === this.request)
                    this.report('failed');
            }
        }
        release(source, gain, now) {
            gain.gain.cancelScheduledValues(now);
            gain.gain.setTargetAtTime(0, now, .008);
            source.stop(now + .04);
        }
        stop() {
            ++this.request;
            if (this.context) {
                for (const [source, gain] of this.voices)
                    this.release(source, gain, this.context.currentTime);
                this.voices.clear();
            }
            if (this.status === 'loading')
                this.report('ready');
        }
    }
    EchoPiano.Player = Player;
})(EchoPiano || (EchoPiano = {}));
