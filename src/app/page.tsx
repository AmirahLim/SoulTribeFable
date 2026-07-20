"use client";

/**
 * Landing / welcome. Signed-in visitors are routed straight to the app;
 * everyone else gets the warm pitch and entry points.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, HeartHandshake, MapPin, ShieldCheck } from "lucide-react";
import { useViewer } from "@/components/providers";

const PILLARS = [
  {
    Icon: Sparkles,
    title: "Friendship DNA",
    body: "A warm, 5-minute conversation about how you connect — not a personality test.",
  },
  {
    Icon: HeartHandshake,
    title: "Explainable matches",
    body: "Every introduction comes with the why: shared values, rhythm, and what might take patience.",
  },
  {
    Icon: MapPin,
    title: "Real-life outings",
    body: "Small, intentional plans around Singapore. No feeds, no swiping, no ghost towns.",
  },
  {
    Icon: ShieldCheck,
    title: "Safety by design",
    body: "Private reflections, kind decline copy, and boundaries honored silently.",
  },
];

export default function LandingPage() {
  const { viewer, loading } = useViewer();
  const router = useRouter();

  useEffect(() => {
    if (loading || !viewer) return;
    router.replace(viewer.user.onboardingComplete ? "/home" : "/onboarding");
  }, [loading, viewer, router]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient blobs */}
      <div
        aria-hidden
        className="organic-blob absolute -right-24 -top-24 h-80 w-80 bg-terracotta-300/20"
      />
      <div
        aria-hidden
        className="organic-blob absolute -left-28 top-1/2 h-72 w-72 bg-forest-400/10"
      />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="organic-blob flex h-10 w-10 items-center justify-center bg-terracotta-500 font-display text-xl text-sand-50">
              S
            </span>
            <span className="font-display text-xl font-medium text-ink">Soul Tribe</span>
          </div>
          <Link
            href="/signin"
            className="rounded-pill border border-sand-300 bg-surface-raised px-5 py-2 text-sm font-semibold text-ink transition-colors hover:border-terracotta-400"
          >
            Sign in
          </Link>
        </header>

        <main className="flex flex-1 flex-col justify-center py-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.21, 0.65, 0.36, 1] }}
            className="max-w-2xl"
          >
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-terracotta-500">
              Meaningful friendship, by design
            </p>
            <h1 className="font-display text-4xl font-medium leading-[1.12] text-ink sm:text-6xl">
              Find your people, <span className="italic text-terracotta-600">not more profiles.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Soul Tribe pairs deep compatibility with real plans — a few thoughtful
              introductions each week, and cozy outings across Singapore designed for
              friendships that actually stick.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center rounded-pill bg-terracotta-500 px-7 text-base font-semibold text-sand-50 shadow-soft transition-all hover:bg-terracotta-600 active:scale-[0.98]"
              >
                Begin your Friendship DNA
              </Link>
              <span className="text-sm text-ink-faint">Free while we grow · Singapore first</span>
            </div>
          </motion.div>

          <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map(({ Icon, title, body }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
                className="rounded-card border border-sand-200/80 bg-surface-raised p-5 shadow-soft"
              >
                <span className="organic-blob mb-3 flex h-10 w-10 items-center justify-center bg-sand-100">
                  <Icon className="h-5 w-5 text-terracotta-600" aria-hidden />
                </span>
                <h2 className="font-display text-base font-medium text-ink">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
              </motion.div>
            ))}
          </div>
        </main>

        <footer className="pb-4 text-center text-xs text-ink-faint">
          Made with warmth in Singapore · Your emotional data stays private, always.
        </footer>
      </div>
    </div>
  );
}
