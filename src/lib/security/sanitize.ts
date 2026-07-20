/**
 * Input sanitization utilities.
 *
 * Defense-in-depth: React escapes output by default (XSS), Drizzle uses
 * parameterized queries everywhere (SQL injection), and these helpers
 * normalize/strip hostile input at the API boundary before it is stored.
 */

/** Remove control characters, zero-width chars and normalize whitespace. */
export function sanitizeText(input: string, maxLength = 2000): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") // control chars
    .replace(/[\u200B-\u200F\u2028\u2029\uFEFF]/g, "") // zero-width / line separators
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Multiline variant that preserves intentional line breaks. */
export function sanitizeMultiline(input: string, maxLength = 4000): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200F\uFEFF]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, maxLength);
}

/** Strict allowlist for identifiers coming from the client. */
export function isSafeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id);
}

const naughtyPatterns = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /data:text\/html/i,
];

/** Reject content that is clearly attempting markup/script injection. */
export function looksLikeInjection(input: string): boolean {
  return naughtyPatterns.some((p) => p.test(input));
}
