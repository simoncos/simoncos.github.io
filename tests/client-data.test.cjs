const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const {buildSync} = require('esbuild');
function load(file) {
    const code = buildSync({entryPoints: [file], bundle: true, write: false, platform: 'node', format: 'cjs', target: 'es2020'}).outputFiles[0].text;
    const module = {exports: {}};
    vm.runInNewContext(code, {module, exports: module.exports, require});
    return module.exports;
}
const {parseRiddle} = load('src/ts/music-riddle/data.ts');
const {restoreTrail} = load('src/ts/music-riddle/progress.ts');
const {normalizeAnswer} = load('src/ts/music-riddle/answers.ts');
const {parseNetwork, indexNetwork} = load('src/ts/network/data.ts');
const riddle = JSON.parse(fs.readFileSync('data/music-riddle.json', 'utf8'));
test('authored riddle validates; dangling routes and malformed chords fail before game initialization', () => {
    assert.equal(parseRiddle(riddle), riddle);
    const bad = structuredClone(riddle); bad.nodes[0].next.push('missing');
    assert.throws(() => parseRiddle(bad), /routes/);
    bad.nodes[0].next.pop(); bad.nodes[0].presentation.chord.midi[0] = '60';
    assert.throws(() => parseRiddle(bad), /data/);
});
test('progress survives route edits, while invalid IDs/edges are discarded', () => {
    const first = riddle.nodes.find(node => node.id === riddle.start), next = first.next[0];
    const saved = {current: next, found: [riddle.start, next, next, 'removed'], edges: [riddle.start + ':' + next, 'missing:edge'], history: [riddle.start, 'removed']};
    const trail = restoreTrail(saved, riddle);
    assert.deepEqual(JSON.parse(JSON.stringify(trail)), {current: next, found: [riddle.start, next], edges: [riddle.start + ':' + next], history: [riddle.start]});
    assert.equal(restoreTrail({found: null}, riddle).current, riddle.start);
});
test('complete progress restores the hidden coda, current song and history', () => {
    const trail = restoreTrail({current: riddle.bonus, found: riddle.nodes.map(n => n.id), edges: [], history: [riddle.bonus]}, riddle);
    assert.equal(trail.current, riddle.bonus); assert.ok(trail.found.includes(riddle.bonus)); assert.ok(trail.history.includes(riddle.bonus));
});
test('answer normalization preserves accepted fullwidth, punctuation and spacing variants', () => {
    assert.equal(normalizeAnswer(' 《Ａ B·C》 '), 'abc');
    assert.equal(normalizeAnswer('「晴天」'), normalizeAnswer('晴天'));
});
test('both archived networks validate, and reciprocal indexes preserve directed edges', () => {
    for (const cohort of ['Net10k', 'Net50k']) {
        const data = JSON.parse(fs.readFileSync(`gallery/research/assets/zhihu-${cohort.toLowerCase()}.json`, 'utf8'));
        assert.equal(parseNetwork(data, cohort), data);
        const index = indexNetwork(data);
        assert.equal(index.outgoing.reduce((count, rows) => count + rows.size, 0), data.edge_count);
        assert.equal(index.reciprocal.length / 2, data.reciprocal_pairs);
        const bad = structuredClone(data); bad.edges[0] = data.node_count;
        assert.throws(() => parseNetwork(bad, cohort), /IDs/);
    }
});
test('missing piano engine leaves sound controls usable and silent', () => {
    const {createSound} = load('src/ts/music-riddle/sound.ts');
    const button = {dataset: {}, classList: {toggle() {}}, setAttribute() {}, textContent: '', title: '', disabled: false};
    let renders = 0;
    const sound = createSound({querySelector: () => button}, 'test-sound', en => en, () => renders++);
    assert.equal(sound.status, 'unavailable');
    assert.doesNotThrow(() => {sound.prepare(); sound.play(riddle.nodes[0]); sound.render();});
    assert.equal(button.disabled, true); assert.equal(renders, 1);
});
