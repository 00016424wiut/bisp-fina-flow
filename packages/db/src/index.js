import { env } from "@bisp-final-flow/env/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
export default prisma;
export { BookingStatus, Role, Category } from "./generated/client";
