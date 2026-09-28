import { cookies } from "next/headers";
import { db } from "@/server/db";
import { COOKIE, validateSession } from "@/server/auth";
import { ApiError, errorResponse } from "@/server/http";
import { modules } from "@/server/validation";
import { registryEntityTypes } from "@/lib/registry";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const token = (await cookies()).get(COOKIE)?.value;
    const session = await validateSession(token);
    if (!session) throw new ApiError(401, "Нэвтрэх шаардлагатай.");
    const raw = request.headers.get("last-event-id") || new URL(request.url).searchParams.get("lastEventId");
    if (raw && !/^\d{1,19}$/.test(raw)) throw new ApiError(422, "Үйл явдлын дугаар буруу байна.");
    const latest = await db.realtimeEvent.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
    let cursor = raw ? BigInt(raw) : latest?.id ?? BigInt(0);
    if (cursor > (latest?.id ?? BigInt(0))) cursor = latest?.id ?? BigInt(0);
    let closed = false, wake: (() => void) | undefined, timer: ReturnType<typeof setTimeout> | undefined;
    let lastHeartbeat = Date.now(), lastAuth = Date.now(); const started = Date.now();
    const stop = () => { closed = true; clearTimeout(timer); wake?.(); request.signal.removeEventListener("abort", stop); };
    request.signal.addEventListener("abort", stop, { once: true });
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (name: string, data: unknown, id?: string) => {
          if (!closed) controller.enqueue(encoder.encode(`${id ? `id: ${id}\n` : ""}event: ${name}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        try {
          send("ready", { connected: true });
          while (!closed && Date.now() - started < 120000) {
            if (Date.now() - lastAuth > 5000) {
              const active = await validateSession(token); lastAuth = Date.now();
              if (!active) { send("unauthorized", {}); break; }
            }
            const events = await db.realtimeEvent.findMany({ where: { id: { gt: cursor } }, orderBy: { id: "asc" }, take: 100 });
            for (const event of events) {
              cursor = event.id;
              if ((modules as readonly string[]).includes(event.entityType) || (registryEntityTypes as readonly string[]).includes(event.entityType) || (event.entityType === "users" && session.user.role === "ADMIN"))
                send("change", { eventType: event.eventType, entityType: event.entityType, entityId: event.entityId, createdAt: event.createdAt.toISOString() }, String(event.id));
            }
            if (events.length) send("checkpoint", {}, String(cursor));
            if (Date.now() - lastHeartbeat > 15000) { send("heartbeat", { time: new Date().toISOString() }, String(cursor)); lastHeartbeat = Date.now(); }
            if (events.length < 100) await new Promise<void>(resolve => { wake = resolve; timer = setTimeout(resolve, 350); });
          }
        } catch { /* Browser reconnects and resumes from its last acknowledged event. */ }
        finally { if (!closed) controller.close(); stop(); }
      },
      cancel() { stop(); },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" } });
  } catch (error) { return errorResponse(error); }
}
