import { z } from "zod";

/**
 * Centralized, validated runtime configuration.
 * Every env var the app reads is declared here and checked at boot —
 * never reach for `process.env` directly elsewhere.
 */
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).optional().default("development"),
    PORT: z.coerce.number().int().positive().optional().default(3000),
    DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
});

// Pick only the keys we care about — process.env has hundreds of entries
// (PATH, USERPROFILE, …) that we don't want zod to choke on.
const picked = {
    NODE_ENV: process.env["NODE_ENV"],
    PORT: process.env["PORT"],
    DATABASE_URL: process.env["DATABASE_URL"],
};

const parsed = envSchema.safeParse(picked);

if (!parsed.success) {
    console.error("Invalid environment configuration:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
}

export const config = {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    databaseUrl: parsed.data.DATABASE_URL,
} as const;
