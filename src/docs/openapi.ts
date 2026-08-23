import { createDocument } from "zod-openapi";
import { z } from "zod";
import { signupSchema, loginSchema } from "../auth/auth.schema.ts";
import {
    createEventSchema,
    updateEventSchema,
    listEventsQuerySchema,
} from "../events/event.schema.ts";
import { createBookingSchema } from "../bookings/booking.schema.ts";
import { idParamSchema } from "../schemas/params.schema.ts";

// ── Shared Component Schemas ─────────────────────────────────

export const userModelSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(["ATTENDEE", "ORGANIZER", "ADMIN"]),
    createdAt: z.string(),
});

export const eventModelSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    venue: z.string().nullable(),
    startsAt: z.string(),
    capacity: z.number().int(),
    priceCents: z.number().int(),
    organizerId: z.string().uuid(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const bookingModelSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    eventId: z.string().uuid(),
    status: z.enum(["CONFIRMED", "CANCELLED", "WAITLISTED"]),
    createdAt: z.string(),
});

export const errorSchema = z.object({
    error: z.string(),
    details: z.any().optional(),
});

// ── Response Schemas ─────────────────────────────────────────

export const authSuccessResponseSchema = z.object({
    data: z.object({
        accessToken: z.string(),
        user: userModelSchema,
    }),
});

export const singleUserResponseSchema = z.object({
    data: userModelSchema,
});

export const singleEventResponseSchema = eventModelSchema;

export const paginatedEventsResponseSchema = z.object({
    data: z.array(eventModelSchema),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
});

export const singleBookingResponseSchema = bookingModelSchema;

export const healthResponseSchema = z.object({
    status: z.string(),
    uptime: z.number(),
});

// ── Complete OpenAPI Document Specification ──────────────────

export const openApiDocument = createDocument({
    openapi: "3.1.0",
    info: {
        title: "Eventify API",
        version: "1.0.0",
        description:
            "Production-ready, concurrency-safe Event Booking REST API featuring JWT rotation, Redis cache-aside, and BullMQ waitlist background workers.",
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "JWT access token signed with HS256 (expires in 15 minutes)",
            },
            cookieAuth: {
                type: "apiKey",
                in: "cookie",
                name: "refreshToken",
                description: "HttpOnly, Secure, SameSite=strict single-use refresh token cookie",
            },
        },
    },
    paths: {
        // ── Health & Spec ────────────────────────────────────
        "/health": {
            get: {
                summary: "Health Check Probe",
                description: "Returns service status and uptime.",
                tags: ["System"],
                responses: {
                    "200": {
                        description: "Service is healthy",
                        content: {
                            "application/json": { schema: healthResponseSchema },
                        },
                    },
                },
            },
        },
        "/openapi.json": {
            get: {
                summary: "OpenAPI Specification",
                description: "Returns the complete OpenAPI 3.1 JSON document.",
                tags: ["System"],
                responses: {
                    "200": {
                        description: "OpenAPI Specification JSON",
                        content: {
                            "application/json": { schema: z.record(z.string(), z.any()) },
                        },
                    },
                },
            },
        },

        // ── Auth Endpoints ───────────────────────────────────
        "/v1/auth/signup": {
            post: {
                summary: "Register new user",
                description: "Creates a new user account with default ATTENDEE role.",
                tags: ["Authentication"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": { schema: signupSchema },
                    },
                },
                responses: {
                    "201": {
                        description: "User registered successfully",
                        content: {
                            "application/json": { schema: singleUserResponseSchema },
                        },
                    },
                    "400": {
                        description: "Validation error",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "409": {
                        description: "Email already exists",
                        content: { "application/json": { schema: errorSchema } },
                    },
                },
            },
        },
        "/v1/auth/login": {
            post: {
                summary: "Authenticate user",
                description:
                    "Validates credentials, returns JWT access token, and sets single-use refresh token cookie. Rate-limited to 5 requests/min per IP.",
                tags: ["Authentication"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": { schema: loginSchema },
                    },
                },
                responses: {
                    "200": {
                        description: "Authenticated successfully",
                        content: {
                            "application/json": { schema: authSuccessResponseSchema },
                        },
                    },
                    "400": {
                        description: "Validation error",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "401": {
                        description: "Invalid email or password",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "429": {
                        description: "Rate limit exceeded (Too Many Requests)",
                        content: { "application/json": { schema: errorSchema } },
                    },
                },
            },
        },
        "/v1/auth/refresh": {
            post: {
                summary: "Rotate refresh token",
                description:
                    "Rotates the presented refresh token cookie, issuing a new access token and fresh refresh cookie. Reusing an old token revokes the session.",
                tags: ["Authentication"],
                security: [{ cookieAuth: [] }],
                responses: {
                    "200": {
                        description: "Token rotated successfully",
                        content: {
                            "application/json": { schema: authSuccessResponseSchema },
                        },
                    },
                    "401": {
                        description: "Missing, expired, or revoked refresh token",
                        content: { "application/json": { schema: errorSchema } },
                    },
                },
            },
        },
        "/v1/auth/logout": {
            post: {
                summary: "Logout user",
                description: "Revokes the active refresh token and clears the cookie.",
                tags: ["Authentication"],
                security: [{ cookieAuth: [] }],
                responses: {
                    "204": {
                        description: "Logged out successfully",
                    },
                    "401": {
                        description: "Unauthorized",
                        content: { "application/json": { schema: errorSchema } },
                    },
                },
            },
        },

        // ── Events Endpoints ─────────────────────────────────
        "/v1/events": {
            get: {
                summary: "List events",
                description:
                    "Returns a paginated list of upcoming events. Filterable by venue, from, and to dates. Cached in Redis with version invalidation.",
                tags: ["Events"],
                requestParams: {
                    query: listEventsQuerySchema,
                },
                responses: {
                    "200": {
                        description: "Paginated list of events",
                        content: {
                            "application/json": { schema: paginatedEventsResponseSchema },
                        },
                    },
                    "400": {
                        description: "Invalid query parameters",
                        content: { "application/json": { schema: errorSchema } },
                    },
                },
            },
            post: {
                summary: "Create event",
                description: "Creates a new event. Role-gated: requires ORGANIZER or ADMIN role.",
                tags: ["Events"],
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": { schema: createEventSchema },
                    },
                },
                responses: {
                    "201": {
                        description: "Event created successfully",
                        content: {
                            "application/json": { schema: singleEventResponseSchema },
                        },
                    },
                    "400": {
                        description: "Validation error or date not in future",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "401": {
                        description: "Unauthenticated",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "403": {
                        description: "Forbidden: ORGANIZER or ADMIN role required",
                        content: { "application/json": { schema: errorSchema } },
                    },
                },
            },
        },
        "/v1/events/{id}": {
            get: {
                summary: "Get event by ID",
                description: "Fetches single event details. Cached in Redis (event:{id}).",
                tags: ["Events"],
                requestParams: {
                    path: idParamSchema,
                },
                responses: {
                    "200": {
                        description: "Event details",
                        content: {
                            "application/json": { schema: singleEventResponseSchema },
                        },
                    },
                    "400": {
                        description: "Invalid event ID format",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "404": {
                        description: "Event not found",
                        content: { "application/json": { schema: errorSchema } },
                    },
                },
            },
            patch: {
                summary: "Update event",
                description:
                    "Updates event details. Enforces BOLA ownership: only the owning ORGANIZER or an ADMIN can update. Invalidates Redis cache.",
                tags: ["Events"],
                security: [{ bearerAuth: [] }],
                requestParams: {
                    path: idParamSchema,
                },
                requestBody: {
                    required: true,
                    content: {
                        "application/json": { schema: updateEventSchema },
                    },
                },
                responses: {
                    "200": {
                        description: "Event updated successfully",
                        content: {
                            "application/json": { schema: singleEventResponseSchema },
                        },
                    },
                    "400": {
                        description: "Validation error",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "401": {
                        description: "Unauthenticated",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "403": {
                        description: "Forbidden: You do not own this event",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "404": {
                        description: "Event not found",
                        content: { "application/json": { schema: errorSchema } },
                    },
                },
            },
            delete: {
                summary: "Delete event",
                description:
                    "Deletes event. Enforces BOLA ownership: only the owning ORGANIZER or an ADMIN can delete. Invalidates Redis cache.",
                tags: ["Events"],
                security: [{ bearerAuth: [] }],
                requestParams: {
                    path: idParamSchema,
                },
                responses: {
                    "204": {
                        description: "Event deleted successfully",
                    },
                    "400": {
                        description: "Invalid event ID format",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "401": {
                        description: "Unauthenticated",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "403": {
                        description: "Forbidden: You do not own this event",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "404": {
                        description: "Event not found",
                        content: { "application/json": { schema: errorSchema } },
                    },
                },
            },
        },

        // ── Bookings Endpoints ───────────────────────────────
        "/v1/bookings": {
            post: {
                summary: "Create booking",
                description:
                    "Creates a booking for the authenticated user inside a PostgreSQL Serializable transaction. If seats are available, returns CONFIRMED; if full, places on WAITLIST. Rate-limited to 10 requests/min per user.",
                tags: ["Bookings"],
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": { schema: createBookingSchema },
                    },
                },
                responses: {
                    "201": {
                        description: "Booking created (CONFIRMED or WAITLISTED)",
                        content: {
                            "application/json": { schema: singleBookingResponseSchema },
                        },
                    },
                    "400": {
                        description: "Validation error",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "401": {
                        description: "Unauthenticated",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "409": {
                        description: "User already has a booking for this event",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "429": {
                        description: "Rate limit exceeded (Too Many Requests)",
                        content: { "application/json": { schema: errorSchema } },
                    },
                },
            },
        },
        "/v1/bookings/{id}": {
            get: {
                summary: "Get booking by ID",
                description:
                    "Fetches booking details. Enforces BOLA ownership: only the booking owner or an ADMIN can view.",
                tags: ["Bookings"],
                security: [{ bearerAuth: [] }],
                requestParams: {
                    path: idParamSchema,
                },
                responses: {
                    "200": {
                        description: "Booking details",
                        content: {
                            "application/json": { schema: singleBookingResponseSchema },
                        },
                    },
                    "400": {
                        description: "Invalid booking ID format",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "401": {
                        description: "Unauthenticated",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "403": {
                        description: "Forbidden: You do not own this booking",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "404": {
                        description: "Booking not found",
                        content: { "application/json": { schema: errorSchema } },
                    },
                },
            },
            delete: {
                summary: "Cancel booking (Soft delete)",
                description:
                    "Soft-cancels a booking (status becomes CANCELLED). If a CONFIRMED booking is cancelled, triggers an asynchronous BullMQ job to promote the oldest waitlisted user.",
                tags: ["Bookings"],
                security: [{ bearerAuth: [] }],
                requestParams: {
                    path: idParamSchema,
                },
                responses: {
                    "200": {
                        description: "Booking cancelled successfully",
                        content: {
                            "application/json": { schema: singleBookingResponseSchema },
                        },
                    },
                    "400": {
                        description: "Invalid booking ID format",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "401": {
                        description: "Unauthenticated",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "403": {
                        description: "Forbidden: You do not own this booking",
                        content: { "application/json": { schema: errorSchema } },
                    },
                    "404": {
                        description: "Booking not found",
                        content: { "application/json": { schema: errorSchema } },
                    },
                },
            },
        },
    },
});
