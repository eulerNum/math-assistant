import { describe, it, expect } from 'vitest';
import { calculateMastery } from '../calculate';

function makeSubmission(is_correct: boolean, submitted_at: string) {
  return { is_correct, submitted_at };
}

describe('calculateMastery', () => {
  it('빈 배열 → score=0, passed=false, recentCorrectCount=0', () => {
    const result = calculateMastery([]);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.totalSubmissions).toBe(0);
    expect(result.recentCorrectCount).toBe(0);
  });

  it('정답 1개 → score=1.0, passed=true', () => {
    const result = calculateMastery([
      makeSubmission(true, '2024-01-01T00:00:00Z'),
    ]);
    expect(result.score).toBeCloseTo(1.0);
    expect(result.passed).toBe(true);
    expect(result.recentCorrectCount).toBe(1);
  });

  it('오답 1개 → score=0, passed=false', () => {
    const result = calculateMastery([
      makeSubmission(false, '2024-01-01T00:00:00Z'),
    ]);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.recentCorrectCount).toBe(0);
  });

  it('20개 전부 정답 → score=1.0, passed=true', () => {
    const submissions = Array.from({ length: 20 }, (_, i) =>
      makeSubmission(true, `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`)
    );
    const result = calculateMastery(submissions);
    expect(result.score).toBeCloseTo(1.0);
    expect(result.passed).toBe(true);
    expect(result.totalSubmissions).toBe(20);
    expect(result.recentCorrectCount).toBe(3);
  });

  it('20개 전부 오답 → score=0, passed=false', () => {
    const submissions = Array.from({ length: 20 }, (_, i) =>
      makeSubmission(false, `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`)
    );
    const result = calculateMastery(submissions);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.recentCorrectCount).toBe(0);
  });

  it('최근 2개 정답 + 나머지 오답 → score < 0.8, passed=false', () => {
    // 18개 오답 + 최근 2개 정답 → recentCorrectCount=2 이지만 score 미충족
    const submissions = [
      ...Array.from({ length: 18 }, (_, i) =>
        makeSubmission(false, `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`)
      ),
      makeSubmission(true, '2024-01-19T00:00:00Z'),
      makeSubmission(true, '2024-01-20T00:00:00Z'),
    ];
    const result = calculateMastery(submissions);
    expect(result.score).toBeLessThan(0.8);
    expect(result.passed).toBe(false);
    expect(result.recentCorrectCount).toBe(2);
  });

  it('recentCorrectCount=1 → passed=false (연속성 조건 불충족)', () => {
    // 3개 제출: 오답, 오답, 정답 → recentCorrectCount=1 < 2 → passed=false
    const submissions = [
      makeSubmission(false, '2024-01-01T00:00:00Z'),
      makeSubmission(false, '2024-01-02T00:00:00Z'),
      makeSubmission(true, '2024-01-03T00:00:00Z'),
    ];
    const result = calculateMastery(submissions);
    expect(result.recentCorrectCount).toBe(1);
    expect(result.passed).toBe(false);
  });

  it('18개 정답 + 최근 2개 오답 → recentCorrectCount=1, passed=false', () => {
    // 18개 정답(index 0~17) + 오답(index 18) + 오답(index 19)
    // 최근 3개: 17(정), 18(오), 19(오) → recentCorrectCount=1
    const submissions = [
      ...Array.from({ length: 18 }, (_, i) =>
        makeSubmission(true, `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`)
      ),
      makeSubmission(false, '2024-01-19T00:00:00Z'),
      makeSubmission(false, '2024-01-20T00:00:00Z'),
    ];
    const result = calculateMastery(submissions);
    expect(result.recentCorrectCount).toBe(1);
    expect(result.passed).toBe(false);
  });

  it('25개 제출 → 최신 20개만 사용, totalSubmissions=25', () => {
    // 처음 5개는 오래된 정답 (제외), 이후 20개는 오답
    const submissions = [
      ...Array.from({ length: 5 }, (_, i) =>
        makeSubmission(true, `2023-12-${String(i + 1).padStart(2, '0')}T00:00:00Z`)
      ),
      ...Array.from({ length: 20 }, (_, i) =>
        makeSubmission(false, `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`)
      ),
    ];
    const result = calculateMastery(submissions);
    expect(result.totalSubmissions).toBe(25);
    // 최신 20개가 전부 오답 → score=0
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('정렬되지 않은 입력 → 시간순 정렬 후 올바른 결과', () => {
    // 섞인 순서: 최신(정), 가장 오래된(오), 중간(오)
    const submissions = [
      makeSubmission(true, '2024-01-03T00:00:00Z'),
      makeSubmission(false, '2024-01-01T00:00:00Z'),
      makeSubmission(false, '2024-01-02T00:00:00Z'),
    ];
    const result = calculateMastery(submissions);
    // 정렬 후: 01(오), 02(오), 03(정) → recentCorrectCount=1
    expect(result.recentCorrectCount).toBe(1);
    expect(result.totalSubmissions).toBe(3);
  });

  it('score >= 0.8 AND recentCorrectCount >= 2 → passed=true', () => {
    // 충분히 많은 정답 + 최근 3개 중 2개 이상 정답
    // 20개 전부 정답이면 score=1.0, recent=3 → passed=true
    const submissions = Array.from({ length: 20 }, (_, i) =>
      makeSubmission(true, `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`)
    );
    const result = calculateMastery(submissions);
    expect(result.score).toBeGreaterThanOrEqual(0.8);
    expect(result.recentCorrectCount).toBeGreaterThanOrEqual(2);
    expect(result.passed).toBe(true);
  });

  it('2개 제출 모두 정답 → passed=true (recent 2/2 충족)', () => {
    const submissions = [
      makeSubmission(true, '2024-01-01T00:00:00Z'),
      makeSubmission(true, '2024-01-02T00:00:00Z'),
    ];
    const result = calculateMastery(submissions);
    expect(result.score).toBeCloseTo(1.0);
    expect(result.recentCorrectCount).toBe(2);
    expect(result.passed).toBe(true);
  });

  it('가중평균 계산 정확성 검증', () => {
    // n=2: 오답(가중치 0.85^1), 정답(가중치 0.85^0=1.0)
    // score = (0 * 0.85 + 1 * 1.0) / (0.85 + 1.0) = 1.0 / 1.85 ≈ 0.5405
    const submissions = [
      makeSubmission(false, '2024-01-01T00:00:00Z'),
      makeSubmission(true, '2024-01-02T00:00:00Z'),
    ];
    const result = calculateMastery(submissions);
    expect(result.score).toBeCloseTo(1.0 / 1.85, 4);
  });
});
