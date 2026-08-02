"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { startQuiz, transferHostIfNeeded } from "@/lib/session/actions";
import { canStartQuiz, pickNextHost } from "@/lib/session/rules";
import { Button } from "@/components/ui/button";

export type LobbyParticipant = {
  id: string;
  nickname: string;
  isHost: boolean;
  joinedAt: string;
};

type LobbySessionStatus = "waiting" | "quiz_in_progress" | "ended";

type ParticipantRow = {
  id: string;
  nickname: string;
  is_host: boolean;
  joined_at: string;
};

type SessionRow = {
  status: LobbySessionStatus;
};

export function SessionLobby({
  joinCode,
  sessionId,
  participantId,
  initialParticipants,
  initialStatus,
}: {
  joinCode: string;
  sessionId: string;
  participantId: string;
  initialParticipants: LobbyParticipant[];
  initialStatus: LobbySessionStatus;
}) {
  const router = useRouter();
  const [participants, setParticipants] = useState(initialParticipants);
  const [status, setStatus] = useState<LobbySessionStatus>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startAction] = useTransition();

  const me = participants.find((p) => p.id === participantId);
  const isHost = me?.isHost ?? false;

  useEffect(() => {
    if (status === "quiz_in_progress") {
      router.push(`/session/${joinCode}/quiz`);
    }
  }, [status, joinCode, router]);

  useEffect(() => {
    const supabase = createBrowserClient();

    const dataChannel = supabase
      .channel(`session-data-${sessionId}`)
      .on<ParticipantRow>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setParticipants((current) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new;
              if (current.some((p) => p.id === row.id)) return current;
              return [
                ...current,
                { id: row.id, nickname: row.nickname, isHost: row.is_host, joinedAt: row.joined_at },
              ].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new;
              return current.map((p) =>
                p.id === row.id ? { ...p, nickname: row.nickname, isHost: row.is_host } : p,
              );
            }
            return current;
          });
        },
      )
      .on<SessionRow>(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          setStatus(payload.new.status);
        },
      )
      .subscribe();

    const presenceChannel = supabase.channel(`session-presence-${sessionId}`, {
      config: { presence: { key: participantId } },
    });
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const presentIds = new Set(Object.keys(presenceChannel.presenceState()));
        setParticipants((current) => {
          const host = current.find((p) => p.isHost);
          if (host && host.id !== participantId && !presentIds.has(host.id)) {
            const candidates = current
              .filter((p) => p.id !== host.id && presentIds.has(p.id))
              .map((p) => ({ id: p.id, joinedAt: new Date(p.joinedAt) }));
            if (pickNextHost(candidates) === participantId) {
              startAction(() => {
                void transferHostIfNeeded(joinCode);
              });
            }
          }
          return current;
        });
      })
      .subscribe(async (subscribeStatus) => {
        if (subscribeStatus === "SUBSCRIBED") {
          await presenceChannel.track({ participantId });
        }
      });

    return () => {
      supabase.removeChannel(dataChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [sessionId, participantId, joinCode]);

  function handleStart() {
    setError(null);
    startAction(async () => {
      const result = await startQuiz(joinCode);
      if (result?.error) setError(result.error);
    });
  }

  async function copyLink() {
    const shareUrl = `${window.location.origin}/session/${joinCode}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Join code</p>
        <p className="text-4xl font-semibold tracking-[0.3em] text-zinc-950 dark:text-zinc-50">
          {joinCode}
        </p>
        <Button variant="outline" type="button" onClick={copyLink}>
          {copied ? "Link copied" : "Copy invite link"}
        </Button>
      </div>

      <div className="w-full rounded-xl border border-zinc-200 bg-white p-5 text-left dark:border-zinc-800 dark:bg-zinc-950">
        <p className="mb-3 text-sm font-medium text-zinc-950 dark:text-zinc-50">
          Participants ({participants.length})
        </p>
        <ul className="flex flex-col gap-2">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300"
            >
              <span>
                {p.nickname}
                {p.id === participantId ? " (you)" : ""}
              </span>
              {p.isHost && <span className="text-xs text-zinc-500 dark:text-zinc-400">Host</span>}
            </li>
          ))}
        </ul>
      </div>

      {isHost ? (
        <div className="flex w-full flex-col gap-2">
          <Button onClick={handleStart} disabled={isPending || !canStartQuiz(participants.length)}>
            {isPending ? "Starting…" : "Start quiz"}
          </Button>
          {!canStartQuiz(participants.length) && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Waiting for at least one more participant to join.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Waiting for the host to start the quiz…
        </p>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
