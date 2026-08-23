import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.ts";
import { createTestUser } from "../helpers/auth.helper.ts";

describe("Auth Integration Tests", () => {
    describe("POST /v1/auth/signup", () => {
        it("should register a new user and return 201 with public user fields", async () => {
            const email = `signup-${Date.now()}@eventify.com`;
            const res = await request(app)
                .post("/v1/auth/signup")
                .send({
                    email,
                    password: "Password123!",
                    name: "Alice Attendee",
                    role: "ATTENDEE",
                });

            expect(res.status).toBe(201);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.id).toBeDefined();
            expect(res.body.data.email).toBe(email);
            expect(res.body.data.name).toBe("Alice Attendee");
            expect(res.body.data.role).toBe("ATTENDEE");
            // Must NOT leak passwordHash
            expect(res.body.data.passwordHash).toBeUndefined();
        });

        it("should return 409 Conflict when attempting to sign up with an existing email", async () => {
            const existing = await createTestUser({ email: "duplicate@eventify.com" });

            const res = await request(app)
                .post("/v1/auth/signup")
                .send({
                    email: existing.user.email,
                    password: "Password123!",
                    name: "Duplicate User",
                });

            expect(res.status).toBe(409);
        });

        it("should return 400 Bad Request on invalid email or short password", async () => {
            const res = await request(app)
                .post("/v1/auth/signup")
                .send({
                    email: "not-an-email",
                    password: "123",
                    name: "Bad",
                });

            expect(res.status).toBe(400);
        });
    });

    describe("POST /v1/auth/login & POST /v1/auth/refresh rotation", () => {
        it("should authenticate valid user, return access token, and set HttpOnly refresh cookie", async () => {
            const password = "Password123!";
            const { user } = await createTestUser({ password });

            const res = await request(app)
                .post("/v1/auth/login")
                .send({
                    email: user.email,
                    password,
                });

            expect(res.status).toBe(200);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.accessToken).toBeDefined();
            expect(res.body.data.user.email).toBe(user.email);

            const cookies = res.headers["set-cookie"];
            expect(cookies).toBeDefined();
            expect(cookies.some((c: string) => c.includes("refreshToken="))).toBe(true);
            expect(cookies.some((c: string) => c.includes("HttpOnly"))).toBe(true);
        });

        it("should return 401 on invalid password", async () => {
            const { user } = await createTestUser({ password: "CorrectPassword123!" });

            const res = await request(app)
                .post("/v1/auth/login")
                .send({
                    email: user.email,
                    password: "WrongPassword123!",
                });

            expect(res.status).toBe(401);
        });

        it("should rotate refresh token and succeed on sequential valid rotations", async () => {
            const password = "Password123!";
            const { user } = await createTestUser({ password });

            // 1. Initial login
            const loginRes = await request(app)
                .post("/v1/auth/login")
                .send({ email: user.email, password });

            expect(loginRes.status).toBe(200);
            const initialCookies = loginRes.headers["set-cookie"];
            expect(initialCookies).toBeDefined();

            // 2. First rotation via /v1/auth/refresh
            const refreshRes1 = await request(app)
                .post("/v1/auth/refresh")
                .set("Cookie", initialCookies);

            expect(refreshRes1.status).toBe(200);
            expect(refreshRes1.body.data.accessToken).toBeDefined();
            const rotatedCookies = refreshRes1.headers["set-cookie"];
            expect(rotatedCookies).toBeDefined();

            // 3. Second rotation using the NEW rotated token must succeed
            const refreshRes2 = await request(app)
                .post("/v1/auth/refresh")
                .set("Cookie", rotatedCookies);

            expect(refreshRes2.status).toBe(200);
            expect(refreshRes2.body.data.accessToken).toBeDefined();
        });

        it("should detect token reuse attack and revoke user session with 401", async () => {
            const password = "Password123!";
            const { user } = await createTestUser({ password });

            // 1. Login
            const loginRes = await request(app)
                .post("/v1/auth/login")
                .send({ email: user.email, password });

            const initialCookies = loginRes.headers["set-cookie"];

            // 2. Legitimate client rotates token
            const refreshRes = await request(app)
                .post("/v1/auth/refresh")
                .set("Cookie", initialCookies);

            expect(refreshRes.status).toBe(200);
            const rotatedCookies = refreshRes.headers["set-cookie"];

            // 3. Attacker presents the OLD (already rotated) token -> must return 401
            const reuseRes = await request(app)
                .post("/v1/auth/refresh")
                .set("Cookie", initialCookies);

            expect(reuseRes.status).toBe(401);

            // 4. Because reuse triggered family revocation, the rotated token is now also invalid
            const revokedRes = await request(app)
                .post("/v1/auth/refresh")
                .set("Cookie", rotatedCookies);

            expect(revokedRes.status).toBe(401);
        });

        it("should return 401 when calling /v1/auth/refresh without cookie", async () => {
            const res = await request(app).post("/v1/auth/refresh");
            expect(res.status).toBe(401);
        });
    });
});
