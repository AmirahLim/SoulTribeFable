import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { getSession, type SessionInfo } from "@/lib/auth/session";
import { checkRateLimit, type RateScope } from "@/lib/security/rateLimit";
import { ensureDbReady } from "@/lib/db/bootstrap";

/**
 * API route wrapper providing, in order:
 *  1. Rate limiting (per scope, keyed by user id or client IP).
 *  2. Same-origin enforcement for mutating methods (CSRF layer 1).
 *  3. CSRF token verification via `x-csrf-token` header (CSRF layer 2,
 *     double-submit against the session record).
 *  4. Session resolution / auth enforcement.
 *  5. Consistent JSON error envelopes; no stack traces leak to clients.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

export interface HandlerContext {
  session: SessionInfo;
  req: NextRequest;
  params: Record<string, string>;
}

export interface PublicHandlerContext {
  session: SessionInfo | null;
  req: NextRequest;
  params: Record<string, string>;
}

interface Options {
  scope?: RateScope;
  /** Allow unauthenticated access (e.g. sign-in). */
  public?: boolean;
  /** Skip CSRF check — only for safe idempotent GETs (enforced by method). */
}

function clientKey(req: NextRequest, session: SessionInfo | null): string {
  return (
    session?.user.id ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.ip ??
    "anonymous"
  );
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients; cookie auth still required
  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}

export function apiHandler(
  options: Options & { public: true },
  fn: (ctx: PublicHandlerContext) => Promise<NextResponse>
): (req: NextRequest, route: { params: Record<string, string> }) => Promise<NextResponse>;
export function apiHandler(
  options: Options,
  fn: (ctx: HandlerContext) => Promise<NextResponse>
): (req: NextRequest, route: { params: Record<string, string> }) => Promise<NextResponse>;
export function apiHandler(
  options: Options,
  fn: (ctx: never) => Promise<NextResponse>
) {
  return async (req: NextRequest, route: { params: Record<string, string> }) => {
    try {
      // On serverless hosts the demo database is created + seeded on first
      // request (no-op locally and once initialised).
      await ensureDbReady();

      const session = await getSession();

      // 1. Rate limit.
      const scope = options.scope ?? "api";
      const rate = checkRateLimit(scope, clientKey(req, session));
      if (!rate.allowed) {
        return NextResponse.json(
          { error: "Too many requests. Please slow down a little.", code: "rate_limited" },
          { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
        );
      }

      // 2 + 3. CSRF protections on mutating requests.
      if (MUTATING.has(req.method)) {
        if (!sameOrigin(req)) {
          throw new ApiError(403, "Cross-origin request rejected.", "bad_origin");
        }
        if (session) {
          const headerToken = req.headers.get("x-csrf-token");
          if (!headerToken || headerToken !== session.csrfToken) {
            throw new ApiError(403, "Invalid or missing CSRF token.", "bad_csrf");
          }
        }
      }

      // 4. Auth.
      if (!options.public && !session) {
        throw new ApiError(401, "Please sign in to continue.", "unauthenticated");
      }
      if (session?.user.status === "restricted" && MUTATING.has(req.method)) {
        throw new ApiError(
          403,
          "Your account is temporarily restricted. Contact support for help.",
          "restricted"
        );
      }

      return await fn({ session, req, params: route?.params ?? {} } as never);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      }
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return NextResponse.json(
          {
            error: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input.",
            code: "validation",
          },
          { status: 400 }
        );
      }
      console.error("[api] unhandled error:", err);
      return NextResponse.json(
        { error: "Something went wrong on our side. Please try again.", code: "internal" },
        { status: 500 }
      );
    }
  };
}

/** Parse + validate a JSON body against a zod schema (server-side validation). */
export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.", "bad_json");
  }
  return schema.parse(json);
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}
