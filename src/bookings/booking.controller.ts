import type { Request, Response } from "express";
import * as bookingService from "./booking.service.ts";
import type { CreateBookingInput } from "./booking.schema.ts";
import { getRouteParam } from "../utils/http.ts";

/** Hardcoded user id until authentication arrives in Session 4 */
const CURRENT_USER_ID = "user-1";

/** POST /v1/bookings */
export function create(req: Request, res: Response): void {
    const booking = bookingService.createBooking(CURRENT_USER_ID, req.body as CreateBookingInput);
    res.status(201).json(booking);
}

/** GET /v1/bookings/:id */
export function getById(req: Request, res: Response): void {
    const booking = bookingService.getBookingById(getRouteParam(req));
    res.json(booking);
}

/** DELETE /v1/bookings/:id */
export function remove(req: Request, res: Response): void {
    const booking = bookingService.cancelBooking(getRouteParam(req));
    res.json(booking);
}
