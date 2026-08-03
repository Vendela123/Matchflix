import Link from "next/link";
import { ArrowRight, Heart, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroIllustration } from "@/components/hero-illustration";

const FEATURES = [
  { icon: Zap, title: "Quick & easy", blurb: "Answer together in minutes" },
  { icon: Users, title: "For any group", blurb: "Friends, couples, roommates" },
  { icon: Heart, title: "Personalized matches", blurb: "Fits your group's combined answers" },
] as const;

const STEPS = [
  { title: "Create or join", blurb: "Start a session and share the code with your group." },
  { title: "Answer the quiz", blurb: "Everyone answers a few quick questions about their taste." },
  { title: "Get matched", blurb: "Instantly see the movie (or top 3) that fits everyone." },
] as const;

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-14rem] left-1/2 h-[34rem] w-[52rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-200/50 via-pink-200/50 to-orange-100/50 blur-3xl"
      />

      <header className="relative flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <div className="font-heading text-2xl font-bold tracking-tight">
          <span className="text-foreground">Match</span>
          <span className="text-pink-500 italic">Flix</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <a href="#how-it-works" className="hover:text-foreground">
            How it works
          </a>
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
        </nav>
        <Button asChild variant="gradient" size="sm" className="gap-1.5 px-4">
          <Link href="/session/new">Get started</Link>
        </Button>
      </header>

      <main className="relative flex w-full max-w-7xl flex-1 flex-col gap-20 px-6 py-12">
        <div className="grid items-center gap-12 md:grid-cols-[1fr_1.15fr]">
          <div className="flex flex-col items-center gap-6 text-center md:items-start md:pl-16 md:text-left">
            <h1 className="font-heading text-5xl leading-[1.1] font-bold tracking-tight text-foreground sm:text-6xl">
              The <span className="text-pink-500 italic">perfect</span> movie night, every time
            </h1>
            <p className="max-w-md text-lg leading-8 text-muted-foreground">
              Answer a few questions together and get recommendations that match your group&apos;s
              taste.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <Button asChild variant="gradient" size="lg" className="gap-2 px-6 text-base">
                <Link href="/session/new">
                  Create a session
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-6 text-base">
                <Link href="/session/join">Join with a code</Link>
              </Button>
            </div>

            <div
              id="features"
              className="grid w-full scroll-mt-24 grid-cols-1 gap-3 rounded-2xl border border-border bg-card/70 p-4 backdrop-blur-sm sm:grid-cols-3"
            >
              {FEATURES.map(({ icon: Icon, title, blurb }) => (
                <div key={title} className="flex items-center gap-3 sm:flex-col sm:text-center">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-orange-100 text-pink-600">
                    <Icon className="size-4" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">{blurb}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <HeroIllustration />
          </div>
        </div>

        <div id="how-it-works" className="flex scroll-mt-24 flex-col items-center gap-8 text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            How it works
          </h2>
          <div className="grid w-full gap-4 sm:grid-cols-3">
            {STEPS.map(({ title, blurb }, index) => (
              <div
                key={title}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6"
              >
                <div className="font-heading flex size-8 items-center justify-center rounded-full bg-pink-100 text-sm font-bold text-pink-600">
                  {index + 1}
                </div>
                <p className="font-semibold text-foreground">{title}</p>
                <p className="text-sm leading-6 text-muted-foreground">{blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
