import { requirePageUser } from "@/server/auth";
import { ReportsPage } from "@/features/reports/reports";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageUser();
  return <ReportsPage key={JSON.stringify(await searchParams)} />;
}
