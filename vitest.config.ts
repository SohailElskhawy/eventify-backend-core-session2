import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        // fileParallelism: false is essential:
        // All test files share the one test database (eventify_test).
        // If tests ran in parallel, their beforeEach table truncations would collide
        // and produce intermittent, maddening race condition failures.
        fileParallelism: false,
        // setupFiles ensures that DB and Redis lifecycles are cleanly managed.
        setupFiles: ["./tests/setup.ts"],
        testTimeout: 15000,
        // Vitest populates process.env BEFORE any ESM imports or modules are evaluated.
        env: {
            NODE_ENV: "test",
            PORT: "3000",
            DATABASE_URL: "postgresql://eventify:301077@localhost:5432/eventify_test",
            REDIS_URL: "redis://localhost:6379",
            JWT_ACCESS_SECRET: "super-secret-jwt-access-token-key-at-least-32-chars-long",
            WEB_ORIGIN: "http://localhost:3000",
        },
    },
});
