export type Card = {
  id: number;
  deck_id: number;
  headword: string;
  definition: string;
  pos: string;
  ipa: string;
  example: string;
  mnemonic?: string;
  etymology?: string;
  state: number; // 0:New, 1-4:Steps, 5:Mastered
  interval: number;
  due: string;
};

// The User's Specific Intervals: 2, 5, 10, 20
const LADDER = [0, 2, 5, 10, 20];

export function calculateNextReview(card: Card, rating: 'pass' | 'fail') {
  let newLevel = card.state;
  let newInterval = 0;
  const now = new Date();

  if (rating === 'pass') {
    // PROMOTION
    newLevel = Math.min(card.state + 1, 5);

    // If Mastered (5), set far future date (e.g., year 2099)
    if (newLevel >= 5) {
      newInterval = 36500; // Forever
    } else {
      // Map Level to Days (Level 1 -> Index 1 -> 2 days)
      // If currently 0, becomes 1 -> 2 days.
      newInterval = LADDER[Math.max(1, newLevel)] || 2;
    }

  } else {
    // DEMOTION (Soft Drop)
    // If at Level 4, drop to 3. If at 1, stay at 1.
    newLevel = Math.max(1, card.state - 1);
    // Note: The card remains in the session queue, so we don't set the due date here.
    // The due date is only set when the user finally Passes the card in the session.
    newInterval = LADDER[newLevel];
  }

  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + newInterval);

  return {
    state: newLevel,
    interval: newInterval,
    due: nextDueDate.toISOString()
  };
}
