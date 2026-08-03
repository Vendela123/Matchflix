// Pure, deterministic scoring/ranking of TMDb candidates against a session's
// combined quiz answers — no I/O, no randomness, no "server-only" guard, so
// it's directly testable (mirrors src/lib/quiz/rules.ts).

import type { QuizAnswers } from "@/lib/quiz/questions";
import type { MediaType, StreamingMovie } from "@/lib/tmdb/movies";

// TMDb has no "mood" field, so mood is scored via a fixed association with
// genres it already has (see spec 004's Design decision).
const MOOD_GENRES: Record<string, string[]> = {
  funny: ["Comedy"],
  exciting: ["Action", "Adventure", "Thriller"],
  emotional: ["Drama", "Romance"],
  scary: ["Horror", "Thriller"],
  feel_good: ["Comedy", "Family", "Animation"],
  thought_provoking: ["Documentary", "Mystery", "Drama"],
};

const RUNTIME_BUCKET_MAX_MINUTES: Record<string, number | undefined> = {
  under_90: 90,
  under_120: 120,
  under_150: 150,
  no_limit: undefined,
};

// A candidate counts as a "new" release if it's within this many years of
// `currentYear` — a fixed, documented threshold, not anything TMDb defines.
const NEW_RELEASE_WINDOW_YEARS = 3;

export const TOP_MATCHES_LIMIT = 3;

// Whichever mediaType the majority of participants chose; ties favor "movie".
export function resolveMediaType(answers: QuizAnswers[]): MediaType {
  const tvCount = answers.filter((answer) => answer.mediaType === "tv").length;
  return tvCount > answers.length / 2 ? "tv" : "movie";
}

// The most restrictive (smallest) runtime cap across participants;
// `undefined` (no cap) only if every participant chose "no_limit".
export function resolveMaxRuntimeMinutes(answers: QuizAnswers[]): number | undefined {
  const caps = answers
    .map((answer) => RUNTIME_BUCKET_MAX_MINUTES[answer.runtimeBucket])
    .filter((minutes): minutes is number => minutes !== undefined);
  return caps.length > 0 ? Math.min(...caps) : undefined;
}

// Union of every participant's preferred genres — the broad net passed to
// discoverMovies; precise per-participant overlap is scored afterward.
export function resolvePreferredGenrePool(answers: QuizAnswers[]): string[] {
  return [...new Set(answers.flatMap((answer) => answer.preferredGenres))];
}

// Union of every participant's avoided genres — a candidate containing any of
// these is excluded entirely, not merely down-ranked.
export function resolveAvoidedGenres(answers: QuizAnswers[]): Set<string> {
  return new Set(answers.flatMap((answer) => answer.avoidedGenres));
}

function scoreForParticipant(candidate: StreamingMovie, answer: QuizAnswers, currentYear: number): number {
  const wantedGenres = new Set([...answer.preferredGenres, ...(MOOD_GENRES[answer.mood] ?? [])]);
  let score = candidate.genres.filter((genre) => wantedGenres.has(genre)).length;

  if (answer.releasePreference !== "no_preference") {
    const isNewRelease = candidate.releaseYear >= currentYear - NEW_RELEASE_WINDOW_YEARS;
    const wantsNewRelease = answer.releasePreference === "new";
    if (isNewRelease === wantsNewRelease) score += 1;
  }

  return score;
}

// The best this candidate could possibly have scored for this participant —
// every one of its genres landing in the wanted set, plus the release-year
// bonus if that dimension is even in play. Used only to turn the raw score
// into a display percentage; ranking itself still sorts on the raw score.
function maxScoreForParticipant(candidate: StreamingMovie, answer: QuizAnswers): number {
  const wantedGenres = new Set([...answer.preferredGenres, ...(MOOD_GENRES[answer.mood] ?? [])]);
  const genreCap = Math.min(candidate.genres.length, wantedGenres.size);
  const releaseCap = answer.releasePreference === "no_preference" ? 0 : 1;
  return genreCap + releaseCap;
}

export type RankedMatch = { movie: StreamingMovie; scorePercent: number };

// Ranks candidates best-to-worst for the group. Deterministic: the same
// candidates + answers + currentYear always produce the same order.
// `currentYear` is a parameter rather than read from the clock internally,
// mirroring isSessionExpired's `now` parameter, so this stays pure/testable.
export function rankCandidates(
  candidates: StreamingMovie[],
  answers: QuizAnswers[],
  currentYear: number,
): RankedMatch[] {
  const avoidedGenres = resolveAvoidedGenres(answers);
  const eligible = candidates.filter(
    (candidate) => !candidate.genres.some((genre) => avoidedGenres.has(genre)),
  );

  return eligible
    .map((candidate) => {
      const score = answers.reduce(
        (total, answer) => total + scoreForParticipant(candidate, answer, currentYear),
        0,
      );
      const maxScore = answers.reduce(
        (total, answer) => total + maxScoreForParticipant(candidate, answer),
        0,
      );
      return { movie: candidate, score, scorePercent: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0 };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ movie, scorePercent }) => ({ movie, scorePercent }));
}

export function topMatches(
  candidates: StreamingMovie[],
  answers: QuizAnswers[],
  currentYear: number,
): RankedMatch[] {
  return rankCandidates(candidates, answers, currentYear).slice(0, TOP_MATCHES_LIMIT);
}
