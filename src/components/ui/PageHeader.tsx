"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

/** Editorial page heading with optional back button and action slot. */
export function PageHeader({
  title,
  eyebrow,
  subtitle,
  back,
  action,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  back?: boolean;
  action?: ReactNode;
}) {
  const router = useRouter();
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mb-6 flex items-start justify-between gap-4"
    >
      <div className="min-w-0">
        {back && (
          <button
            onClick={() => router.back()}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </button>
        )}
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-terracotta-500">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-medium leading-tight text-ink sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </motion.header>
  );
}
