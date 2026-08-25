import { sql } from "drizzle-orm";
import type { Database } from "./client";
import { migrations } from "./migrations.generated";

/**
 * Applies every unapplied migration in order, inside one transaction each. Versioned and additive —
 * no destructive "push" shortcut, on any host.
 */
export async function migrate(db: Database): Promise<string[]> {
  await db.execute(sql`
    create table if not exists echo_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const { rows } = await db.execute<{ version: string }>(sql`select version from echo_migrations`);
  const applied = new Set(rows.map((row) => row.version));
  const pending = migrations.filter((migration) => !applied.has(migration.version));

  for (const migration of pending) {
    await db.transaction(async (tx) => {
      for (const statement of migration.sql.split("--> statement-breakpoint")) {
        const trimmed = statement.trim();
        if (trimmed) await tx.execute(sql.raw(trimmed));
      }
      await tx.execute(sql`insert into echo_migrations (version) values (${migration.version})`);
    });
  }

  return pending.map((migration) => migration.version);
}
