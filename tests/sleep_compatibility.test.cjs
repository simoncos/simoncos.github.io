const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const {capture} = require('../scripts/test_sleep_charts.cjs');
const expected = JSON.parse(fs.readFileSync('tests/fixtures/sleep-chart-outputs.json', 'utf8'));

for (const language of ['zh', 'en']) {
  test(`cached ${language} essay runtime still renders the original charts`, () => {
    const suffix = language === 'en' ? '.en' : '';
    const html = fs.readFileSync(`gallery/research/sleep-2016-2026${suffix}.html`, 'utf8');
    const legacy = fs.readFileSync(`gallery/research/assets/sleep-2016-2026${suffix}.js`, 'utf8');
    assert.equal(legacy, fs.readFileSync('gallery/research/assets/sleep-charts.js', 'utf8'));
    const {calls, ...actual} = capture(legacy, html, language);
    assert.deepEqual(actual, expected[language]);
  });
}
