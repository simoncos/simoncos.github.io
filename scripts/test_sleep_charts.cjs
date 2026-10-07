// Capture real renderer arguments without Plotly/network; expected digests come from the pre-refactor bundles.
const fs = require('node:fs'), vm = require('node:vm'), crypto = require('node:crypto');
class Element {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.dataset = {}; this.style = {}; this.events = {}; this.textContent = ''; this.className = ''; this.id = ''; this.classes = new Set(); this.classList = {add: (...xs) => xs.forEach(x => this.classes.add(x)), remove: (...xs) => xs.forEach(x => this.classes.delete(x)), toggle: (x, on) => { const next = on === undefined ? !this.classes.has(x) : on; next ? this.classes.add(x) : this.classes.delete(x); }, contains: x => this.classes.has(x)}; }
  appendChild(el) { this.children.push(el); return el; }
  after() {}
  closest() { return new Element(); }
  addEventListener(name, handler) { (this.events[name] ||= []).push(handler); }
  querySelectorAll(selector) { return this.children.filter(el => el.classes.has(selector.replace(/^\./, '').split('.')[0]) && (!selector.includes('.active') || el.classes.has('active'))); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
function capture(bundle, html, language) {
  const elements = new Map();
  for (const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)) { const el = new Element(match[1]); el.id = match[3]; elements.set(el.id, el); }
  const selector = elements.get('event-selector');
  for (const match of html.matchAll(/<button\b([^>]*data-event-key="([^"]+)"[^>]*)>/g)) { const el = new Element('button'); el.dataset.eventKey = match[2]; el.classes.add('event-chip'); if (/class="[^"]*active/.test(match[1])) el.classes.add('active'); selector?.appendChild(el); }
  const document = {readyState: 'complete', documentElement: {lang: language}, getElementById: id => elements.get(id) || null, createElement: tag => new Element(tag), querySelectorAll: () => []};
  const calls = [];
  const Plotly = {newPlot: (...args) => { calls.push(JSON.parse(JSON.stringify(args))); return Promise.resolve(); }};
  const window = {document, Plotly};
  vm.runInNewContext(bundle, {window, document, console, Promise}, {timeout: 15000});
  const initialCount = calls.length;
  for (const id of ['event-selector', 'scatter-selector']) for (const button of elements.get(id)?.children || []) for (const handler of button.events.click || []) handler();
  const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
  return {initialCount, interactionCount: calls.length - initialCount, plots: [...new Set(calls.map(args => args[0]))].sort(), digest: digest(calls), calls};
}
module.exports = {capture};
if (require.main === module) {
  const fixtures = JSON.parse(fs.readFileSync('tests/fixtures/sleep-chart-outputs.json', 'utf8'));
  for (const language of ['zh', 'en']) {
    const html = fs.readFileSync(`gallery/research/sleep-2016-2026${language === 'en' ? '.en' : ''}.html`, 'utf8');
    const result = capture(fs.readFileSync('gallery/research/assets/sleep-charts.js', 'utf8'), html, language);
    const {calls, ...actual} = result;
    require('node:assert/strict').deepEqual(actual, fixtures[language]);
    console.log(`Sleep ${language}: ${actual.initialCount} initial plots, ${actual.interactionCount} filtered plots match the original.`);
  }
}
