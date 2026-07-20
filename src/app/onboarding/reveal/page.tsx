"use client";

/**
 * DNA reveal — the emotional payoff of onboarding (PRD §5).
 * Shows the synthesized portrait with tentative "you seem to…" language.
 * Every section can be edited, hidden, or regenerated — the person stays
 * in control of how they're described.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, PencilLine, RefreshCw, Check, ArrowRight } from "lucide-react";
import { api } from "@/lib/api/client";
import { useViewer, useToast } from "@/components/providers";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/fields";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DnaSummaryResult, DnaSummarySection } from "@/lib/ai/provider";

type Summary = Pick<DnaSummaryResult, "headline" | "sections">;

export default function RevealPage() {
  const router = useRouter();
  const { viewer, loading } = useViewer();
  const { toast } = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!viewer) {
      router.replace("/signin");
      return;
    }
    api
      .get<{ summary: Summary }>("/api/dna/summary")
      .then((res) => setSummary(res.summary))
      .catch(() => router.replace("/onboarding"));
  }, [loading, viewer, router]);

  async function patch(body: unknown, note?: string) {
    setBusy(true);
    try {
      const res = await api.patch<{ summary: Summary }>("/api/dna/summary", body);
      setSummary(res.summary);
      if (note) toast(note, "success");
    } catch {
      toast("Couldn't update that just now — please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(s: DnaSummarySection) {
    setEditingId(s.id);
    setDraft(s.text);
  }

  async function saveEdit(s: DnaSummarySection) {
    await patch(
      { sections: [{ id: s.id, text: draft.trim().slice(0, 400), hidden: s.hidden }] },
      "Saved — it's your story."
    );
    setEditingId(null);
  }

  if (loading || !summary) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-12">
        <Skeleton className="h-20 w-20 !rounded-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-lg px-4 pb-24 pt-10">
      <div
        aria-hidden
        className="organic-blob absolute -right-16 -top-8 -z-10 h-56 w-56 bg-gold-400/10"
      />

      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center"
      >
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-terracotta-500">
          Your Friendship DNA
        </p>
        <h1 className="font-display text-3xl font-medium leading-snug text-ink">
          {summary.headline}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          This is how we'll introduce you to compatible people. Edit anything that doesn't
          feel like you — or hide it entirely.
        </p>
      </motion.header>

      <div className="space-y-4">
        {summary.sections.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 + i * 0.09 }}
            className={
              "rounded-card border p-5 shadow-soft transition-opacity " +
              (s.hidden
                ? "border-sand-200 bg-surface-sunken opacity-60"
                : "border-sand-200/80 bg-surface-raised")
            }
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-terracotta-500">
                {s.dimension.replace(/_/g, " ")}
                {s.edited && <span className="ml-2 font-medium normal-case text-ink-faint">· in your words</span>}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(s)}
                  aria-label={`Edit ${s.dimension} section`}
                  className="rounded-full p-1.5 text-ink-faint transition-colors hover:bg-sand-100 hover:text-ink"
                >
                  <PencilLine className="h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    patch(
                      { sections: [{ id: s.id, text: s.text, hidden: !s.hidden }] },
                      s.hidden ? "Section visible again." : "Hidden — only you decide what shows."
                    )
                  }
                  aria-label={s.hidden ? "Show section" : "Hide section"}
                  className="rounded-full p-1.5 text-ink-faint transition-colors hover:bg-sand-100 hover:text-ink"
                >
                  {s.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {editingId === s.id ? (
              <div className="space-y-3">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  maxLength={400}
                  aria-label="Edit section text"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" loading={busy} onClick={() => saveEdit(s)} icon={<Check className="h-4 w-4" />}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[15px] leading-relaxed text-ink">{s.text}</p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        <Button
          variant="secondary"
          loading={busy}
          onClick={() => patch({ regenerate: true }, "Rewoven — same you, fresh words.")}
          icon={<RefreshCw className="h-4 w-4" />}
        >
          Reword my summary
        </Button>
        <Button size="lg" full onClick={() => router.push("/home")} icon={<ArrowRight className="h-4 w-4" />}>
          Meet my first matches
        </Button>
        <p className="text-center text-xs leading-relaxed text-ink-faint">
          Sections marked private never appear to others — they only guide matching.
        </p>
      </div>
    </div>
  );
}
