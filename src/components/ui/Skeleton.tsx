"use client";

import clsx from "clsx";

/** Shimmering placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("skeleton", className)} />;
}

/** Standard card-shaped skeleton for list loading states. */
export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="rounded-card border border-sand-200/80 bg-surface-raised p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 !rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={clsx("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} lines={lines} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
