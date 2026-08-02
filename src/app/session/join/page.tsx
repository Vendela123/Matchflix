import { JoinSessionForm } from "@/components/session/join-session-form";

export const metadata = {
  title: "Join a session — MatchFlix",
};

export default async function JoinSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-24 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Join a session
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Enter the code your host shared, and pick a nickname.
          </p>
        </div>
        <JoinSessionForm lockedCode={code?.toUpperCase()} />
      </div>
    </div>
  );
}
