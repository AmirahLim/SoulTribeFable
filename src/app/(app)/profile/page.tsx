"use client";

/**
 * Your profile — how you appear to others, plus your Friendship DNA summary
 * (PRD §6/§7). You control every word and every visibility switch.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PencilLine,
  Shuffle,
  Settings as SettingsIcon,
  ShieldCheck,
  Eye,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useViewer, useToast, type ViewerProfile } from "@/components/providers";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { Input, Textarea } from "@/components/ui/fields";
import { LIFE_SEASON_LABELS } from "@/lib/utils";

interface DnaSummarySection {
  id: string;
  dimension: string;
  text: string;
  hidden: boolean;
  edited: boolean;
}

interface DnaSummary {
  headline: string;
  sections: DnaSummarySection[];
  modelVersion: string;
}

const VISIBILITY_COPY: Record<string, string> = {
  community: "Visible to the community",
  matches_only: "Visible to matches only",
  hidden: "Hidden from discovery",
};

export default function ProfilePage() {
  const { viewer, refresh } = useViewer();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const profile = viewer?.profile;

  const summaryQuery = useQuery({
    queryKey: ["dna", "summary"],
    queryFn: () => api.get<{ summary: DnaSummary }>("/api/dna/summary"),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    pronouns: "",
    bio: "",
    friendshipFeelsLike: "",
    avatarSeed: "",
  });
  const [errors, setErrors] = useState<{ displayName?: string }>({});

  useEffect(() => {
    if (profile && !editOpen) {
      setForm({
        displayName: profile.displayName,
        pronouns: profile.pronouns ?? "",
        bio: profile.bio,
        friendshipFeelsLike: profile.friendshipFeelsLike,
        avatarSeed: profile.avatarSeed,
      });
    }
  }, [profile, editOpen]);

  const save = useMutation({
    mutationFn: (payload: Partial<ViewerProfile>) => api.patch("/api/profile", payload),
    onSuccess: async () => {
      await refresh();
      queryClient.invalidateQueries({ queryKey: ["souldrop"] });
      setEditOpen(false);
      toast("Profile updated.", "success");
    },
    onError: () => toast("Couldn't save your profile — please try again.", "error"),
  });

  if (!profile) return <CardSkeleton lines={4} />;

  const submitEdit = () => {
    const name = form.displayName.trim();
    if (name.length < 2) {
      setErrors({ displayName: "Your name needs at least 2 characters." });
      return;
    }
    setErrors({});
    save.mutate({
      displayName: name,
      pronouns: form.pronouns.trim(),
      bio: form.bio.trim(),
      friendshipFeelsLike: form.friendshipFeelsLike.trim(),
      avatarSeed: form.avatarSeed,
    });
  };

  const summary = summaryQuery.data?.summary;
  const visibleSections = summary?.sections.filter((s) => !s.hidden) ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="This is you"
        title="Profile"
        action={
          <Button
            variant="secondary"
            size="sm"
            icon={<PencilLine className="h-4 w-4" />}
            onClick={() => setEditOpen(true)}
          >
            Edit
          </Button>
        }
      />

      {/* Identity card */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar seed={profile.avatarSeed} name={profile.displayName} size="xl" />
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-medium text-ink">
              {profile.displayName}
            </h2>
            {profile.pronouns && (
              <p className="text-sm text-ink-faint">{profile.pronouns}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.lifeSeason && (
                <Tag tone="gold">
                  {LIFE_SEASON_LABELS[profile.lifeSeason] ?? profile.lifeSeason}
                </Tag>
              )}
              {profile.neighborhood && <Tag>{profile.neighborhood}</Tag>}
              {profile.languages.slice(0, 3).map((l) => (
                <Tag key={l}>{l}</Tag>
              ))}
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">{profile.bio}</p>
        )}
        {profile.friendshipFeelsLike && (
          <blockquote className="mt-4 border-l-2 border-terracotta-400 pl-3 text-sm italic leading-relaxed text-ink-soft">
            “{profile.friendshipFeelsLike}”
          </blockquote>
        )}

        <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-faint">
          <Eye className="h-3.5 w-3.5" aria-hidden />
          {VISIBILITY_COPY[profile.visibility] ?? profile.visibility} — change this in
          Settings.
        </p>
      </Card>

      {/* DNA summary */}
      <section aria-label="Your Friendship DNA" className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-medium text-ink">
            <Sparkles className="h-4 w-4 text-gold-500" aria-hidden />
            Your Friendship DNA
          </h2>
          <Link
            href="/onboarding/reveal"
            className="text-sm font-semibold text-terracotta-600 hover:underline"
          >
            Edit summary
          </Link>
        </div>

        {summaryQuery.isLoading ? (
          <CardSkeleton lines={3} />
        ) : !summary ? (
          <Card className="p-5 text-sm text-ink-faint">
            Your DNA summary will appear here after onboarding.
          </Card>
        ) : (
          <Card className="p-6">
            <p className="font-display text-lg italic leading-relaxed text-ink">
              “{summary.headline}”
            </p>
            <ul className="mt-4 space-y-3">
              {visibleSections.map((s) => (
                <li key={s.id} className="text-sm leading-relaxed text-ink-soft">
                  {s.text}
                  {s.edited && (
                    <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-forest-600">
                      in your words
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {summary.sections.some((s) => s.hidden) && (
              <p className="mt-4 text-xs italic text-ink-faint">
                Some parts are hidden from others — only you (and matching) see them.
              </p>
            )}
          </Card>
        )}
      </section>

      {/* Quick links */}
      <nav aria-label="Account" className="mt-8 space-y-2">
        {[
          {
            href: "/settings",
            icon: SettingsIcon,
            title: "Settings",
            body: "Visibility, notifications, account",
          },
          {
            href: "/safety",
            icon: ShieldCheck,
            title: "Safety centre",
            body: "Blocked people, community pledge, reporting",
          },
        ].map(({ href, icon: Icon, title, body }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-card border border-sand-200 bg-surface-raised p-4 transition-colors hover:bg-surface-sunken"
          >
            <span className="organic-blob flex h-9 w-9 shrink-0 items-center justify-center bg-sand-100">
              <Icon className="h-4 w-4 text-ink-soft" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-ink">{title}</span>
              <span className="block text-xs text-ink-faint">{body}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-ink-faint" aria-hidden />
          </Link>
        ))}
      </nav>

      {/* Edit sheet */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar seed={form.avatarSeed} name={form.displayName || "?"} size="lg" />
            <Button
              variant="secondary"
              size="sm"
              icon={<Shuffle className="h-4 w-4" />}
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  avatarSeed: `${f.displayName || "soul"}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`,
                }))
              }
            >
              Shuffle colours
            </Button>
          </div>

          <Input
            label="Display name"
            value={form.displayName}
            error={errors.displayName}
            maxLength={40}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
          />
          <Input
            label="Pronouns (optional)"
            value={form.pronouns}
            maxLength={30}
            placeholder="e.g. she/her"
            onChange={(e) => setForm((f) => ({ ...f, pronouns: e.target.value }))}
          />
          <Textarea
            label="A little about you"
            value={form.bio}
            maxLength={280}
            rows={3}
            hint={`${form.bio.length}/280`}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          />
          <Textarea
            label="Friendship, to me, feels like…"
            value={form.friendshipFeelsLike}
            maxLength={200}
            rows={2}
            onChange={(e) =>
              setForm((f) => ({ ...f, friendshipFeelsLike: e.target.value }))
            }
          />

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" full onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button full loading={save.isPending} onClick={submitEdit}>
              Save changes
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
