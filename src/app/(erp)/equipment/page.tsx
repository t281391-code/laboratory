import { requirePageUser } from "@/server/auth";
import { EquipmentPage } from "@/features/equipment/equipment";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageUser();
  return <EquipmentPage key={JSON.stringify(await searchParams)} />;
}
