"use client";

/**
 * Pitch an outing — a 4-step stepper (PRD §9):
 *  1. The idea (category, title, pitch — with AI wording help)
 *  2. When & where (date/time, duration, area, exact venue — venue stays
 *     hidden from non-members)
 *  3. The vibe (energy, depth, budget, comfort, languages)
 *  4. Who joins (capacity, format, approval mode, min fit band, host prompt)
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, Wand2, Lock } from "lucide-react";
import { api, ClientApiError } from "@/lib/api/client";
import { useToast } from "@/components/providers";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/fields";
import { Chip } from "@/components/ui/Chip";
import { CATEGORY_LABELS, CATEGORY_EMOJI, BUDGET_LABELS } from "@/lib/utils";
import { AREAS, OUTING_CATEGORIES } from "@/lib/validation/schemas";
import { FIT_BAND_LABELS, type FitBand } from "@/lib/matching/types";
import type { SerializedOuting } from "@/lib/server/serializers";

const STEPS = ["The idea", "When & where", "The vibe", "Who joins"] as const;

interface Draft {
  category: string;
  title: string;
  pitch: string;
  date: string;
  time: string;
  durationMins: number;
  area: string;
  venueName: string;
  venueAddress: string;
  budgetBand: string;
  energyLevel: string;
  conversationDepth: string;
  structured: boolean;
  alcoholFree: boolean;
  indoor: boolean;
  wheelchairAccessible: boolean;
  languages: string[];
  firstTimerFriendly: boolean;
  capacity: number;
  groupFormat: string;
  visibility: string;
  approvalMode: string;
  requestDeadlineHoursBefore: number;
  minFitBand: string;
  hostPrompt: string;
}

const LANG_OPTIONS = ["english", "mandarin", "malay", "tamil", "cantonese"];
const LANG_LABELS: Record<string, string> = {
  english: "English",
  mandarin: "Mandarin",
  malay: "Malay",
  tamil: "Tamil",
  cantonese: "Cantonese",
};

function defaultDraft(): Draft {
  const d = new Date(Date.now() + 4 * 24 * 3600 * 1000);
  const date = d.toISOString().slice(0, 10);
  return {
    category: "coffee",
    title: "",
    pitch: "",
    date,
    time: "10:30",
    durationMins: 90,
    area: AREAS[0],
    venueName: "",
    venueAddress: "",
    budgetBand: "under_20",
    energyLevel: "calm",
    conversationDepth: "mixed",
    structured: false,
    alcoholFree: true,
    indoor: true,
    wheelchairAccessible: false,
    languages: ["english"],
    firstTimerFriendly: true,
    capacity: 4,
    groupFormat: "small_group",
    visibility: "public",
    approvalMode: "approval",
    requestDeadlineHoursBefore: 12,
    minFitBand: "none",
    hostPrompt: "What's something you're quietly into these days?",
  };
}

function SegmentedRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o.value} selected={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export default function NewOutingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [polishing, setPolishing] = useState(false);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setErrors((e) => ({ ...e, [key]: "" }));
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const startsAt = useMemo(() => {
    const dt = new Date(`${draft.date}T${draft.time}:00+08:00`);
    return dt.getTime();
  }, [draft.date, draft.time]);

  function validateStep(): boolean {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (draft.title.trim().length < 6) next.title = "Give it a short, clear title (6+ characters).";
      if (draft.pitch.trim().length < 30)
        next.pitch = "Tell people a little more — at least 30 characters.";
    }
    if (step === 1) {
      if (!Number.isFinite(startsAt) || startsAt < Date.now() + 3600_000)
        next.date = "Pick a time at least an hour from now.";
      if (draft.venueName.trim().length < 3) next.venueName = "Name the spot (3+ characters).";
      if (draft.venueAddress.trim().length < 5)
        next.venueAddress = "An address helps people plan (5+ characters).";
    }
    if (step === 2) {
      if (draft.languages.length === 0) next.languages = "Pick at least one language.";
    }
    if (step === 3) {
      if (draft.hostPrompt.trim().length < 5)
        next.hostPrompt = "A little icebreaker goes a long way.";
    }
    setErrors(next);
    return Object.values(next).every((v) => !v);
  }

  async function polish() {
    if (draft.title.trim().length < 3 && draft.pitch.trim().length < 10) {
      toast("Write a rough title or pitch first — then I'll warm it up.", "info");
      return;
    }
    setPolishing(true);
    try {
      const res = await api.post<{ suggestion: { title: string; pitch: string } }>(
        "/api/outings/wording",
        { title: draft.title, pitch: draft.pitch, category: draft.category }
      );
      setDraft((d) => ({
        ...d,
        title: res.suggestion.title || d.title,
        pitch: res.suggestion.pitch || d.pitch,
      }));
      toast("Warmed up your wording — edit anything you like.", "success");
    } catch (err) {
      toast(
        err instanceof ClientApiError ? err.message : "Couldn't polish just now.",
        "error"
      );
    } finally {
      setPolishing(false);
    }
  }

  async function submit() {
    if (!validateStep()) return;
    setBusy(true);
    try {
      const res = await api.post<{ outing: SerializedOuting }>("/api/outings", {
        title: draft.title.trim(),
        pitch: draft.pitch.trim(),
        category: draft.category,
        startsAt,
        durationMins: draft.durationMins,
        area: draft.area,
        venueName: draft.venueName.trim(),
        venueAddress: draft.venueAddress.trim(),
        capacity: draft.groupFormat === "one_on_one" ? 1 : draft.capacity,
        groupFormat: draft.groupFormat,
        visibility: draft.visibility,
        approvalMode: draft.approvalMode,
        requestDeadlineHoursBefore: draft.requestDeadlineHoursBefore,
        hostPrompt: draft.hostPrompt.trim(),
        preferences: {
          budgetBand: draft.budgetBand,
          energyLevel: draft.energyLevel,
          conversationDepth: draft.conversationDepth,
          structured: draft.structured,
          alcoholFree: draft.alcoholFree,
          indoor: draft.indoor,
          wheelchairAccessible: draft.wheelchairAccessible,
          languages: draft.languages,
          firstTimerFriendly: draft.firstTimerFriendly,
          minFitBand: draft.minFitBand,
        },
      });
      toast("Your outing is live. We'll send kindred folks your way.", "success");
      router.replace(`/outings/${res.outing.id}`);
    } catch (err) {
      toast(
        err instanceof ClientApiError ? err.message : "Couldn't create the outing — try again.",
        "error"
      );
      setBusy(false);
    }
  }

  function next() {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      void submit();
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        eyebrow="Pitch an outing"
        title={STEPS[step]}
        subtitle="Small, warm plans — the kind that turn strangers into regulars."
      />

      {/* Stepper */}
      <div className="mb-6 flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={clsx(
              "h-1.5 flex-1 rounded-pill transition-colors duration-300",
              i <= step ? "bg-terracotta-500" : "bg-sand-200"
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          {step === 0 && (
            <>
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">What kind of outing?</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {OUTING_CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set("category", c)}
                      aria-pressed={draft.category === c}
                      className={clsx(
                        "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all active:scale-[0.98]",
                        draft.category === c
                          ? "border-terracotta-500 bg-terracotta-500/5 text-terracotta-700"
                          : "border-sand-300 bg-surface-raised text-ink hover:border-terracotta-300"
                      )}
                    >
                      <span aria-hidden>{CATEGORY_EMOJI[c]}</span>
                      <span className="leading-tight">{CATEGORY_LABELS[c]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Input
                label="Title"
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Slow Saturday kopi & good questions"
                maxLength={80}
                error={errors.title || undefined}
              />
              <Textarea
                label="Your pitch"
                value={draft.pitch}
                onChange={(e) => set("pitch", e.target.value)}
                placeholder="What's the plan, and what kind of company are you hoping for? Write it like a note to a future friend."
                rows={4}
                maxLength={600}
                error={errors.pitch || undefined}
                hint={`${draft.pitch.length}/600`}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={polish}
                loading={polishing}
                icon={<Wand2 className="h-4 w-4" />}
              >
                Warm up my wording
              </Button>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => set("date", e.target.value)}
                  error={errors.date || undefined}
                />
                <Input
                  label="Start time"
                  type="time"
                  value={draft.time}
                  onChange={(e) => set("time", e.target.value)}
                />
              </div>
              <SegmentedRow
                label="Roughly how long?"
                value={String(draft.durationMins)}
                onChange={(v) => set("durationMins", Number(v))}
                options={[
                  { value: "60", label: "1 hour" },
                  { value: "90", label: "1.5 hours" },
                  { value: "120", label: "2 hours" },
                  { value: "180", label: "3 hours" },
                ]}
              />
              <Select
                label="Neighborhood"
                value={draft.area}
                onChange={(e) => set("area", e.target.value)}
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
              <Input
                label="Venue name"
                value={draft.venueName}
                onChange={(e) => set("venueName", e.target.value)}
                placeholder="Tiong Bahru Bakery"
                maxLength={80}
                error={errors.venueName || undefined}
              />
              <Input
                label="Venue address"
                value={draft.venueAddress}
                onChange={(e) => set("venueAddress", e.target.value)}
                placeholder="56 Eng Hoon St, #01-70"
                maxLength={160}
                error={errors.venueAddress || undefined}
              />
              <p className="flex items-start gap-2 rounded-xl bg-sand-100 px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Only the neighborhood shows publicly. The exact venue is revealed to people you
                accept — a small privacy layer that keeps everyone comfortable.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <SegmentedRow
                label="Energy"
                value={draft.energyLevel}
                onChange={(v) => set("energyLevel", v)}
                options={[
                  { value: "calm", label: "Calm & cozy" },
                  { value: "balanced", label: "Balanced" },
                  { value: "lively", label: "Lively" },
                ]}
              />
              <SegmentedRow
                label="Conversation"
                value={draft.conversationDepth}
                onChange={(v) => set("conversationDepth", v)}
                options={[
                  { value: "light", label: "Light & fun" },
                  { value: "mixed", label: "A natural drift" },
                  { value: "deep", label: "The real stuff" },
                ]}
              />
              <SegmentedRow
                label="Budget"
                value={draft.budgetBand}
                onChange={(v) => set("budgetBand", v)}
                options={Object.entries(BUDGET_LABELS).map(([value, label]) => ({ value, label }))}
              />
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Comfort & setting</p>
                <div className="flex flex-wrap gap-2">
                  <Chip tone="forest" selected={draft.alcoholFree} onClick={() => set("alcoholFree", !draft.alcoholFree)}>
                    Alcohol-free
                  </Chip>
                  <Chip tone="forest" selected={draft.indoor} onClick={() => set("indoor", !draft.indoor)}>
                    Indoors
                  </Chip>
                  <Chip
                    tone="forest"
                    selected={draft.wheelchairAccessible}
                    onClick={() => set("wheelchairAccessible", !draft.wheelchairAccessible)}
                  >
                    Step-free access
                  </Chip>
                  <Chip tone="forest" selected={draft.structured} onClick={() => set("structured", !draft.structured)}>
                    Has an activity
                  </Chip>
                  <Chip
                    tone="forest"
                    selected={draft.firstTimerFriendly}
                    onClick={() => set("firstTimerFriendly", !draft.firstTimerFriendly)}
                  >
                    First-timer friendly
                  </Chip>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Languages</p>
                <div className="flex flex-wrap gap-2">
                  {LANG_OPTIONS.map((l) => (
                    <Chip
                      key={l}
                      selected={draft.languages.includes(l)}
                      onClick={() =>
                        set(
                          "languages",
                          draft.languages.includes(l)
                            ? draft.languages.filter((x) => x !== l)
                            : [...draft.languages, l]
                        )
                      }
                    >
                      {LANG_LABELS[l]}
                    </Chip>
                  ))}
                </div>
                {errors.languages && (
                  <p role="alert" className="mt-2 text-xs font-medium text-danger">
                    {errors.languages}
                  </p>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <SegmentedRow
                label="Format"
                value={draft.groupFormat}
                onChange={(v) => set("groupFormat", v)}
                options={[
                  { value: "one_on_one", label: "One-on-one" },
                  { value: "small_group", label: "Small group" },
                ]}
              />
              {draft.groupFormat === "small_group" && (
                <SegmentedRow
                  label="How many guests? (besides you)"
                  value={String(draft.capacity)}
                  onChange={(v) => set("capacity", Number(v))}
                  options={[2, 3, 4, 5, 6, 8].map((n) => ({ value: String(n), label: String(n) }))}
                />
              )}
              <SegmentedRow
                label="Who can find it?"
                value={draft.visibility}
                onChange={(v) => set("visibility", v)}
                options={[
                  { value: "public", label: "Anyone on Soul Tribe" },
                  { value: "recommended_only", label: "Only people we match to it" },
                ]}
              />
              <SegmentedRow
                label="Joining"
                value={draft.approvalMode}
                onChange={(v) => set("approvalMode", v)}
                options={[
                  { value: "approval", label: "I approve requests" },
                  { value: "open", label: "Open — first come, first in" },
                ]}
              />
              <SegmentedRow
                label="Requests close"
                value={String(draft.requestDeadlineHoursBefore)}
                onChange={(v) => set("requestDeadlineHoursBefore", Number(v))}
                options={[
                  { value: "6", label: "6h before" },
                  { value: "12", label: "12h before" },
                  { value: "24", label: "1 day before" },
                  { value: "48", label: "2 days before" },
                ]}
              />
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Minimum compatibility</p>
                <div className="flex flex-wrap gap-2">
                  <Chip selected={draft.minFitBand === "none"} onClick={() => set("minFitBand", "none")}>
                    Open to everyone
                  </Chip>
                  {(["worth_exploring", "promising", "strong"] as FitBand[]).map((b) => (
                    <Chip key={b} selected={draft.minFitBand === b} onClick={() => set("minFitBand", b)}>
                      {FIT_BAND_LABELS[b]}+
                    </Chip>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                  If someone doesn't meet the bar, they simply see the outing as unavailable —
                  never a rejection.
                </p>
              </div>
              <Textarea
                label="A question for people who join"
                value={draft.hostPrompt}
                onChange={(e) => set("hostPrompt", e.target.value)}
                rows={2}
                maxLength={160}
                error={errors.hostPrompt || undefined}
                hint="Posted in the outing chat as a gentle icebreaker."
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex items-center gap-3">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)} icon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        )}
        <div className="flex-1" />
        <Button onClick={next} loading={busy} icon={<ArrowRight className="h-4 w-4" />}>
          {step === STEPS.length - 1 ? "Publish outing" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
