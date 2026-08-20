import { Router } from "express";
import { validate, validateParams } from "../middleware/validate.ts";
import { idParamSchema } from "../schemas/params.schema.ts";
import { createBookingSchema } from "./booking.schema.ts";
import * as bookingController from "./booking.controller.ts";
import { requireAuth } from "../auth/auth.middleware.ts";

export const bookingRouter = Router();

// All booking routes require authentication
bookingRouter.post("/", requireAuth, validate(createBookingSchema), bookingController.create);
bookingRouter.get("/:id", requireAuth, validateParams(idParamSchema), bookingController.getById);
bookingRouter.delete("/:id", requireAuth, validateParams(idParamSchema), bookingController.remove);
