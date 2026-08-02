import { redirect } from "next/navigation";
import { getIdentity, getSessionByCode } from "@/lib/session/session-data";

export const metadata = {
  title: "Finding your match — MatchFlix",
};

// The matching/recommendation algorithm itself is a separate spec (Match
// Logic). This confirms the quiz→matching transition actually happens once
// every participant has submitted (see spec 002, "Not touched").
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

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Finding your match…
      </h1>
      <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
        Everyone in session {joinCode} has answered. The matching step ships in a follow-up spec.
      </p>
    </div>
  );
}
