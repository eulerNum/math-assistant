import { normalizeAnswer } from './normalize';

export function checkAnswer(studentAnswer: string, correctAnswer: string): boolean {
  return normalizeAnswer(studentAnswer) === normalizeAnswer(correctAnswer);
}
