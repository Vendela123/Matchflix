// Core Objects — named here so they exist somewhere before a spec models them.
// Not persisted, not wired to any screen. See docs/VISION.md and specs/README.md.

export type User = {
  nickname: string;
};

export type Movie = {
  genres: string[];
  runtime: number;
  ageRating: string;
  mood: string;
  streamingPlatforms: string[];
  releaseYear: number;
  description: string;
};

export type QuizResponse = {
  genres: string[];
  mood: string;
  runtimeTolerance: number;
  language: string;
};

export type MatchSession = {
  users: User[];
};

export type Recommendation = {
  movies: Movie[];
};
