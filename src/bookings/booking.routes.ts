import { Router } from "express";
import { validate } from "../middleware/validate.ts";
import { createBookingSchema } from "./booking.schema.ts";
import * as bookingController from "./booking.controller.ts";

export const bookingRouter = Router();

bookingRouter.post("/", validate(createBookingSchema), bookingController.create);
bookingRouter.get("/:id", bookingController.getById);
bookingRouter.delete("/:id", bookingController.remove);
