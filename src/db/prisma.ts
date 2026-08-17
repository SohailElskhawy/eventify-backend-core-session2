import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { config } from "../config.ts";

/**
 * PrismaClient singleton.
 *
 * Prisma 7 requires a driver adapter — we pass a `PrismaPg` instance built
 * from the validated DATABASE_URL in src/config.ts (never `process.env`).
 *
 * `log: ['query']` is enabled in development so we can capture the exact SQL
 * a query produces (used for the Session 3 EXPLAIN ANALYZE task).
 */
const adapter = new PrismaPg({ connectionString: config.databaseUrl });

const log = config.nodeEnv === "development" ? (["query", "warn", "error"] as const) : (["warn", "error"] as const);

export const prisma = new PrismaClient({ adapter, log: [...log] });
