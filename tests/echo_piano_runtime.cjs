// Exercise asynchronous audio ownership without a speaker or browser dependency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const pending = [];
const sources = [];
let contexts = 0;
class Param {
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
  cancelScheduledValues() {}
  setTargetAtTime() {}
}
class Context {
  constructor() { contexts++; this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
  async resume() { this.state = 'running'; }
  async decodeAudioData() { return { duration: 15 }; }
  createGain() { return { gain: new Param(), connect() {}, disconnect() {} }; }
  createBufferSource() {
    const source = { playbackRate: new Param(), starts: 0, stops: [], connect() {}, disconnect() {}, start() { this.starts++; }, stop(at) { this.stops.push(at); } };
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

(async () => {
  assert.equal(contexts, 0, 'constructing the player must not autoplay or open an audio context');
  assert.equal(pending.length, 0, 'samples load only in response to interaction');
  const manifest = JSON.parse(fs.readFileSync('gallery/music/assets/piano/ydp/manifest.json'));
  assert.deepEqual(Array.from(sandbox.EchoPiano.roots), manifest.samples.map(sample => sample.rootMidi));
  for (const sample of manifest.samples) assert.ok(fs.statSync('gallery/music/assets/piano/ydp/' + sample.file).size > 1000);

  const first = player.play(62), newer = player.play(64);
  assert.equal(pending.length, 1, 'concurrent clicks share the nearest sample request');
  assert.ok(pending[0].url.endsWith('root-063.mp3'));
  settle(0); await Promise.all([first, newer]);
  assert.equal(sources.length, 1, 'only the latest pending click should sound after a cold load');
  assert.equal(sources[0].playbackRate.value, Math.pow(2, 1 / 12));
  await player.play(64);
  assert.equal(sources.length, 2, 'the same discovered node can sound again');
  assert.equal(pending.length, 1, 'replays use the decoded buffer');

  const loading = player.play(48);
  player.stop(); settle(1); await loading;
  assert.equal(sources.length, 2, 'mute or leaving the tab cancels a sample still loading');
  assert.ok(sources.every(source => source.stops.at(-1) === .04), 'mute stops active tails');
  await player.play(48);
  assert.equal(sources.length, 3, 'a cancelled load remains cached for a later intentional click');

  const oldRoot = player.play(69), newRoot = player.play(72);
  settle(2); await oldRoot;
  assert.equal(sources.length, 3, 'an old network response must not sound after a newer click');
  settle(3); await newRoot;
  assert.equal(sources.length, 4);

  const failed = player.play(54);
  pending[4].resolve({ ok: false }); await failed;
  assert.equal(statuses.at(-1), 'failed');
  const retry = player.play(54);
  assert.equal(pending.length, 6, 'a failed fetch is evicted so retry can recover');
  settle(5); await retry;
  assert.equal(statuses.at(-1), 'ready');
  assert.equal(sources.length, 5);
  for (let i = 0; i < 12; i++) await player.play(63);
  assert.ok(sources.filter(source => source.stops.at(-1) > .04).length <= 6, 'rapid replay bounds overlapping voices');
  assert.equal(contexts, 1, 'all plays share a single audio context');
  console.log('PASS piano replay, sample caching, pending cancellation, ordering, retry and polyphony');
})().catch(error => { console.error(error); process.exitCode = 1; });
