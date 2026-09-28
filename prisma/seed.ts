import "dotenv/config";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../src/server/db";
import { newUser } from "../src/server/auth-validation";
import { transaction, recordChange } from "../src/server/transaction";
async function main() {
  z.string().min(32).parse(process.env.SESSION_SECRET);
  const input = newUser.parse({ fullName: process.env.ADMIN_FULL_NAME, username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD, role: "ADMIN" });
  const passwordHash = await bcrypt.hash(input.password, 12);
  await transaction(async tx => {
    const existing = await tx.user.findUnique({ where: { username: input.username } });
    if (existing) {
      if (existing.role !== "ADMIN" || !existing.isActive) throw new Error("SEED_ADMIN_CONFLICT");
      return;
    }
    const user = await tx.user.create({ data: { fullName: input.fullName, username: input.username, passwordHash, role: "ADMIN" } });
    await recordChange(tx, user.id, "SEED_ADMIN", "users", user.id, undefined, { fullName: user.fullName, username: user.username, role: user.role });
  });
  console.log("Initial administrator is ready. Existing passwords were not changed.");
}
main().catch(() => { console.error("Seed failed. Check DATABASE_URL, SESSION_SECRET and ADMIN_* values; existing inactive/non-admin accounts are never overwritten."); process.exitCode = 1; }).finally(() => db.$disconnect());
