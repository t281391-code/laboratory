import fs from "node:fs";
import mariadb from "mariadb";
import dotenv from "dotenv";
const config = dotenv.parse(fs.readFileSync(".verification/runtime.env"));
const url = new URL(config.DATABASE_URL);
if (url.hostname !== "127.0.0.1" || url.port !== "33307" || url.pathname !== "/laboratory_erp_verify") throw new Error("Refusing to reset any database other than the isolated verification database.");
const db = await mariadb.createConnection({ host:url.hostname,port:Number(url.port),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password) });
try { await db.query("DROP DATABASE laboratory_erp_verify"); await db.query("CREATE DATABASE laboratory_erp_verify CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"); console.log("Isolated verification database reset."); } finally { await db.end(); }
