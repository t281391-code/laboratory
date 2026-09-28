import { requirePageUser } from "@/server/auth";
import { Dashboard } from "@/features/dashboard/dashboard";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageUser();
  return <Dashboard key={JSON.stringify(await searchParams)} />;
}
