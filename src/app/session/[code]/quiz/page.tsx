import { redirect } from "next/navigation";
import { QuizFlow } from "@/components/quiz/quiz-flow";
import { getSubmittedParticipantIds } from "@/lib/quiz/quiz-data";
import { getIdentity, getParticipants, getSessionByCode } from "@/lib/session/session-data";

export const metadata = {
  title: "Quiz — MatchFlix",
};

export default async function SessionQuizPage({
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
  if (session.status === "matching") {
    redirect(`/session/${joinCode}/match`);
  }
  if (session.status === "ended") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background px-6 py-24 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Session ended</h1>
        <p className="max-w-sm text-muted-foreground">This session has expired.</p>
      </div>
    );
  }

  const [participants, submittedParticipantIds] = await Promise.all([
    getParticipants(session.id),
    getSubmittedParticipantIds(session.id),
  ]);

  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-16">
      <QuizFlow
        joinCode={joinCode}
        sessionId={session.id}
        participantId={identity.participantId}
        participants={participants.map((p) => ({ id: p.id, nickname: p.nickname }))}
        initialSubmittedParticipantIds={submittedParticipantIds}
        alreadySubmitted={submittedParticipantIds.includes(identity.participantId)}
      />
    </div>
  );
}
