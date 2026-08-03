// Fun trivia shown on the waiting-room screen while the group finishes the
// quiz — purely decorative, not part of matching/scoring, so no determinism
// requirement applies. One is picked per session via a stable hash of the
// session id (see quiz-flow.tsx), so everyone in a session sees the same
// fact and it doesn't flicker between server and client renders.
export const MOVIE_FACTS: string[] = [
  "The average person spends 2.7 years of their life watching movies. Make it a great one!",
  "The first movie ever made was just 2.11 seconds long — 'Roundhay Garden Scene' (1888).",
  "The Lumière brothers' first public film screening in 1895 reportedly made audience members flee the theater.",
  "Popcorn sales make up a huge share of movie theater profit — some cinemas earn more from snacks than tickets.",
  "The word 'blockbuster' comes from bombs powerful enough to level an entire city block.",
];

export function pickMovieFact(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % MOVIE_FACTS.length;
  return MOVIE_FACTS[index];
}
