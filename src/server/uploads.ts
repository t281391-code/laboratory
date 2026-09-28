import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fileRules } from "@/lib/registry";
import { ApiError, checkOrigin } from "./http";

/** Binaries never enter MySQL: they live under LAB_UPLOAD_DIR (default ./storage/laboratory-results), outside `public/`, so only the authenticated API can serve them. */
export const storageRoot = () => path.resolve(process.env.LAB_UPLOAD_DIR || path.join(process.cwd(), "storage", "laboratory-results"));
export const REQUEST_LIMIT = fileRules.maxFiles * fileRules.maxBytes + 1024 * 1024;

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const storagePathPattern = new RegExp(`^${uuid}/${uuid}\\.(pdf|jpg|jpeg|png)$`);
const dangerousSegments = new Set(["exe", "com", "bat", "cmd", "msi", "scr", "pif", "dll", "sh", "bash", "js", "mjs", "cjs", "vbs", "vbe", "ps1", "jar", "apk", "app", "php", "phtml", "jsp", "asp", "aspx", "cgi", "py", "rb", "pl", "html", "htm", "svg", "xml", "hta", "lnk", "reg"]);
const canonicalMime: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const signatures: Record<string, (bytes: Buffer) => boolean> = {
  pdf: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
  jpg: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  jpeg: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b.length > 8 && b.subarray(0, 8).equals(pngSignature),
};

export type PreparedFile = { originalName: string; extension: string; mimeType: string; size: number; sha256: string; storedName: string; buffer: Buffer };

/** Reads a multipart body while enforcing a byte cap, so an oversized upload is rejected before it is buffered in full. */
export async function multipart(request: Request, maxBytes = REQUEST_LIMIT) {
  checkOrigin(request);
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("multipart/form-data")) throw new ApiError(422, "Файл хавсаргах хүсэлт буруу байна.");
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) throw new ApiError(413, "Хүсэлтийн хэмжээ хэтэрсэн.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(422, "Мэдээлэл хоосон байна.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length;
      if (size > maxBytes) { await reader.cancel(); throw new ApiError(413, "Хүсэлтийн хэмжээ хэтэрсэн."); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  try { return await new Response(Buffer.concat(chunks), { headers: { "content-type": type } }).formData(); }
  catch { throw new ApiError(422, "Хүсэлтийн бүтэц буруу байна."); }
}

function safeName(raw: string) {
  const base = raw.split(/[\\/]/).pop() ?? "";
  return base.normalize("NFC").replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "").trim().slice(-200);
}
/** Validates extension, declared MIME type, size and the file's real signature; never trusts the client-supplied name for storage. */
export async function prepareUpload(file: File): Promise<PreparedFile> {
  const originalName = safeName(file.name || "");
  const segments = originalName.toLowerCase().split(".");
  const extension = segments.length > 1 ? segments[segments.length - 1] : "";
  if (!(fileRules.extensions as readonly string[]).includes(extension)) throw new ApiError(422, "Зөвхөн PDF, JPG, JPEG, PNG файл хавсаргана.");
  if (segments.slice(1, -1).some((segment) => dangerousSegments.has(segment))) throw new ApiError(422, "Гүйцэтгэх файл хавсаргах боломжгүй.");
  if (!fileRules.mimeByExtension[extension].includes(file.type.toLowerCase())) throw new ApiError(422, `${originalName}: файлын төрөл өргөтгөлтэйгээ таарахгүй байна.`);
  if (file.size < 1) throw new ApiError(422, `${originalName}: файл хоосон байна.`);
  if (file.size > fileRules.maxBytes) throw new ApiError(422, `${originalName}: файлын хэмжээ 10 МБ-аас хэтэрсэн.`);
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > fileRules.maxBytes || !signatures[extension](buffer)) throw new ApiError(422, `${originalName}: файлын агуулга ${extension.toUpperCase()} биш байна.`);
  return { originalName, extension, mimeType: canonicalMime[extension], size: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex"), storedName: `${randomUUID()}.${extension}`, buffer };
}
export async function readUploads(form: FormData) {
  const files = form.getAll("files").filter((value): value is File => typeof value !== "string" && value.size > 0);
  if (files.length > fileRules.maxFiles) throw new ApiError(422, `Нэг удаад ${fileRules.maxFiles}-аас олон файл хавсаргах боломжгүй.`);
  return Promise.all(files.map(prepareUpload));
}

export const storagePathFor = (resultId: string, storedName: string) => `${resultId}/${storedName}`;
/** Resolves a stored relative path only if it has the exact generated shape and stays inside the storage root. */
export function resolveStoragePath(relative: string) {
  const root = storageRoot(); const full = path.resolve(root, relative);
  if (!storagePathPattern.test(relative) || !full.startsWith(root + path.sep)) throw new ApiError(404, "Файл олдсонгүй.");
  return full;
}
export async function writeStored(relative: string, buffer: Buffer) {
  const full = resolveStoragePath(relative);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer, { flag: "wx", mode: 0o640 });
  return full;
}
export async function discardStored(fullPaths: string[]) {
  await Promise.all(fullPaths.map((file) => rm(file, { force: true }).catch(() => undefined)));
}
export async function serveStored(relative: string, meta: { name: string; mimeType: string; size: number }, download: boolean) {
  const full = resolveStoragePath(relative);
  const info = await stat(full).catch(() => null);
  if (!info?.isFile()) throw new ApiError(404, "Файл олдсонгүй.");
  const ascii = meta.name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_") || "file";
  const encoded = encodeURIComponent(meta.name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return new Response(Readable.toWeb(createReadStream(full)) as unknown as ReadableStream, {
    headers: {
      "Content-Type": meta.mimeType,
      "Content-Length": String(info.size),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encoded}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "frame-ancestors 'self'",
      "Cache-Control": "private, no-store",
    },
  });
}
