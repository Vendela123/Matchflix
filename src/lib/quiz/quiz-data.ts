import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Read-only helper shared by the quiz page and the submit action, mirroring
// src/lib/session/session-data.ts. Mutating logic lives in actions.ts.

export async function getSubmittedParticipantIds(sessionId: string): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("quiz_responses")
    .select("participant_id")
    .eq("session_id", sessionId);
  if (error || !data) return [];
  return data.map((row) => row.participant_id);
}

export type QuizResponseRow = {
  id: string;
  session_id: string;
  participant_id: string;
  preferred_genres: string[];
  avoided_genres: string[];
  mood: string;
  runtime_bucket: string;
  media_type: string;
  release_preference: string;
  submitted_at: string;
};

export async function getQuizResponses(sessionId: string): Promise<QuizResponseRow[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("quiz_responses")
    .select(
      "id, session_id, participant_id, preferred_genres, avoided_genres, mood, runtime_bucket, media_type, release_preference, submitted_at",
    )
    .eq("session_id", sessionId);
  if (error || !data) return [];
  return data;
}
