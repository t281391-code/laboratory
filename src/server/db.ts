import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalDb = globalThis as unknown as { laboratoryDb?: PrismaClient };
export function createDb() {
  const url = new URL(process.env.DATABASE_URL ?? "mysql://USER:PASSWORD@localhost:3306/laboratory_erp");
  const adapter = new PrismaMariaDb({
    host: url.hostname, port: Number(url.port || 3306),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    database: url.pathname.slice(1), connectionLimit: 10,
    timezone: "Z", initSql: "SET time_zone = '+00:00'",
    connectTimeout: 5000, acquireTimeout: 10000,
    // caching_sha2_password (MySQL 8 default) needs the server's RSA key over
    // a non-TLS loopback connection; safe for localhost, not a MITM exposure.
    allowPublicKeyRetrieval: true,
  });
  return new PrismaClient({ adapter, log: [] });
}
export const db = globalDb.laboratoryDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalDb.laboratoryDb = db;
