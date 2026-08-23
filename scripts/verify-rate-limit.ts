/**
 * Verification script for Session 5: Redis Rate Limiting Rollout.
 *
 * Validates:
 * 1. IP-based rate limiting on POST /v1/auth/login (threshold: 5 requests / window)
 *    - Requests 1..5 are processed
 *    - Request 6 returns 429 Too Many Requests + Retry-After header
 * 2. User-based rate limiting on POST /v1/bookings (threshold: 10 requests / window)
 *    - Requests 1..10 are processed for the authenticated user
 *    - Request 11 returns 429 Too Many Requests + Retry-After header
 *
 * Usage:
 *   node --env-file=.env scripts/verify-rate-limit.ts
 */

const BASE_URL = process.env["BASE_URL"] || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
    if (condition) {
        console.log(`✅ PASS: ${description}`);
        passed++;
    } else {
        console.error(`❌ FAIL: ${description}`);
        failed++;
    }
}

async function run() {
    console.log("==================================================");
    console.log("🚀 Starting Session 5 Rate Limiting Verification Suite");
    console.log(`Target: ${BASE_URL}`);
    console.log("==================================================\n");

    // ── Test 1: POST /v1/auth/login (Strict Per-IP, limit = 5) ─────────────
    console.log("--- 1. Testing Login IP Rate Limiting (Limit: 5 requests / 60s) ---");
    const loginResponses = [];
    for (let i = 1; i <= 6; i++) {
        const res = await fetch(`${BASE_URL}/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "attendee1@example.com", password: "password123" }),
        });
        loginResponses.push({
            attempt: i,
            status: res.status,
            retryAfter: res.headers.get("retry-after"),
            limit: res.headers.get("x-ratelimit-limit"),
            remaining: res.headers.get("x-ratelimit-remaining"),
        });
    }

    const underLimit = loginResponses.slice(0, 5);
    const overLimit = loginResponses[5];

    assert(
        underLimit.every((r) => r.status === 200),
        `First 5 login attempts processed successfully (status 200). Statuses: [${underLimit.map((r) => r.status).join(", ")}]`,
    );

    assert(
        overLimit !== undefined && overLimit.status === 429,
        `6th login attempt receives 429 Too Many Requests (got ${overLimit?.status})`,
    );

    assert(
        overLimit !== undefined && overLimit.retryAfter !== null && parseInt(overLimit.retryAfter, 10) > 0,
        `429 response contains valid Retry-After header: ${overLimit?.retryAfter}s`,
    );

    // ── Test 2: POST /v1/bookings (Per-User Rate Limit, limit = 10) ────────
    console.log("\n--- 2. Testing Bookings Per-User Rate Limiting (Limit: 10 requests / 60s) ---");

    // Login as a second user to test per-user rate limit without being blocked by test 1's IP limit if running from another token
    // First, let's get a token for attendee2 (or organizer)
    // Note: since test 1 consumed IP limit on /login, we can test bookings using a pre-generated token or wait/login before
    // If attendee1 got a token on attempt 1, use that token:
    // Let's create an event or use seeded event id
    const eventsRes = await fetch(`${BASE_URL}/v1/events`);
    const eventsData = (await eventsRes.json()) as { data?: Array<{ id: string }> };
    const eventId = eventsData.data?.[0]?.id;

    if (!eventId) {
        console.error("❌ No events found in database to test bookings rate limit. Please seed database.");
    } else {
        // Log in to get token (attempt 1 had token)
        // Let's get token from attempt 1
        const firstLogin = await fetch(`${BASE_URL}/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Forwarded-For": "192.168.1.100" },
            body: JSON.stringify({ email: "attendee2@example.com", password: "password123" }),
        });
        const loginData = (await firstLogin.json()) as { data?: { accessToken?: string } };
        const token = loginData.data?.accessToken;

        if (!token) {
            console.error("❌ Could not obtain access token for user booking test.");
        } else {
            const bookingResponses = [];
            for (let i = 1; i <= 11; i++) {
                const res = await fetch(`${BASE_URL}/v1/bookings`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ eventId }),
                });
                bookingResponses.push({
                    attempt: i,
                    status: res.status,
                    retryAfter: res.headers.get("retry-after"),
                });
            }

            const bookingUnder = bookingResponses.slice(0, 10);
            const bookingOver = bookingResponses[10];

            assert(
                bookingUnder.every((r) => r.status !== 429),
                `First 10 booking attempts are under rate limit (non-429). Statuses: [${bookingUnder.map((r) => r.status).join(", ")}]`,
            );

            assert(
                bookingOver !== undefined && bookingOver.status === 429,
                `11th booking attempt receives 429 Too Many Requests (got ${bookingOver?.status})`,
            );

            assert(
                bookingOver !== undefined && bookingOver.retryAfter !== null,
                `Booking 429 response contains Retry-After header: ${bookingOver?.retryAfter}s`,
            );
        }
    }

    console.log("\n==================================================");
    console.log(`Results: ${passed} Passed, ${failed} Failed`);
    console.log("==================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

void run();
