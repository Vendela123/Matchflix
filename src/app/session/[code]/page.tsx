import { redirect } from "next/navigation";
import { JoinSessionForm } from "@/components/session/join-session-form";
import { SessionLobby, type LobbyParticipant } from "@/components/session/session-lobby";
import { expireIfInactive, getIdentity, getParticipants, getSessionByCode } from "@/lib/session/session-data";

export const metadata = {
  title: "Session lobby — MatchFlix",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-24">{children}</div>
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
        <p className="text-muted-foreground">Session not found. Check the code and try again.</p>
      </Shell>
    );
  }

  session = await expireIfInactive(session);
  if (session.status === "ended") {
    return (
      <Shell>
        <p className="text-muted-foreground">This session has expired.</p>
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
          <p className="text-muted-foreground">This session has already started.</p>
        </Shell>
      );
    }
    return (
      <Shell>
        <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground">
              Join session {joinCode}
            </h1>
            <p className="text-muted-foreground">Pick a nickname to join.</p>
          </div>
          <JoinSessionForm lockedCode={joinCode} />
        </div>
      </Shell>
    );
  }

  if (session.status === "quiz_in_progress") {
    redirect(`/session/${joinCode}/quiz`);
  }
  if (session.status === "matching") {
    redirect(`/session/${joinCode}/match`);
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
