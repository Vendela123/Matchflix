// Pure session business rules — no I/O, so they're testable without a database
// or the network. Server actions (src/lib/session/actions.ts) wire these to
// Supabase.

// Excludes visually ambiguous characters: O/0 and I/1.
const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 6;

export function randomJoinCode(): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

const MAX_JOIN_CODE_ATTEMPTS = 10;

// Draws random codes until one doesn't collide with an existing session.
// `codeExists` is injected so this stays testable without a database.
export async function generateUniqueJoinCode(
  codeExists: (code: string) => Promise<boolean>,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_JOIN_CODE_ATTEMPTS; attempt++) {
    const code = randomJoinCode();
    if (!(await codeExists(code))) {
      return code;
    }
  }
  throw new Error("Could not generate a unique join code");
}

export const MIN_PARTICIPANTS_TO_START = 2;

export function canStartQuiz(participantCount: number): boolean {
  return participantCount >= MIN_PARTICIPANTS_TO_START;
}

export const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export function isSessionExpired(lastActivityAt: Date, now: Date): boolean {
  return now.getTime() - lastActivityAt.getTime() > SESSION_EXPIRY_MS;
}

export type ParticipantForHostHandoff = { id: string; joinedAt: Date };

// The earliest-joined remaining participant becomes host; null if nobody's left.
export function pickNextHost(
  remainingParticipants: ParticipantForHostHandoff[],
): string | null {
  if (remainingParticipants.length === 0) return null;
  return remainingParticipants.reduce((earliest, participant) =>
    participant.joinedAt < earliest.joinedAt ? participant : earliest,
  ).id;
}
