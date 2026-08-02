import "server-only";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

function requireApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("Missing TMDB_API_KEY");
  return key;
}

// Server-only TMDb fetch wrapper. Network/parse failures return null rather
// than throwing — a missing/misconfigured API key is a setup error and should
// fail loudly, but a flaky TMDb response is not; callers turn a null into an
// empty result set instead of crashing.
export async function tmdbGet<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("api_key", requireApiKey());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
