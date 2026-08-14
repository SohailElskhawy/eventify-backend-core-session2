/**
 * Domain types for Eventify.
 * Single source of truth for domain models and shared contracts across services.
 */

export type Role = "ATTENDEE" | "ORGANIZER" | "ADMIN";
export type BookingStatus = "CONFIRMED" | "CANCELLED" | "WAITLISTED";

export interface Event {
    id: string;
    title: string;
    description: string;
    venue: string | null;
    startsAt: string;      // ISO date string
    capacity: number;
    priceCents: number;    // 0 = free
    organizerId: string;
    createdAt: string;
    updatedAt: string;
}

export interface Venue {
    id: string;
    name: string;
    address: string;
    capacity: number;
    contactEmail: string;
    createdAt: string;
    updatedAt: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
    createdAt: string;
}

export interface Booking {
    id: string;
    userId: string;
    eventId: string;
    status: BookingStatus;
    createdAt: string;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}
