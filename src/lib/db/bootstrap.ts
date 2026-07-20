import { dbClient } from "./client";
import { BOOTSTRAP_STATEMENTS } from "./bootstrapSql";
import { seedDatabase } from "./seed";

/**
 * Ensures the schema exists and demo data is seeded before the first query.
 *
 * Locally `npm run dev` handles this via db:setup. On serverless hosts
 * (Vercel) the SQLite file lives in ephemeral /tmp, so each fresh server
 * instance re-creates and re-seeds it here on its first request. When
 * DATABASE_URL points at a remote libsql/Turso database, the same logic
 * initialises it once and then becomes a no-op.
 *
 * Memoised: costs a single existence check per server instance.
 */

let ready: Promise<void> | null = null;

async function initialise(): Promise<void> {
  const res = await dbClient.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  );
  if (res.rows.length === 0) {
    for (const statement of BOOTSTRAP_STATEMENTS) {
      await dbClient.execute(statement);
    }
  }
  // seedDatabase() exits early when users already exist, so this is safe.
  await seedDatabase();
}

export function ensureDbReady(): Promise<void> {
  if (!ready) {
    ready = initialise().catch((err) => {
      ready = null; // allow a retry on the next request
      throw err;
    });
  }
  return ready;
}
