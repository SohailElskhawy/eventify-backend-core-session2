import { z } from "zod";

/**
 * Common schema for validating :id route parameters.
 * Enforces valid UUID format at the HTTP boundary.
 */
export const idParamSchema = z.strictObject({
    id: z.uuid("id parameter must be a valid UUID"),
});

export type IdParam = z.infer<typeof idParamSchema>;
