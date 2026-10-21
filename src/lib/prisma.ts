import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

/** Cliente Prisma compartido con el adaptador PostgreSQL y reutilizado en desarrollo. */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
