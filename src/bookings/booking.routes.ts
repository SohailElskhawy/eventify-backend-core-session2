import { Router } from "express";
import { validate, validateParams } from "../middleware/validate.ts";
import { idParamSchema } from "../schemas/params.schema.ts";
import { createBookingSchema } from "./booking.schema.ts";
import * as bookingController from "./booking.controller.ts";
import { requireAuth } from "../auth/auth.middleware.ts";
import { rateLimiter } from "../middleware/rateLimiter.ts";

export const bookingRouter = Router();

// All booking routes require authentication
bookingRouter.post(
    "/",
    requireAuth,
    rateLimiter({
        windowSeconds: 60,
        maxRequests: 10,
        prefix: "/v1/bookings",
        keyGenerator: (req) => req.user?.sub ?? req.ip ?? "unknown",
    }),
    validate(createBookingSchema),
    bookingController.create,
);
bookingRouter.get("/:id", requireAuth, validateParams(idParamSchema), bookingController.getById);
bookingRouter.delete("/:id", requireAuth, validateParams(idParamSchema), bookingController.remove);
