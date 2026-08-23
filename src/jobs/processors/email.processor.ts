import type { Job } from "bullmq";
import type { BookingEmailJobPayload } from "../email.queue.ts";

/**
 * Processor for booking email notifications:
 * Simulates sending confirmation email (or logs structured delivery payload).
 */
export async function processBookingEmail(job: Job<BookingEmailJobPayload>): Promise<void> {
    const { bookingId } = job.data;
    console.log(`[Worker:booking-email] 📧 Sending booking confirmation email for bookingId: ${bookingId}...`);
    
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
}
