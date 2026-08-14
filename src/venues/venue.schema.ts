import { z } from "zod";

/** Schema for creating a new venue (POST body). */
export const createVenueSchema = z.strictObject({
    name: z.string().trim().min(2, "name must be at least 2 characters").max(200, "name cannot exceed 200 characters"),
    address: z.string().trim().min(5, "address must be at least 5 characters").max(500, "address cannot exceed 500 characters"),
    capacity: z.number().int().positive("capacity must be a positive integer").max(100_000, "capacity cannot exceed 100,000"),
    contactEmail: z.preprocess(
        (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
        z.email("contactEmail must be a valid email"),
    ),
});

/** Schema for partially updating a venue (PATCH body). */
export const updateVenueSchema = createVenueSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for update",
);

/** Schema for list query params. Values arrive as strings from Express. */
export const listVenuesQuerySchema = z.strictObject({
    page: z.coerce.number().int().min(1, "page must be an integer >= 1").optional().default(1),
    limit: z.coerce.number().int().min(1, "limit must be between 1 and 100").max(100, "limit cannot exceed 100").optional().default(20),
});

export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
export type ListVenuesQuery = z.infer<typeof listVenuesQuerySchema>;
