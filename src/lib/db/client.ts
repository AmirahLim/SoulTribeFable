import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

/**
 * Single shared database handle. Uses a local SQLite file via libsql —
 * the Drizzle schema is portable to Postgres/Supabase for production.
 * Cached on globalThis so Next.js hot reload doesn't leak connections.
 */

const globalForDb = globalThis as unknown as {
  __soulTribeDb?: LibSQLDatabase<typeof schema>;
  __soulTribeClient?: Client;
};

function makeClient(): Client {
  // A remote database (e.g. Turso/libsql) takes priority when configured.
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && !envUrl.startsWith("file:")) {
    return createClient({ url: envUrl, authToken: process.env.DATABASE_AUTH_TOKEN });
  }

  // On serverless hosts (Vercel sets VERCEL=1) the app bundle is read-only —
  // /tmp is the only writable directory, so the demo database lives there.
  // Note: /tmp is per-instance and ephemeral; it is re-created and re-seeded
  // automatically (see bootstrap.ts). Use DATABASE_URL for persistent data.
  const dataDir = process.env.VERCEL
    ? "/tmp/soul-tribe-data"
    : path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const url = envUrl ?? `file:${path.join(dataDir, "soul-tribe.db")}`;
  return createClient({ url });
}

export const dbClient = globalForDb.__soulTribeClient ?? makeClient();
export const db = globalForDb.__soulTribeDb ?? drizzle(dbClient, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__soulTribeClient = dbClient;
  globalForDb.__soulTribeDb = db;
}

export { schema };
