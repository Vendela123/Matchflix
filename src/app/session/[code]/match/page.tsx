import Image from "next/image";
import { redirect } from "next/navigation";
import { getQuizResponses } from "@/lib/quiz/quiz-data";
import type { QuizAnswers } from "@/lib/quiz/questions";
import {
  resolveMaxRuntimeMinutes,
  resolveMediaType,
  resolvePreferredGenrePool,
  topMatches,
} from "@/lib/match/scoring";
import { discoverMovies } from "@/lib/tmdb/movies";
import { getIdentity, getSessionByCode } from "@/lib/session/session-data";

export const metadata = {
  title: "Your match — MatchFlix",
};

export default async function SessionMatchPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const joinCode = code.toUpperCase();

  const session = await getSessionByCode(joinCode);
  const identity = await getIdentity();
  if (!session || !identity || identity.sessionId !== session.id) {
    redirect(`/session/${joinCode}`);
  }
  if (session.status === "waiting") {
    redirect(`/session/${joinCode}`);
  }
  if (session.status === "quiz_in_progress") {
    redirect(`/session/${joinCode}/quiz`);
  }
  if (session.status === "ended") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Session ended
        </h1>
        <p className="max-w-sm text-zinc-600 dark:text-zinc-400">This session has expired.</p>
      </div>
    );
  }

  const responses = await getQuizResponses(session.id);
  const answers: QuizAnswers[] = responses.map((response) => ({
    preferredGenres: response.preferred_genres,
    avoidedGenres: response.avoided_genres,
    mood: response.mood,
    runtimeBucket: response.runtime_bucket,
    mediaType: response.media_type,
    releasePreference: response.release_preference,
  }));

  const candidates = await discoverMovies({
    genres: resolvePreferredGenrePool(answers),
    mediaType: resolveMediaType(answers),
    maxRuntimeMinutes: resolveMaxRuntimeMinutes(answers),
  });
  const matches = topMatches(candidates, answers, new Date().getFullYear());

  if (matches.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          No match found
        </h1>
        <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
          Nothing overlapped with what is available right now. Try a new session with different
          answers.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-zinc-50 px-6 py-16 dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Your match{matches.length > 1 ? "es" : ""}
      </h1>
      <ul className="flex w-full max-w-sm flex-col gap-4">
        {matches.map((movie) => (
          <li
            key={movie.tmdbId}
            className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-left dark:border-zinc-800 dark:bg-zinc-950"
          >
            {movie.posterUrl && (
              <Image
                src={movie.posterUrl}
                alt={`${movie.title} poster`}
                width={80}
                height={120}
                className="h-30 w-20 flex-shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-zinc-950 dark:text-zinc-50">
                {movie.title}{" "}
                <span className="font-normal text-zinc-500 dark:text-zinc-400">
                  ({movie.releaseYear})
                </span>
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {movie.genres.join(", ")} · {movie.runtimeMinutes} min
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {movie.streamingPlatforms.length > 0
                  ? `Watch on ${movie.streamingPlatforms.join(", ")}`
                  : "Not currently streaming"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
