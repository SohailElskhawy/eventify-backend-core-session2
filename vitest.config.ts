import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        // fileParallelism: false is essential:
        // All test files share the one test database (eventify_test).
        // If tests ran in parallel, their beforeEach table truncations would collide
        // and produce intermittent, maddening race condition failures.
        fileParallelism: false,
        // setupFiles ensures that process.env.DATABASE_URL points to eventify_test
        // before any application module or Prisma instance is loaded.
        setupFiles: ["./tests/setup.ts"],
        testTimeout: 15000,
    },
});
