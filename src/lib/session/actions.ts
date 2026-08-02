"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { canStartQuiz, generateUniqueJoinCode, pickNextHost } from "@/lib/session/rules";
import {
  IDENTITY_COOKIE_MAX_AGE_SECONDS,
  PARTICIPANT_COOKIE,
  SESSION_COOKIE,
  expireIfInactive,
  getIdentity,
  getParticipants,
  getSessionByCode,
} from "@/lib/session/session-data";

export type FormState = { error: string } | undefined;

const NICKNAME_MAX_LENGTH = 30;

function readNickname(formData: FormData): string | null {
  const raw = formData.get("nickname");
  if (typeof raw !== "string") return null;
  const nickname = raw.trim().slice(0, NICKNAME_MAX_LENGTH);
  return nickname.length > 0 ? nickname : null;
}

async function setIdentityCookies(sessionId: string, participantId: string) {
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: IDENTITY_COOKIE_MAX_AGE_SECONDS,
  };
  cookieStore.set(SESSION_COOKIE, sessionId, options);
  cookieStore.set(PARTICIPANT_COOKIE, participantId, options);
}

export async function createSession(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const nickname = readNickname(formData);
  if (!nickname) return { error: "Enter a nickname to create a session." };

  const supabase = createServiceRoleClient();
  const joinCode = await generateUniqueJoinCode(async (code) => {
    const { data } = await supabase.from("sessions").select("id").eq("join_code", code).maybeSingle();
    return data !== null;
  });

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({ join_code: joinCode })
    .select("id")
    .single();
  if (sessionError || !session) {
    return { error: "Could not create a session. Try again." };
  }

  const { data: participant, error: participantError } = await supabase
    .from("session_participants")
    .insert({ session_id: session.id, nickname, is_host: true })
    .select("id")
    .single();
  if (participantError || !participant) {
    return { error: "Could not create a session. Try again." };
  }

  await setIdentityCookies(session.id, participant.id);
  redirect(`/session/${joinCode}`);
}

export async function joinSession(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const nickname = readNickname(formData);
  const rawCode = formData.get("joinCode");
  const joinCode = typeof rawCode === "string" ? rawCode.trim().toUpperCase() : "";
  if (!joinCode) return { error: "Enter a join code." };
  if (!nickname) return { error: "Enter a nickname to join." };

  let session = await getSessionByCode(joinCode);
  if (!session) return { error: "Session not found. Check the code and try again." };

  session = await expireIfInactive(session);
  if (session.status === "ended") return { error: "This session has expired." };
  if (session.status !== "waiting") return { error: "This session has already started." };

  const supabase = createServiceRoleClient();
  const { data: participant, error: participantError } = await supabase
    .from("session_participants")
    .insert({ session_id: session.id, nickname, is_host: false })
    .select("id")
    .single();
  if (participantError || !participant) {
    return { error: "Could not join the session. Try again." };
  }

  await supabase
    .from("sessions")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", session.id);

  await setIdentityCookies(session.id, participant.id);
  redirect(`/session/${joinCode}`);
}

export async function startQuiz(joinCode: string): Promise<{ error?: string }> {
  const identity = await getIdentity();
  if (!identity) return { error: "You're not part of this session." };

  let session = await getSessionByCode(joinCode);
  if (!session || session.id !== identity.sessionId) {
    return { error: "You're not part of this session." };
  }

  session = await expireIfInactive(session);
  if (session.status === "ended") return { error: "This session has expired." };
  if (session.status !== "waiting") return { error: "The quiz has already started." };

  const participants = await getParticipants(session.id);
  const me = participants.find((p) => p.id === identity.participantId);
  if (!me?.is_host) return { error: "Only the host can start the quiz." };
  if (!canStartQuiz(participants.length)) {
    return { error: "Wait for at least one more participant." };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("sessions")
    .update({ status: "quiz_in_progress", last_activity_at: new Date().toISOString() })
    .eq("id", session.id);
  if (error) return { error: "Could not start the quiz. Try again." };

  revalidatePath(`/session/${joinCode}`);
  return {};
}

// Called by a remaining participant's client when it notices the host is gone
// (see the lobby's presence handling). Self-limiting: it only ever promotes
// the earliest-joined non-host participant still present, so a spurious or
// duplicate call from a client that isn't actually next in line is a no-op.
export async function transferHostIfNeeded(joinCode: string): Promise<{ error?: string }> {
  const identity = await getIdentity();
  if (!identity) return {};

  const session = await getSessionByCode(joinCode);
  if (!session || session.id !== identity.sessionId || session.status !== "waiting") {
    return {};
  }

  const participants = await getParticipants(session.id);
  const me = participants.find((p) => p.id === identity.participantId);
  if (!me || me.is_host) return {};

  const currentHost = participants.find((p) => p.is_host);
  const others = participants.filter((p) => p.id !== currentHost?.id);
  const nextHostId = pickNextHost(
    others.map((p) => ({ id: p.id, joinedAt: new Date(p.joined_at) })),
  );
  if (nextHostId !== me.id) return {};

  const supabase = createServiceRoleClient();
  if (currentHost) {
    await supabase.from("session_participants").update({ is_host: false }).eq("id", currentHost.id);
  }
  await supabase.from("session_participants").update({ is_host: true }).eq("id", me.id);

  revalidatePath(`/session/${joinCode}`);
  return {};
}
