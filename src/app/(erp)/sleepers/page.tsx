import { requirePageUser } from "@/server/auth";
import type { Metadata } from "next";
import { ProductModulePage } from "@/features/forms/product-modules";

export const metadata: Metadata = { title: "Төмөр бетон дэр | БҮК Лаборатори" };

export default async function Page() {
  await requirePageUser();
  return <ProductModulePage key="sleepers" module="sleepers" />;
}
