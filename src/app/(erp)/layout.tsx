import { Suspense } from "react";
import { requirePageUser } from "@/server/auth";
import { AppShell } from "@/components/shell";
import { RealtimeProvider } from "@/components/realtime-provider";
export default async function ErpLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser();
  return <Suspense fallback={<div className="loading-state">Ачаалж байна…</div>}><RealtimeProvider><AppShell>{children}</AppShell></RealtimeProvider></Suspense>;
}
