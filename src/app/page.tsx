const CORE_OBJECTS = [
  { emoji: "👤", name: "User", blurb: "A person participating in a movie match. Has a nickname and answers the quiz." },
  { emoji: "🎬", name: "Movie", blurb: "Genres, runtime, age rating, mood, streaming platforms, release year, description." },
  { emoji: "❓", name: "Quiz Response", blurb: "A user's answers about genres, mood, runtime, and language." },
  { emoji: "🤝", name: "Match Session", blurb: "A shared room where users join, answer the quiz, and get a recommendation together." },
  { emoji: "✨", name: "Recommendation", blurb: "The movie (or top 3) that best fits everyone's combined preferences." },
] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center gap-12 px-6 py-24 sm:items-start">
        <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            MatchFlix
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Two or more people answer a short movie preference quiz and instantly get a
            recommendation that matches everyone&apos;s tastes.
          </p>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-2">
          {CORE_OBJECTS.map(({ emoji, name, blurb }) => (
            <div
              key={name}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-center gap-2 text-base font-medium text-zinc-950 dark:text-zinc-50">
                <span aria-hidden>{emoji}</span>
                {name}
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{blurb}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          This is the foundation. Every feature past this page starts with{" "}
          <code className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-800">/createspec</code>.
        </p>
      </main>
    </div>
  );
}
