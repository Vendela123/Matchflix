import { describe, expect, it } from "vitest";
import { QUIZ_QUESTIONS, type QuizAnswers } from "./questions";
import { allParticipantsSubmitted, isQuestionAnswered, validateQuizAnswers } from "./rules";

const validAnswers: QuizAnswers = {
  preferredGenres: ["Comedy"],
  avoidedGenres: ["Horror"],
  mood: "funny",
  runtimeBucket: "under_120",
  mediaType: "movie",
  releasePreference: "new",
};

describe("QUIZ_QUESTIONS", () => {
  it("has exactly six questions in the fixed MVP order", () => {
    expect(QUIZ_QUESTIONS.map((q) => q.id)).toEqual([
      "preferredGenres",
      "avoidedGenres",
      "mood",
      "runtimeBucket",
      "mediaType",
      "releasePreference",
    ]);
  });
});

describe("isQuestionAnswered", () => {
  it("requires at least one selection for a required multi-select", () => {
    const question = QUIZ_QUESTIONS[0]; // preferredGenres
    expect(isQuestionAnswered(question, { ...validAnswers, preferredGenres: [] })).toBe(false);
    expect(isQuestionAnswered(question, validAnswers)).toBe(true);
  });

  it("allows an optional multi-select to stay empty", () => {
    const question = QUIZ_QUESTIONS[1]; // avoidedGenres
    expect(isQuestionAnswered(question, { ...validAnswers, avoidedGenres: [] })).toBe(true);
  });

  it("requires a value for a required single-select", () => {
    const question = QUIZ_QUESTIONS[2]; // mood
    expect(isQuestionAnswered(question, { ...validAnswers, mood: "" })).toBe(false);
    expect(isQuestionAnswered(question, validAnswers)).toBe(true);
  });
});

describe("validateQuizAnswers", () => {
  it("accepts a fully answered, valid response", () => {
    expect(validateQuizAnswers(validAnswers)).toEqual({ valid: true });
  });

  it("rejects a missing required answer", () => {
    expect(validateQuizAnswers({ ...validAnswers, mood: "" }).valid).toBe(false);
  });

  it("rejects an option value that isn't in the fixed list", () => {
    expect(validateQuizAnswers({ ...validAnswers, mood: "sleepy" }).valid).toBe(false);
  });

  it("rejects a genre picked as both preferred and avoided", () => {
    const result = validateQuizAnswers({
      ...validAnswers,
      preferredGenres: ["Comedy"],
      avoidedGenres: ["Comedy"],
    });
    expect(result.valid).toBe(false);
  });
});

describe("allParticipantsSubmitted", () => {
  it("is false until every participant has submitted", () => {
    expect(allParticipantsSubmitted(0, 2)).toBe(false);
    expect(allParticipantsSubmitted(1, 2)).toBe(false);
  });

  it("is true once responses reach the participant count", () => {
    expect(allParticipantsSubmitted(2, 2)).toBe(true);
  });

  it("is false for a session with no participants", () => {
    expect(allParticipantsSubmitted(0, 0)).toBe(false);
  });
});
