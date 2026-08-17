import { z } from "zod";

/**
 * Shared reusable schema for paginated list endpoints.
 * Coerces string query parameters from Express to integer defaults.
 */
export const paginationQuerySchema = z.strictObject({
    page: z.coerce.number().int().min(1, "page must be an integer >= 1").optional().default(1),
    limit: z.coerce.number().int().min(1, "limit must be between 1 and 100").max(100, "limit cannot exceed 100").optional().default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
