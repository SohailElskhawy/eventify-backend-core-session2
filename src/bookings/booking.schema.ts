import { z } from "zod";

/** Schema for creating a new booking (POST body). */
export const createBookingSchema = z.strictObject({
    eventId: z.string().trim().min(1, "eventId is required"),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
