import { redirect } from "next/navigation";
import { getIdentity, getSessionByCode } from "@/lib/session/session-data";

export const metadata = {
  title: "Quiz — MatchFlix",
};

// The quiz itself is a separate spec (see specs/001-session-management.md,
// "Not touched"). This confirms the session→quiz transition actually happens.
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

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Quiz starting…
      </h1>
      <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
        Everyone in session {joinCode} is on their way here. The quiz itself ships in a follow-up
        spec.
      </p>
    </div>
  );
}
