import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";
import { db } from "./client";

/** Applies committed SQL migrations. Idempotent — safe to run on every boot. */
async function main() {
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "src/lib/db/migrations"),
  });
  console.log("✓ database schema up to date");
}

main().catch((err) => {
  console.error("migration failed:", err);
  process.exit(1);
});
