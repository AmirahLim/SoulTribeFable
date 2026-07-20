"use client";

/**
 * Settings — visibility, notification preferences, session and account
 * controls (PRD §7/§12). Calm defaults; the user is always in charge.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { LogOut, PauseCircle, Eye } from "lucide-react";
import { api } from "@/lib/api/client";
import { useViewer, useToast } from "@/components/providers";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { formatSingapore } from "@/lib/utils";

interface NotificationPrefs {
  soulDrop: boolean;
  requests: boolean;
  reminders: boolean;
  reconnect: boolean;
}

interface SettingsResponse {
  email: string;
  notificationPrefs: NotificationPrefs;
  visibility: string;
  memberSince: number;
}

const VISIBILITY_OPTIONS = [
  {
    value: "community",
    label: "Community",
    body: "People in the community can discover you.",
  },
  {
    value: "matches_only",
    label: "Matches only",
    body: "Only people we introduce you to can see your profile.",
  },
  {
    value: "hidden",
    label: "Hidden",
    body: "You won't appear anywhere. You can still browse outings.",
  },
] as const;

const PREF_COPY: { key: keyof NotificationPrefs; label: string; body: string }[] = [
  { key: "soulDrop", label: "Weekly Soul Drop", body: "When your new introductions arrive." },
  { key: "requests", label: "Join requests", body: "When someone asks to join your outing, or a host replies." },
  { key: "reminders", label: "Outing reminders", body: "A nudge before plans you've committed to." },
  { key: "reconnect", label: "Reconnection nudges", body: "Gentle suggestions to meet good matches again." },
];

function ToggleRow({
  label,
  body,
  checked,
  onChange,
}: {
  label: string;
  body: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink-faint">{body}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-7 w-12 shrink-0 rounded-pill transition-colors duration-200",
          checked ? "bg-forest-600" : "bg-sand-300"
        )}
      >
        <span
          className={clsx(
            "absolute top-1 h-5 w-5 rounded-full bg-surface-raised shadow-soft transition-all duration-200",
            checked ? "left-6" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { setViewer, refresh } = useViewer();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pauseOpen, setPauseOpen] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<SettingsResponse>("/api/settings"),
  });

  const savePrefs = useMutation({
    mutationFn: (notificationPrefs: NotificationPrefs) =>
      api.patch("/api/settings", { notificationPrefs }),
    onMutate: async (notificationPrefs) => {
      await queryClient.cancelQueries({ queryKey: ["settings"] });
      const prev = queryClient.getQueryData<SettingsResponse>(["settings"]);
      queryClient.setQueryData<SettingsResponse>(["settings"], (old) =>
        old ? { ...old, notificationPrefs } : old
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["settings"], ctx.prev);
      toast("Couldn't save that preference — please try again.", "error");
    },
  });

  const saveVisibility = useMutation({
    mutationFn: (visibility: string) => api.patch("/api/profile", { visibility }),
    onSuccess: async () => {
      await refresh();
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast("Visibility updated.", "success");
    },
    onError: () => toast("Couldn't update visibility — please try again.", "error"),
  });

  const signOut = useMutation({
    mutationFn: () => api.post("/api/auth/signout", {}),
    onSuccess: () => {
      setViewer(null);
      router.replace("/signin");
    },
  });

  const deactivate = useMutation({
    mutationFn: () => api.post("/api/account/deactivate", {}),
    onSuccess: () => {
      setViewer(null);
      router.replace("/");
    },
    onError: () => toast("Couldn't pause your account — please try again.", "error"),
  });

  const data = settingsQuery.data;

  return (
    <div>
      <PageHeader
        eyebrow="Your controls"
        title="Settings"
        subtitle={
          data
            ? `${data.email} · with us since ${formatSingapore(data.memberSince, {
                withDate: true,
                withTime: false,
              })}`
            : undefined
        }
      />

      {settingsQuery.isLoading ? (
        <CardSkeleton lines={4} />
      ) : settingsQuery.isError || !data ? (
        <ErrorState onRetry={() => settingsQuery.refetch()} />
      ) : (
        <div className="space-y-8">
          {/* Visibility */}
          <section aria-label="Profile visibility">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-medium text-ink">
              <Eye className="h-4 w-4 text-terracotta-600" aria-hidden />
              Who can find you
            </h2>
            <div className="space-y-2" role="radiogroup" aria-label="Profile visibility">
              {VISIBILITY_OPTIONS.map((opt) => {
                const active = data.visibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    role="radio"
                    aria-checked={active}
                    disabled={saveVisibility.isPending}
                    onClick={() => !active && saveVisibility.mutate(opt.value)}
                    className={clsx(
                      "w-full rounded-card border p-4 text-left transition-colors",
                      active
                        ? "border-terracotta-500 bg-terracotta-300/10"
                        : "border-sand-200 bg-surface-raised hover:border-sand-300"
                    )}
                  >
                    <span className="block text-sm font-semibold text-ink">{opt.label}</span>
                    <span className="mt-0.5 block text-xs text-ink-faint">{opt.body}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Notifications */}
          <section aria-label="Notification preferences">
            <h2 className="mb-1 font-display text-lg font-medium text-ink">Notifications</h2>
            <p className="mb-3 text-xs text-ink-faint">
              Everything here is optional. Safety notices always reach you.
            </p>
            <Card className="divide-y divide-sand-200/70 px-5 py-2">
              {PREF_COPY.map(({ key, label, body }) => (
                <ToggleRow
                  key={key}
                  label={label}
                  body={body}
                  checked={data.notificationPrefs[key]}
                  onChange={(v) =>
                    savePrefs.mutate({ ...data.notificationPrefs, [key]: v })
                  }
                />
              ))}
            </Card>
          </section>

          {/* Account */}
          <section aria-label="Account" className="space-y-2">
            <h2 className="mb-3 font-display text-lg font-medium text-ink">Account</h2>
            <Button
              variant="secondary"
              full
              icon={<LogOut className="h-4 w-4" />}
              loading={signOut.isPending}
              onClick={() => signOut.mutate()}
            >
              Sign out
            </Button>
            <Button
              variant="ghost"
              full
              icon={<PauseCircle className="h-4 w-4" />}
              onClick={() => setPauseOpen(true)}
            >
              Pause my account
            </Button>
          </section>
        </div>
      )}

      {/* Pause confirmation */}
      <Sheet open={pauseOpen} onClose={() => setPauseOpen(false)} title="Pause your account?">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            Your profile disappears from discovery and matching stops. Nothing is
            deleted — sign back in whenever you're ready, and we'll pick up gently
            where you left off.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" full onClick={() => setPauseOpen(false)}>
              Not now
            </Button>
            <Button
              variant="danger"
              full
              loading={deactivate.isPending}
              onClick={() => deactivate.mutate()}
            >
              Pause account
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
