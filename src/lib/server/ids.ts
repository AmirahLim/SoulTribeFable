import { randomBytes } from "crypto";

/** URL-safe unique id. Server-side only (Node crypto). */
export function newId(prefix = ""): string {
  const id = randomBytes(12).toString("base64url");
  return prefix ? `${prefix}_${id}` : id;
}
