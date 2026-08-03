"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shares the current match page's URL via the Web Share API where available
// (mobile browsers, mostly), falling back to a clipboard copy — same
// fallback pattern as the lobby's "Copy invite link" button.
export function ShareResultsButton() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Our MatchFlix results", url });
      } catch {
        // User cancelled the share sheet — not an error.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="lg" className="w-full gap-2" onClick={handleShare}>
      {copied ? "Link copied" : "Share your results"}
      <Share2 className="size-4" aria-hidden />
    </Button>
  );
}
