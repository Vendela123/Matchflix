import {
  Clock,
  Film,
  Ghost,
  Heart,
  History,
  Infinity as InfinityIcon,
  Lightbulb,
  Shuffle,
  Smile,
  Sparkles,
  Sun,
  Tv,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Icon + one-line description per option, for the small single-select
// questions (mood/runtime/media type/release preference) — rendered as
// icon-cards instead of plain pill buttons. Deliberately not in
// src/lib/quiz/questions.ts: that module is plain data importable by the
// scoring/matching code too, and shouldn't need a UI-library dependency.
// Genre questions (19+ options, multi-select) stay as pill chips — an
// icon-card grid doesn't scale to that many options.
export const QUESTION_OPTION_META: Record<string, { icon: LucideIcon; description: string }> = {
  funny: { icon: Smile, description: "Feel-good and entertaining" },
  exciting: { icon: Zap, description: "Action-packed and thrilling" },
  emotional: { icon: Heart, description: "Sweet, emotional and heartwarming" },
  scary: { icon: Ghost, description: "Thrilling and suspenseful" },
  feel_good: { icon: Sun, description: "Warm, uplifting and cozy" },
  thought_provoking: { icon: Lightbulb, description: "Emotional and mind-opening" },

  under_90: { icon: Clock, description: "Quick watch, under 90 minutes" },
  under_120: { icon: Clock, description: "A couple hours" },
  under_150: { icon: Clock, description: "Up to two and a half hours" },
  no_limit: { icon: InfinityIcon, description: "Any length works" },

  movie: { icon: Film, description: "A single feature-length film" },
  tv: { icon: Tv, description: "An episodic TV series" },

  new: { icon: Sparkles, description: "Recent releases" },
  old: { icon: History, description: "Older titles and classics" },
  no_preference: { icon: Shuffle, description: "Either works" },
};
