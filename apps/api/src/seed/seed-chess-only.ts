/**
 * Seed chess exercise/game banks for all tenants without truncating other data.
 * Usage: pnpm --filter=api exec tsx ./src/seed/seed-chess-only.ts
 */
import * as dotenv from "dotenv";
import { count, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { chessExercises, tenants, users } from "src/storage/schema";

import { seedChessBanks } from "./seed-chess-data";

import type { DatabasePg } from "../common";

dotenv.config({ path: "./.env" });

const connectionString = process.env.MIGRATOR_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("MIGRATOR_DATABASE_URL or DATABASE_URL not found");
}

const pg = postgres(connectionString);
const db = drizzle(pg) as DatabasePg;

async function main() {
  const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants);

  for (const tenant of tenantRows) {
    const [existing] = await db
      .select({ total: count() })
      .from(chessExercises)
      .where(eq(chessExercises.tenantId, tenant.id));

    if (Number(existing?.total ?? 0) > 0) {
      console.log(`Skip tenant ${tenant.name}: exercises already present`);
      continue;
    }

    const [author] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, tenant.id))
      .limit(1);

    if (!author) {
      console.log(`Skip tenant ${tenant.name}: no users`);
      continue;
    }

    await db.execute(sql`SELECT set_config('app.tenant_id', ${tenant.id}, true)`);

    const result = await seedChessBanks(db, tenant.id, author.id);
    console.log(
      `Tenant ${tenant.name}: seeded ${result.exercises} exercises, ${result.games} games`,
    );
  }
}

main()
  .then(async () => {
    await pg.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await pg.end();
    process.exit(1);
  });
