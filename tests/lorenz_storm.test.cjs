// Re-derives every number of the Lorenz butterfly module (limits-of-problem-analysis §03)
// and checks the numbers quoted in the prose (<span data-lz="key">) of both language editions.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const DIR = path.join(__dirname, "..", "gallery", "talks", "limits-of-problem-analysis");

function model(LZ) {
  const DT = LZ.dt, f = (x, y, z) => [LZ.sigma * (y - x), x * (LZ.rho - z) - y, x * y - LZ.beta * z];
  const rk4 = s => { const [x, y, z] = s, h = DT, a = f(x, y, z), b = f(x + a[0] * h / 2, y + a[1] * h / 2, z + a[2] * h / 2), c = f(x + b[0] * h / 2, y + b[1] * h / 2, z + b[2] * h / 2), d = f(x + c[0] * h, y + c[1] * h, z + c[2] * h); return [x + h / 6 * (a[0] + 2 * b[0] + 2 * c[0] + d[0]), y + h / 6 * (a[1] + 2 * b[1] + 2 * c[1] + d[1]), z + h / 6 * (a[2] + 2 * b[2] + 2 * c[2] + d[2])]; };
  let s0 = [1, 1, 1]; for (let i = 0; i < LZ.spinup; i++) s0 = rk4(s0);
  let A = s0.slice(), B = s0.slice(), wa = 0, wb = 0; const gap = [0], k = DT / LZ.tau;
  for (let i = 0; i < LZ.steps; i++) { if (i === LZ.flapStep) A[0] += LZ.nudge; A = rk4(A); B = rk4(B); wa += (Math.tanh(A[0] / 6) - wa) * k; wb += (Math.tanh(B[0] / 6) - wb) * k; gap.push(Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2])); if (i < LZ.flapStep) assert.strictEqual(gap[i + 1], 0); }
  const eps = n => LZ.eps12 * Math.sqrt(12 / n), first = e => gap.findIndex(g => g > e) * DT;
  // largest Lyapunov exponent by Benettin renormalisation, as an independent check of LZ.lambda
  let p = s0.slice(), q = [s0[0] + 1e-8, s0[1], s0[2]], sum = 0; const M = 200000;
  for (let i = 0; i < M; i++) { p = rk4(p); q = rk4(q); const d = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]); sum += Math.log(d / 1e-8); q = p.map((v, j) => v + (q[j] - v) * 1e-8 / d); }
  const lam = sum / (M * DT), hz = n => Math.log(LZ.tol / eps(n)) / LZ.lambda;
  return { wa, wb, lam, lambda: LZ.lambda, d12: first(eps(12)), d600: first(eps(600)), d9000: first(eps(9000)), split: first(LZ.tol), h12: hz(12), h600: hz(600), h9000: hz(9000), gain: hz(9000) - hz(12), ratio: Math.sqrt(9000 / 12), invlam: 1 / LZ.lambda, dbl: Math.LN2 / LZ.lambda };
}
const FMT = { lambda: v => v.toFixed(3), ratio: v => Math.round(v).toString(), dbl: v => v.toFixed(2) };
for (const file of ["index.html", "index.en.html"]) {
  test(`Lorenz storm numbers: ${file}`, () => {
    const html = fs.readFileSync(path.join(DIR, file), "utf8");
    const LZ = JSON.parse(html.match(/const LZ = (\{.*?\});/)[1]);
    assert.deepStrictEqual([LZ.sigma, LZ.rho, LZ.beta], [10, 28, 8 / 3]);
    const m = model(LZ);
    assert.ok(Math.abs(m.lam - LZ.lambda) < 0.02, `lambda ${m.lam}`);
    assert.ok(m.wa < -0.5 && m.wb > 0.5, "world A ends south (city), world B north (sea)");
    assert.ok(m.d9000 < m.d600 && m.d600 < m.d12 && m.d12 < m.split, "detection order");
    const marks = [...html.matchAll(/data-lz="(\w+)">([^<]+)</g)];
    assert.ok(marks.length >= 6, "prose numbers are marked");
    for (const [, key, txt] of marks) {
      assert.ok(key in m, key);
      const want = (FMT[key] || (v => v.toFixed(1)))(m[key]);
      assert.strictEqual(txt.trim(), want, `${file}: ${key} says ${txt}, model gives ${want}`);
    }
    if (process.env.LZ_PRINT) console.log(file, JSON.stringify(m));
  });
}
