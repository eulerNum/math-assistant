/**
 * variant-trapezoid.mjs
 *
 * 좌표 기하 사다리꼴 문제 변형 생성기
 *
 * 원본 구조:
 *   직선 L1: y = (a/b)x + c  (y절편 c)
 *   직선 L2: y = dx           (원점 통과)
 *   A = L1의 y절편, B = L1∩L2
 *   사각형 OCAB가 사다리꼴, 넓이 = S
 *   C는 제3사분면, y좌표 > c
 *   → 모든 C의 y좌표의 곱 구하기
 *
 * Usage: node scripts/variant-trapezoid.mjs [count=5]
 */

// ── Fraction helpers (avoid floating point) ──

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

class Frac {
  constructor(num, den = 1) {
    if (den === 0) throw new Error('zero denominator');
    if (den < 0) { num = -num; den = -den; }
    const g = gcd(Math.abs(num), den);
    this.n = num / g;
    this.d = den / g;
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
  toString() {
    if (this.d === 1) return `${this.n}`;
    return `${this.n}/${this.d}`;
  }
  toLatex() {
    if (this.d === 1) return `${this.n}`;
    const sign = this.n < 0 ? '-' : '';
    return `${sign}\\frac{${Math.abs(this.n)}}{${this.d}}`;
  }
}

// ── Problem solver ──

function solve(params) {
  const { slopeL1, interceptL1, slopeL2, area } = params;

  // A = y-intercept of L1
  const A = { x: Frac.of(0), y: interceptL1 };
  const OA = interceptL1.abs();

  // B = intersection of L1 and L2
  // slopeL1 * x + interceptL1 = slopeL2 * x
  // (slopeL1 - slopeL2) * x = -interceptL1
  // x = -interceptL1 / (slopeL1 - slopeL2)
  const slopeDiff = slopeL1.sub(slopeL2);
  if (slopeDiff.n === 0) return null; // parallel, no intersection

  const Bx = interceptL1.neg().div(slopeDiff);
  const By = slopeL2.mul(Bx);
  const B = { x: Bx, y: By };

  // Triangle OAB area = (1/2) * OA * |Bx|
  const areaOAB = OA.mul(Bx.abs()).div(Frac.of(2));

  // Triangle OCA area = S - areaOAB
  const areaOCA = area.sub(areaOAB);
  if (areaOCA.val() <= 0) return null; // area too small

  // C's x-coordinate: areaOCA = (1/2) * OA * |Cx| → |Cx| = 2 * areaOCA / OA
  const absCx = areaOCA.mul(Frac.of(2)).div(OA);
  const Cx = absCx.neg(); // 3rd quadrant → negative x

  // Trapezoid OCAB: exactly two sides parallel
  // Possible parallel pairs: CA∥OB or CO∥AB

  const solutions = [];

  // Case (i): CA ∥ OB
  // slope of OB = By/Bx = slopeL2
  // slope of CA = (Cy - Ay) / (Cx - Ax) = (Cy - interceptL1) / (Cx - 0) = slopeL2
  // Cy = slopeL2 * Cx + interceptL1
  const Cy1 = slopeL2.mul(Cx).add(interceptL1);
  // Check: C must be in 3rd quadrant (x < 0, y < 0) and y > interceptL1
  if (Cx.val() < 0 && Cy1.val() < 0 && Cy1.val() > interceptL1.val()) {
    // Also verify CO is NOT parallel to AB (otherwise it's a parallelogram, not trapezoid)
    const slopeCO = Cy1.div(Cx); // slope of CO = Cy/Cx
    const slopeAB = By.sub(A.y).div(Bx.sub(A.x)); // slope of AB
    if (!slopeCO.eq(slopeAB)) {
      solutions.push({ x: Cx, y: Cy1, case: 'CA∥OB' });
    }
  }

  // Case (ii): CO ∥ AB
  // slope of AB = (By - Ay) / (Bx - 0) = (By - interceptL1) / Bx
  const slopeAB = By.sub(interceptL1).div(Bx);
  // slope of CO = Cy / Cx = slopeAB → Cy = slopeAB * Cx
  const Cy2 = slopeAB.mul(Cx);
  if (Cx.val() < 0 && Cy2.val() < 0 && Cy2.val() > interceptL1.val()) {
    const slopeCA = Cy2.sub(interceptL1).div(Cx);
    const slopeOB = slopeL2;
    if (!slopeCA.eq(slopeOB)) {
      solutions.push({ x: Cx, y: Cy2, case: 'CO∥AB' });
    }
  }

  if (solutions.length === 0) return null;

  // Product of y-coordinates
  let product = Frac.of(1);
  for (const s of solutions) {
    product = product.mul(s.y);
  }

  return {
    params,
    A, B, OA, areaOAB, areaOCA,
    Cx,
    solutions,
    product,
  };
}

// ── Variant generator ──

function generateVariants(count = 5) {
  const variants = [];

  // Parameter ranges for "nice" problems
  const slopes = [
    Frac.of(1, 3), Frac.of(1, 2), Frac.of(2, 3), Frac.of(3, 4),
    Frac.of(1), Frac.of(3, 2), Frac.of(2),
  ];
  const negSlopes = [
    Frac.of(-1, 3), Frac.of(-1, 2), Frac.of(-2, 3), Frac.of(-1),
    Frac.of(-3, 2), Frac.of(-2),
  ];
  const intercepts = [-3, -4, -5, -6, -7, -8].map(n => Frac.of(n));
  const areas = [
    Frac.of(9, 2), Frac.of(15, 2), Frac.of(25, 2), Frac.of(12),
    Frac.of(16), Frac.of(21, 2), Frac.of(18), Frac.of(10),
    Frac.of(27, 2), Frac.of(35, 2),
  ];

  let attempts = 0;
  while (variants.length < count && attempts < 2000) {
    attempts++;
    const slopeL1 = slopes[Math.floor(Math.random() * slopes.length)];
    const slopeL2 = negSlopes[Math.floor(Math.random() * negSlopes.length)];
    const interceptL1 = intercepts[Math.floor(Math.random() * intercepts.length)];
    const area = areas[Math.floor(Math.random() * areas.length)];

    // Skip if same as original
    if (slopeL1.eq(Frac.of(2, 3)) && slopeL2.eq(Frac.of(-1)) && interceptL1.eq(Frac.of(-5))) {
      continue;
    }

    const result = solve({ slopeL1, slopeL2, interceptL1, area });
    if (!result) continue;
    if (result.solutions.length < 2) continue; // want both cases for interesting problem

    // Check answer is reasonable fraction (training, not exam — fractions OK)
    const p = result.product;
    if (p.d > 12 || Math.abs(p.n) > 50) continue;

    // Check all intermediate values are reasonable
    const allNice = result.solutions.every(s =>
      s.y.d <= 6 && Math.abs(s.y.n) <= 20
    );
    if (!allNice) continue;

    // Deduplicate
    const key = `${slopeL1}|${slopeL2}|${interceptL1}|${area}`;
    if (variants.some(v => v.key === key)) continue;

    variants.push({ ...result, key });
  }

  return variants;
}

// ── Output formatter ──

function fmtFrac(f) {
  if (f.d === 1) return `${f.n}`;
  return `${f.n}/${f.d}`;
}

function fmtSlope(f) {
  if (f.n === 1 && f.d === 1) return '';
  if (f.n === -1 && f.d === 1) return '-';
  return fmtFrac(f);
}

function fmtLine(slope, intercept) {
  let s = `y = ${fmtSlope(slope)}x`;
  if (intercept && intercept.n !== 0) {
    s += intercept.val() > 0 ? ` + ${fmtFrac(intercept)}` : ` - ${fmtFrac(intercept.abs())}`;
  }
  return s;
}

function formatForReview(result, index) {
  const { params, B, solutions, product, areaOAB, areaOCA, Cx } = result;
  const { slopeL1, slopeL2, interceptL1, area } = params;

  let out = '';
  out += `━━━ 변형 ${index} ━━━\n`;
  out += `\n`;
  out += `【문제】\n`;
  out += `직선 ${fmtLine(slopeL1, interceptL1)}가 y축과 만나는 점을 A,\n`;
  out += `직선 ${fmtLine(slopeL2)}와 만나는 점을 B라 하자.\n`;
  out += `원점 O와 제3사분면에 있는 점 C에 대하여\n`;
  out += `사각형 OCAB가 사다리꼴이고 넓이가 ${fmtFrac(area)}일 때,\n`;
  out += `모든 점 C의 y좌표의 곱을 구하시오.\n`;
  out += `(단, 점 C의 y좌표는 ${fmtFrac(interceptL1)}보다 크다.)\n`;
  out += `\n`;
  out += `【정답】 ${fmtFrac(product)}\n`;
  out += `\n`;
  out += `【풀이 요약】\n`;
  out += `  A(0, ${fmtFrac(interceptL1)})  B(${fmtFrac(B.x)}, ${fmtFrac(B.y)})\n`;
  out += `  △OAB = ${fmtFrac(areaOAB)}  △OCA = ${fmtFrac(areaOCA)}\n`;
  out += `  C의 x좌표 = ${fmtFrac(Cx)}\n`;
  for (const s of solutions) {
    out += `  ${s.case}: C(${fmtFrac(s.x)}, ${fmtFrac(s.y)})  →  y = ${fmtFrac(s.y)}\n`;
  }
  out += `  곱: ${solutions.map(s => fmtFrac(s.y)).join(' × ')} = ${fmtFrac(product)}\n`;

  return out;
}

function formatProblem(result, index) {
  return formatForReview(result, index);
}

// ── Main ──

// First, verify the original problem
console.log('=== 원본 문제 검증 ===\n');
const original = solve({
  slopeL1: Frac.of(2, 3),
  slopeL2: Frac.of(-1),
  interceptL1: Frac.of(-5),
  area: Frac.of(25, 2),
});

if (original) {
  console.log(formatForReview(original, '원본'));
} else {
  console.log('원본 문제 풀이 실패!\n');
}

console.log('=== 변형 문제 생성 ===\n');
const count = parseInt(process.argv[2] || '5', 10);
const variants = generateVariants(count);

if (variants.length === 0) {
  console.log('조건에 맞는 변형을 찾지 못했습니다.');
} else {
  for (let i = 0; i < variants.length; i++) {
    console.log(formatProblem(variants[i], i + 1));
    console.log('---');
  }
  console.log(`\n총 ${variants.length}개 변형 생성 완료.`);
}
