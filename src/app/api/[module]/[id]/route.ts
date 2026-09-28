import { z } from "zod";
import { requireUser } from "@/server/auth";
import { body, json, errorResponse } from "@/server/http";
import { moduleSchema } from "@/server/validation";
import { dto, getRecord, mutateRecord } from "@/server/erp";
import { writable } from "@/lib/contracts";
type Context = { params: Promise<{ module: string; id: string }> };
export async function GET(request: Request, context: Context) {
  try { const user = await requireUser(); const p = await context.params; return json(dto(await getRecord(moduleSchema.parse(p.module), p.id, user))); }
  catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser(); const p = await context.params; const entity = moduleSchema.parse(p.module);
    const input = z.object({ version: z.number().int().min(1), data: z.record(z.string(), z.unknown()) }).strict().parse(await body(request));
    const old = dto(await getRecord(entity, p.id, user));
    return json(await mutateRecord(entity, user, { ...writable(entity, old), ...input.data }, p.id, input.version));
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireUser(); const p = await context.params; const entity = moduleSchema.parse(p.module);
    const input = z.object({ version: z.number().int().min(1) }).strict().parse(await body(request));
    return json(await mutateRecord(entity, user, null, p.id, input.version, true));
  } catch (error) { return errorResponse(error); }
}
