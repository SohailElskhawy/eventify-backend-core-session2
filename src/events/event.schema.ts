import { z } from "zod";

/** Schema for creating a new event (POST body). */
export const createEventSchema = z.object({
    title: z.string().min(1, "title is required"),
    description: z.string().min(1, "description is required"),
    venue: z.string().nullable(),
    startsAt: z.string().datetime("startsAt must be an ISO date string"),
    capacity: z.number().int().positive("capacity must be a positive integer"),
    priceCents: z.number().int().nonnegative("priceCents must be a non-negative integer"),
    organizerId: z.string().min(1, "organizerId is required"),
});

/** Schema for partially updating an event (PATCH body). */
export const updateEventSchema = createEventSchema.partial();

/** Schema for list query params. Values arrive as strings from Express. */
export const listEventsQuerySchema = z.object({
    limit: z.coerce.number().int().positive().optional().default(20),
    offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
