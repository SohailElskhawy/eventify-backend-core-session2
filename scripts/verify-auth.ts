/**
 * Automated verification script for Session 4: Locking Eventify Down.
 *
 * Validates:
 * 1. Public endpoints (GET /health, GET /v1/events)
 * 2. Unauthenticated access prevention (401 on mutations)
 * 3. Role enforcement (403 on Attendee creating an event)
 * 4. BOLA / Ownership checks (403 on Organizer 2 modifying Organizer 1's event, 403 on User B cancelling User A's booking)
 * 5. Admin bypass capabilities
 * 6. Refresh token rotation & token reuse/theft detection (401)
 *
 * Usage:
 *   node --env-file=.env scripts/verify-auth.ts
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

interface LoginResult {
    status: number;
    body: { data?: { accessToken?: string } };
    cookie: string;
    token: string;
}

async function loginUser(email: string, password = "password123"): Promise<LoginResult> {
    const res = await fetch(`${BASE_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    const body = (await res.json()) as { data?: { accessToken?: string } };
    const cookie = res.headers.get("set-cookie") || "";
    return {
        status: res.status,
        body,
        cookie,
        token: body?.data?.accessToken || "",
    };
}

async function runVerification() {
    console.log(`\n🔒 Running Session 4 Auth & Security Verification against ${BASE_URL}...\n`);

    // 1. Health & Public GETs
    const healthRes = await fetch(`${BASE_URL}/health`);
    assert(healthRes.status === 200, "GET /health is public and returns 200");

    const eventsRes = await fetch(`${BASE_URL}/v1/events`);
    assert(eventsRes.status === 200, "GET /v1/events is public and returns 200");

    // 2. Unauthenticated mutations return 401
    const unauthEventRes = await fetch(`${BASE_URL}/v1/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: "Unauth Event",
            description: "Should fail unauthenticated",
            startsAt: new Date(Date.now() + 86400000).toISOString(),
            capacity: 50,
            priceCents: 1000,
        }),
    });
    assert(unauthEventRes.status === 401, "Unauthenticated POST /v1/events returns 401");

    const unauthBookingRes = await fetch(`${BASE_URL}/v1/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: "00000000-0000-4000-8000-000000000010" }),
    });
    assert(unauthBookingRes.status === 401, "Unauthenticated POST /v1/bookings returns 401");

    // 3. Login users
    const org1Auth = await loginUser("organizer@eventify.com");
    assert(org1Auth.status === 200 && Boolean(org1Auth.token), "Organizer 1 can log in and receives access token");

    const org2Auth = await loginUser("organizer2@eventify.com");
    assert(org2Auth.status === 200 && Boolean(org2Auth.token), "Organizer 2 can log in and receives access token");

    const attendeeAuth = await loginUser("attendee@eventify.com");
    assert(attendeeAuth.status === 200 && Boolean(attendeeAuth.token), "Attendee can log in and receives access token");

    const adminAuth = await loginUser("admin@eventify.com");
    assert(adminAuth.status === 200 && Boolean(adminAuth.token), "Admin can log in and receives access token");

    // 4. Role check: Attendee creating event -> 403
    const attendeeCreateEventRes = await fetch(`${BASE_URL}/v1/events`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${attendeeAuth.token}`,
        },
        body: JSON.stringify({
            title: "Attendee Event",
            description: "Attendee trying to create event",
            startsAt: new Date(Date.now() + 86400000).toISOString(),
            capacity: 50,
            priceCents: 1000,
        }),
    });
    assert(attendeeCreateEventRes.status === 403, "Attendee POST /v1/events returns 403 Forbidden");

    // 5. Organizer 1 creates an event
    const org1CreateEventRes = await fetch(`${BASE_URL}/v1/events`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1Auth.token}`,
        },
        body: JSON.stringify({
            title: "Organizer 1 Exclusive Masterclass",
            description: "High quality engineering workshop",
            startsAt: new Date(Date.now() + 86400000 * 5).toISOString(),
            capacity: 40,
            priceCents: 2000,
        }),
    });
    const org1Event = (await org1CreateEventRes.json()) as { id?: string };
    assert(org1CreateEventRes.status === 201 && Boolean(org1Event?.id), "Organizer 1 successfully creates event (201 Created)");

    const eventId = org1Event.id || "";

    // 6. Ownership Check (BOLA): Organizer 2 tries to PATCH Organizer 1's event -> 403
    const org2PatchRes = await fetch(`${BASE_URL}/v1/events/${eventId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org2Auth.token}`,
        },
        body: JSON.stringify({ title: "Hacked by Organizer 2" }),
    });
    assert(org2PatchRes.status === 403, "BOLA Check: Organizer 2 PATCH Organizer 1's event returns 403 Forbidden");

    // Organizer 2 tries to DELETE Organizer 1's event -> 403
    const org2DeleteRes = await fetch(`${BASE_URL}/v1/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${org2Auth.token}` },
    });
    assert(org2DeleteRes.status === 403, "BOLA Check: Organizer 2 DELETE Organizer 1's event returns 403 Forbidden");

    // 7. Organizer 1 can PATCH own event -> 200
    const org1PatchRes = await fetch(`${BASE_URL}/v1/events/${eventId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${org1Auth.token}`,
        },
        body: JSON.stringify({ title: "Updated Title by Owner" }),
    });
    assert(org1PatchRes.status === 200, "Organizer 1 can PATCH own event (200 OK)");

    // 8. Admin bypass: Admin can PATCH Organizer 1's event -> 200
    const adminPatchRes = await fetch(`${BASE_URL}/v1/events/${eventId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminAuth.token}`,
        },
        body: JSON.stringify({ title: "Admin Moderated Title" }),
    });
    assert(adminPatchRes.status === 200, "Admin bypass: Admin can PATCH Organizer 1's event (200 OK)");

    // 9. Booking creation & Ownership check
    const bookingCreateRes = await fetch(`${BASE_URL}/v1/bookings`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${attendeeAuth.token}`,
        },
        body: JSON.stringify({ eventId }),
    });
    const bookingData = (await bookingCreateRes.json()) as { id?: string };
    assert(bookingCreateRes.status === 201 && Boolean(bookingData?.id), "Attendee creates booking (201 Created)");

    const bookingId = bookingData.id || "";

    // Organizer 1 tries to cancel Attendee's booking -> 403
    const org1CancelBookingRes = await fetch(`${BASE_URL}/v1/bookings/${bookingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${org1Auth.token}` },
    });
    assert(org1CancelBookingRes.status === 403, "BOLA Check: Other user cannot cancel Attendee's booking (403 Forbidden)");

    // Attendee cancels own booking -> 200
    const attendeeCancelBookingRes = await fetch(`${BASE_URL}/v1/bookings/${bookingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${attendeeAuth.token}` },
    });
    assert(attendeeCancelBookingRes.status === 200, "Attendee can cancel own booking (200 OK)");

    // 10. Refresh Token Rotation & Theft/Reuse Detection
    const cookieHeader = org1Auth.cookie ? (org1Auth.cookie.split(";")[0] ?? "") : "";

    const refreshRes1 = await fetch(`${BASE_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: { Cookie: cookieHeader },
    });
    const refreshData1 = (await refreshRes1.json()) as { data?: { accessToken?: string } };
    assert(
        refreshRes1.status === 200 && Boolean(refreshData1?.data?.accessToken),
        "POST /v1/auth/refresh returns 200 and issues new access token",
    );

    // Theft signal: Re-submitting the PREVIOUS cookie must return 401
    const reuseRes = await fetch(`${BASE_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: { Cookie: cookieHeader },
    });
    assert(reuseRes.status === 401, "Theft Detection: Reusing old rotated refresh token returns 401 Unauthorized");

    console.log(`\n========================================`);
    console.log(`Verification Complete: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runVerification().catch((err) => {
    console.error("Verification failed with unexpected error:", err);
    process.exit(1);
});
