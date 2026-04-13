export interface Submission {
  is_correct: boolean;
  submitted_at: string; // ISO datetime
}

export interface MasteryResult {
  score: number;
  passed: boolean;
  totalSubmissions: number;
  recentCorrectCount: number;
}

const MAX_SUBMISSIONS = 20;
const DECAY = 0.85;
const PASS_SCORE_THRESHOLD = 0.8;
const RECENT_WINDOW = 3;
const RECENT_CORRECT_THRESHOLD = 2;

export function calculateMastery(submissions: Submission[]): MasteryResult {
  const totalSubmissions = submissions.length;

  if (totalSubmissions === 0) {
    return {
      score: 0,
      passed: false,
      totalSubmissions: 0,
      recentCorrectCount: 0,
    };
  }

  // Sort by submitted_at ascending (oldest first)
  const sorted = [...submissions].sort(
    (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
  );

  // Take only the most recent MAX_SUBMISSIONS
  const window = sorted.slice(-MAX_SUBMISSIONS);
  const n = window.length;

  // Weighted average: weight for index i = DECAY^(n-1-i)
  // i=0 is oldest → weight=DECAY^(n-1), i=n-1 is newest → weight=DECAY^0=1
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < n; i++) {
    const weight = Math.pow(DECAY, n - 1 - i);
    const correct = window[i].is_correct ? 1 : 0;
    weightedSum += weight * correct;
    totalWeight += weight;
  }

  const score = weightedSum / totalWeight;

  // Recent RECENT_WINDOW submissions (newest first from sorted)
  const recentWindow = sorted.slice(-RECENT_WINDOW);
  const recentCorrectCount = recentWindow.filter((s) => s.is_correct).length;
  const recentWindowSize = recentWindow.length;

  const passed =
    score >= PASS_SCORE_THRESHOLD &&
    recentCorrectCount >= Math.min(RECENT_CORRECT_THRESHOLD, recentWindowSize);

  return {
    score,
    passed,
    totalSubmissions,
    recentCorrectCount,
  };
}
