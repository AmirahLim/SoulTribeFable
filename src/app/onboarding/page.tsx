"use client";

/**
 * Friendship DNA onboarding — a conversation, not a test (PRD §5).
 *  - 7 progressive steps with warm copy and a growing progress vine
 *  - Autosaves each step (resume-safe via onboardingStep)
 *  - Sensitive step 5 carries consent copy and is fully skippable
 *  - Every question explains "how this helps matching"
 *  - Ends with synthesis → the DNA reveal
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, HelpCircle, Lock, Sparkles } from "lucide-react";
import { api, ClientApiError } from "@/lib/api/client";
import { useViewer, useToast } from "@/components/providers";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/fields";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  DNA_STEPS,
  TOTAL_DNA_STEPS,
  questionsForStep,
  type DnaQuestion,
} from "@/lib/dna/questions";

type AnswerValue = string | number | string[];
type AnswerMap = Record<string, AnswerValue>;

/* ------------------------------------------------------------------ */
/* Per-type question renderers                                         */
/* ------------------------------------------------------------------ */

function OptionCards({
  q,
  value,
  onChange,
}: {
  q: DnaQuestion;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  return (
    <div className="grid gap-2.5">
      {q.options!.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={clsx(
              "rounded-card border px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99]",
              selected
                ? "border-terracotta-500 bg-terracotta-500/5 shadow-soft"
                : "border-sand-300 bg-surface-raised hover:border-terracotta-300"
            )}
          >
            <span
              className={clsx(
                "block text-[15px] font-semibold",
                selected ? "text-terracotta-700" : "text-ink"
              )}
            >
              {opt.label}
            </span>
            {opt.description && (
              <span className="mt-0.5 block text-sm text-ink-soft">{opt.description}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function MultiChips({
  q,
  value,
  onChange,
}: {
  q: DnaQuestion;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  const selected = Array.isArray(value) ? value : [];
  const max = q.maxSelections ?? 12;

  function toggle(v: string) {
    if (selected.includes(v)) onChange(selected.filter((s) => s !== v));
    else if (selected.length < max) onChange([...selected, v]);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {q.options!.map((opt) => (
          <Chip
            key={opt.value}
            selected={selected.includes(opt.value)}
            onClick={() => toggle(opt.value)}
          >
            {opt.label}
          </Chip>
        ))}
      </div>
      {q.maxSelections && (
        <p className="mt-2 text-xs text-ink-faint">
          Up to {q.maxSelections} — {selected.length} chosen
        </p>
      )}
    </div>
  );
}

function SliderField({
  q,
  value,
  onChange,
}: {
  q: DnaQuestion;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  const num = typeof value === "number" ? value : 50;
  const touched = typeof value === "number";
  return (
    <div>
      <input
        type="range"
        min={q.min ?? 0}
        max={q.max ?? 100}
        step={5}
        value={num}
        aria-label={q.prompt}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-pill bg-sand-200 accent-terracotta-500"
      />
      <div className="mt-2 flex justify-between gap-4 text-xs text-ink-faint">
        <span className={clsx(touched && num <= 35 && "font-semibold text-terracotta-600")}>
          {q.minLabel}
        </span>
        <span className={clsx(touched && num >= 65 && "font-semibold text-terracotta-600")}>
          {q.maxLabel}
        </span>
      </div>
      {!touched && (
        <p className="mt-1.5 text-center text-xs italic text-ink-faint">
          Slide to wherever feels honest
        </p>
      )}
    </div>
  );
}

function QuestionBlock({
  q,
  value,
  onChange,
}: {
  q: DnaQuestion;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  return (
    <fieldset className="rounded-card border border-sand-200/80 bg-surface-raised p-5 shadow-soft">
      <legend className="sr-only">{q.prompt}</legend>
      <div className="mb-1 flex items-start justify-between gap-3">
        <p className="text-[15px] font-semibold leading-snug text-ink">
          {q.prompt}
          {q.optional && <span className="ml-2 text-xs font-medium text-ink-faint">optional</span>}
        </p>
        <button
          type="button"
          onClick={() => setShowWhy((s) => !s)}
          aria-expanded={showWhy}
          aria-label="How this helps matching"
          className="mt-0.5 shrink-0 text-ink-faint transition-colors hover:text-terracotta-600"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
      {q.helper && <p className="mb-3 text-xs text-ink-faint">{q.helper}</p>}
      <AnimatePresence initial={false}>
        {showWhy && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden rounded-xl bg-sand-100 px-3 py-2 text-xs leading-relaxed text-ink-soft"
          >
            {q.howThisHelps}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="mt-3">
        {(q.type === "single" || q.type === "scenario") && (
          <OptionCards q={q} value={value} onChange={onChange} />
        )}
        {(q.type === "multi" || q.type === "tags") && (
          <MultiChips q={q} value={value} onChange={onChange} />
        )}
        {q.type === "slider" && <SliderField q={q} value={value} onChange={onChange} />}
        {q.type === "text" && (
          <Textarea
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={q.placeholder}
            maxLength={q.maxLength}
            rows={3}
            hint={
              q.maxLength
                ? `${typeof value === "string" ? value.length : 0}/${q.maxLength}`
                : undefined
            }
          />
        )}
      </div>
      {q.privacyLevel === "private" && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint">
          <Lock className="h-3 w-3" aria-hidden /> Private — used for matching only, never shown.
        </p>
      )}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Wizard                                                              */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const router = useRouter();
  const { viewer, loading, refresh } = useViewer();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);

  // Route guards + resume.
  useEffect(() => {
    if (loading) return;
    if (!viewer) {
      router.replace("/signin");
      return;
    }
    if (viewer.user.onboardingComplete) {
      router.replace("/home");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ answers: AnswerMap; onboardingStep: number }>(
          "/api/dna/answers"
        );
        if (cancelled) return;
        setAnswers(res.answers ?? {});
        setStep(Math.min(Math.max(res.onboardingStep, 1), TOTAL_DNA_STEPS));
      } catch {
        /* start fresh */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, viewer, router]);

  const stepMeta = DNA_STEPS[step - 1];
  const stepQuestions = useMemo(() => questionsForStep(step), [step]);

  function answered(q: DnaQuestion): boolean {
    const v = answers[q.id];
    if (v === undefined || v === null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }

  const missingRequired = stepQuestions.filter((q) => !q.optional && !answered(q));

  function setAnswer(id: string, v: AnswerValue) {
    setValidation(null);
    setAnswers((prev) => ({ ...prev, [id]: v }));
  }

  async function saveStep(targetStep: number): Promise<boolean> {
    const payload: AnswerMap = {};
    for (const q of stepQuestions) {
      const v = answers[q.id];
      if (v !== undefined && (!Array.isArray(v) || v.length > 0)) {
        payload[q.id] = typeof v === "string" ? v : v;
      }
    }
    try {
      await api.post("/api/dna/answers", { step: targetStep, answers: payload });
      return true;
    } catch (err) {
      toast(
        err instanceof ClientApiError ? err.message : "Couldn't save just now — please retry.",
        "error"
      );
      return false;
    }
  }

  async function next() {
    if (missingRequired.length > 0) {
      setValidation(
        missingRequired.length === 1
          ? "One more answer needed on this step."
          : `${missingRequired.length} answers still needed on this step.`
      );
      return;
    }
    setSaving(true);
    const okSave = await saveStep(Math.min(step + 1, TOTAL_DNA_STEPS));
    setSaving(false);
    if (!okSave) return;

    if (step < TOTAL_DNA_STEPS) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Final step → synthesize DNA.
      setSynthesizing(true);
      try {
        await api.post("/api/dna/synthesize", {});
        await refresh();
        router.replace("/onboarding/reveal");
      } catch (err) {
        setSynthesizing(false);
        toast(
          err instanceof ClientApiError
            ? err.message
            : "We couldn't weave your DNA just now — please try again.",
          "error"
        );
      }
    }
  }

  function skipStep() {
    // Only the sensitive step offers a whole-step skip.
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading || !ready) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-12">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (synthesizing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, 4, -4, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          className="organic-blob flex h-24 w-24 items-center justify-center bg-terracotta-500/15"
        >
          <Sparkles className="h-10 w-10 text-terracotta-600" aria-hidden />
        </motion.div>
        <h1 className="mt-8 font-display text-2xl font-medium text-ink">
          Weaving your Friendship DNA…
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
          We're reading between your answers — your rhythm, your depth, the way you show up
          for people.
        </p>
      </div>
    );
  }

  const progress = (step - 1) / TOTAL_DNA_STEPS;

  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-8">
      {/* Progress */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink-faint">
          <span>
            Step {step} of {TOTAL_DNA_STEPS}
          </span>
          <span>~{Math.max(1, TOTAL_DNA_STEPS - step + 1)} min left</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-pill bg-sand-200"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full rounded-pill bg-gradient-to-r from-terracotta-400 to-terracotta-600"
            initial={false}
            animate={{ width: `${Math.max(4, progress * 100)}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.3, ease: [0.21, 0.65, 0.36, 1] }}
        >
          <header className="mb-6">
            <h1 className="font-display text-2xl font-medium text-ink">{stepMeta.title}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{stepMeta.subtitle}</p>
            {stepMeta.consentCopy && (
              <div className="mt-4 flex gap-2.5 rounded-card border border-forest-500/20 bg-forest-600/5 p-4">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden />
                <p className="text-xs leading-relaxed text-forest-700">{stepMeta.consentCopy}</p>
              </div>
            )}
          </header>

          <div className="space-y-4">
            {stepQuestions.map((q) => (
              <QuestionBlock key={q.id} q={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {validation && (
        <p role="alert" className="mt-4 text-center text-sm font-medium text-danger">
          {validation}
        </p>
      )}

      {/* Footer nav */}
      <div className="mt-8 flex items-center gap-3">
        {step > 1 && (
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            icon={<ArrowLeft className="h-4 w-4" />}
            aria-label="Previous step"
          >
            Back
          </Button>
        )}
        <div className="flex-1" />
        {stepMeta.sensitive && (
          <Button variant="secondary" onClick={skipStep}>
            Skip this part
          </Button>
        )}
        <Button onClick={next} loading={saving} icon={<ArrowRight className="h-4 w-4" />}>
          {step === TOTAL_DNA_STEPS ? "Reveal my DNA" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
