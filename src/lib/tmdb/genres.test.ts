import { describe, expect, it } from "vitest";
import { QUIZ_QUESTIONS } from "@/lib/quiz/questions";
import { TMDB_GENRE_ID_BY_NAME, genreIdsForNames } from "./genres";

const quizGenreNames = QUIZ_QUESTIONS.find((q) => q.id === "preferredGenres")!.options.map(
  (option) => option.value,
);

describe("TMDB_GENRE_ID_BY_NAME", () => {
  it("has a real TMDb id for every quiz genre, so the two lists never drift apart", () => {
    for (const name of quizGenreNames) {
      expect(TMDB_GENRE_ID_BY_NAME[name]).toBeTypeOf("number");
    }
  });
});

describe("genreIdsForNames", () => {
  it("maps known genre names to their TMDb ids", () => {
    expect(genreIdsForNames(["Comedy", "Horror"])).toEqual([35, 27]);
  });

  it("drops names with no known mapping instead of throwing", () => {
    expect(genreIdsForNames(["Comedy", "Not A Genre"])).toEqual([35]);
  });

  it("returns an empty array for no input", () => {
    expect(genreIdsForNames([])).toEqual([]);
  });
});
