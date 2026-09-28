import { requirePageUser } from "@/server/auth";
import { TestsPage } from "@/features/tests/tests";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageUser();
  return <TestsPage key={JSON.stringify(await searchParams)} />;
}
