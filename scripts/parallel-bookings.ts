/**
 * Concurrency proof for Session 3 task 2.
 *
 * Fires 20 simultaneous POST /v1/bookings for one capacity-5 event as 20
 * distinct users, prints a status-code tally, and exits non-zero on oversell.
 *
 * Expected tally with the serializable transaction + retry loop:
 *   5× 201  (the 5 winners who got a confirmed seat)
 *   15× 409 (the 15 who were rejected / waitlisted — no oversell)
 *
 * Usage:
 *   npm run dev                          # terminal 1 — start the server
 *   node scripts/parallel-bookings.ts    # terminal 2 — fire the test
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(__dirname, "fixtures", "parallel-users.json");

interface Fixture {
    baseUrl: string;
    eventId: string;
    capacity: number;
    users: Array<{ userId: string; token: string }>;
}

const fixture: Fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));

const { baseUrl, eventId, capacity, users } = fixture;

if (users.length < capacity + 1) {
    console.error(`Fixture needs at least ${capacity + 1} users to prove oversell prevention.`);
    process.exit(1);
}

console.log(`Firing ${users.length} simultaneous bookings for event ${eventId} (capacity ${capacity})…\n`);

const startTime = Date.now();

// Fire all requests simultaneously — no awaiting between them.
const results = await Promise.allSettled(
    users.map((user) =>
        fetch(`${baseUrl}/v1/bookings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-user-id": user.userId,
                ...(user.token ? { Authorization: `Bearer ${user.token}` } : {}),
            },
            body: JSON.stringify({ eventId }),
        }),
    ),
);

const elapsed = Date.now() - startTime;

// ── Tally ───────────────────────────────────────────────────
const tally: Record<number, number> = {};
const errors: string[] = [];

for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    const user = users[i]!;

    if (result.status === "rejected") {
        errors.push(`User ${user.userId}: network error — ${result.reason}`);
        const code = 0; // network failure
        tally[code] = (tally[code] ?? 0) + 1;
        continue;
    }

    const res = result.value;
    tally[res.status] = (tally[res.status] ?? 0) + 1;

    if (res.status >= 500) {
        const body = await res.text().catch(() => "<unreadable>");
        errors.push(`User ${user.userId}: ${res.status} — ${body}`);
    }
}

console.log("── Status code tally ────────────────────");
for (const code of Object.keys(tally).sort((a, b) => Number(a) - Number(b))) {
    const count = tally[Number(code)]!;
    const label = code === "0" ? "network error" : `HTTP ${code}`;
    console.log(`  ${label.padEnd(15)} ${count}×`);
}
console.log(`  (elapsed: ${elapsed}ms)`);
console.log("─────────────────────────────────────────");

if (errors.length > 0) {
    console.log(`\n${errors.length} error(s):`);
    for (const e of errors) {
        console.log(`  ${e}`);
    }
}

// ── Oversell check ──────────────────────────────────────────
const confirmed = tally[201] ?? 0;
const oversold = confirmed > capacity;

if (oversold) {
    console.error(`\n❌ OVERSOLD: ${confirmed} confirmed bookings for a capacity-${capacity} event!`);
    process.exit(1);
}

if (confirmed === capacity) {
    console.log(`\n✅ No oversell: exactly ${confirmed} confirmed bookings (capacity ${capacity}).`);
} else {
    console.log(`\n⚠️  Only ${confirmed} confirmed (expected ${capacity}). Check for errors above.`);
}

process.exit(0);
