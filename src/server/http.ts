import "server-only";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function json(data: unknown, status = 200, meta?: unknown) {
  return Response.json({ data, ...(meta ? { meta } : {}) }, { status, headers: { "Cache-Control": "no-store" } });
}
export function errorResponse(error: unknown) {
  let status = 500, message = "Үйлчилгээ түр боломжгүй байна. Дахин оролдоно уу.";
  let fields: { path: string; message: string }[] | undefined;
  if (error instanceof ApiError) { status = error.status; message = error.message; }
  else if (error instanceof ZodError) {
    status = 422; message = "Оруулсан мэдээлэл буруу байна. Талбаруудаа шалгана уу.";
    fields = error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
  }
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") { status = 409; message = "Ижил кодтой бүртгэл байна."; }
    else if (error.code === "P2025") { status = 404; message = "Бүртгэл олдсонгүй."; }
    else if (error.code === "P2003") { status = 422; message = "Холбоотой бүртгэл олдсонгүй."; }
    else if (error.code === "P2034") { status = 409; message = "Мэдээлэл өөрчлөгдсөн. Дахин оролдоно уу."; }
  }
  return Response.json({ data: null, error: { message, ...(fields ? { fields } : {}) } }, { status, headers: { "Cache-Control": "no-store" } });
}
export function route(fn: (request: Request) => Promise<Response>) {
  return async (request: Request) => { try { return await fn(request); } catch (error) { return errorResponse(error); } };
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = `${new URL(request.url).protocol}//${request.headers.get("host") || new URL(request.url).host}`;
  if (!origin || origin !== expected || request.headers.get("sec-fetch-site") === "cross-site")
    throw new ApiError(403, "Хүсэлтийн эх үүсвэр зөвшөөрөгдөөгүй.");
}
export async function body(request: Request) {
  checkOrigin(request);
  if (!request.headers.get("content-type")?.includes("application/json")) throw new ApiError(422, "JSON мэдээлэл шаардлагатай.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(422, "Мэдээлэл хоосон байна.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length;
      if (size > 8 * 1024 * 1024) { await reader.cancel(); throw new ApiError(422, "Мэдээллийн хэмжээ хэтэрсэн."); }
      chunks.push(part.value);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new ApiError(422, "JSON мэдээлэл буруу байна."); }
  } finally { reader.releaseLock(); }
}
