import type { Request, Response } from "express";
import * as bookingService from "./booking.service.ts";
import type { CreateBookingInput } from "./booking.schema.ts";
import { getRouteParam } from "../utils/http.ts";

/** POST /v1/bookings */
export async function create(req: Request, res: Response): Promise<void> {
    const booking = await bookingService.createBooking(req.user!.sub, req.body as CreateBookingInput);
    res.status(201).json(booking);
}

/** GET /v1/bookings/:id */
export async function getById(req: Request, res: Response): Promise<void> {
    const booking = await bookingService.getBookingById(getRouteParam(req), req.user!);
    res.json(booking);
}

/** DELETE /v1/bookings/:id */
export async function remove(req: Request, res: Response): Promise<void> {
    const booking = await bookingService.cancelBooking(getRouteParam(req), req.user!);
    res.json(booking);
}
