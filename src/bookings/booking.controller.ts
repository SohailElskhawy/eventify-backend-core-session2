import type { Request, Response } from "express";
import * as bookingService from "./booking.service.ts";
import type { CreateBookingInput } from "./booking.schema.ts";
import { getRouteParam, getAuthenticatedUser } from "../utils/http.ts";

/** POST /v1/bookings */
export async function create(req: Request<unknown, unknown, CreateBookingInput>, res: Response): Promise<void> {
    const user = getAuthenticatedUser(req);
    const booking = await bookingService.createBooking(user.sub, req.body);
    res.status(201).json(booking);
}

/** GET /v1/bookings/:id */
export async function getById(req: Request<{ id: string }>, res: Response): Promise<void> {
    const user = getAuthenticatedUser(req);
    const booking = await bookingService.getBookingById(getRouteParam(req), user);
    res.json(booking);
}

/** DELETE /v1/bookings/:id */
export async function remove(req: Request<{ id: string }>, res: Response): Promise<void> {
    const user = getAuthenticatedUser(req);
    const booking = await bookingService.cancelBooking(getRouteParam(req), user);
    res.json(booking);
}
