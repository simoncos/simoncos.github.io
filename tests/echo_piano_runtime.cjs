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

(async () => {
  assert.equal(contexts, 0, 'constructing the player must not autoplay or open an audio context');
  assert.equal(pending.length, 0, 'samples load only in response to interaction');
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
  console.log('PASS all 37 simultaneous chords, normalized gain, replay, caching, cancellation, ordering, retry and bounded voices');
})().catch(error => { console.error(error); process.exitCode = 1; });
