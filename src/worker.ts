import { Worker } from "bullmq";
import { createQueueConnection } from "./infra/queue-backend.ts";
import { emailQueue, type BookingEmailJobPayload } from "./jobs/email.queue.ts";
import type { WaitlistPromoteJobPayload } from "./jobs/waitlist.queue.ts";
import * as bookingRepo from "./bookings/booking.repository.ts";
import { runSerializableTransaction } from "./db/transaction.ts";
import { prisma } from "./db/prisma.ts";

console.log("🛠️ Starting Eventify Background Worker process...");

/**
 * Waitlist promotion worker:
 * Processes cancellations, checks capacity atomically, and promotes the oldest waitlisted user.
 */
const waitlistWorker = new Worker<WaitlistPromoteJobPayload>(
    "waitlist-promote",
    async (job) => {
        const { eventId } = job.data;
        console.log(`[Worker:waitlist-promote] Processing waitlist check for event: ${eventId}`);

        const promotedBooking = await runSerializableTransaction(async (tx) => {
            // 1. Re-check capacity atomically inside the transaction
            const [confirmedCount, event] = await Promise.all([
                bookingRepo.countConfirmedBookingsTx(tx, eventId),
                bookingRepo.findEventCapacityTx(tx, eventId),
            ]);

            if (confirmedCount >= event.capacity) {
                console.log(
                    `[Worker:waitlist-promote] Event ${eventId} is at full capacity (${confirmedCount}/${event.capacity}). No promotion available.`,
                );
                return null;
            }

            // 2. Find the oldest WAITLISTED booking
            const oldestWaitlist = await bookingRepo.findOldestWaitlistedBookingTx(tx, eventId);
            if (!oldestWaitlist) {
                console.log(`[Worker:waitlist-promote] No waitlisted bookings found for event ${eventId}.`);
                return null;
            }

            // 3. Promote to CONFIRMED
            const promoted = await bookingRepo.updateBookingStatusTx(tx, oldestWaitlist.id, "CONFIRMED");
            console.log(
                `[Worker:waitlist-promote] ✅ Promoted booking ${promoted.id} (user: ${promoted.userId}) to CONFIRMED.`,
            );
            return promoted;
        });

        // 4. Enqueue confirmation email for the newly promoted booking
        if (promotedBooking) {
            await emailQueue.add("confirmation", { bookingId: promotedBooking.id });
            console.log(
                `[Worker:waitlist-promote] ✉️ Enqueued confirmation email job for booking ${promotedBooking.id}`,
            );
        }
    },
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
 * Email notification worker:
 * Simulates sending confirmation email (or logs payload).
 */
const emailWorker = new Worker<BookingEmailJobPayload>(
    "booking-email",
    async (job) => {
        const { bookingId } = job.data;
        console.log(`[Worker:booking-email] 📧 Sending booking confirmation email for bookingId: ${bookingId}...`);
        // Simulates email transport delivery
        console.log(
            JSON.stringify({
                type: "email_sent",
                queue: "booking-email",
                jobId: job.id,
                bookingId,
                status: "DELIVERED",
                timestamp: new Date().toISOString(),
            }),
        );
    },
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

console.log("🚀 Eventify Background Worker is running and listening for jobs.");
