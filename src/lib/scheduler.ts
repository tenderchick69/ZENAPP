// src/lib/scheduler.ts
export const LADDER = [1, 1.2, 3, 12, 30]; // days

export function nextDue(times_correct: number): number {
  if (times_correct >= 5) return Number.MAX_SAFE_INTEGER;
  const days = LADDER[Math.min(times_correct, LADDER.length - 1)];
  return Date.now() + days * 24 * 60 * 60 * 1000;
}
