import { env } from "@bisp-final-flow/env/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

// Реэкспорт типов и enum-ов из сгенерированного клиента
export type { Booking, Venue, Expense, Company } from  "./generated/client";
export { BookingStatus, Role, Category } from  "./generated/client";

// Тип Booking с подгруженными связями
import type { Prisma } from  "./generated/client";

export type BookingWithRelations = Prisma.BookingGetPayload<{
  include: { venue: true; manager: true; expenses: true };
}>;
