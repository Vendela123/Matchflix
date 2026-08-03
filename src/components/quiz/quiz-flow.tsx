"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Lightbulb } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { submitQuizResponse } from "@/lib/quiz/actions";
import { EMPTY_QUIZ_ANSWERS, QUIZ_QUESTIONS, type QuestionOption, type QuizAnswers } from "@/lib/quiz/questions";
import { isQuestionAnswered } from "@/lib/quiz/rules";
import { pickMovieFact } from "@/lib/quiz/movie-facts";
import { Button } from "@/components/ui/button";
import { QUESTION_OPTION_META } from "@/components/quiz/question-option-meta";

export type QuizParticipant = { id: string; nickname: string };

type QuizResponseRow = { participant_id: string };
type SessionRow = { status: "waiting" | "quiz_in_progress" | "matching" | "ended" };

export function QuizFlow({
  joinCode,
  sessionId,
  participantId,
  participants,
  initialSubmittedParticipantIds,
  alreadySubmitted,
}: {
  joinCode: string;
  sessionId: string;
  participantId: string;
  participants: QuizParticipant[];
  initialSubmittedParticipantIds: string[];
  alreadySubmitted: boolean;
}) {
  const router = useRouter();
  const storageKey = `mf-quiz-progress-${sessionId}-${participantId}`;
  const [questionIndex, setQuestionIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [answers, setAnswers] = useState<QuizAnswers>(EMPTY_QUIZ_ANSWERS);
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [submittedIds, setSubmittedIds] = useState(() => new Set(initialSubmittedParticipantIds));
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Answers aren't persisted server-side until final submit (by design — see
  // spec 002), so a mid-quiz reload restores from localStorage instead of
  // losing the participant's place.
  useEffect(() => {
    if (alreadySubmitted) return;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { questionIndex: number; answers: QuizAnswers };
      // Must happen post-mount, not in the initial render: SSR always renders
      // question 1 (no access to localStorage), so restoring earlier would
      // make the client's first render diverge from the server HTML and
      // trigger a hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuestionIndex(Math.min(Math.max(saved.questionIndex, 0), QUIZ_QUESTIONS.length - 1));
      setAnswers(saved.answers);
    } catch {
      // Ignore corrupted/foreign localStorage content.
    }
  }, [alreadySubmitted, storageKey]);

  useEffect(() => {
    if (submitted) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify({ questionIndex, answers }));
  }, [storageKey, questionIndex, answers, submitted]);

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`quiz-${sessionId}`)
      .on<QuizResponseRow>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quiz_responses",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setSubmittedIds((current) => new Set(current).add(payload.new.participant_id));
        },
      )
      .on<SessionRow>(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          if (payload.new.status === "matching") {
            router.push(`/session/${joinCode}/match`);
          } else if (payload.new.status === "ended") {
            setEnded(true);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, joinCode, router]);

  const question = QUIZ_QUESTIONS[questionIndex];
  const isLastQuestion = questionIndex === QUIZ_QUESTIONS.length - 1;
  const canAdvance = isQuestionAnswered(question, answers);
  const progressPercent = Math.round(((questionIndex + 1) / QUIZ_QUESTIONS.length) * 100);

  function selectSingle(value: string) {
    if (question.kind !== "single") return;
    setAnswers((current) => ({ ...current, [question.id]: value }));
  }

  function toggleGenre(value: string) {
    if (question.kind !== "multi") return;
    const otherId = question.id === "preferredGenres" ? "avoidedGenres" : "preferredGenres";
    setAnswers((current) => {
      const selected = current[question.id].includes(value);
      return {
        ...current,
        [question.id]: selected
          ? current[question.id].filter((genre) => genre !== value)
          : [...current[question.id], value],
        [otherId]: current[otherId].filter((genre) => genre !== value),
      };
    });
  }

  function isSelected(option: QuestionOption): boolean {
    if (question.kind === "multi") return answers[question.id].includes(option.value);
    return answers[question.id] === option.value;
  }

  function goBack() {
    setDirection("backward");
    setQuestionIndex((i) => Math.max(0, i - 1));
  }

  function goNext() {
    setError(null);
    if (!isLastQuestion) {
      setDirection("forward");
      setQuestionIndex((i) => Math.min(QUIZ_QUESTIONS.length - 1, i + 1));
      return;
    }
    startTransition(async () => {
      const result = await submitQuizResponse(joinCode, answers);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSubmittedIds((current) => new Set(current).add(participantId));
      setSubmitted(true);
    });
  }

  if (ended) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-2xl font-extrabold text-foreground">Session ended</h1>
        <p className="text-muted-foreground">This session has expired.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <WaitingRoom
        sessionId={sessionId}
        participants={participants}
        submittedIds={submittedIds}
        participantId={participantId}
      />
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium text-pink-600">
            Question {questionIndex + 1} of {QUIZ_QUESTIONS.length}
          </p>
          <p className="text-muted-foreground">{progressPercent}%</p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div
        key={question.id}
        className={
          direction === "forward"
            ? "animate-in fade-in slide-in-from-right-6 duration-300"
            : "animate-in fade-in slide-in-from-left-6 duration-300"
        }
      >
        <h1 className="font-heading mb-1 text-3xl font-extrabold tracking-tight text-foreground">
          {question.title}
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">Choose the one that sounds best right now.</p>

        {question.kind === "single" ? (
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((option) => {
              const meta = QUESTION_OPTION_META[option.value];
              const Icon = meta?.icon;
              const selected = isSelected(option);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectSingle(option.value)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                    selected
                      ? "border-pink-400 bg-pink-50 shadow-sm shadow-pink-200"
                      : "border-border bg-card hover:border-pink-200"
                  }`}
                >
                  {Icon && (
                    <span className="flex size-10 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                      <Icon className="size-5" aria-hidden />
                    </span>
                  )}
                  <span className="font-semibold text-foreground">{option.label}</span>
                  {meta && <span className="text-xs text-muted-foreground">{meta.description}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {question.options.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={isSelected(option) ? "gradient" : "outline"}
                className="rounded-full"
                onClick={() => toggleGenre(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button
          variant="outline"
          type="button"
          className="rounded-full"
          onClick={goBack}
          disabled={questionIndex === 0 || isPending}
        >
          Back
        </Button>
        <Button
          variant="gradient"
          type="button"
          onClick={goNext}
          disabled={!canAdvance || isPending}
          className="flex-1 gap-2"
        >
          {isLastQuestion ? (isPending ? "Submitting…" : "Submit") : "Next question"}
          {!isPending && <ArrowRight className="size-4" aria-hidden />}
        </Button>
      </div>
    </div>
  );
}

function WaitingRoom({
  sessionId,
  participants,
  submittedIds,
  participantId,
}: {
  sessionId: string;
  participants: QuizParticipant[];
  submittedIds: Set<string>;
  participantId: string;
}) {
  const fact = pickMovieFact(sessionId);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          Waiting for other players…
        </h1>
        <p className="text-muted-foreground">
          {submittedIds.size} of {participants.length} answered
        </p>
      </div>

      <ul className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-card/70 p-5 text-left backdrop-blur-sm">
        {participants.map((p) => (
          <li key={p.id} className="flex items-center justify-between text-sm text-foreground">
            <span>
              {p.nickname}
              {p.id === participantId ? " (you)" : ""}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                aria-hidden
                className={`size-2 rounded-full ${submittedIds.has(p.id) ? "bg-emerald-500" : "bg-border"}`}
              />
              {submittedIds.has(p.id) ? "Done" : "Answering…"}
            </span>
          </li>
        ))}
      </ul>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem]">
        <Image
          src="/raccoon.png"
          alt=""
          fill
          sizes="(min-width: 640px) 24rem, 100vw"
          className="object-cover object-[75%_center]"
        />
      </div>

      <div className="flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Lightbulb className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Did you know?</p>
          <p className="text-sm text-muted-foreground">{fact}</p>
        </div>
      </div>
    </div>
  );
}
