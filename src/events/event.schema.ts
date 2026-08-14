import { z } from "zod";

/** Schema for creating a new event (POST body). */
export const createEventSchema = z.strictObject({
    title: z.string().trim().min(3, "title must be at least 3 characters").max(200, "title cannot exceed 200 characters"),
    description: z.string().trim().min(10, "description must be at least 10 characters").max(2000, "description cannot exceed 2000 characters"),
    venue: z.string().trim().min(2, "venue must be at least 2 characters").max(200, "venue cannot exceed 200 characters").nullable(),
    startsAt: z.string().datetime("startsAt must be an ISO date string"),
    capacity: z.number().int().positive("capacity must be a positive integer").max(100_000, "capacity cannot exceed 100,000"),
    priceCents: z.number().int().nonnegative("priceCents must be a non-negative integer").max(10_000_000, "priceCents cannot exceed 10,000,000 ($100k)"),
    organizerId: z.string().trim().min(1, "organizerId is required"),
});

/** Schema for partially updating an event (PATCH body). */
export const updateEventSchema = createEventSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for update",
);

/** Schema for list query params. Values arrive as strings from Express. */
export const listEventsQuerySchema = z.strictObject({
    page: z.coerce.number().int().min(1, "page must be an integer >= 1").optional().default(1),
    limit: z.coerce.number().int().min(1, "limit must be between 1 and 100").max(100, "limit cannot exceed 100").optional().default(20),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
