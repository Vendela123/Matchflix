"use client";

import { useActionState } from "react";
import { createSession, type FormState } from "@/lib/session/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateSessionForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createSession, undefined);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2 text-left">
        <Label htmlFor="nickname">Your nickname</Label>
        <Input id="nickname" name="nickname" placeholder="e.g. Alex" maxLength={30} required autoFocus />
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create session"}
      </Button>
    </form>
  );
}
