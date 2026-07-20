"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ClientApiError } from "@/lib/api/client";
import { useViewer } from "@/components/providers";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/fields";

export default function SignInPage() {
  const router = useRouter();
  const { refresh } = useViewer();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Please fill in both your email and password.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ onboardingComplete: boolean }>("/api/auth/signin", {
        email: email.trim().toLowerCase(),
        password,
      });
      await refresh();
      router.replace(res.onboardingComplete ? "/home" : "/onboarding");
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Your people missed you. Let's pick up where you left off."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-terracotta-600 hover:underline">
            Create your Friendship DNA
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          error={error ?? undefined}
        />
        <Button type="submit" full size="lg" loading={busy}>
          Sign in
        </Button>
        <p className="text-center text-xs text-ink-faint">
          Demo account: <span className="font-semibold">amirah@demo.soultribe.app</span> ·{" "}
          <span className="font-semibold">friendship-2026</span>
        </p>
      </form>
    </AuthCard>
  );
}
