import { z } from "zod";
import { requireUser } from "@/server/auth";
import { body, json, errorResponse } from "@/server/http";
import { moduleSchema } from "@/server/validation";
import { listRecords, mutateRecord } from "@/server/erp";
type Context = { params: Promise<{ module: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser(); const entity = moduleSchema.parse((await context.params).module);
    const result = await listRecords(entity, request, user); return json(result.data, 200, result.meta);
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser(); const entity = moduleSchema.parse((await context.params).module);
    const input = z.object({ data: z.record(z.string(), z.unknown()) }).strict().parse(await body(request));
    return json(await mutateRecord(entity, user, input.data), 201);
  } catch (error) { return errorResponse(error); }
}
