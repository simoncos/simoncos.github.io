// Exercise chord scheduling and asynchronous ownership without a speaker dependency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const pending = [];
const sources = [];
let contexts = 0;
class Param {
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.peak = value; }
  exponentialRampToValueAtTime() {}
  cancelScheduledValues() {}
  setTargetAtTime() {}
}
class Context {
  constructor() { contexts++; this.state = 'suspended'; this.currentTime = 3; this.destination = {}; }
  async resume() { this.state = 'running'; }
  async decodeAudioData() { return { duration: 15 }; }
  createGain() { return { gain: new Param(), connect() {}, disconnect() {} }; }
  createBufferSource() {
    const source = { playbackRate: new Param(), starts: [], stops: [], connect(gain) { this.gain = gain; }, disconnect() {}, start(at) { this.starts.push(at); }, stop(at) { this.stops.push(at); } };
    sources.push(source); return source;
  }
}
const sandbox = {
  window: { AudioContext: Context },
  fetch: url => new Promise((resolve, reject) => pending.push({ url, resolve, reject })),
};
vm.runInNewContext(fs.readFileSync('src/js/echo-piano.js', 'utf8'), sandbox);
const statuses = [];
const player = new sandbox.EchoPiano.Player(status => statuses.push(status));
const settle = i => pending[i].resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
const active = () => sources.filter(source => source.stops.at(-1) > 3.04);
const flush = () => new Promise(resolve => setImmediate(resolve));

function preloadingHarness(decodeFailures = new Set()) {
  const state = { outputs: 0, decoders: 0, decodes: 0, pending: [], sources: [], statuses: [] };
  class Decoder {
    constructor(channels, length, rate) {
      state.decoders++;
      assert.equal(channels, 1); assert.equal(length, 1); assert.equal(rate, 44100);
    }
    async decodeAudioData(bytes) {
      const root = new Uint8Array(bytes)[0];
      state.decodes++;
      if (decodeFailures.delete(root)) throw new Error('Bad sample');
      return { duration: 15 };
    }
  }
  class Output {
    constructor(options) {
      state.outputs++; this.state = 'suspended'; this.currentTime = 3; this.destination = {};
      assert.equal(options.latencyHint, 'interactive');
    }
    async resume() { this.state = 'running'; }
    async decodeAudioData(bytes) { return new Decoder(1, 1, 44100).decodeAudioData(bytes); }
    createGain() { return { gain: new Param(), connect() {}, disconnect() {} }; }
    createBufferSource() {
      const source = { playbackRate: new Param(), starts: [], stops: [], connect(gain) { this.gain = gain; }, disconnect() {}, start(at) { this.starts.push(at); }, stop(at) { this.stops.push(at); } };
      state.sources.push(source); return source;
    }
  }
  const page = {
    window: { AudioContext: Output, OfflineAudioContext: Decoder },
    fetch: url => new Promise((resolve, reject) => state.pending.push({ url, resolve, reject })),
  };
  vm.runInNewContext(fs.readFileSync('src/js/echo-piano.js', 'utf8'), page);
  state.player = new page.EchoPiano.Player(status => state.statuses.push(status));
  state.settle = i => {
    const root = Number(state.pending[i].url.match(/root-(\d+)\.mp3/)[1]);
    state.pending[i].resolve({ ok: true, arrayBuffer: async () => Uint8Array.of(root).buffer });
  };
  return state;
}

async function testPreloading(data) {
  const warm = preloadingHarness();
  assert.equal(warm.pending.length, 0, 'construction stays silent and does not start downloads');
  const preparing = warm.player.prepare();
  assert.equal(warm.player.prepare(), preparing, 'concurrent preparation shares one operation');
  assert.equal(warm.pending.length, 7, 'prepare starts all seven sample requests ahead of a click');
  assert.equal(warm.outputs, 0, 'preloading never opens the playback device');
  for (let i = 0; i < 7; i++) warm.settle(i);
  assert.equal(await preparing, true);
  assert.equal(warm.decodes, 7, 'all seven samples are decoded before the first click');
  assert.equal(warm.sources.length, 0, 'preloading never creates a voice or autoplays');
  await warm.player.play([60, 64, 67]);
  assert.equal(warm.outputs, 1);
  for (const node of data.nodes) {
    const before = warm.sources.length;
    const played = warm.player.play(node.presentation.chord.midi);
    assert.equal(warm.sources.length - before, node.presentation.chord.midi.length,
      node.title + ': warm audio is scheduled synchronously before the graph redraw');
    await played;
  }
  assert.equal(warm.pending.length, 7, 'no discovered-node click causes a new download');
  assert.equal(warm.decodes, 7, 'no discovered-node click decodes audio again');
  assert.equal(await warm.player.prepare(), true);
  assert.equal(warm.decoders, 1);
  warm.player.stop();

  const racing = preloadingHarness(), racedPreparation = racing.player.prepare();
  const older = racing.player.play([48, 54, 69]), latest = racing.player.play([60, 64, 67]);
  assert.equal(racing.pending.length, 7, 'early clicks reuse the background requests');
  racing.settle(2); await flush();
  assert.equal(racing.sources.length, 0, 'early clicks still wait for the entire chord');
  racing.settle(3); racing.settle(4); await latest;
  assert.equal(racing.sources.length, 3, 'a click need not wait for unrelated background samples');
  for (const i of [0, 1, 5, 6]) racing.settle(i);
  await Promise.all([older, racedPreparation]);
  assert.equal(racing.sources.length, 3, 'obsolete early clicks never play late');
  racing.player.stop();

  const muted = preloadingHarness(), mutedPreparation = muted.player.prepare();
  const cancelled = muted.player.play([48, 54, 69]);
  muted.player.stop();
  for (let i = 0; i < 7; i++) muted.settle(i);
  await Promise.all([cancelled, mutedPreparation]);
  assert.equal(muted.sources.length, 0, 'preload completion cannot undo mute or tab hiding');
  assert.equal(muted.statuses.at(-1), 'ready');
  await muted.player.play([48, 54, 69]);
  assert.equal(muted.sources.length, 3, 'a later intentional click can use the prepared cache');
  muted.player.stop();

  for (const failure of ['network', 'decode']) {
    const retry = preloadingHarness(failure === 'decode' ? new Set([48]) : new Set());
    const failed = retry.player.prepare();
    for (let i = 0; i < 7; i++) {
      if (i === 0 && failure === 'network') retry.pending[i].resolve({ ok: false });
      else retry.settle(i);
    }
    assert.equal(await failed, false, failure + ' failure remains retryable');
    assert.equal(retry.statuses.at(-1), 'failed');
    const recovered = retry.player.prepare();
    assert.equal(retry.pending.length, 8, 'retry preserves the other six prepared samples');
    retry.settle(7); assert.equal(await recovered, true);
    assert.equal(retry.outputs, 0, 'retry also stays silent');
    assert.equal(retry.statuses.at(-1), 'ready');
  }

  const stale = preloadingHarness(), stalePreparation = stale.player.prepare();
  for (let i = 1; i < 7; i++) stale.settle(i);
  await stale.player.play([60, 64, 67]);
  stale.pending[0].resolve({ ok: false });
  assert.equal(await stalePreparation, false);
  assert.equal(stale.statuses.at(-1), 'ready', 'stale preload failure cannot override a newer successful click');
  stale.player.stop();
}

(async () => {
  assert.equal(contexts, 0, 'constructing the player must not autoplay or open an audio context');
  assert.equal(pending.length, 0, 'samples load only in response to interaction');
  assert.equal(await player.prepare(), false, 'missing offline decoder retains the gesture-loading fallback');
  assert.equal(contexts, 0); assert.equal(pending.length, 0);
  const manifest = JSON.parse(fs.readFileSync('gallery/music/assets/piano/ydp/manifest.json'));
  assert.deepEqual(Array.from(sandbox.EchoPiano.roots), manifest.samples.map(sample => sample.rootMidi));
  for (const sample of manifest.samples) assert.ok(fs.statSync('gallery/music/assets/piano/ydp/' + sample.file).size > 1000);

  const first = player.play([60, 64, 67]), newer = player.play([60, 63, 67]);
  assert.equal(pending.length, 3, 'concurrent clicks share nearest-sample requests');
  settle(0); await flush();
  assert.equal(sources.length, 0, 'a cold chord never sounds partly loaded');
  settle(1); settle(2); await Promise.all([first, newer]);
  assert.equal(sources.length, 3, 'only the latest pending chord should sound');
  assert.deepEqual(sources.map(s => s.starts), [[3.01], [3.01], [3.01]], 'all chord tones share exactly one audio-clock time');
  assert.equal(sources[2].playbackRate.value, Math.pow(2, 1 / 12));
  assert.ok(sources.every(s => Math.abs(s.gain.gain.peak - .22 / Math.sqrt(3)) < 1e-9), 'normalize chord gain');
  await player.play([60, 64, 67]);
  assert.equal(sources.length, 6, 'the same discovered node can sound again');
  assert.equal(pending.length, 3, 'replays use decoded buffers');
  assert.equal(active().length, 3, 'a new chord releases all of the preceding chord');

  const loading = player.play([48, 54, 69]);
  player.stop(); settle(3); settle(4); settle(5); await loading;
  assert.equal(sources.length, 6, 'mute or leaving the tab cancels the entire loading chord');
  assert.equal(active().length, 0, 'mute stops active tails');
  await player.play([48, 54, 69]);
  assert.equal(sources.length, 9, 'a cancelled load stays cached for a later intentional click');

  const oldRoot = player.play([48, 54, 72]);
  await player.play([48, 54, 69]);
  pending[6].resolve({ ok: false }); await oldRoot;
  assert.equal(sources.length, 12, 'an obsolete network response must not sound');
  assert.equal(statuses.at(-1), 'ready', 'a superseded failure must not break the current status');
  const failed = player.play([48, 54, 72]);
  pending[7].resolve({ ok: false }); await failed;
  assert.equal(statuses.at(-1), 'failed');
  assert.equal(sources.length, 12, 'failure must not sound the other cached chord tones');
  const retry = player.play([48, 54, 72]);
  assert.equal(pending.length, 9, 'failed samples are evicted so retry can recover');
  settle(8); await retry;
  assert.equal(statuses.at(-1), 'ready');

  const data = JSON.parse(fs.readFileSync('data/music-riddle.json'));
  for (const node of data.nodes) {
    const before = sources.length;
    await player.play(node.presentation.chord.midi);
    const group = sources.slice(before);
    assert.equal(group.length, node.presentation.chord.midi.length, node.title);
    assert.ok(group.every(s => s.starts[0] === group[0].starts[0]), node.title + ' must be simultaneous');
    assert.equal(active().length, group.length, 'rapid navigation must not accumulate chords');
  }
  assert.equal(pending.length, 9, 'all 37 curated chords fit the existing seven cached samples');
  player.stop(); assert.equal(active().length, 0);
  assert.equal(contexts, 1, 'all plays share a single audio context');
  await testPreloading(data);
  console.log('PASS all 37 simultaneous chords, silent preloading, immediate warm clicks, shared requests, cancellation, ordering, retry and bounded voices');
})().catch(error => { console.error(error); process.exitCode = 1; });
