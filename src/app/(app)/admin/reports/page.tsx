"use client";

/**
 * Admin moderation queue (PRD §10, MVP-thin). Only reachable by admins —
 * the API enforces this too. Reporter identity is never shown to subjects.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { ShieldAlert } from "lucide-react";
import { api } from "@/lib/api/client";
import { useViewer, useToast } from "@/components/providers";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Chip";
import { relativeTime } from "@/lib/utils";
import { REPORT_CATEGORIES } from "@/lib/validation/schemas";

interface ReportRow {
  id: string;
  reporterId: string;
  subjectType: "user" | "outing" | "message";
  subjectId: string;
  category: string;
  details: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  severity: "low" | "medium" | "high" | "critical";
  createdAt: number;
}

const CATEGORY_LABEL = Object.fromEntries(
  REPORT_CATEGORIES.map((c) => [c.value, c.label])
);

const SEVERITY_TONE: Record<ReportRow["severity"], string> = {
  low: "bg-sand-100 text-ink-soft",
  medium: "bg-gold-400/20 text-ink",
  high: "bg-terracotta-300/30 text-terracotta-700",
  critical: "bg-terracotta-500 text-sand-50",
};

export default function AdminReportsPage() {
  const { viewer } = useViewer();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = viewer?.user.isAdmin ?? false;

  const reportsQuery = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: () => api.get<{ reports: ReportRow[] }>("/api/admin/reports"),
    enabled: isAdmin,
  });

  const decide = useMutation({
    mutationFn: (payload: {
      reportId: string;
      status: ReportRow["status"];
      restrictUserId?: string;
      restore?: boolean;
    }) => api.patch("/api/admin/reports", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      toast("Report updated.", "success");
    },
    onError: () => toast("Couldn't update that report.", "error"),
  });

  if (!isAdmin) {
    return (
      <EmptyState
        emoji="🔒"
        title="Admins only"
        body="This corner of Soul Tribe is for the moderation team."
      />
    );
  }

  const rows = reportsQuery.data?.reports ?? [];
  const openCount = rows.filter((r) => r.status === "open").length;

  return (
    <div>
      <PageHeader
        eyebrow="Moderation"
        title="Reports queue"
        subtitle={`${openCount} open · reporters stay confidential`}
      />

      {reportsQuery.isLoading ? (
        <ListSkeleton count={4} lines={2} />
      ) : reportsQuery.isError ? (
        <ErrorState onRetry={() => reportsQuery.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          emoji="🌤️"
          title="Queue is clear"
          body="No reports right now. A quiet queue is a healthy community."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-terracotta-600" aria-hidden />
                  <span className="text-sm font-semibold text-ink">
                    {CATEGORY_LABEL[r.category] ?? r.category}
                  </span>
                  <span
                    className={clsx(
                      "rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      SEVERITY_TONE[r.severity]
                    )}
                  >
                    {r.severity}
                  </span>
                  <Tag tone={r.status === "open" ? "gold" : "sand"}>{r.status}</Tag>
                  <span className="ml-auto text-[11px] text-ink-faint">
                    {relativeTime(r.createdAt)}
                  </span>
                </div>

                <p className="mt-2 text-xs text-ink-faint">
                  {r.subjectType} · <code className="text-[11px]">{r.subjectId}</code>
                </p>
                {r.details && (
                  <p className="mt-2 rounded-card bg-surface-sunken px-3 py-2 text-sm leading-relaxed text-ink-soft">
                    {r.details}
                  </p>
                )}

                {(r.status === "open" || r.status === "reviewing") && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status === "open" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => decide.mutate({ reportId: r.id, status: "reviewing" })}
                      >
                        Start review
                      </Button>
                    )}
                    <Button
                      variant="forest"
                      size="sm"
                      onClick={() => decide.mutate({ reportId: r.id, status: "resolved" })}
                    >
                      Resolve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => decide.mutate({ reportId: r.id, status: "dismissed" })}
                    >
                      Dismiss
                    </Button>
                    {r.subjectType === "user" && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() =>
                          decide.mutate({
                            reportId: r.id,
                            status: "resolved",
                            restrictUserId: r.subjectId,
                          })
                        }
                      >
                        Resolve & restrict user
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
