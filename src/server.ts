import { app } from "./app.ts";
import { config } from "./config.ts";
import { prisma } from "./db/prisma.ts";
import { disconnectRedis } from "./infra/redis.ts";

const server = app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
});

async function shutdown(signal: string): Promise<void> {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
        try {
            await Promise.all([
                prisma.$disconnect(),
                disconnectRedis(),
            ]);
            console.log("Database and Redis connections closed. Exiting process.");
            process.exit(0);
        } catch (err) {
            console.error("Error during server shutdown cleanup:", err);
            process.exit(1);
        }
    });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    void shutdown("uncaughtException");
});
