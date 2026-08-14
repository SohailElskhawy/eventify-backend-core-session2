import { Router } from "express";
import { validate, validateQuery } from "../middleware/validate.ts";
import { createVenueSchema, updateVenueSchema, listVenuesQuerySchema } from "./venue.schema.ts";
import * as venueController from "./venue.controller.ts";

export const venueRouter = Router();

venueRouter.post("/", validate(createVenueSchema), venueController.create);
venueRouter.get("/", validateQuery(listVenuesQuerySchema), venueController.list);
venueRouter.get("/:id", venueController.getById);
venueRouter.patch("/:id", validate(updateVenueSchema), venueController.update);
venueRouter.delete("/:id", venueController.remove);
