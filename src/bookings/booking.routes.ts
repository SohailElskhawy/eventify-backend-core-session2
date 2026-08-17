import { Router } from "express";
import { validate, validateParams } from "../middleware/validate.ts";
import { idParamSchema } from "../schemas/params.schema.ts";
import { createBookingSchema } from "./booking.schema.ts";
import * as bookingController from "./booking.controller.ts";

export const bookingRouter = Router();

bookingRouter.post("/", validate(createBookingSchema), bookingController.create);
bookingRouter.get("/:id", validateParams(idParamSchema), bookingController.getById);
bookingRouter.delete("/:id", validateParams(idParamSchema), bookingController.remove);
