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
