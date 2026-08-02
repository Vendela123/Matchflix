"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getSubmittedParticipantIds } from "@/lib/quiz/quiz-data";
import { allParticipantsSubmitted, validateQuizAnswers } from "@/lib/quiz/rules";
import type { QuizAnswers } from "@/lib/quiz/questions";
import {
  expireIfInactive,
  getIdentity,
  getParticipants,
  getSessionByCode,
} from "@/lib/session/session-data";

const UNIQUE_VIOLATION = "23505";

export async function submitQuizResponse(
  joinCode: string,
  answers: QuizAnswers,
): Promise<{ error?: string }> {
  const identity = await getIdentity();
  if (!identity) return { error: "You're not part of this session." };

  let session = await getSessionByCode(joinCode);
  if (!session || session.id !== identity.sessionId) {
    return { error: "You're not part of this session." };
  }

  session = await expireIfInactive(session);
  if (session.status === "ended") return { error: "This session has expired." };
  if (session.status !== "quiz_in_progress") return { error: "The quiz isn't in progress." };

  const validation = validateQuizAnswers(answers);
  if (!validation.valid) return { error: validation.error };

  const supabase = createServiceRoleClient();
  const { error: insertError } = await supabase.from("quiz_responses").insert({
    session_id: session.id,
    participant_id: identity.participantId,
    preferred_genres: answers.preferredGenres,
    avoided_genres: answers.avoidedGenres,
    mood: answers.mood,
    runtime_bucket: answers.runtimeBucket,
    media_type: answers.mediaType,
    release_preference: answers.releasePreference,
  });
  // A unique-violation retry means this participant already submitted — treat
  // it as a no-op success rather than an error; their response is unchanged
  // (immutability), and that's the outcome they actually care about.
  if (insertError && insertError.code !== UNIQUE_VIOLATION) {
    return { error: "Could not submit your answers. Try again." };
  }

  const [participants, submittedParticipantIds] = await Promise.all([
    getParticipants(session.id),
    getSubmittedParticipantIds(session.id),
  ]);

  const nowIso = new Date().toISOString();
  const updates = allParticipantsSubmitted(submittedParticipantIds.length, participants.length)
    ? { status: "matching" as const, last_activity_at: nowIso }
    : { last_activity_at: nowIso };
  await supabase.from("sessions").update(updates).eq("id", session.id);

  revalidatePath(`/session/${joinCode}/quiz`);
  return {};
}
