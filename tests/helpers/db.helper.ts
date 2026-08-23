import { prisma } from "../../src/db/prisma.ts";

export interface CreateTestEventOptions {
    title?: string;
    description?: string;
    venue?: string | null;
    startsAt?: Date;
    capacity?: number;
    priceCents?: number;
    organizerId: string;
}

/**
 * Creates an event in the test database.
 */
export async function createTestEvent(options: CreateTestEventOptions) {
    const uniqueSuffix = Math.random().toString(36).substring(2, 9);
    return prisma.event.create({
        data: {
            title: options.title ?? `Test Event ${uniqueSuffix}`,
            description: options.description ?? "This is a detailed description of the test event with sufficient length.",
            venue: options.venue !== undefined ? options.venue : "Grand Arena",
            startsAt: options.startsAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            capacity: options.capacity ?? 10,
            priceCents: options.priceCents ?? 2500,
            organizerId: options.organizerId,
        },
    });
}
