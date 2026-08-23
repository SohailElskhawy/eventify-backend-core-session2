import type { Job } from "bullmq";
import type { WaitlistPromoteJobPayload } from "../waitlist.queue.ts";
import { emailQueue } from "../email.queue.ts";
import * as bookingRepo from "../../bookings/booking.repository.ts";
import { runSerializableTransaction } from "../../db/transaction.ts";

/**
 * Processor for waitlist promotion:
 * Atomically re-checks capacity, promotes oldest waitlisted booking to CONFIRMED,
 * and enqueues a confirmation email job.
 */
export async function processWaitlistPromotion(job: Job<WaitlistPromoteJobPayload>): Promise<void> {
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
}
