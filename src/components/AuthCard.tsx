"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

/** Shared warm frame for the signin/signup screens. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="organic-blob absolute -left-20 -top-16 h-64 w-64 bg-terracotta-300/15"
      />
      <div
        aria-hidden
        className="organic-blob absolute -bottom-20 -right-16 h-72 w-72 bg-forest-400/10"
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.21, 0.65, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="organic-blob flex h-10 w-10 items-center justify-center bg-terracotta-500 font-display text-xl text-sand-50">
            S
          </span>
          <span className="font-display text-xl font-medium text-ink">Soul Tribe</span>
        </Link>
        <div className="rounded-card border border-sand-200/80 bg-surface-raised p-7 shadow-lift sm:p-8">
          <h1 className="font-display text-2xl font-medium text-ink">{title}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-5 text-center text-sm text-ink-soft">{footer}</p>
      </motion.div>
    </div>
  );
}
