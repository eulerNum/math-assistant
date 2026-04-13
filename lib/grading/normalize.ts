export function normalizeAnswer(answer: string): string {
  return answer.trim().replace(/\s+/g, ' ').toLowerCase();
}
