import { z } from "zod";

/** Schema for creating a new venue (POST body). */
export const createVenueSchema = z.object({
    name: z.string().min(1, "name is required"),
    address: z.string().min(1, "address is required"),
    capacity: z.number().int().positive("capacity must be a positive integer"),
    contactEmail: z.email("contactEmail must be a valid email"),
});

/** Schema for partially updating a venue (PATCH body). */
export const updateVenueSchema = createVenueSchema.partial();

/** Schema for list query params. `limit` arrives as a string from Express. */
export const listVenuesQuerySchema = z.object({
    limit: z.coerce.number().int().positive().optional(),
});

export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
export type ListVenuesQuery = z.infer<typeof listVenuesQuerySchema>;
