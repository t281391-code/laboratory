import { requireUser } from "@/server/auth";
import { body, errorResponse, json } from "@/server/http";
import { createSampleRecord, listSampleRecords } from "@/server/registry";
export async function GET(request: Request) {
  try {
    await requireUser();
    const result = await listSampleRecords(request);
    return json(result.data, 200, result.meta);
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    return json(await createSampleRecord(user, await body(request)), 201);
  } catch (error) { return errorResponse(error); }
}
