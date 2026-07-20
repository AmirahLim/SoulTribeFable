"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * Warm empty/error state — an organic blob illustration with gentle copy.
 * Per the PRD, empty states should feel like an invitation, never a dead end.
 */
export function EmptyState({
  emoji = "🌿",
  title,
  body,
  action,
}: {
  emoji?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center px-6 py-14 text-center"
    >
      <div className="organic-blob flex h-20 w-20 items-center justify-center bg-sand-100 text-3xl shadow-soft">
        <span aria-hidden>{emoji}</span>
      </div>
      <h3 className="mt-5 font-display text-lg font-medium text-ink">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

export function ErrorState({
  message = "Something went wrong on our side. Please try again in a moment.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      emoji="🫖"
      title="A small hiccup"
      body={message}
      action={
        onRetry && (
          <button
            onClick={onRetry}
            className="rounded-pill border border-sand-300 bg-surface-raised px-5 py-2 text-sm font-semibold text-ink transition-colors hover:border-terracotta-400"
          >
            Try again
          </button>
        )
      }
    />
  );
}
