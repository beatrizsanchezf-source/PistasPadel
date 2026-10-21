import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, ReservationStatus, UserRole } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is required to seed the database.");

const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: databaseUrl })) });
const day = new Date();
day.setHours(0, 0, 0, 0);

/** Crea un instante del día de demostración a la hora local indicada. */
function at(hour: number) {
  const date = new Date(day);
  date.setHours(hour, 0, 0, 0);
  return date;
}

/** Inserta o actualiza datos de demostración; no se permite ejecutarla en producción. */
async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("La semilla solo se puede ejecutar en desarrollo.");
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 12) throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 12 caracteres) antes de ejecutar la semilla.");
  const passwordHash = await hashPassword(adminPassword);
  const courts = await Promise.all([
    prisma.court.upsert({ where: { name: "Pista 1" }, update: {}, create: { name: "Pista 1", description: "Cubierta · Cristal", lightsOn: true } }),
    prisma.court.upsert({ where: { name: "Pista 2" }, update: {}, create: { name: "Pista 2", description: "Exterior · Panorámica", lightsOn: true } }),
    prisma.court.upsert({ where: { name: "Pista 3" }, update: {}, create: { name: "Pista 3", description: "Exterior · Estándar" } }),
  ]);
  const users = await Promise.all([
    prisma.user.upsert({ where: { email: adminEmail }, update: { role: UserRole.ADMIN, passwordHash }, create: { name: "Administración", email: adminEmail, passwordHash, role: UserRole.ADMIN } }),
    prisma.user.upsert({ where: { email: "maria@example.test" }, update: { passwordHash }, create: { name: "María García", email: "maria@example.test", passwordHash } }),
    prisma.user.upsert({ where: { email: "pablo@example.test" }, update: { passwordHash }, create: { name: "Pablo Martín", email: "pablo@example.test", passwordHash } }),
    prisma.user.upsert({ where: { email: "carlos@example.test" }, update: { passwordHash }, create: { name: "Carlos Rodríguez", email: "carlos@example.test", passwordHash } }),
  ]);

  await prisma.reservation.createMany({ data: [
    { courtId: courts[0].id, userId: users[1].id, startsAt: at(17), endsAt: at(18), players: 4, status: ReservationStatus.CONFIRMED },
    { courtId: courts[0].id, userId: users[2].id, startsAt: at(19), endsAt: at(20), players: 4, withLight: true, status: ReservationStatus.CONFIRMED },
    { courtId: courts[1].id, userId: users[2].id, startsAt: at(18), endsAt: at(19), players: 2, withLight: true, status: ReservationStatus.PENDING },
    { courtId: courts[2].id, userId: users[3].id, startsAt: at(16), endsAt: at(17), players: 4, status: ReservationStatus.CONFIRMED },
  ], skipDuplicates: true });
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
