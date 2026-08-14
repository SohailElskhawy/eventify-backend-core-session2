import type { Request, Response } from "express";
import * as venueService from "./venue.service.ts";
import type { CreateVenueInput, UpdateVenueInput, ListVenuesQuery } from "./venue.schema.ts";

function getId(req: Request): string {
    const { id } = req.params;
    return typeof id === "string" ? id : (id?.[0] ?? "");
}

/** POST /v1/venues */
export function create(req: Request, res: Response): void {
    const venue = venueService.createVenue(req.body as CreateVenueInput);
    res.status(201).json(venue);
}

/** GET /v1/venues */
export function list(_req: Request, res: Response): void {
    const { page, limit } = res.locals.query as ListVenuesQuery;
    const paginated = venueService.listVenues(page, limit);
    res.json(paginated);
}

/** GET /v1/venues/:id */
export function getById(req: Request, res: Response): void {
    const venue = venueService.getVenueById(getId(req));
    res.json(venue);
}

/** PATCH /v1/venues/:id */
export function update(req: Request, res: Response): void {
    const venue = venueService.updateVenue(getId(req), req.body as UpdateVenueInput);
    res.json(venue);
}

/** DELETE /v1/venues/:id */
export function remove(req: Request, res: Response): void {
    venueService.deleteVenue(getId(req));
    res.status(204).end();
}
