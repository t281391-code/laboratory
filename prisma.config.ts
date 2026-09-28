import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "node --import tsx prisma/seed.ts" },
  datasource: { url: process.env.DATABASE_URL ?? "mysql://USER:PASSWORD@localhost:3306/laboratory_erp" },
});
