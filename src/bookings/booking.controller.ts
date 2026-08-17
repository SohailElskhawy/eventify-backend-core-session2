import type { Request, Response } from "express";
import * as bookingService from "./booking.service.ts";
import type { CreateBookingInput } from "./booking.schema.ts";
import { getRouteParam } from "../utils/http.ts";

/**
 * Temporary user-id resolution until Session 4 adds real auth.
 *
 * The `x-user-id` header is the stand-in for a JWT-extracted subject —
 * the parallel-bookings script sets it per-request so 20 distinct users
 * can hit the same endpoint simultaneously. If the header is absent
 * (e.g. manual curl testing), we fall back to a seeded default user.
 *
 * Session 4 will replace this with `req.user.id` populated by auth middleware.
 */
const DEFAULT_USER_ID = "00000000-0000-4000-8000-000000000003"; // Carol Attendee from seed
const USER_ID_HEADER = "x-user-id";

function resolveUserId(req: Request): string {
    const header = req.get(USER_ID_HEADER);
    return header && header.trim().length > 0 ? header.trim() : DEFAULT_USER_ID;
}

/** POST /v1/bookings */
export async function create(req: Request, res: Response): Promise<void> {
    const userId = resolveUserId(req);
    const booking = await bookingService.createBooking(userId, req.body as CreateBookingInput);
    res.status(201).json(booking);
}

/** GET /v1/bookings/:id */
export async function getById(req: Request, res: Response): Promise<void> {
    const booking = await bookingService.getBookingById(getRouteParam(req));
    res.json(booking);
}

/** DELETE /v1/bookings/:id */
export async function remove(req: Request, res: Response): Promise<void> {
    const booking = await bookingService.cancelBooking(getRouteParam(req));
    res.json(booking);
}
