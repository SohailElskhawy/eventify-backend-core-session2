import { Queue } from "bullmq";
import { createQueueConnection } from "../infra/queue-backend.ts";

export interface BookingEmailJobPayload {
    bookingId: string;
}

/**
 * Queue for asynchronous booking confirmation emails.
 */
export const emailQueue = new Queue<BookingEmailJobPayload>("booking-email", {
    connection: createQueueConnection(),
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
    },
});
