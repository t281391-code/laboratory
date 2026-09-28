import fs from "node:fs";
import { randomBytes } from "node:crypto";
import mariadb from "mariadb";
import dotenv from "dotenv";
const envPath = ".verification/runtime.env";
const existing = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : null;
const password = existing ? decodeURIComponent(new URL(existing.DATABASE_URL).password) : randomBytes(32).toString("hex");
const connection = await mariadb.createConnection({ host: "127.0.0.1", port: 33307, user: "root", password: existing ? password : "", connectTimeout: 10000 });
try {
  await connection.query("CREATE DATABASE IF NOT EXISTS laboratory_erp_verify CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  if (!existing) {
    await connection.query("ALTER USER 'root'@'localhost' IDENTIFIED BY ?", [password]);
    const config = { DATABASE_URL: `mysql://root:${password}@127.0.0.1:33307/laboratory_erp_verify`, ADMIN_FULL_NAME: "Verification Administrator", ADMIN_USERNAME: `verify_${randomBytes(6).toString("hex")}`, ADMIN_PASSWORD: randomBytes(24).toString("hex"), SESSION_SECRET: randomBytes(48).toString("hex"), TEST_URL: "http://127.0.0.1:3101" };
    fs.writeFileSync(envPath, Object.entries(config).map(([k,v]) => `${k}=${JSON.stringify(v)}`).join("\n") + "\n");
  }
  console.log("Isolated MySQL verification configuration ready; credentials remain in the ignored verification directory.");
} finally { await connection.end(); }
