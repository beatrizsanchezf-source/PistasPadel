import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/** Configura el esquema, las migraciones, la semilla y la URL de PostgreSQL para Prisma CLI. */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: env("DATABASE_URL") },
});
