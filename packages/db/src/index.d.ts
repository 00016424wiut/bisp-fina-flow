import { PrismaClient } from "../prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
export declare function createPrismaClient(): PrismaClient<{
    adapter: PrismaPg;
}, never, import("../prisma/generated/runtime/client").DefaultArgs>;
declare const prisma: PrismaClient<{
    adapter: PrismaPg;
}, never, import("../prisma/generated/runtime/client").DefaultArgs>;
export default prisma;
