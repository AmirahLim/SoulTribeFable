"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ClientApiError } from "@/lib/api/client";
import { useViewer } from "@/components/providers";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/fields";

export default function SignUpPage() {
  const router = useRouter();
  const { refresh } = useViewer();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (displayName.trim().length < 2) next.displayName = "Tell us what to call you (2+ characters).";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = "That email doesn't look quite right.";
    if (password.length < 10) next.password = "Use at least 10 characters — a short phrase works well.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      await api.post("/api/auth/signup", {
        email: email.trim().toLowerCase(),
        password,
        displayName: displayName.trim(),
      });
      await refresh();
      router.replace("/onboarding");
    } catch (err) {
      const message =
        err instanceof ClientApiError ? err.message : "Something went wrong. Please try again.";
      setErrors({ email: message });
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Let's begin"
      subtitle="First an account, then a short conversation about how you connect. About 5 minutes, at your own pace."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/signin" className="font-semibold text-terracotta-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="What should friends call you?"
          autoComplete="nickname"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your first name or nickname"
          error={errors.displayName}
          maxLength={40}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          error={errors.email}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 10 characters"
          hint="A memorable phrase beats a complicated jumble."
          error={errors.password}
        />
        <Button type="submit" full size="lg" loading={busy}>
          Create account
        </Button>
        <p className="text-center text-xs leading-relaxed text-ink-faint">
          Your emotional answers are used only for matching — never shown publicly, never sold.
        </p>
      </form>
    </AuthCard>
  );
}
