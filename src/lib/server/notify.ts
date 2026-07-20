import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { newId } from "./ids";

/**
 * In-app notification writer. Push channels (Expo/web push) can subscribe to
 * the same event types later; PRD notification rules are encoded at the call
 * sites (immediate for requests/decisions, scheduled for reminders, etc.).
 */
export async function notify(
  userId: string,
  eventType:
    | "join_request_received"
    | "request_accepted"
    | "request_declined"
    | "outing_reminder"
    | "host_action_needed"
    | "post_outing_reflection"
    | "soul_drop"
    | "outing_cancelled"
    | "outing_updated"
    | "removed_from_outing"
    | "new_message",
  payload: { title: string; body: string; href?: string }
): Promise<void> {
  await db.insert(notifications).values({
    id: newId("ntf"),
    userId,
    eventType,
    payload,
    sentAt: Date.now(),
    readAt: null,
  });
}
