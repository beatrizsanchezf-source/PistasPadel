import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, ReservationStatus } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is required to seed the database.");

const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: databaseUrl })) });
const day = new Date();
day.setHours(0, 0, 0, 0);

function at(hour: number) {
  const date = new Date(day);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  const courts = await Promise.all([
    prisma.court.upsert({ where: { name: "Pista 1" }, update: {}, create: { name: "Pista 1", description: "Cubierta · Cristal", lightsOn: true } }),
    prisma.court.upsert({ where: { name: "Pista 2" }, update: {}, create: { name: "Pista 2", description: "Exterior · Panorámica", lightsOn: true } }),
    prisma.court.upsert({ where: { name: "Pista 3" }, update: {}, create: { name: "Pista 3", description: "Exterior · Estándar" } }),
  ]);
  const users = await Promise.all([
    prisma.user.upsert({ where: { email: "maria@example.com" }, update: {}, create: { name: "María García", email: "maria@example.com" } }),
    prisma.user.upsert({ where: { email: "pablo@example.com" }, update: {}, create: { name: "Pablo Martín", email: "pablo@example.com" } }),
    prisma.user.upsert({ where: { email: "carlos@example.com" }, update: {}, create: { name: "Carlos Rodríguez", email: "carlos@example.com" } }),
  ]);

  await prisma.reservation.createMany({ data: [
    { courtId: courts[0].id, userId: users[0].id, startsAt: at(17), endsAt: at(18), players: 4, status: ReservationStatus.CONFIRMED },
    { courtId: courts[0].id, userId: users[1].id, startsAt: at(19), endsAt: at(20), players: 4, withLight: true, status: ReservationStatus.CONFIRMED },
    { courtId: courts[1].id, userId: users[1].id, startsAt: at(18), endsAt: at(19), players: 2, withLight: true, status: ReservationStatus.PENDING },
    { courtId: courts[2].id, userId: users[2].id, startsAt: at(16), endsAt: at(17), players: 4, status: ReservationStatus.CONFIRMED },
  ], skipDuplicates: true });
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
