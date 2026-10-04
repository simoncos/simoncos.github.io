// Exercise the score player (scheduling, dynamics, hooks, cancellation) and the pure path / finale logic.
// A virtual clock stands in for the audio clock and for timers, so nothing here needs a speaker or real waiting.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Clock {
  constructor() { this.now = 3; this.timers = []; this.seq = 0; }
  setTimeout(fn, ms) { const timer = { at: this.now + ms / 1000, fn, id: ++this.seq }; this.timers.push(timer); return timer; }
  clearTimeout(timer) { this.timers = this.timers.filter(t => t !== timer); }
  advance(seconds) {
    const target = this.now + seconds;
    for (;;) {
      this.timers.sort((a, b) => a.at - b.at || a.id - b.id);
      const next = this.timers[0];
      if (!next || next.at > target) break;
      this.timers.shift(); this.now = Math.max(this.now, next.at); next.fn();
    }
    this.now = target;
  }
}

class Param {
  constructor() { this.events = []; }
  setValueAtTime(value, time) { this.events.push(['set', value, time]); }
  linearRampToValueAtTime(value, time) { this.events.push(['linear', value, time]); }
  exponentialRampToValueAtTime(value, time) { this.events.push(['exp', value, time]); }
  cancelScheduledValues(time) { this.events.push(['cancel', undefined, time]); }
  setTargetAtTime(value, time, constant) { this.events.push(['target', value, time, constant]); }
}

function harness({ latency = 0, compressor = true, running = true } = {}) {
  const clock = new Clock();
  const state = { clock, sources: [], gains: [], compressors: [], outputs: 0, pending: [], statuses: [], manual: false };
  class Decoder {
    constructor(channels, length, rate) { assert.equal(channels, 1); assert.equal(length, 1); assert.equal(rate, 44100); }
    async decodeAudioData() { return { duration: 15 }; }
  }
  class Context {
    constructor() { state.outputs++; this.state = running ? 'running' : 'suspended'; this.destination = { name: 'destination' }; this.outputLatency = latency; }
    get currentTime() { return clock.now; }
    async resume() { this.state = 'running'; }
    async decodeAudioData() { return { duration: 15 }; }
    createGain() {
      const gain = { gain: new Param(), connections: [], connect(node) { this.connections.push(node); return node; }, disconnect() { this.connections.length = 0; } };
      state.gains.push(gain); return gain;
    }
    createBufferSource() {
      const source = { createdAt: clock.now, buffer: null, playbackRate: new Param(), starts: [], stops: [], connect(node) { this.target = node; return node; }, disconnect() {}, start(at) { this.starts.push(at); }, stop(at) { this.stops.push(at); } };
      state.sources.push(source); return source;
    }
  }
  if (compressor) {
    Context.prototype.createDynamicsCompressor = function () {
      const node = { threshold: new Param(), knee: new Param(), ratio: new Param(), attack: new Param(), release: new Param(), connections: [], connect(target) { this.connections.push(target); return target; } };
      state.compressors.push(node); return node;
    };
  }
  const page = {
    window: { AudioContext: Context, OfflineAudioContext: Decoder },
    fetch: url => new Promise((resolve, reject) => {
      const respond = () => resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
      if (state.manual) state.pending.push({ url, respond, reject }); else respond();
    }),
    setTimeout: (fn, ms) => clock.setTimeout(fn, ms),
    clearTimeout: timer => clock.clearTimeout(timer),
  };
  vm.runInNewContext(fs.readFileSync('src/js/echo-piano.js', 'utf8') + '\n' + fs.readFileSync('src/js/echo-score.js', 'utf8'), page);
  state.EchoPiano = page.EchoPiano;
  state.EchoScore = page.EchoScore;
  state.player = new page.EchoPiano.Player(status => state.statuses.push(status));
  return state;
}

const flush = () => new Promise(resolve => setImmediate(resolve));
const voicesOf = (h, from = 0) => h.sources.slice(from);
const plain = value => JSON.parse(JSON.stringify(value)); // arrays made inside the vm are a different realm
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} vs ${expected}`);
const sample = midi => [48, 54, 60, 63, 66, 69, 72].reduce((best, n) => Math.abs(n - midi) < Math.abs(best - midi) ? n : best, 48);

const SCORE = [
  { at: 0, midi: [48, 55, 62], hold: .5, level: .5 },
  { at: .6, midi: [52, 57, 62, 66, 67], hold: .5, level: 1, roll: .1, release: .4 },
  { at: 1.2, midi: [48, 55, 59, 62, 64, 71], hold: 1, level: .25, release: 1 },
];

async function testScheduling() {
  const h = harness();
  assert.equal(await h.player.prepare(), true);
  const events = [];
  const done = h.player.playScore(SCORE, { onStart: () => events.push('start'), onStep: i => events.push('step' + i), onEnd: f => events.push('end:' + f) });
  // Everything is queued on the audio clock up front: three chords of 3, 5 and 6 notes.
  assert.equal(h.sources.length, 14, 'one voice per note, scheduled before the piece begins');
  assert.equal(h.outputs, 1);
  assert.deepEqual(events, ['start'], 'the page hears about the start synchronously, before any chord');
  const start = 3 + .08;
  const first = voicesOf(h, 0).slice(0, 3), second = voicesOf(h, 3).slice(0, 5), third = voicesOf(h, 8);
  assert.deepEqual(first.map(s => s.starts[0]), [start, start, start], 'a block chord starts together');
  near(second[0].starts[0], start + .6, 'a rolled chord starts on its beat with its lowest note');
  near(second[4].starts[0], start + .6 + .1, 'and spreads to its highest note over the roll');
  assert.ok(second.every((s, i) => i === 0 || s.starts[0] > second[i - 1].starts[0]), 'a roll rises note by note');
  near(third[0].playbackRate.events[0][1], Math.pow(2, (48 - sample(48)) / 12), 'pitch comes from the nearest sample');
  near(third[5].playbackRate.events[0][1], Math.pow(2, (71 - sample(71)) / 12), 'the six-note chord is tuned too');
  const peak = voice => voice.target.gain.events.find(e => e[0] === 'linear')[1];
  near(peak(first[0]), .22 * .5 / Math.sqrt(3), 'dynamics scale the chord gain by level and note count');
  near(peak(second[0]), .22 * 1 / Math.sqrt(5), 'a louder chord is louder');
  near(peak(third[0]), .22 * .25 / Math.sqrt(6), 'a soft six-note chord stays soft');
  // Envelope: attack, hold at level until the chord's own end, exponential release, stop just after.
  const env = first[0].target.gain.events;
  assert.deepEqual(env.map(e => e[0]), ['set', 'linear', 'set', 'exp']);
  near(env[2][2], start + .5, 'the fade begins when the chord has been held for its hold time');
  near(env[3][2], start + .5 + .6, 'and takes the default release when none is given');
  near(first[0].stops[0], start + .5 + .6 + .03, 'the voice is stopped after its fade');
  near(second[0].target.gain.events[3][2], start + .6 + .5 + .4, 'a step can set its own release');
  // The master bus: every voice feeds one gain, which feeds one compressor, which feeds the output.
  const bus = first[0].target.connections[0];
  assert.ok(bus && h.compressors.includes(bus.connections[0]), 'a master bus feeds the compressor');
  assert.ok(h.sources.every(s => s.target.connections[0] === bus), 'every score voice feeds the master bus');
  assert.equal(h.compressors.length, 1);
  assert.deepEqual(h.compressors[0].connections.map(c => c.name), ['destination']);
  assert.deepEqual(bus.gain.events.slice(-2).map(e => e[0]), ['cancel', 'set'], 'a fresh piece resets the bus level');

  // The page is told about each chord when it is heard, in order, once.
  h.clock.advance(.55);
  assert.deepEqual(events, ['start', 'step0'], 'the first chord is heard on its beat, the second has not arrived');
  h.clock.advance(.2);
  assert.deepEqual(events, ['start', 'step0', 'step1']);
  h.clock.advance(.6);
  assert.deepEqual(events, ['start', 'step0', 'step1', 'step2']);
  h.clock.advance(3);
  assert.deepEqual(events, ['start', 'step0', 'step1', 'step2', 'end:true']);
  assert.equal(await done, true, 'the promise resolves true when the last chord has faded');
  assert.equal(h.statuses.at(-1), 'ready');
  h.clock.advance(5);
  assert.equal(events.length, 5, 'nothing fires after the end');
}

async function testLatencyAndLead() {
  const h = harness({ latency: .05 });
  await h.player.prepare();
  const heard = [];
  const done = h.player.playScore(SCORE, { onStep: (i, step) => heard.push([i, step.at, +(h.clock.now).toFixed(3)]) }, { lead: 1 });
  near(h.sources[0].starts[0], 3 + .08 + 1, 'a lead delays the whole piece');
  h.clock.advance(1.1);
  assert.equal(heard.length, 0, 'nothing is heard during the lead');
  h.clock.advance(.1);
  assert.deepEqual(heard.map(x => x[0]), [0], 'the first chord is announced once it is heard');
  assert.ok(heard[0][2] >= 3 + .08 + 1 + .05 - .005, 'the announcement waits for the output latency, not just the scheduling time');
  h.player.stop();
  assert.equal(await done, false);
}

async function testCancellation() {
  const h = harness();
  await h.player.prepare();
  const events = [];
  const hooks = tag => ({ onStart: () => events.push(tag + ':start'), onStep: i => events.push(tag + ':step' + i), onEnd: f => events.push(tag + ':end:' + f) });
  const done = h.player.playScore(SCORE, hooks('a'));
  h.clock.advance(.7);
  assert.deepEqual(events, ['a:start', 'a:step0', 'a:step1']);
  h.player.stop();
  assert.deepEqual(events.slice(3), ['a:end:false'], 'stop reports a cut-short piece exactly once');
  assert.equal(await done, false);
  const now = h.clock.now;
  assert.ok(h.sources.every(s => s.stops.at(-1) === now + .04), 'every voice, played or still queued, is released');
  const bus = h.gains.find(g => g.connections.some(c => h.compressors.includes(c)));
  assert.deepEqual(bus.gain.events.at(-1), ['target', 0, now, .02], 'the master bus fades instead of clicking off');
  h.clock.advance(5);
  assert.equal(events.length, 4, 'a cancelled piece never announces a later chord');

  // A single chord cancels a running piece.
  const second = h.player.playScore(SCORE, hooks('b'));
  h.clock.advance(.1);
  await h.player.play([60, 64, 67]);
  assert.equal(events.at(-1), 'b:end:false');
  assert.equal(await second, false);
  // A new piece cancels the previous one and starts clean.
  const c = h.player.playScore(SCORE, hooks('c'));
  const d = h.player.playScore(SCORE, hooks('d'));
  assert.equal(await c, false, 'the older piece resolves false at once');
  assert.ok(events.includes('c:end:false') && !events.includes('d:end:false'));
  h.clock.advance(.7);
  assert.deepEqual(events.slice(-3), ['d:start', 'd:step0', 'd:step1']);
  const bus2 = h.gains.find(g => g.connections.some(c => h.compressors.includes(c)));
  assert.deepEqual(bus2.gain.events.slice(-2).map(e => e[0]), ['cancel', 'set'], 'the bus is back at full level for the new piece');
  assert.equal(bus2.gain.events.at(-1)[1], 1);
  h.player.stop();
  assert.equal(await d, false);

  // A hook may cancel from inside a step without breaking anything.
  const inner = harness();
  await inner.player.prepare();
  let steps = 0;
  const cut = inner.player.playScore(SCORE, { onStep: () => { steps++; inner.player.stop(); } });
  inner.clock.advance(5);
  assert.equal(steps, 1, 'stopping inside onStep ends the piece immediately');
  assert.equal(await cut, false);
}

async function testColdStartAndFailure() {
  const cold = harness({ running: false });
  cold.manual = true;
  const events = [];
  const done = cold.player.playScore(SCORE, { onStart: () => events.push('start'), onEnd: f => events.push('end:' + f) });
  assert.equal(cold.sources.length, 0, 'a cold piece waits for every sample before any chord sounds');
  assert.equal(cold.statuses.at(-1), 'loading');
  assert.ok(cold.pending.length >= 1);
  cold.player.stop();
  while (cold.pending.length) cold.pending.shift().respond();
  assert.equal(await done, false);
  assert.deepEqual(events, [], 'a piece cancelled while loading never announces a start or an end');
  assert.equal(cold.sources.length, 0, 'and never sounds');

  const warm = harness({ running: false });
  const played = warm.player.playScore(SCORE, {});
  await flush();
  assert.equal(warm.sources.length, 14, 'once everything is loaded the piece is queued in one go');
  warm.clock.advance(5);
  assert.equal(await played, true);

  const noCompressor = harness({ compressor: false });
  await noCompressor.player.prepare();
  const plain = noCompressor.player.playScore(SCORE, {});
  assert.equal(noCompressor.sources.length, 14, 'a browser without a compressor still plays the piece');
  noCompressor.player.stop(); await plain;

  for (const bad of [[], [{ at: 0, midi: [48, 55], hold: 1 }], [{ at: 0, midi: [48, 50, 52, 54, 56, 58, 60], hold: 1 }], [{ at: 0, midi: [48, 55, 62], hold: 0 }],
    [{ at: 1, midi: [48, 55, 62], hold: 1 }, { at: 0, midi: [48, 55, 62], hold: 1 }], [{ at: 0, midi: [48, 55, 73], hold: 1 }], [{ at: 0, midi: [48, 55, 62], hold: 1, level: 2 }],
    [{ at: 0, midi: [48, 55, 62], hold: NaN }], [{ at: 0, midi: [48, 48, 62], hold: 1 }]]) {
    const h = harness();
    await h.player.prepare();
    assert.equal(await h.player.playScore(bad, {}), false, JSON.stringify(bad));
    assert.equal(h.sources.length, 0, 'an invalid piece sounds nothing');
    assert.equal(h.statuses.at(-1), 'failed');
  }
  const huge = harness();
  assert.equal(await huge.player.playScore(Array.from({ length: 257 }, (_, i) => ({ at: i, midi: [48, 55, 62], hold: 1 })), {}), false, 'an unreasonably long piece is refused');
  assert.equal(await huge.player.playScore(SCORE, {}, { lead: 99 }), false, 'so is an absurd lead');

  // Extended chords reach six notes for single clicks as well; seven are still refused.
  const single = harness();
  await single.player.play([48, 55, 59, 62, 64, 71]);
  assert.equal(single.sources.length, 6);
  await single.player.play([48, 50, 52, 54, 56, 58, 60]);
  assert.equal(single.sources.length, 6, 'seven notes are not a chord');
  assert.equal(single.statuses.at(-1), 'failed');
}

function loadData() {
  const data = JSON.parse(fs.readFileSync('data/music-riddle.json'));
  return { data, byId: new Map(data.nodes.map(n => [n.id, n])) };
}

function testRoute() {
  const { EchoScore: scoring } = harness();
  const EchoScore = { route: (...args) => plain(scoring.route(...args)) };
  const { data } = loadData();
  const all = data.nodes.flatMap(n => n.next.map(t => n.id + ':' + t));
  assert.equal(all.length, 47);
  const shortest = EchoScore.route(all, data.start, data.ending, data.ending);
  assert.equal(shortest.length, 5, 'the shortest way home is four answers: five songs');
  assert.deepEqual(shortest, ['VbpP7694d', 'mQKhoF955e4', 'fOld7b901', 'wedding-card-street', 'rAx50113']);
  // Only paths the player walked count.
  const walked = ['VbpP7694d:mQKhoF955e4', 'mQKhoF955e4:fOld7b901'];
  assert.deepEqual(EchoScore.route(walked, data.start, 'fOld7b901', data.ending), ['VbpP7694d', 'mQKhoF955e4', 'fOld7b901']);
  assert.deepEqual(EchoScore.route(walked, data.start, data.ending, data.ending), [], 'no walked path, no route');
  assert.deepEqual(EchoScore.route([], data.start, data.start, data.ending), [data.start], 'standing at the start is a one-song path');
  assert.deepEqual(EchoScore.route(['a:b', 'b:a', 'b:c', 'a:d', 'c:d'], 'a', 'd', 'd'), ['a', 'b', 'c', 'd'], 'the way walked last wins, even when longer');
  assert.deepEqual(EchoScore.route(['a:b', 'b:a', 'b:c', 'c:d', 'a:d'], 'a', 'd', 'd'), ['a', 'd'], 'and a shorter way walked last wins too');
  // 2026-10-04: 喜帖街 into 贝多芬 first, then 花花世界 into 贝多芬; the replay played 喜帖街.
  assert.deepEqual(EchoScore.route(['s:x', 'x:b', 's:y', 'y:b'], 's', 'b', 'b'), ['s', 'y', 'b'], 'a song reached two ways replays the latest');
  assert.deepEqual(EchoScore.route(['s:y', 'y:b', 's:x', 'x:b'], 's', 'b', 'b'), ['s', 'x', 'b']);
  assert.deepEqual(EchoScore.route(['s:x', 'x:b', 'b:s', 's:y'], 's', 'b', 'b'), ['s', 'x', 'b'], 'an edge back into the start is not a way to it');
  assert.deepEqual(EchoScore.route(['a:b', 'b:a', 'b:c'], 'a', 'c', 'c'), ['a', 'b', 'c'], 'loops do not repeat songs');
  // The hidden coda follows the ending.
  assert.deepEqual(EchoScore.route(all, data.start, data.bonus, data.ending, data.bonus), [...shortest, data.bonus]);
  assert.deepEqual(EchoScore.route(walked, data.start, data.bonus, data.ending, data.bonus), [], 'no coda path before the ending was reached');
  // Every song is reachable over the full graph, and the route is a real chain of edges.
  for (const node of data.nodes) {
    const ids = EchoScore.route(all, data.start, node.id, data.ending, data.bonus);
    assert.ok(ids.length >= 1 && ids[0] === data.start && ids.at(-1) === node.id, node.title);
    ids.slice(1).forEach((id, i) => assert.ok(all.includes(ids[i] + ':' + id) || (id === data.bonus && ids[i] === data.ending), node.title + ' ' + id));
  }
}

function testPathSteps() {
  const { EchoScore, EchoPiano } = harness();
  const midiOf = id => [48, 55, 62].map(n => n + id.length);
  const one = EchoScore.pathSteps(['x'], midiOf);
  assert.equal(one.length, 1);
  assert.equal(one[0].at, 0); near(one[0].level, .88, 'a lone song settles at the end level'); assert.equal(one[0].release, 2.4);
  const two = EchoScore.pathSteps(['x', 'yy'], midiOf);
  near(two[1].at, .7 * 1.3, 'the last gap before the held chord is stretched');
  const five = EchoScore.pathSteps(['a', 'bb', 'ccc', 'dddd', 'eeeee'], midiOf);
  const gaps = five.slice(1).map((s, i) => s.at - five[i].at);
  [.7, .7, .7 * 1.12, .7 * 1.3].forEach((g, i) => near(gaps[i], g, 'gap ' + i));
  assert.ok(five.every((s, i) => i === 0 || s.level > five[i - 1].level), 'a path gathers strength');
  near(five[0].level, .5, 'it begins at mezzo'); near(five.at(-1).level, .88, 'and arrives strong');
  assert.ok(five.slice(0, -1).every(s => s.hold < .7 * 1.3 && s.roll < .1), 'passing chords are short and lightly rolled');
  assert.ok(five.at(-1).hold > 1.5 && five.at(-1).release > 2, 'the chord you stand on is held');
  assert.deepEqual(plain(five.map(s => s.midi)), ['a', 'bb', 'ccc', 'dddd', 'eeeee'].map(midiOf));
  const long = EchoScore.pathSteps(Array.from({ length: 14 }, (_, i) => 'n' + i), midiOf);
  assert.ok(EchoScore.length(long) < 14, 'even the deepest route plays in under fourteen seconds: ' + EchoScore.length(long));
  void EchoPiano;
}

async function testFinaleAgainstTheData() {
  const { data, byId } = loadData();
  const h = harness();
  const { EchoScore } = h;
  const finale = data.finale;
  const steps = EchoScore.finaleSteps(finale, id => byId.get(id).presentation.chord.midi);
  assert.equal(steps.length, finale.steps.length);
  steps.forEach((s, i) => {
    near(s.hold, finale.steps[i].beats * finale.beat * (finale.steps[i].gate ?? EchoScore.legato), 'hold ' + i);
    if (i) near(s.at - steps[i - 1].at, finale.steps[i - 1].beats * finale.beat, 'onset ' + i);
  });
  assert.deepEqual(plain(steps.map(s => s.midi)), finale.steps.map(s => byId.get(s.node).presentation.chord.midi), 'every step plays its own node chord');
  const lit = new Set(finale.steps.map(s => s.node));
  assert.deepEqual([...byId.keys()].filter(id => !lit.has(id)), [], 'every song, hidden coda included, is lit at least once');
  assert.equal(finale.steps[0].node, data.start, 'the piece opens on the start');
  assert.equal(finale.steps.at(-2).node, data.ending, 'it resolves on the ending');
  assert.equal(finale.steps.at(-1).node, data.bonus, 'and closes with the hidden coda');
  const seconds = EchoScore.length(steps);
  assert.ok(seconds > 35 && seconds < 60, 'a piece you will sit through once: ' + seconds.toFixed(1) + ' s');
  const levels = finale.steps.map(s => s.level);
  assert.ok(Math.max(...levels) - Math.min(...levels) >= .5, 'it has real dynamics');
  const climax = finale.steps.findIndex(s => s.level === Math.max(...levels));
  assert.ok(climax >= finale.steps.length * .7, 'the loudest chord comes late, near the cadence');
  assert.ok(Math.min(...levels.slice(0, 4)) < .4, 'it begins quietly');
  assert.ok(finale.steps.at(-1).level < .5, 'and the coda is a soft echo');
  assert.deepEqual(byId.get(finale.steps[0].node).presentation.chord.midi, byId.get('2113245').presentation.chord.midi, 'the loop echo has the opening chord');
  assert.ok(finale.steps.some(s => s.node === '2113245'), 'and it comes back in the middle of the piece');

  // The whole piece plays through the real engine, queued a few seconds at a time.
  await h.player.prepare();
  const heard = [], voices = steps.reduce((n, s) => n + s.midi.length, 0);
  const begun = h.clock.now;
  const done = h.player.playScore(steps, { onStep: i => heard.push(i) });
  assert.ok(h.sources.length > 0 && h.sources.length < voices / 3, 'the first seconds are queued, not all ' + voices + ' voices: ' + h.sources.length);
  h.clock.advance(seconds + 1);
  assert.deepEqual(heard, Array.from({ length: steps.length }, (_, i) => i), 'every chord is announced once, in order');
  assert.equal(await done, true);
  assert.equal(h.sources.length, voices, 'by the end every note of every chord has sounded');
  assert.ok(h.sources.every(s => s.starts[0] < s.stops[0]));
  // Each voice is queued well before it starts (a busy page has seconds of slack), except in the opening window.
  const pieceStart = begun + .08;
  assert.ok(h.sources.every(s => s.starts[0] - s.createdAt >= Math.min(s.starts[0] - pieceStart, 5.9)), 'every voice is queued with seconds to spare');
  // Voices sounding at once stay bounded, and the loudest moment stays inside a sane sum.
  const events = h.sources.flatMap(s => [[s.starts[0], 1, s], [s.stops[0], -1, s]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let live = 0, most = 0;
  for (const [, delta] of events) { live += delta; most = Math.max(most, live); }
  assert.ok(most <= 24, 'at most 24 voices sound at once, saw ' + most);
}

async function testLookAhead() {
  const h = harness();
  await h.player.prepare();
  // Forty one-second chords: a long piece is queued in a rolling window, never all at once.
  const long = Array.from({ length: 40 }, (_, i) => ({ at: i, midi: [48, 55, 62], hold: .9, release: .5 }));
  const done = h.player.playScore(long, {});
  assert.equal(h.sources.length, 7 * 3, 'only the first six seconds (steps at 0 to 6) are queued at the start');
  h.clock.advance(10);
  assert.equal(h.sources.length, 16 * 3, 'the queue is topped up as the piece plays: steps up to six seconds past the 9.9 s heard');
  h.clock.advance(60);
  assert.equal(h.sources.length, 40 * 3);
  assert.equal(await done, true);

  // Cancelling stops the queue: later chords are never created.
  const cut = harness();
  await cut.player.prepare();
  const second = cut.player.playScore(long, {});
  cut.clock.advance(3);
  const queued = cut.sources.length, cancelledAt = cut.clock.now;
  cut.player.stop();
  assert.equal(await second, false);
  cut.clock.advance(60);
  assert.equal(cut.sources.length, queued, 'nothing is queued after a cancel');
  assert.ok(cut.sources.every(s => s.stops.at(-1) === cancelledAt + .04), 'and every queued voice was released at once');
}

(async () => {
  await testScheduling();
  await testLatencyAndLead();
  await testLookAhead();
  await testCancellation();
  await testColdStartAndFailure();
  testRoute();
  testPathSteps();
  await testFinaleAgainstTheData();
  console.log('PASS score scheduling and dynamics, rolls, master bus, heard-time hooks, look-ahead queueing, cancellation, cold start, validation, walked routes, path phrasing and the finale');
})().catch(error => { console.error(error); process.exitCode = 1; });
