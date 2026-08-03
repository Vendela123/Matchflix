import { describe, expect, it } from "vitest";
import type { QuizAnswers } from "@/lib/quiz/questions";
import type { StreamingMovie } from "@/lib/tmdb/movies";
import {
  rankCandidates,
  resolveAvoidedGenres,
  resolveMaxRuntimeMinutes,
  resolveMediaType,
  resolvePreferredGenrePool,
  topMatches,
} from "./scoring";

const CURRENT_YEAR = 2026;

function answer(overrides: Partial<QuizAnswers> = {}): QuizAnswers {
  return {
    preferredGenres: [],
    avoidedGenres: [],
    mood: "funny",
    runtimeBucket: "no_limit",
    mediaType: "movie",
    releasePreference: "no_preference",
    ...overrides,
  };
}

function movie(overrides: Partial<StreamingMovie> = {}): StreamingMovie {
  return {
    tmdbId: 1,
    title: "Example",
    genres: [],
    runtimeMinutes: 100,
    mediaType: "movie",
    releaseYear: CURRENT_YEAR,
    posterUrl: null,
    streamingPlatforms: [],
    ...overrides,
  };
}

describe("resolveMediaType", () => {
  it("picks the majority mediaType", () => {
    expect(resolveMediaType([answer({ mediaType: "tv" }), answer({ mediaType: "tv" }), answer()])).toBe(
      "tv",
    );
  });

  it("breaks a tie toward movie", () => {
    expect(resolveMediaType([answer({ mediaType: "tv" }), answer({ mediaType: "movie" })])).toBe(
      "movie",
    );
  });
});

describe("resolveMaxRuntimeMinutes", () => {
  it("is the most restrictive (smallest) cap across participants", () => {
    expect(
      resolveMaxRuntimeMinutes([
        answer({ runtimeBucket: "under_150" }),
        answer({ runtimeBucket: "under_90" }),
        answer({ runtimeBucket: "no_limit" }),
      ]),
    ).toBe(90);
  });

  it("is undefined only when every participant chose no_limit", () => {
    expect(resolveMaxRuntimeMinutes([answer(), answer()])).toBeUndefined();
  });
});

describe("resolvePreferredGenrePool / resolveAvoidedGenres", () => {
  it("union preferred genres across participants", () => {
    expect(
      resolvePreferredGenrePool([
        answer({ preferredGenres: ["Comedy", "Drama"] }),
        answer({ preferredGenres: ["Drama", "Horror"] }),
      ]),
    ).toEqual(["Comedy", "Drama", "Horror"]);
  });

  it("union avoided genres across participants", () => {
    expect(
      resolveAvoidedGenres([answer({ avoidedGenres: ["Horror"] }), answer({ avoidedGenres: ["War"] })]),
    ).toEqual(new Set(["Horror", "War"]));
  });
});

describe("rankCandidates", () => {
  it("excludes a candidate containing any participant's avoided genre entirely", () => {
    const candidates = [movie({ tmdbId: 1, genres: ["Horror"] }), movie({ tmdbId: 2, genres: ["Comedy"] })];
    const answers = [answer({ avoidedGenres: ["Horror"] })];

    const ranked = rankCandidates(candidates, answers, CURRENT_YEAR);

    expect(ranked.map(({ movie }) => movie.tmdbId)).toEqual([2]);
  });

  it("ranks a movie matching more participants' preferred genres above one matching fewer", () => {
    const candidates = [
      movie({ tmdbId: 1, genres: ["Comedy"] }),
      movie({ tmdbId: 2, genres: ["Horror"] }),
    ];
    const answers = [answer({ preferredGenres: ["Comedy"] }), answer({ preferredGenres: ["Comedy"] })];

    const ranked = rankCandidates(candidates, answers, CURRENT_YEAR);

    expect(ranked[0].movie.tmdbId).toBe(1);
  });

  it("scores a mood-mapped genre the same as a directly preferred genre", () => {
    const candidates = [
      movie({ tmdbId: 1, genres: ["Horror"] }),
      movie({ tmdbId: 2, genres: ["Documentary"] }),
    ];
    const answers = [answer({ mood: "scary", preferredGenres: [] })];

    const ranked = rankCandidates(candidates, answers, CURRENT_YEAR);

    expect(ranked[0].movie.tmdbId).toBe(1);
  });

  it("scores release preference using the given currentYear, not the real clock", () => {
    const recent = movie({ tmdbId: 1, releaseYear: 2025 });
    const old = movie({ tmdbId: 2, releaseYear: 1990 });
    const answers = [answer({ releasePreference: "new" })];

    const ranked = rankCandidates([old, recent], answers, CURRENT_YEAR);

    expect(ranked[0].movie.tmdbId).toBe(1);
  });

  it("is deterministic: identical inputs produce identical output", () => {
    const candidates = [
      movie({ tmdbId: 1, genres: ["Comedy"] }),
      movie({ tmdbId: 2, genres: ["Drama"] }),
      movie({ tmdbId: 3, genres: ["Horror"] }),
    ];
    const answers = [answer({ preferredGenres: ["Drama"] }), answer({ preferredGenres: ["Comedy"] })];

    const first = rankCandidates(candidates, answers, CURRENT_YEAR).map(({ movie }) => movie.tmdbId);
    const second = rankCandidates(candidates, answers, CURRENT_YEAR).map(({ movie }) => movie.tmdbId);

    expect(first).toEqual(second);
  });

  it("gives a perfect-match candidate a 100% score", () => {
    const candidates = [movie({ tmdbId: 1, genres: ["Comedy"] })];
    const answers = [answer({ preferredGenres: ["Comedy"] })];

    expect(rankCandidates(candidates, answers, CURRENT_YEAR)[0].scorePercent).toBe(100);
  });

  it("gives a partial-match candidate a percentage below 100", () => {
    // Genre overlap succeeds (Comedy) but the release-year bonus doesn't
    // (participant wants "new", candidate is from 1990) — a real partial hit.
    const candidates = [movie({ tmdbId: 1, genres: ["Comedy", "Drama"], releaseYear: 1990 })];
    const answers = [answer({ preferredGenres: ["Comedy"], releasePreference: "new" })];

    const result = rankCandidates(candidates, answers, CURRENT_YEAR)[0];
    expect(result.scorePercent).toBe(50);
  });

  it("returns an empty array when every candidate is excluded", () => {
    const candidates = [movie({ genres: ["Horror"] })];
    const answers = [answer({ avoidedGenres: ["Horror"] })];

    expect(rankCandidates(candidates, answers, CURRENT_YEAR)).toEqual([]);
  });
});

describe("topMatches", () => {
  it("returns at most TOP_MATCHES_LIMIT candidates", () => {
    const candidates = [1, 2, 3, 4, 5].map((id) => movie({ tmdbId: id }));
    expect(topMatches(candidates, [answer()], CURRENT_YEAR)).toHaveLength(3);
  });

  it("returns fewer than the limit if fewer candidates survive filtering", () => {
    const candidates = [movie({ tmdbId: 1, genres: ["Comedy"] }), movie({ tmdbId: 2, genres: ["Horror"] })];
    const answers = [answer({ avoidedGenres: ["Horror"] })];

    expect(topMatches(candidates, answers, CURRENT_YEAR)).toHaveLength(1);
  });

  it("returns an empty array for no candidates", () => {
    expect(topMatches([], [answer()], CURRENT_YEAR)).toEqual([]);
  });
});
