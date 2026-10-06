#!/usr/bin/env node
// Render an article film: open films/<name>/index.html in headless Chromium,
// draw every frame on its canvas, and pipe the frames into ffmpeg.
//
//   node films/render.mjs <name> [--lang zh|en] [--out file.mp4]
//        [--from s] [--to s] [--fps 30] [--workers 3] [--crf 16]
//        [--stills 3,12.5,40 --still-dir dir]   (PNG stills instead of a video)
//        [--audio score.wav]                     (mux a soundtrack)
//        [--events cues.json]                    (dump the film's sound cues and exit)
//
// The page must define window.__film = { width, height, duration, ready, render(t) }.
// Fonts come from films/node_modules (npm i in films/), served under /fonts/;
// everything else is served from the repository root, so a scene can load
// article images by their site paths.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const fontRoot = path.join(here, 'node_modules', '@fontsource-variable');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) args[a.slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i];
    else args._.push(a);
  }
  return args;
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.mp4': 'video/mp4',
};

function serve() {
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = url.startsWith('/fonts/')
      ? path.join(fontRoot, url.slice('/fonts/'.length))
      : path.join(root, url);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function openFilm(browser, base, name, lang) {
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('[page]', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[console]', m.text()); });
  await page.goto(`${base}/films/${name}/index.html?lang=${lang}`);
  await page.waitForFunction(() => window.__film && window.__film.ready);
  await page.evaluate(() => window.__film.ready);
  const meta = await page.evaluate(() => ({ width: __film.width, height: __film.height, duration: __film.duration }));
  await page.setViewportSize({ width: meta.width, height: meta.height });
  return { page, meta };
}

function frameAt(page, t, type = 'image/jpeg', quality = 0.94) {
  return page.evaluate(async ([t, type, quality]) => {
    await window.__film.render(t);
    return document.querySelector('canvas').toDataURL(type, quality).split(',')[1];
  }, [t, type, quality]);
}

function ffmpeg(args) {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => p.on('close', c => (c === 0 ? resolve() : reject(new Error(`ffmpeg exited ${c}`)))));
  return { p, done };
}

async function write(stream, buf) {
  if (!stream.write(buf)) await new Promise(r => stream.once('drain', r));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const name = args._[0];
  if (!name) { console.error('usage: node films/render.mjs <name> [--lang zh] [--out file.mp4]'); process.exit(2); }
  const lang = args.lang || 'zh';
  const fps = Number(args.fps || 30);
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--force-color-profile=srgb'] });

  try {
    if (args.events) {
      const { page } = await openFilm(browser, base, name, lang);
      const { duration, events, curves } = await page.evaluate(() => {
        const f = window.__film;
        // weather and other continuous cues, sampled every 0.1 s
        const curves = {};
        for (const [k, fn] of Object.entries(f.curves || {})) {
          curves[k] = Array.from({ length: Math.ceil(f.duration * 10) + 1 }, (_, i) => +fn(i / 10).toFixed(4));
        }
        return { duration: f.duration, events: f.events || [], curves };
      });
      await writeFile(path.resolve(args.events), JSON.stringify({ duration, events, curves }));
      console.log(`${events.length} events → ${args.events}`);
      return;
    }

    if (args.stills) {
      const dir = args['still-dir'] || path.join(os.tmpdir(), `${name}-stills`);
      await mkdir(dir, { recursive: true });
      const { page } = await openFilm(browser, base, name, lang);
      for (const s of String(args.stills).split(',').map(Number)) {
        const b64 = await frameAt(page, s, 'image/png');
        const file = path.join(dir, `${name}-${lang}-${s.toFixed(2).padStart(7, '0')}.png`);
        await writeFile(file, Buffer.from(b64, 'base64'));
        console.log(file);
      }
      return;
    }

    const probe = await openFilm(browser, base, name, lang);
    const { duration } = probe.meta;
    await probe.page.close();
    const from = Number(args.from || 0);
    const to = Math.min(Number(args.to || duration), duration);
    const total = Math.round((to - from) * fps);
    const workers = Math.max(1, Math.min(Number(args.workers || 3), total));
    const out = path.resolve(args.out || path.join(here, name, `out/${name}.${lang}.mp4`));
    const tmp = `${out}.parts`;
    await mkdir(tmp, { recursive: true });
    const crf = String(args.crf || 16);
    const started = Date.now();
    let doneFrames = 0;

    const chunk = Math.ceil(total / workers);
    const parts = [];
    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const first = w * chunk;
      const last = Math.min(total, first + chunk);
      if (first >= last) return;
      const part = path.join(tmp, `part-${String(w).padStart(2, '0')}.mp4`);
      parts[w] = part;
      const { page } = await openFilm(browser, base, name, lang);
      const enc = ffmpeg(['-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', '-r', String(fps), part]);
      for (let i = first; i < last; i++) {
        const b64 = await frameAt(page, from + i / fps);
        await write(enc.p.stdin, Buffer.from(b64, 'base64'));
        if (++doneFrames % (fps * 5) === 0) {
          const s = (Date.now() - started) / 1000;
          process.stderr.write(`\r${doneFrames}/${total} frames, ${(doneFrames / s).toFixed(1)} fps`);
        }
      }
      enc.p.stdin.end();
      await enc.done;
      await page.close();
    }));
    process.stderr.write('\n');

    const list = path.join(tmp, 'list.txt');
    await writeFile(list, parts.filter(Boolean).map(p => `file '${p}'`).join('\n'));
    const muxArgs = ['-f', 'concat', '-safe', '0', '-i', list];
    if (args.audio) muxArgs.push('-ss', String(from), '-i', path.resolve(args.audio), '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest');
    muxArgs.push('-c:v', 'copy', '-movflags', '+faststart', out);
    await ffmpeg(muxArgs).done;
    await rm(tmp, { recursive: true, force: true });
    console.log(`${out} (${total} frames in ${((Date.now() - started) / 1000).toFixed(0)} s)`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
