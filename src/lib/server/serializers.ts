import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  outingMembers,
  outingPreferences,
  outings,
  profiles,
  joinRequests,
  type Outing,
  type Profile,
} from "@/lib/db/schema";

/**
 * Serializers shape database rows into API payloads and are the single place
 * where privacy rules are enforced:
 *  - Exact venue is only revealed to the host and accepted members (PRD §11).
 *  - Sensitive DNA answers and private reflections never leave the server.
 *  - Profiles expose only public-facing fields.
 */

export interface PublicProfile {
  userId: string;
  displayName: string;
  pronouns: string | null;
  avatarSeed: string;
  bio: string;
  friendshipFeelsLike: string;
  languages: string[];
  neighborhood: string;
  lifeSeason: string;
  intent: string;
}

export function serializeProfile(p: Profile): PublicProfile {
  return {
    userId: p.userId,
    displayName: p.displayName,
    pronouns: p.pronouns,
    avatarSeed: p.avatarSeed,
    bio: p.bio,
    friendshipFeelsLike: p.friendshipFeelsLike,
    languages: p.languages,
    neighborhood: p.neighborhood,
    lifeSeason: p.lifeSeason,
    intent: p.intent,
  };
}

export interface SerializedOuting {
  id: string;
  host: PublicProfile | null;
  title: string;
  pitch: string;
  category: string;
  startsAt: number;
  durationMins: number;
  timezone: string;
  area: string;
  /** Only present for host / accepted members. */
  venueName: string | null;
  venueAddress: string | null;
  capacity: number;
  spotsLeft: number;
  memberCount: number;
  groupFormat: string;
  visibility: string;
  approvalMode: string;
  requestDeadline: number;
  status: string;
  hostPrompt: string;
  preferences: {
    budgetBand: string;
    energyLevel: string;
    conversationDepth: string;
    structured: boolean;
    alcoholFree: boolean;
    indoor: boolean;
    wheelchairAccessible: boolean;
    languages: string[];
    firstTimerFriendly: boolean;
    minFitBand: string;
  } | null;
  viewer: {
    isHost: boolean;
    isMember: boolean;
    requestStatus: string | null;
    attendanceStatus: string | null;
  };
}

export async function serializeOuting(
  outing: Outing,
  viewerId: string
): Promise<SerializedOuting> {
  const [hostProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, outing.hostId))
    .limit(1);

  const members = await db
    .select()
    .from(outingMembers)
    .where(eq(outingMembers.outingId, outing.id));
  const activeMembers = members.filter(
    (m) => m.attendanceStatus === "confirmed" || m.attendanceStatus === "attended"
  );
  const viewerMember = activeMembers.find((m) => m.userId === viewerId);
  const isHost = outing.hostId === viewerId;
  const canSeeVenue = isHost || Boolean(viewerMember);

  const [prefs] = await db
    .select()
    .from(outingPreferences)
    .where(eq(outingPreferences.outingId, outing.id))
    .limit(1);

  const [viewerRequest] = await db
    .select()
    .from(joinRequests)
    .where(
      and(eq(joinRequests.outingId, outing.id), eq(joinRequests.requesterId, viewerId))
    )
    .orderBy(joinRequests.createdAt)
    .limit(1);

  return {
    id: outing.id,
    host: hostProfile ? serializeProfile(hostProfile) : null,
    title: outing.title,
    pitch: outing.pitch,
    category: outing.category,
    startsAt: outing.startsAt,
    durationMins: outing.durationMins,
    timezone: outing.timezone,
    area: outing.area,
    venueName: canSeeVenue ? outing.venueName : null,
    venueAddress: canSeeVenue ? outing.venueAddress : null,
    capacity: outing.capacity,
    spotsLeft: Math.max(0, outing.capacity - (activeMembers.length - 1)), // host doesn't consume capacity
    memberCount: activeMembers.length,
    groupFormat: outing.groupFormat,
    visibility: outing.visibility,
    approvalMode: outing.approvalMode,
    requestDeadline: outing.requestDeadline,
    status: outing.status,
    hostPrompt: outing.hostPrompt,
    preferences: prefs
      ? {
          budgetBand: prefs.budgetBand,
          energyLevel: prefs.energyLevel,
          conversationDepth: prefs.conversationDepth,
          structured: prefs.structured,
          alcoholFree: prefs.alcoholFree,
          indoor: prefs.indoor,
          wheelchairAccessible: prefs.wheelchairAccessible,
          languages: prefs.languages,
          firstTimerFriendly: prefs.firstTimerFriendly,
          minFitBand: prefs.minFitBand,
        }
      : null,
    viewer: {
      isHost,
      isMember: Boolean(viewerMember) || isHost,
      requestStatus: viewerRequest?.status ?? null,
      attendanceStatus: viewerMember?.attendanceStatus ?? null,
    },
  };
}

export async function profilesByIds(ids: string[]): Promise<Map<string, PublicProfile>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select().from(profiles).where(inArray(profiles.userId, ids));
  return new Map(rows.map((r) => [r.userId, serializeProfile(r)]));
}
