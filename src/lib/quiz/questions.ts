// Fixed MVP quiz content — questions live in code, not the database (CLAUDE.md).
// The order of QUIZ_QUESTIONS is the order the wizard presents them in, and its
// length drives the "Question X of N" progress indicator.

export type QuestionOption = { value: string; label: string };

// TMDb's standard movie genre list, hardcoded for now (no live TMDb call yet —
// that's the Streaming Integration spec) so answers already line up with real
// TMDb genre names once Match Logic wires in.
const GENRE_OPTIONS: QuestionOption[] = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Science Fiction",
  "TV Movie",
  "Thriller",
  "War",
  "Western",
].map((genre) => ({ value: genre, label: genre }));

const MOOD_OPTIONS: QuestionOption[] = [
  { value: "funny", label: "Funny" },
  { value: "exciting", label: "Exciting" },
  { value: "emotional", label: "Emotional" },
  { value: "scary", label: "Scary" },
  { value: "feel_good", label: "Feel-good" },
  { value: "thought_provoking", label: "Thought-provoking" },
];

const RUNTIME_OPTIONS: QuestionOption[] = [
  { value: "under_90", label: "Up to 90 min" },
  { value: "under_120", label: "Up to 2 hours" },
  { value: "under_150", label: "Up to 2.5 hours" },
  { value: "no_limit", label: "No limit" },
];

const MEDIA_TYPE_OPTIONS: QuestionOption[] = [
  { value: "movie", label: "Movie" },
  { value: "tv", label: "TV show" },
];

const RELEASE_PREFERENCE_OPTIONS: QuestionOption[] = [
  { value: "new", label: "New releases" },
  { value: "old", label: "Older / classics" },
  { value: "no_preference", label: "No preference" },
];

export type QuizQuestion =
  | {
      id: "preferredGenres" | "avoidedGenres";
      kind: "multi";
      required: boolean;
      title: string;
      options: QuestionOption[];
    }
  | {
      id: "mood" | "runtimeBucket" | "mediaType" | "releasePreference";
      kind: "single";
      required: true;
      title: string;
      options: QuestionOption[];
    };

export type QuizAnswerId = QuizQuestion["id"];

export type QuizAnswers = {
  preferredGenres: string[];
  avoidedGenres: string[];
  mood: string;
  runtimeBucket: string;
  mediaType: string;
  releasePreference: string;
};

export const EMPTY_QUIZ_ANSWERS: QuizAnswers = {
  preferredGenres: [],
  avoidedGenres: [],
  mood: "",
  runtimeBucket: "",
  mediaType: "",
  releasePreference: "",
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "preferredGenres",
    kind: "multi",
    required: true,
    title: "Which genres do you enjoy?",
    options: GENRE_OPTIONS,
  },
  {
    id: "avoidedGenres",
    kind: "multi",
    required: false,
    title: "Any genres to avoid?",
    options: GENRE_OPTIONS,
  },
  {
    id: "mood",
    kind: "single",
    required: true,
    title: "What's the mood tonight?",
    options: MOOD_OPTIONS,
  },
  {
    id: "runtimeBucket",
    kind: "single",
    required: true,
    title: "How much time do you have?",
    options: RUNTIME_OPTIONS,
  },
  {
    id: "mediaType",
    kind: "single",
    required: true,
    title: "Movie or TV show?",
    options: MEDIA_TYPE_OPTIONS,
  },
  {
    id: "releasePreference",
    kind: "single",
    required: true,
    title: "New releases or classics?",
    options: RELEASE_PREFERENCE_OPTIONS,
  },
];
