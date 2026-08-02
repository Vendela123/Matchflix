// TMDb's standard movie genre ids, keyed by the exact genre names already
// hardcoded in the quiz (src/lib/quiz/questions.ts's GENRE_OPTIONS) — that
// list is TMDb's own standard movie genre list, so this is a direct mapping,
// not a second vocabulary. Hardcoded rather than fetched: this is TMDb's
// stable reference data, not something that changes per request.
export const TMDB_GENRE_ID_BY_NAME: Record<string, number> = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  "Science Fiction": 878,
  "TV Movie": 10770,
  Thriller: 53,
  War: 10752,
  Western: 37,
};

export function genreIdsForNames(names: string[]): number[] {
  return names
    .map((name) => TMDB_GENRE_ID_BY_NAME[name])
    .filter((id): id is number => id !== undefined);
}
