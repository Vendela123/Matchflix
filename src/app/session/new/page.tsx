import { CreateSessionForm } from "@/components/session/create-session-form";

export const metadata = {
  title: "Start a session — MatchFlix",
};

export default function NewSessionPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-24">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground">
            Start a session
          </h1>
          <p className="text-muted-foreground">
            Pick a nickname — you&apos;ll get a code to share with your group.
          </p>
        </div>
        <CreateSessionForm />
      </div>
    </div>
  );
}
