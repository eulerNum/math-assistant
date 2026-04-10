/**
 * preview-variants.mjs
 *
 * 변형 문제를 KaTeX 렌더링된 HTML로 생성하여 브라우저에서 미리보기.
 * Usage: node scripts/preview-variants.mjs
 *   → public/preview-variants.html 생성 → 브라우저로 열기
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Fraction (variant-trapezoid.mjs에서 복사) ──

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

class Frac {
  constructor(num, den = 1) {
    if (den === 0) throw new Error('zero denominator');
    if (den < 0) { num = -num; den = -den; }
    const g = gcd(Math.abs(num), den);
    this.n = num / g; this.d = den / g;
  }
  static of(n, d = 1) { return new Frac(n, d); }
  add(o) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Frac(this.n * o.n, this.d * o.d); }
  div(o) { return new Frac(this.n * o.d, this.d * o.n); }
  neg() { return new Frac(-this.n, this.d); }
  abs() { return new Frac(Math.abs(this.n), this.d); }
  val() { return this.n / this.d; }
  eq(o) { return this.n === o.n && this.d === o.d; }
  isInt() { return this.d === 1; }
  toLatex() {
    if (this.d === 1) return `${this.n}`;
    const sign = this.n < 0 ? '-' : '';
    return `${sign}\\frac{${Math.abs(this.n)}}{${this.d}}`;
  }
}

// ── Solver (same logic) ──

function solve(params) {
  const { slopeL1, interceptL1, slopeL2, area } = params;
  const A = { x: Frac.of(0), y: interceptL1 };
  const OA = interceptL1.abs();
  const slopeDiff = slopeL1.sub(slopeL2);
  if (slopeDiff.n === 0) return null;
  const Bx = interceptL1.neg().div(slopeDiff);
  const By = slopeL2.mul(Bx);
  const B = { x: Bx, y: By };
  const areaOAB = OA.mul(Bx.abs()).div(Frac.of(2));
  const areaOCA = area.sub(areaOAB);
  if (areaOCA.val() <= 0) return null;
  const absCx = areaOCA.mul(Frac.of(2)).div(OA);
  const Cx = absCx.neg();
  const solutions = [];

  const Cy1 = slopeL2.mul(Cx).add(interceptL1);
  if (Cx.val() < 0 && Cy1.val() < 0 && Cy1.val() > interceptL1.val()) {
    const slopeCO = Cy1.div(Cx);
    const slopeAB = By.sub(A.y).div(Bx.sub(A.x));
    if (!slopeCO.eq(slopeAB)) solutions.push({ x: Cx, y: Cy1, case: 'CA∥OB' });
  }

  const slopeAB = By.sub(interceptL1).div(Bx);
  const Cy2 = slopeAB.mul(Cx);
  if (Cx.val() < 0 && Cy2.val() < 0 && Cy2.val() > interceptL1.val()) {
    const slopeCA = Cy2.sub(interceptL1).div(Cx);
    if (!slopeCA.eq(slopeL2)) solutions.push({ x: Cx, y: Cy2, case: 'CO∥AB' });
  }

  if (solutions.length === 0) return null;
  let product = Frac.of(1);
  for (const s of solutions) product = product.mul(s.y);

  return { params, A, B, OA, areaOAB, areaOCA, Cx, solutions, product };
}

// ── Generate variants ──

function generateVariants(count = 5) {
  const variants = [];
  const slopes = [Frac.of(1,3),Frac.of(1,2),Frac.of(2,3),Frac.of(3,4),Frac.of(1),Frac.of(3,2),Frac.of(2)];
  const negSlopes = [Frac.of(-1,3),Frac.of(-1,2),Frac.of(-2,3),Frac.of(-1),Frac.of(-3,2),Frac.of(-2)];
  const intercepts = [-3,-4,-5,-6,-7,-8].map(n => Frac.of(n));
  const areas = [Frac.of(9,2),Frac.of(15,2),Frac.of(25,2),Frac.of(12),Frac.of(16),Frac.of(21,2),Frac.of(18),Frac.of(10),Frac.of(27,2),Frac.of(35,2)];
  let attempts = 0;
  while (variants.length < count && attempts < 2000) {
    attempts++;
    const slopeL1 = slopes[Math.floor(Math.random() * slopes.length)];
    const slopeL2 = negSlopes[Math.floor(Math.random() * negSlopes.length)];
    const interceptL1 = intercepts[Math.floor(Math.random() * intercepts.length)];
    const area = areas[Math.floor(Math.random() * areas.length)];
    const result = solve({ slopeL1, slopeL2, interceptL1, area });
    if (!result || result.solutions.length < 2) continue;
    const p = result.product;
    if (p.d > 12 || Math.abs(p.n) > 50) continue;
    if (!result.solutions.every(s => s.y.d <= 6 && Math.abs(s.y.n) <= 20)) continue;
    const key = `${slopeL1}|${slopeL2}|${interceptL1}|${area}`;
    if (variants.some(v => v.key === key)) continue;
    variants.push({ ...result, key });
  }
  return variants;
}

// ── LaTeX formatting ──

function latexSlope(f) {
  if (f.n === 1 && f.d === 1) return '';
  if (f.n === -1 && f.d === 1) return '-';
  return f.toLatex();
}

function latexLine(slope, intercept) {
  let s = `y = ${latexSlope(slope)}x`;
  if (intercept && intercept.n !== 0) {
    s += intercept.val() > 0 ? ` + ${intercept.toLatex()}` : ` - ${intercept.abs().toLatex()}`;
  }
  return s;
}

function problemToHtml(result, index, showAnswer) {
  const { params, B, solutions, product, areaOAB, areaOCA, Cx } = result;
  const { slopeL1, slopeL2, interceptL1, area } = params;

  const l1 = latexLine(slopeL1, interceptL1);
  const l2 = latexLine(slopeL2);

  let html = `<div class="problem-card">`;
  html += `<span class="problem-number">${index}</span>`;
  html += `<div class="problem-text">`;
  html += `직선 \\(${l1}\\)가 \\(y\\)축과 만나는 점을 A, `;
  html += `직선 \\(${l2}\\)와 만나는 점을 B라 하자. `;
  html += `원점 O와 제3사분면에 있는 점 C에 대하여 `;
  html += `사각형 OCAB가 사다리꼴이고 넓이가 \\(${area.toLatex()}\\)일 때, `;
  html += `모든 점 C의 \\(y\\)좌표의 곱을 구하시오.`;
  html += `<br><span class="constraint">(단, 점 C의 \\(y\\)좌표는 \\(${interceptL1.toLatex()}\\)보다 크다.)</span>`;
  html += `</div>`;

  if (showAnswer) {
    html += `<details class="answer-section"><summary>정답 및 풀이 보기</summary>`;
    html += `<div class="answer-box">`;
    html += `<div class="answer-value">정답: \\(${product.toLatex()}\\)</div>`;
    html += `<div class="solution-steps">`;
    html += `<p>\\(A(0,\\; ${interceptL1.toLatex()})\\), \\(B(${B.x.toLatex()},\\; ${B.y.toLatex()})\\)</p>`;
    html += `<p>\\(\\triangle OAB = ${areaOAB.toLatex()}\\), \\(\\triangle OCA = ${areaOCA.toLatex()}\\)</p>`;
    html += `<p>C의 \\(x\\)좌표 \\(= ${Cx.toLatex()}\\)</p>`;
    for (const s of solutions) {
      html += `<p>${s.case}: \\(C(${s.x.toLatex()},\\; ${s.y.toLatex()})\\)</p>`;
    }
    html += `<p>\\(${solutions.map(s => `(${s.y.toLatex()})`).join(' \\times ')} = ${product.toLatex()}\\)</p>`;
    html += `</div></div></details>`;
  }

  html += `</div>`;
  return html;
}

// ── HTML template ──

function buildHtml(variants) {
  const original = solve({
    slopeL1: Frac.of(2, 3), slopeL2: Frac.of(-1),
    interceptL1: Frac.of(-5), area: Frac.of(25, 2),
  });

  let problemsHtml = '';
  problemsHtml += `<h2 class="section-title">원본 문제</h2>`;
  problemsHtml += problemToHtml(original, '원본', true);
  problemsHtml += `<h2 class="section-title">변형 문제</h2>`;
  for (let i = 0; i < variants.length; i++) {
    problemsHtml += problemToHtml(variants[i], i + 1, true);
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>문제 미리보기 — 좌표 기하 사다리꼴</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"
  onload="renderMathInElement(document.body, {delimiters:[{left:'\\\\(',right:'\\\\)',display:false},{left:'\\\\[',right:'\\\\]',display:true}]})"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    background: #f8f9fa;
    color: #1a1a1a;
    line-height: 1.7;
    padding: 2rem 1rem;
    max-width: 720px;
    margin: 0 auto;
  }
  h1 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
  }
  .subtitle {
    font-size: 0.85rem;
    color: #888;
    margin-bottom: 2rem;
  }
  .section-title {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #999;
    margin: 2.5rem 0 1rem;
  }
  .problem-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.5rem 1.5rem 1.25rem;
    margin-bottom: 1rem;
    transition: box-shadow 0.15s;
  }
  .problem-card:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .problem-number {
    display: inline-block;
    background: #f1f3f5;
    border-radius: 6px;
    padding: 0.15rem 0.6rem;
    font-weight: 700;
    font-size: 0.8rem;
    color: #495057;
    margin-bottom: 0.75rem;
  }
  .problem-text {
    font-size: 0.95rem;
    line-height: 1.85;
    word-break: keep-all;
    overflow-wrap: break-word;
  }
  .constraint {
    color: #868e96;
    font-size: 0.85rem;
  }
  .answer-section {
    margin-top: 1rem;
    width: 100%;
  }
  .answer-section summary {
    cursor: pointer;
    font-size: 0.8rem;
    color: #5c7cfa;
    font-weight: 500;
    user-select: none;
  }
  .answer-section summary:hover {
    color: #3b5bdb;
  }
  .answer-box {
    margin-top: 0.75rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e9ecef;
  }
  .answer-value {
    font-weight: 700;
    font-size: 1.1rem;
    color: #2b8a3e;
    margin-bottom: 0.75rem;
  }
  .solution-steps p {
    font-size: 0.85rem;
    color: #555;
    margin-bottom: 0.3rem;
  }
  @media (max-width: 600px) {
    body { padding: 1rem 0.75rem; }
    .problem-card { padding: 1rem; flex-direction: column; gap: 0.5rem; }
    .problem-number { width: 2rem; height: 2rem; font-size: 0.8rem; }
  }
</style>
</head>
<body>
<h1>좌표 기하 — 사다리꼴 넓이</h1>
<p class="subtitle">주관식 · 훈련용 변형 문제</p>
${problemsHtml}
</body>
</html>`;
}

// ── Main ──

const variants = generateVariants(5);
const html = buildHtml(variants);
const outPath = resolve(__dirname, '..', 'public', 'preview-variants.html');
writeFileSync(outPath, html, 'utf8');
console.log(`✓ ${outPath}`);
console.log(`  브라우저에서 열기: http://localhost:3000/preview-variants.html`);
console.log(`  또는 파일 직접 열기: ${outPath}`);
