import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

async function runMigrations() {
  const url = process.env.TURSO_DATABASE_URL ?? "file:./cse.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  console.log(`🗄️  Running migrations on: ${url}`);

  const client = createClient({ url, authToken });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("✅ Migrations complete");
  process.exit(0);
}

runMigrations().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
