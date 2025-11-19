// The Syndicate Learning Algorithm
export type Card = {
  id: number;
  deck_id: number;
  headword: string;
  definition: string;
  pos: string;
  ipa: string;
  example: string;
  state: number; // 0:New, 1:Learning, 2:Review, 3:Mastered
  interval: number;
  due: string;
};

export function calculateNextReview(card: Card, rating: 'fail' | 'pass'): Partial<Card> {
  const now = new Date();

  if (rating === 'fail') {
    // PUNISHMENT: Reset progress, queue for 10 minutes later
    return {
      state: 1,
      interval: 0,
      due: new Date(now.getTime() + 10 * 60000).toISOString() // +10 mins
    };
  }

  // REWARD: The Ladder (1 -> 3 -> 12 -> 30)
  let newInterval = 1;
  let newState = card.state;

  if (card.state === 0) newInterval = 1;       // New -> 1 day
  else if (card.interval === 0) newInterval = 1;
  else if (card.interval === 1) newInterval = 3; // 1 -> 3 days
  else if (card.interval === 3) newInterval = 12;
  else if (card.interval === 12) newInterval = 30;
  else newInterval = card.interval * 2.5; // After 30, just multiply

  // If interval > 30, mark Mastered
  if (newInterval >= 30) newState = 3;
  else newState = 2;

  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + newInterval);

  return {
    state: newState,
    interval: newInterval,
    due: nextDueDate.toISOString()
  };
}
