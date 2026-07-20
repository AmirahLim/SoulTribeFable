"use client";

/**
 * Trust & Safety report flow (PRD §11). Reassuring, low-friction, and the
 * reported person is never notified.
 */

import { useState } from "react";
import { api } from "@/lib/api/client";
import { useToast } from "@/components/providers";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/fields";
import { REPORT_CATEGORIES } from "@/lib/validation/schemas";
import clsx from "clsx";

export function ReportSheet({
  open,
  onClose,
  subjectType,
  subjectId,
  subjectName,
}: {
  open: boolean;
  onClose: () => void;
  subjectType: "user" | "outing" | "message";
  subjectId: string;
  subjectName: string;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reason) return;
    setBusy(true);
    try {
      await api.post("/api/safety/report", {
        subjectType,
        subjectId,
        category: reason,
        details: details.trim(),
      });
      toast("Thank you for telling us. Our team will review this with care.", "success");
      onClose();
      setReason(null);
      setDetails("");
    } catch {
      toast("Couldn't send the report — please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Report ${subjectName}`}>
      <p className="mb-4 text-sm leading-relaxed text-ink-soft">
        This is confidential — {subjectName} won't know you reported them. We take every
        report seriously.
      </p>
      <div className="space-y-2" role="radiogroup" aria-label="Reason">
        {REPORT_CATEGORIES.map((r) => (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={reason === r.value}
            onClick={() => setReason(r.value)}
            className={clsx(
              "w-full rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition-colors",
              reason === r.value
                ? "border-terracotta-500 bg-terracotta-500/5 text-terracotta-700"
                : "border-sand-300 bg-surface-raised text-ink hover:border-terracotta-300"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Textarea
          label="Anything that would help us understand? (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          maxLength={1000}
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!reason} loading={busy}>
          Send report
        </Button>
      </div>
    </Sheet>
  );
}
