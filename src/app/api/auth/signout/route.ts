import { apiHandler, ok } from "@/lib/api/handler";
import { destroySession } from "@/lib/auth/session";

/** POST /api/auth/signout — invalidates the current session server-side. */
export const POST = apiHandler({ scope: "api" }, async () => {
  await destroySession();
  return ok({ signedOut: true });
});
