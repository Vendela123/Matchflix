"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { submitQuizResponse } from "@/lib/quiz/actions";
import { EMPTY_QUIZ_ANSWERS, QUIZ_QUESTIONS, type QuestionOption, type QuizAnswers } from "@/lib/quiz/questions";
import { isQuestionAnswered } from "@/lib/quiz/rules";
import { Button } from "@/components/ui/button";

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
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Session ended</h1>
        <p className="text-zinc-600 dark:text-zinc-400">This session has expired.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <WaitingRoom participants={participants} submittedIds={submittedIds} participantId={participantId} />
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Question {questionIndex + 1} of {QUIZ_QUESTIONS.length}
        </p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-zinc-900 transition-all duration-300 dark:bg-zinc-50"
            style={{ width: `${((questionIndex + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
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
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {question.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          {question.options.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={isSelected(option) ? "default" : "outline"}
              onClick={() => (question.kind === "multi" ? toggleGenre(option.value) : selectSingle(option.value))}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={goBack}
          disabled={questionIndex === 0 || isPending}
        >
          Back
        </Button>
        <Button type="button" onClick={goNext} disabled={!canAdvance || isPending} className="flex-1">
          {isLastQuestion ? (isPending ? "Submitting…" : "Submit") : "Next"}
        </Button>
      </div>
    </div>
  );
}

function WaitingRoom({
  participants,
  submittedIds,
  participantId,
}: {
  participants: QuizParticipant[];
  submittedIds: Set<string>;
  participantId: string;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Waiting for other players…
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {submittedIds.size} of {participants.length} answered
        </p>
      </div>
      <ul className="flex w-full flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-5 text-left dark:border-zinc-800 dark:bg-zinc-950">
        {participants.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300"
          >
            <span>
              {p.nickname}
              {p.id === participantId ? " (you)" : ""}
            </span>
            <span
              className={
                submittedIds.has(p.id)
                  ? "text-zinc-950 dark:text-zinc-50"
                  : "text-zinc-400 dark:text-zinc-600"
              }
            >
              {submittedIds.has(p.id) ? "✓ Done" : "Answering…"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
