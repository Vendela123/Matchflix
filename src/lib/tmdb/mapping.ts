// Pure TMDb response mapping/filtering — kept separate from movies.ts (which
// is "server-only" and makes network calls) so it's unit-testable without
// hitting TMDb or a server-only guard, mirroring src/lib/quiz/rules.ts.

export type MediaType = "movie" | "tv";

export type StreamingMovie = {
  tmdbId: number;
  title: string;
  genres: string[];
  runtimeMinutes: number;
  mediaType: MediaType;
  releaseYear: number;
  posterUrl: string | null;
  streamingPlatforms: string[];
};

// TMDb's watch-provider data is region-specific; MVP hardcodes a single
// region rather than deriving one per participant (see spec 003).
export const WATCH_REGION = "US";
const POSTER_BASE_URL = "https://image.tmdb.org/t/p/w342";

export type TmdbDetailsResponse = {
  id: number;
  title?: string;
  name?: string;
  genres: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  "watch/providers"?: {
    results?: Record<string, { flatrate?: { provider_name: string }[] }>;
  };
};

// A title missing metadata this integration's callers need (title, runtime,
// release year, genres) is filtered out rather than returned with null
// fields (see spec 003's Design decision).
export function mapDetailsToStreamingMovie(
  details: TmdbDetailsResponse,
  mediaType: MediaType,
): StreamingMovie | null {
  const title = details.title ?? details.name;
  const runtimeMinutes = mediaType === "movie" ? details.runtime : details.episode_run_time?.[0];
  const releaseDate = details.release_date ?? details.first_air_date;
  const releaseYear = releaseDate ? Number(releaseDate.slice(0, 4)) : undefined;

  if (!title || !runtimeMinutes || !releaseYear || details.genres.length === 0) {
    return null;
  }

  const streamingPlatforms =
    details["watch/providers"]?.results?.[WATCH_REGION]?.flatrate?.map((p) => p.provider_name) ?? [];

  return {
    tmdbId: details.id,
    title,
    genres: details.genres.map((g) => g.name),
    runtimeMinutes,
    mediaType,
    releaseYear,
    posterUrl: details.poster_path ? `${POSTER_BASE_URL}${details.poster_path}` : null,
    streamingPlatforms,
  };
}
