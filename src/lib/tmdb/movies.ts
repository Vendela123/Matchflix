import "server-only";
import { tmdbGet } from "./client";
import { genreIdsForNames } from "./genres";
import {
  WATCH_REGION,
  mapDetailsToStreamingMovie,
  type MediaType,
  type StreamingMovie,
  type TmdbDetailsResponse,
} from "./mapping";

export type { MediaType, StreamingMovie };

export type DiscoverFilters = {
  genres: string[];
  mediaType: MediaType;
  maxRuntimeMinutes?: number;
};

type DiscoverResponse = { results: { id: number }[] };

async function fetchTitleDetails(id: number, mediaType: MediaType): Promise<StreamingMovie | null> {
  const path = mediaType === "movie" ? `/movie/${id}` : `/tv/${id}`;
  // append_to_response combines the detail call and the watch-providers call
  // into one request per title.
  const details = await tmdbGet<TmdbDetailsResponse>(path, { append_to_response: "watch/providers" });
  if (!details) return null;
  return mapDetailsToStreamingMovie(details, mediaType);
}

// Returns movies/TV shows matching the given genres, media type, and maximum
// runtime. Never throws: a TMDb failure, a filter combination with no
// matches, or an empty genre list all resolve to an empty array (see spec
// 003's Design decision).
export async function discoverMovies(filters: DiscoverFilters): Promise<StreamingMovie[]> {
  const genreIds = genreIdsForNames(filters.genres);
  if (genreIds.length === 0) return [];

  const discoverPath = filters.mediaType === "movie" ? "/discover/movie" : "/discover/tv";
  const params: Record<string, string> = {
    with_genres: genreIds.join("|"),
    sort_by: "popularity.desc",
    watch_region: WATCH_REGION,
  };
  // TMDb's discover endpoint only supports runtime filtering for movies; TV
  // is filtered client-side below, after details are fetched.
  if (filters.maxRuntimeMinutes !== undefined && filters.mediaType === "movie") {
    params["with_runtime.lte"] = String(filters.maxRuntimeMinutes);
  }

  const discovered = await tmdbGet<DiscoverResponse>(discoverPath, params);
  if (!discovered) return [];

  const details = await Promise.all(
    discovered.results.map((result) => fetchTitleDetails(result.id, filters.mediaType)),
  );

  return details.filter(
    (movie): movie is StreamingMovie =>
      movie !== null &&
      (filters.maxRuntimeMinutes === undefined || movie.runtimeMinutes <= filters.maxRuntimeMinutes),
  );
}
