import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { logSanitizedError } from "../src/lib/safe-log";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required to clean expired records.");

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const now = new Date();
  const [sessions, resetTokens, loginAttempts] = await Promise.all([
    prisma.session.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.loginAttempt.deleteMany({ where: { resetAt: { lte: now } } }),
  ]);
  console.log(JSON.stringify({
    removedExpiredSessions: sessions.count,
    removedExpiredPasswordResetTokens: resetTokens.count,
    removedExpiredLoginAttempts: loginAttempts.count,
  }));
}

main()
  .catch((error: unknown) => {
    logSanitizedError("No se pudieron limpiar los registros expirados.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });