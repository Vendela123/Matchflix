import { describe, expect, it, vi } from "vitest";
import {
  JOIN_CODE_LENGTH,
  canStartQuiz,
  generateUniqueJoinCode,
  isSessionExpired,
  pickNextHost,
  randomJoinCode,
} from "./rules";

describe("randomJoinCode", () => {
  it("generates a 6-character uppercase code without ambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      const code = randomJoinCode();
      expect(code).toHaveLength(JOIN_CODE_LENGTH);
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]+$/);
      expect(code).not.toMatch(/[O0I1]/);
    }
  });
});

describe("generateUniqueJoinCode", () => {
  it("returns the first code that doesn't collide", async () => {
    const codeExists = vi.fn().mockResolvedValue(false);
    const code = await generateUniqueJoinCode(codeExists);
    expect(code).toHaveLength(JOIN_CODE_LENGTH);
    expect(codeExists).toHaveBeenCalledTimes(1);
  });

  it("retries on collision until a free code is found", async () => {
    const codeExists = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    await generateUniqueJoinCode(codeExists);
    expect(codeExists).toHaveBeenCalledTimes(3);
  });

  it("gives up after too many collisions", async () => {
    const codeExists = vi.fn().mockResolvedValue(true);
    await expect(generateUniqueJoinCode(codeExists)).rejects.toThrow(
      "Could not generate a unique join code",
    );
  });
});

describe("canStartQuiz", () => {
  it("requires at least 2 participants, including the host", () => {
    expect(canStartQuiz(0)).toBe(false);
    expect(canStartQuiz(1)).toBe(false);
    expect(canStartQuiz(2)).toBe(true);
    expect(canStartQuiz(5)).toBe(true);
  });
});

describe("isSessionExpired", () => {
  const lastActivityAt = new Date("2026-08-01T00:00:00Z");

  it("is not expired before 24 hours of inactivity", () => {
    const now = new Date("2026-08-01T23:59:59Z");
    expect(isSessionExpired(lastActivityAt, now)).toBe(false);
  });

  it("is expired after 24 hours of inactivity", () => {
    const now = new Date("2026-08-02T00:00:01Z");
    expect(isSessionExpired(lastActivityAt, now)).toBe(true);
  });
});

describe("pickNextHost", () => {
  it("returns null when nobody is left", () => {
    expect(pickNextHost([])).toBeNull();
  });

  it("picks the earliest-joined remaining participant", () => {
    const nextHost = pickNextHost([
      { id: "b", joinedAt: new Date("2026-08-01T00:02:00Z") },
      { id: "a", joinedAt: new Date("2026-08-01T00:01:00Z") },
      { id: "c", joinedAt: new Date("2026-08-01T00:03:00Z") },
    ]);
    expect(nextHost).toBe("a");
  });
});
