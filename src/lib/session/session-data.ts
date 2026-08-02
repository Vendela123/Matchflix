import "server-only";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isSessionExpired } from "@/lib/session/rules";

// Read-only/idempotent helpers shared by server components and server actions.
// Mutating actions live in actions.ts.

export const SESSION_COOKIE = "mf_session";
export const PARTICIPANT_COOKIE = "mf_participant";
export const IDENTITY_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // matches session expiry

export type SessionStatus = "waiting" | "quiz_in_progress" | "ended";

export type SessionRow = {
  id: string;
  join_code: string;
  status: SessionStatus;
  created_at: string;
  last_activity_at: string;
};

export type ParticipantRow = {
  id: string;
  session_id: string;
  nickname: string;
  is_host: boolean;
  joined_at: string;
};

export type Identity = { sessionId: string; participantId: string };

export async function getIdentity(): Promise<Identity | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  const participantId = cookieStore.get(PARTICIPANT_COOKIE)?.value;
  if (!sessionId || !participantId) return null;
  return { sessionId, participantId };
}

export async function getSessionByCode(code: string): Promise<SessionRow | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, join_code, status, created_at, last_activity_at")
    .eq("join_code", code)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// Lazily expires a session on access rather than via a background job — simple
// and sufficient at MVP scale (see spec 001, Implementation notes).
export async function expireIfInactive(session: SessionRow): Promise<SessionRow> {
  if (
    session.status === "ended" ||
    !isSessionExpired(new Date(session.last_activity_at), new Date())
  ) {
    return session;
  }
  const supabase = createServiceRoleClient();
  await supabase.from("sessions").update({ status: "ended" }).eq("id", session.id);
  return { ...session, status: "ended" };
}

export async function getParticipants(sessionId: string): Promise<ParticipantRow[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("session_participants")
    .select("id, session_id, nickname, is_host, joined_at")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });
  if (error || !data) return [];
  return data;
}
