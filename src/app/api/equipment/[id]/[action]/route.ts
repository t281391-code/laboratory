import { requireUser } from "@/server/auth";
import { body, json, errorResponse, ApiError } from "@/server/http";
import { readingSchema, maintenanceSchema } from "@/server/validation";
import { getRecord, dto } from "@/server/erp";
import { transaction, recordChange } from "@/server/transaction";
export async function POST(request: Request, context: { params: Promise<{ id: string; action: string }> }) {
  try {
    const user = await requireUser(); const { id, action } = await context.params;
    const raw = await body(request);
    if (!["readings", "maintenance"].includes(action)) throw new ApiError(404, "Үйлдэл олдсонгүй.");
    const result = await transaction(async tx => {
      await getRecord("equipment", id, user, tx);
      if (action === "readings") {
        const v = readingSchema.parse(raw);
        await tx.equipmentReading.create({ data: { equipmentId: id, value: v.value, unit: v.unit, measuredAt: new Date(v.measuredAt), recordedBy: user.id } });
      } else {
        const v = maintenanceSchema.parse(raw);
        await tx.maintenanceHistory.create({ data: { equipmentId: id, description: v.description, performedAt: new Date(v.performedAt), recordedBy: user.id } });
      }
      await tx.erpRecord.update({ where: { id }, data: { updatedById: user.id, version: { increment: 1 } } });
      const after = dto(await getRecord("equipment", id, user, tx));
      await recordChange(tx, user.id, action === "readings" ? "MEASUREMENT" : "MAINTENANCE", "equipment", id, undefined, raw);
      return after;
    });
    return json(result, 201);
  } catch (error) { return errorResponse(error); }
}
