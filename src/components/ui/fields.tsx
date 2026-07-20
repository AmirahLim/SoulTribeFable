"use client";

/**
 * Form field primitives with consistent labels, hints and error copy.
 * All fields are controlled; error text is announced to screen readers.
 */

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import clsx from "clsx";

interface FieldWrapProps {
  label?: string;
  hint?: string;
  error?: string;
  id: string;
  children: ReactNode;
}

function FieldWrap({ label, hint, error, id, children }: FieldWrapProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-ink">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full rounded-xl border bg-surface-raised px-4 py-2.5 text-[15px] text-ink placeholder:text-ink-faint transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-terracotta-400/50";

function borderFor(error?: string) {
  return error
    ? "border-danger/60 focus:border-danger"
    : "border-sand-300 focus:border-terracotta-400";
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id: idProp, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldWrap label={label} hint={hint} error={error} id={id}>
      <input
        ref={ref}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={clsx(inputBase, borderFor(error), className)}
        {...rest}
      />
    </FieldWrap>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id: idProp, rows = 4, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldWrap label={label} hint={hint} error={error} id={id}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={clsx(inputBase, borderFor(error), "resize-none leading-relaxed", className)}
        {...rest}
      />
    </FieldWrap>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id: idProp, children, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldWrap label={label} hint={hint} error={error} id={id}>
      <select
        ref={ref}
        id={id}
        aria-invalid={!!error}
        className={clsx(inputBase, borderFor(error), "appearance-none pr-9", className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%236e5e52' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.9rem center",
        }}
        {...rest}
      >
        {children}
      </select>
    </FieldWrap>
  );
});

/** 1–5 slider rendered as tappable stops — friendlier than a native range on mobile. */
export function ScaleField({
  label,
  low,
  high,
  value,
  onChange,
}: {
  label: string;
  low: string;
  high: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <p id={id} className="text-sm font-semibold text-ink">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={id} className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} of 5`}
            onClick={() => onChange(n)}
            className={clsx(
              "h-10 flex-1 rounded-xl border text-sm font-semibold transition-all duration-200 active:scale-95",
              value === n
                ? "border-terracotta-500 bg-terracotta-500 text-sand-50 shadow-soft"
                : "border-sand-300 bg-surface-raised text-ink-faint hover:border-terracotta-300"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-ink-faint">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
