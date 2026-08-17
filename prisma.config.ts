// prisma.config.ts — consumed by the Prisma CLI (migrate, seed, etc.).
// Prisma 7 does NOT auto-load .env, so we load it explicitly here.
// The runtime app reads env through src/config.ts instead.
import "dotenv/config";
import process from "node:process";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `prisma db seed` runs this command. Node 24 runs TypeScript directly.
    seed: "node --env-file=.env prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
