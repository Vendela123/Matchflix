import { CreateSessionForm } from "@/components/session/create-session-form";

export const metadata = {
  title: "Start a session — MatchFlix",
};

export default function NewSessionPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-24 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Start a session
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Pick a nickname — you&apos;ll get a code to share with your group.
          </p>
        </div>
        <CreateSessionForm />
      </div>
    </div>
  );
}
