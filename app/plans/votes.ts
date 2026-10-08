export type Tally = { up: number; down: number; mine: 1 | -1 | null };

// Count a plan's votes and find the current user's own vote
export function tally(votes: { user_id: string; value: number }[], userId: string | undefined): Tally {
  return {
    up: votes.filter((vote) => vote.value === 1).length,
    down: votes.filter((vote) => vote.value === -1).length,
    mine: (votes.find((vote) => vote.user_id === userId)?.value as 1 | -1 | undefined) ?? null,
  };
}
