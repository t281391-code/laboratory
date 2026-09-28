import { z } from "zod";
export const username = z.string().trim().min(3).max(64).regex(/^[\p{L}\p{N}_.-]+$/u).transform(v => v.toLowerCase());
export const password = z.string().min(8).max(72).refine(v => Buffer.byteLength(v, "utf8") <= 72);
export const newUser = z.object({ fullName: z.string().trim().min(2).max(120), username, password, role: z.enum(["ADMIN", "USER"]) }).strict();
