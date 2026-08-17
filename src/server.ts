import { app } from "./app.ts";
import { config } from "./config.ts";
import { prisma } from "./db/prisma.ts";

const server = app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
});

async function shutdown(signal: string): Promise<void> {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
        try {
            await prisma.$disconnect();
            console.log("Database connection closed. Exiting process.");
            process.exit(0);
        } catch (err) {
            console.error("Error during database disconnect:", err);
            process.exit(1);
        }
    });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
