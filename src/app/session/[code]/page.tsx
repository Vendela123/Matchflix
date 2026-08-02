import { redirect } from "next/navigation";
import { JoinSessionForm } from "@/components/session/join-session-form";
import { SessionLobby, type LobbyParticipant } from "@/components/session/session-lobby";
import { expireIfInactive, getIdentity, getParticipants, getSessionByCode } from "@/lib/session/session-data";

export const metadata = {
  title: "Session lobby — MatchFlix",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-24 dark:bg-black">
      {children}
    </div>
  );
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const joinCode = code.toUpperCase();

  let session = await getSessionByCode(joinCode);
  if (!session) {
    return (
      <Shell>
        <p className="text-zinc-600 dark:text-zinc-400">
          Session not found. Check the code and try again.
        </p>
      </Shell>
    );
  }

  session = await expireIfInactive(session);
  if (session.status === "ended") {
    return (
      <Shell>
        <p className="text-zinc-600 dark:text-zinc-400">This session has expired.</p>
      </Shell>
    );
  }

  const identity = await getIdentity();
  const participants = await getParticipants(session.id);
  const me =
    identity && identity.sessionId === session.id
      ? participants.find((p) => p.id === identity.participantId)
      : undefined;

  if (!me) {
    if (session.status !== "waiting") {
      return (
        <Shell>
          <p className="text-zinc-600 dark:text-zinc-400">This session has already started.</p>
        </Shell>
      );
    }
    return (
      <Shell>
        <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Join session {joinCode}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">Pick a nickname to join.</p>
          </div>
          <JoinSessionForm lockedCode={joinCode} />
        </div>
      </Shell>
    );
  }

  if (session.status === "quiz_in_progress") {
    redirect(`/session/${joinCode}/quiz`);
  }

  const lobbyParticipants: LobbyParticipant[] = participants.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    isHost: p.is_host,
    joinedAt: p.joined_at,
  }));

  return (
    <Shell>
      <SessionLobby
        joinCode={joinCode}
        sessionId={session.id}
        participantId={me.id}
        initialParticipants={lobbyParticipants}
        initialStatus={session.status}
      />
    </Shell>
  );
}
