import { Worker } from "bullmq";
import { createQueueConnection } from "./infra/queue-backend.ts";
import type { BookingEmailJobPayload } from "./jobs/email.queue.ts";
import type { WaitlistPromoteJobPayload } from "./jobs/waitlist.queue.ts";
import { processWaitlistPromotion } from "./jobs/processors/waitlist.processor.ts";
import { processBookingEmail } from "./jobs/processors/email.processor.ts";
import { prisma } from "./db/prisma.ts";

console.log("🛠️ Starting Eventify Background Worker process...");

/**
 * Waitlist promotion worker
 */
const waitlistWorker = new Worker<WaitlistPromoteJobPayload>(
    "waitlist-promote",
    processWaitlistPromotion,
    {
        connection: createQueueConnection(),
        concurrency: 5,
    },
);

waitlistWorker.on("failed", (job, err) => {
    console.error(`[Worker:waitlist-promote] ❌ Job ${job?.id} failed with error:`, err);
});

waitlistWorker.on("completed", (job) => {
    console.log(`[Worker:waitlist-promote] ✨ Job ${job.id} finished successfully.`);
});

/**
 * Email notification worker
 */
const emailWorker = new Worker<BookingEmailJobPayload>(
    "booking-email",
    processBookingEmail,
    {
        connection: createQueueConnection(),
        concurrency: 5,
    },
);

emailWorker.on("failed", (job, err) => {
    console.error(`[Worker:booking-email] ❌ Job ${job?.id} failed with error:`, err);
});

emailWorker.on("completed", (job) => {
    console.log(`[Worker:booking-email] ✨ Email job ${job.id} finished successfully.`);
});

/**
 * Graceful shutdown handling for worker process
 */
async function shutdown(signal: string): Promise<void> {
    console.log(`\n[Worker] Received ${signal}. Closing workers and database connections...`);
    try {
        await Promise.all([waitlistWorker.close(), emailWorker.close()]);
        await prisma.$disconnect();
        console.log("[Worker] All workers and connections closed. Exiting.");
        process.exit(0);
    } catch (err) {
        console.error("[Worker] Error during worker shutdown:", err);
        process.exit(1);
    }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
    console.error("[Worker] Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
    console.error("[Worker] Uncaught Exception:", error);
    void shutdown("uncaughtException");
});

console.log("🚀 Eventify Background Worker is running and listening for jobs.");
