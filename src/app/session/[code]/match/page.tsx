import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, RefreshCw } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { ShareResultsButton } from "@/components/match/share-results-button";

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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background px-6 py-24 text-center">
        <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground">
          Session ended
        </h1>
        <p className="max-w-sm text-muted-foreground">This session has expired.</p>
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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background px-6 py-24 text-center">
        <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground">
          No match found
        </h1>
        <p className="max-w-sm text-muted-foreground">
          Nothing overlapped with what is available right now. Try a new session with different
          answers.
        </p>
        <Button asChild variant="gradient" size="lg" className="mt-2 gap-2">
          <Link href="/session/new">
            Start a new quiz
            <RefreshCw className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-background px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading flex items-center gap-2 text-4xl font-extrabold tracking-tight text-foreground">
          Your match{matches.length > 1 ? "es" : ""}
          <Heart className="size-7 fill-pink-500 text-pink-500" aria-hidden />
        </h1>
        <p className="text-muted-foreground">Based on your answers</p>
      </div>

      <ul className="flex w-full max-w-sm flex-col gap-4">
        {matches.map(({ movie, scorePercent }) => (
          <li
            key={movie.tmdbId}
            className="flex gap-4 rounded-2xl border border-border bg-card/70 p-4 text-left backdrop-blur-sm"
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
            <div className="flex flex-1 flex-col gap-1">
              <p className="font-semibold text-foreground">
                {movie.title}{" "}
                <span className="font-normal text-muted-foreground">({movie.releaseYear})</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {movie.genres.join(", ")} · {movie.runtimeMinutes} min
              </p>
              <p className="text-sm text-muted-foreground">
                {movie.streamingPlatforms.length > 0
                  ? `Watch on ${movie.streamingPlatforms.join(", ")}`
                  : "Not currently streaming"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center justify-center">
              <div className="flex size-14 flex-col items-center justify-center rounded-full bg-pink-100 text-pink-600">
                <span className="text-sm leading-none font-bold">{scorePercent}%</span>
              </div>
              <span className="mt-1 text-[0.65rem] text-muted-foreground">match</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button asChild variant="gradient" size="lg" className="w-full gap-2">
          <Link href="/session/new">
            Start a new quiz
            <RefreshCw className="size-4" aria-hidden />
          </Link>
        </Button>
        <ShareResultsButton />
      </div>
    </div>
  );
}
