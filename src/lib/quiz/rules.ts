// Pure quiz business rules — no I/O, so they're testable without a database or
// the network. Server actions (src/lib/quiz/actions.ts) wire these to Supabase.

import { QUIZ_QUESTIONS, type QuizAnswers, type QuizQuestion } from "./questions";

export function isQuestionAnswered(question: QuizQuestion, answers: QuizAnswers): boolean {
  if (!question.required) return true;
  return answers[question.id].length > 0;
}

export type ValidationResult = { valid: true } | { valid: false; error: string };

// Server-side validation: every server action must revalidate, never trust the
// client's own "can I advance" check. Re-derives the valid option sets from
// QUIZ_QUESTIONS itself so the option lists never need to be duplicated here.
export function validateQuizAnswers(answers: QuizAnswers): ValidationResult {
  for (const question of QUIZ_QUESTIONS) {
    if (!isQuestionAnswered(question, answers)) {
      return { valid: false, error: `Answer "${question.title}" before submitting.` };
    }
  }

  for (const question of QUIZ_QUESTIONS) {
    const validValues = new Set(question.options.map((option) => option.value));
    const value = answers[question.id];
    const values = Array.isArray(value) ? value : [value];
    if (!values.every((v) => validValues.has(v))) {
      return { valid: false, error: `Invalid answer for "${question.title}".` };
    }
  }

  if (answers.preferredGenres.some((genre) => answers.avoidedGenres.includes(genre))) {
    return { valid: false, error: "A genre can't be both preferred and avoided." };
  }

  return { valid: true };
}

export function allParticipantsSubmitted(responseCount: number, participantCount: number): boolean {
  return participantCount > 0 && responseCount >= participantCount;
}
