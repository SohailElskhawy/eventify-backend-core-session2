import { Queue } from "bullmq";
import { createQueueConnection } from "../infra/queue-backend.ts";

export interface WaitlistPromoteJobPayload {
    eventId: string;
}

/**
 * Queue for asynchronous waitlist promotion upon booking cancellation.
 */
export const waitlistQueue = new Queue<WaitlistPromoteJobPayload>("waitlist-promote", {
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
