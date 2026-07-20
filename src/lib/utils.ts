/** ISO week key used to group Soul Drop cohorts, e.g. "2026-W28". */
export function weekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const SGT_OFFSET_MS = 8 * 3600 * 1000;

/** Format an epoch-ms timestamp in Singapore local time (PRD: explicit local time). */
export function formatSingapore(
  epochMs: number,
  opts: { withDate?: boolean; withTime?: boolean } = { withDate: true, withTime: true }
): string {
  const d = new Date(epochMs + SGT_OFFSET_MS);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts: string[] = [];
  if (opts.withDate !== false) {
    parts.push(`${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`);
  }
  if (opts.withTime !== false) {
    let h = d.getUTCHours();
    const m = d.getUTCMinutes();
    const ampm = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    parts.push(`${h}:${String(m).padStart(2, "0")}${ampm}`);
  }
  return parts.join(" · ");
}

export function relativeTime(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return diff > 0 ? `${mins}m ago` : `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return diff > 0 ? `${hours}h ago` : `in ${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return diff > 0 ? `${days}d ago` : `in ${days}d`;
  return formatSingapore(epochMs, { withDate: true, withTime: false });
}

export const BUDGET_LABELS: Record<string, string> = {
  free: "Free",
  under_20: "Under S$20",
  "20_50": "S$20–50",
  over_50: "S$50+",
};

export const CATEGORY_LABELS: Record<string, string> = {
  coffee: "Coffee & conversation",
  food: "Food adventure",
  walks: "Walk & nature",
  art: "Art & museums",
  books: "Books & ideas",
  making: "Making & crafts",
  movement: "Movement",
  music: "Live music",
  games: "Board games",
  photography: "Photography",
  volunteering: "Volunteering",
  markets: "Markets & neighborhoods",
};

export const CATEGORY_EMOJI: Record<string, string> = {
  coffee: "☕",
  food: "🍜",
  walks: "🌿",
  art: "🖼️",
  books: "📚",
  making: "🏺",
  movement: "🏃",
  music: "🎶",
  games: "🎲",
  photography: "📷",
  volunteering: "🤝",
  markets: "🧺",
};

export const LIFE_SEASON_LABELS: Record<string, string> = {
  new_city: "New to the city",
  rebuilding: "Rebuilding",
  exploring: "Exploring",
  career_intense: "Career-intense",
  parenting: "Parenting",
};

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
