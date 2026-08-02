import { describe, expect, it } from "vitest";
import { mapDetailsToStreamingMovie } from "./mapping";

describe("mapDetailsToStreamingMovie", () => {
  it("maps a full movie response, including watch providers for the US region", () => {
    const result = mapDetailsToStreamingMovie(
      {
        id: 1,
        title: "Example Movie",
        genres: [{ id: 35, name: "Comedy" }],
        runtime: 95,
        release_date: "2024-06-15",
        poster_path: "/poster.jpg",
        "watch/providers": {
          results: {
            US: { flatrate: [{ provider_name: "Netflix" }, { provider_name: "Max" }] },
            SE: { flatrate: [{ provider_name: "Viaplay" }] },
          },
        },
      },
      "movie",
    );

    expect(result).toEqual({
      tmdbId: 1,
      title: "Example Movie",
      genres: ["Comedy"],
      runtimeMinutes: 95,
      mediaType: "movie",
      releaseYear: 2024,
      posterUrl: "https://image.tmdb.org/t/p/w342/poster.jpg",
      streamingPlatforms: ["Netflix", "Max"],
    });
  });

  it("maps a TV response using name/first_air_date/episode_run_time", () => {
    const result = mapDetailsToStreamingMovie(
      {
        id: 2,
        name: "Example Show",
        genres: [{ id: 18, name: "Drama" }],
        episode_run_time: [45],
        first_air_date: "2019-01-01",
        poster_path: null,
      },
      "tv",
    );

    expect(result).toMatchObject({ title: "Example Show", runtimeMinutes: 45, releaseYear: 2019 });
    expect(result?.posterUrl).toBeNull();
  });

  it("returns an empty streaming-platforms list when no US flatrate provider exists", () => {
    const result = mapDetailsToStreamingMovie(
      {
        id: 3,
        title: "No Streams",
        genres: [{ id: 18, name: "Drama" }],
        runtime: 100,
        release_date: "2020-01-01",
        poster_path: null,
      },
      "movie",
    );

    expect(result?.streamingPlatforms).toEqual([]);
  });

  it("filters out a title missing runtime instead of returning it with a null runtime", () => {
    const result = mapDetailsToStreamingMovie(
      {
        id: 4,
        title: "Missing Runtime",
        genres: [{ id: 18, name: "Drama" }],
        release_date: "2020-01-01",
        poster_path: null,
      },
      "movie",
    );

    expect(result).toBeNull();
  });

  it("filters out a title with no genres", () => {
    const result = mapDetailsToStreamingMovie(
      {
        id: 5,
        title: "No Genres",
        genres: [],
        runtime: 100,
        release_date: "2020-01-01",
        poster_path: null,
      },
      "movie",
    );

    expect(result).toBeNull();
  });

  it("filters out a title missing a release date", () => {
    const result = mapDetailsToStreamingMovie(
      {
        id: 6,
        title: "No Release Date",
        genres: [{ id: 18, name: "Drama" }],
        runtime: 100,
        poster_path: null,
      },
      "movie",
    );

    expect(result).toBeNull();
  });
});
