import { PrismaClient } from "../prisma/generated/client";
import { env } from "@bisp-final-flow/env/server";
import { PrismaPg } from "@prisma/adapter-pg";
export function createPrismaClient() {
    const adapter = new PrismaPg({
        connectionString: env.DATABASE_URL,
    });
    return new PrismaClient({ adapter });
}
const prisma = createPrismaClient();
export default prisma;
