import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.ts";

describe("OpenAPI Documentation Endpoint", () => {
    it("should serve a valid OpenAPI 3.1.0 JSON document at GET /openapi.json", async () => {
        const res = await request(app).get("/openapi.json");

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("application/json");
        expect(res.body).toBeDefined();
        expect(res.body.openapi).toBe("3.1.0");
        expect(res.body.info).toBeDefined();
        expect(res.body.info.title).toBe("Eventify API");
        expect(res.body.info.version).toBe("1.0.0");

        // Verify that all core API routes are documented
        const paths = res.body.paths;
        expect(paths).toBeDefined();

        // System
        expect(paths["/health"]).toBeDefined();
        expect(paths["/health"].get).toBeDefined();
        expect(paths["/openapi.json"]).toBeDefined();
        expect(paths["/openapi.json"].get).toBeDefined();

        // Auth
        expect(paths["/v1/auth/signup"]).toBeDefined();
        expect(paths["/v1/auth/signup"].post).toBeDefined();
        expect(paths["/v1/auth/login"]).toBeDefined();
        expect(paths["/v1/auth/login"].post).toBeDefined();
        expect(paths["/v1/auth/refresh"]).toBeDefined();
        expect(paths["/v1/auth/refresh"].post).toBeDefined();
        expect(paths["/v1/auth/logout"]).toBeDefined();
        expect(paths["/v1/auth/logout"].post).toBeDefined();

        // Events
        expect(paths["/v1/events"]).toBeDefined();
        expect(paths["/v1/events"].get).toBeDefined();
        expect(paths["/v1/events"].post).toBeDefined();
        expect(paths["/v1/events/{id}"]).toBeDefined();
        expect(paths["/v1/events/{id}"].get).toBeDefined();
        expect(paths["/v1/events/{id}"].patch).toBeDefined();
        expect(paths["/v1/events/{id}"].delete).toBeDefined();

        // Bookings
        expect(paths["/v1/bookings"]).toBeDefined();
        expect(paths["/v1/bookings"].post).toBeDefined();
        expect(paths["/v1/bookings/{id}"]).toBeDefined();
        expect(paths["/v1/bookings/{id}"].get).toBeDefined();
        expect(paths["/v1/bookings/{id}"].delete).toBeDefined();
    });
});
