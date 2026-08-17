import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../src/generated/prisma/client.ts";

/**
 * Seed script — idempotent (all upserts, safe to run multiple times).
 *
 * Creates:
 *   - 3 core users: ORGANIZER, ADMIN, ATTENDEE
 *   - 5 events (one with capacity 5 — the target for parallel-bookings.ts)
 *   - a few sample bookings
 *   - 20 parallel-test users (deterministic UUIDs so re-seeding doesn't
 *     change the ids you paste into scripts/fixtures/parallel-users.json)
 *
 * Run:  npx prisma db seed   (or)  node --env-file=.env prisma/seed.ts
 */

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] });
const prisma = new PrismaClient({ adapter });

// ── Fixed UUIDs for the parallel script target ──────────────
// Using deterministic ids so parallel-users.json never needs updating
// after a re-seed. The parallel users use a distinct UUID prefix (a...)
// to avoid colliding with the core users/events which use 0... prefix.
const PARALLEL_EVENT_ID = "a0000000-0000-4000-8000-000000000005";
const parallelUserIds: string[] = [];
for (let i = 1; i <= 20; i++) {
    parallelUserIds.push(`a0000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
}

async function main(): Promise<void> {
    // ── Core users ──────────────────────────────────────────
    const organizer = await prisma.user.upsert({
        where: { email: "organizer@eventify.com" },
        update: {},
        create: {
            id: "00000000-0000-4000-8000-000000000001",
            email: "organizer@eventify.com",
            name: "Alice Organizer",
            role: "ORGANIZER" as Role,
        },
    });

    const admin = await prisma.user.upsert({
        where: { email: "admin@eventify.com" },
        update: {},
        create: {
            id: "00000000-0000-4000-8000-000000000002",
            email: "admin@eventify.com",
            name: "Bob Admin",
            role: "ADMIN" as Role,
        },
    });

    const attendee = await prisma.user.upsert({
        where: { email: "attendee@eventify.com" },
        update: {},
        create: {
            id: "00000000-0000-4000-8000-000000000003",
            email: "attendee@eventify.com",
            name: "Carol Attendee",
            role: "ATTENDEE" as Role,
        },
    });

    console.log("Core users:", { organizer: organizer.id, admin: admin.id, attendee: attendee.id });

    // ── 5 events (one with capacity 5) ──────────────────────
    const futureDate = (days: number): Date => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d;
    };

    const events = [
        {
            id: PARALLEL_EVENT_ID,
            title: "Parallel Booking Test Event (cap 5)",
            description: "A small-capacity event used by scripts/parallel-bookings.ts to prove the serializable transaction prevents overselling.",
            venue: "Test Hall A",
            startsAt: futureDate(30),
            capacity: 5,
            priceCents: 2500,
            organizerId: organizer.id,
        },
        {
            id: "00000000-0000-4000-8000-000000000010",
            title: "TechConf 2026",
            description: "A full-day conference covering the latest in software engineering, AI, and cloud infrastructure.",
            venue: "Grand Convention Center",
            startsAt: futureDate(60),
            capacity: 500,
            priceCents: 15000,
            organizerId: organizer.id,
        },
        {
            id: "00000000-0000-4000-8000-000000000011",
            title: "Intro to TypeScript Workshop",
            description: "Hands-on workshop covering TypeScript fundamentals, strict mode, and real-world patterns.",
            venue: "Coworking Space Downtown",
            startsAt: futureDate(14),
            capacity: 30,
            priceCents: 5000,
            organizerId: organizer.id,
        },
        {
            id: "00000000-0000-4000-8000-000000000012",
            title: "Startup Networking Night",
            description: "An evening of networking with founders, investors, and engineers from the local startup scene.",
            venue: "Rooftop Lounge",
            startsAt: futureDate(7),
            capacity: 100,
            priceCents: 0,
            organizerId: organizer.id,
        },
        {
            id: "00000000-0000-4000-8000-000000000013",
            title: "DevOps Deep Dive",
            description: "Advanced session on CI/CD pipelines, container orchestration, and observability at scale.",
            venue: "Tech Hub Auditorium",
            startsAt: futureDate(45),
            capacity: 80,
            priceCents: 7500,
            organizerId: organizer.id,
        },
    ];

    for (const ev of events) {
        await prisma.event.upsert({
            where: { id: ev.id },
            update: {
                title: ev.title,
                description: ev.description,
                venue: ev.venue,
                startsAt: ev.startsAt,
                capacity: ev.capacity,
                priceCents: ev.priceCents,
            },
            create: ev,
        });
    }
    console.log(`Seeded ${events.length} events (capacity-5 event: ${PARALLEL_EVENT_ID})`);

    // ── Sample bookings ─────────────────────────────────────
    // Clean up any previous bookings for the parallel test event to ensure clean test runs
    await prisma.booking.deleteMany({
        where: { eventId: PARALLEL_EVENT_ID },
    });

    // Carol books the TechConf — a normal confirmed booking.
    await prisma.booking.upsert({
        where: { userId_eventId: { userId: attendee.id, eventId: events[1]!.id } },
        update: {},
        create: {
            userId: attendee.id,
            eventId: events[1]!.id,
            status: "CONFIRMED",
        },
    });
    console.log("Seeded sample bookings (cleared test event bookings)");

    // ── 20 parallel-test users ──────────────────────────────
    for (let i = 0; i < 20; i++) {
        const id = parallelUserIds[i]!;
        const email = `parallel-user-${i + 1}@eventify.com`;
        await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                id,
                email,
                name: `Parallel User ${i + 1}`,
                role: "ATTENDEE" as Role,
            },
        });
    }
    console.log(`Seeded 20 parallel-test users`);

    // ── Print what the parallel script needs ────────────────
    console.log("\n========================================");
    console.log("Copy these into scripts/fixtures/parallel-users.json:");
    console.log("========================================");
    console.log(`Event ID (capacity 5): ${PARALLEL_EVENT_ID}`);
    console.log(`Capacity: 5`);
    console.log(`\n20 user ids:`);
    for (const id of parallelUserIds) {
        console.log(`  ${id}`);
    }
    console.log("========================================\n");
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
