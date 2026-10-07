// Type checking stays with tsc; esbuild bundles only modular browser entries.
import { build } from 'esbuild';
import ts from 'typescript';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outputRoot = args.includes('--output-root') ? path.resolve(args[args.indexOf('--output-root') + 1]) : root;
const all = !args.includes('--scope') || args[args.indexOf('--scope') + 1] === 'all';
const modular = new Set(['site', 'music-riddle', 'zhihu-network']);
await mkdir(path.join(outputRoot, 'src/js'), {recursive: true});
for (const file of await readdir(path.join(root, 'src/ts'))) {
  if (!file.endsWith('.ts') || file.endsWith('.d.ts')) continue;
  const name = file.slice(0, -3);
  const source = path.join(root, 'src/ts', file);
  const target = path.join(outputRoot, 'src/js', name + '.js');
  if (modular.has(name)) {
    await build({entryPoints: [source], outfile: target, bundle: true, format: 'iife', target: 'es2020', charset: 'utf8', legalComments: 'inline'});
  } else {
    const {outputText} = ts.transpileModule(await readFile(source, 'utf8'), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None}});
    await writeFile(target, outputText);
  }
}
if (all) {
  const target = path.join(outputRoot, 'gallery/research/assets/sleep-charts.js');
  await mkdir(path.dirname(target), {recursive: true});
  await build({entryPoints: [path.join(root, 'gallery/research/assets/sleep-charts.ts')], outfile: target, bundle: true, format: 'iife', target: 'es2020', charset: 'utf8', minify: true, legalComments: 'none'});
  // Cached essays and loaders still request these URLs. Serve the same bundle
  // directly so their existing script-load success/error handling keeps working.
  const runtime = await readFile(target);
  for (const legacy of ['sleep-2016-2026.js', 'sleep-2016-2026.en.js']) {
    await writeFile(path.join(path.dirname(target), legacy), runtime);
  }
}
