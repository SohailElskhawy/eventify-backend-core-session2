import { z } from "zod";

export const signupSchema = z.strictObject({
    email: z.email("Invalid email address").toLowerCase().trim(),
    password: z.string().min(8, "Password must be at least 8 characters").max(100),
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    role: z.enum(["ATTENDEE", "ORGANIZER", "ADMIN"]).optional().default("ATTENDEE"),
});

export const loginSchema = z.strictObject({
    email: z.email("Invalid email address").toLowerCase().trim(),
    password: z.string().min(1, "Password is required"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
