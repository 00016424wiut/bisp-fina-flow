import { PrismaClient } from "./generated/client";
export declare const prisma: PrismaClient<Prisma.PrismaClientOptions, never, import("./generated/client/runtime/client").DefaultArgs>;
export default prisma;
export type { Booking, Venue, Expense, Company } from "./generated/client";
export { BookingStatus, Role, Category } from "./generated/client";
import type { Prisma } from "./generated/client";
export type BookingWithRelations = Prisma.BookingGetPayload<{
    include: {
        venue: true;
        manager: true;
        expenses: true;
    };
}>;
