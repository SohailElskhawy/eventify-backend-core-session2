import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.ts";
import { createTestUser } from "../helpers/auth.helper.ts";

describe("Auth Integration Tests", () => {
    describe("POST /v1/auth/signup", () => {
        it("should register a new user successfully and return 201", async () => {
            const signupPayload = {
                email: "newuser@example.com",
                password: "SecurePassword123!",
                name: "New User",
                role: "ATTENDEE",
            };

            const res = await request(app)
                .post("/v1/auth/signup")
                .send(signupPayload);

            expect(res.status).toBe(201);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.id).toBeDefined();
            expect(res.body.data.email).toBe("newuser@example.com");
            expect(res.body.data.name).toBe("New User");
            expect(res.body.data.role).toBe("ATTENDEE");
            expect(res.body.data.passwordHash).toBeUndefined();
        });

        it("should return 409 if email already exists", async () => {
            await createTestUser({ email: "existing@example.com" });

            const res = await request(app)
                .post("/v1/auth/signup")
                .send({
                    email: "existing@example.com",
                    password: "Password123!",
                    name: "Another User",
                });

            expect(res.status).toBe(409);
        });
    });

    describe("POST /v1/auth/login & POST /v1/auth/refresh rotation", () => {
        it("should login successfully, return access token, and set httpOnly refresh cookie", async () => {
            const { user, password } = await createTestUser({
                email: "login-test@example.com",
                password: "Password123!",
            });

            const res = await request(app)
                .post("/v1/auth/login")
                .send({
                    email: user.email,
                    password,
                });

            expect(res.status).toBe(200);
            expect(res.body.data.accessToken).toBeDefined();
            expect(res.body.data.user.id).toBe(user.id);

            const cookies = res.headers["set-cookie"];
            expect(cookies).toBeDefined();
            const refreshCookie = Array.isArray(cookies) ? cookies.find((c) => c.startsWith("refreshToken=")) : cookies;
            expect(refreshCookie).toBeDefined();
            expect(refreshCookie).toContain("HttpOnly");
        });

        it("should return 401 for incorrect password", async () => {
            const { user } = await createTestUser({ email: "wrongpass@example.com" });

            const res = await request(app)
                .post("/v1/auth/login")
                .send({
                    email: user.email,
                    password: "WrongPassword!",
                });

            expect(res.status).toBe(401);
        });

        it("should rotate refresh token and reject rotated token reuse with 401", async () => {
            const { user, password } = await createTestUser({
                email: "rotation-test@example.com",
                password: "Password123!",
            });

            // 1. Initial Login
            const loginRes = await request(app)
                .post("/v1/auth/login")
                .send({ email: user.email, password });

            expect(loginRes.status).toBe(200);
            const initialCookies = loginRes.headers["set-cookie"];
            expect(initialCookies).toBeDefined();

            // 2. Perform token rotation via /v1/auth/refresh
            const refreshRes1 = await request(app)
                .post("/v1/auth/refresh")
                .set("Cookie", initialCookies);

            expect(refreshRes1.status).toBe(200);
            expect(refreshRes1.body.data.accessToken).toBeDefined();
            const rotatedCookies = refreshRes1.headers["set-cookie"];
            expect(rotatedCookies).toBeDefined();

            // 3. Attempting to reuse the OLD (already rotated) refresh token must fail with 401
            const reuseRes = await request(app)
                .post("/v1/auth/refresh")
                .set("Cookie", initialCookies);

            expect(reuseRes.status).toBe(401);

            // 4. Using the NEW rotated token must succeed
            const refreshRes2 = await request(app)
                .post("/v1/auth/refresh")
                .set("Cookie", rotatedCookies);

            expect(refreshRes2.status).toBe(200);
            expect(refreshRes2.body.data.accessToken).toBeDefined();
        });

        it("should return 401 when calling /v1/auth/refresh without cookie", async () => {
            const res = await request(app).post("/v1/auth/refresh");
            expect(res.status).toBe(401);
        });
    });
});
