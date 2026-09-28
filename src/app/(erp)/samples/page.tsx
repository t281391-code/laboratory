import { requirePageUser } from "@/server/auth";
import { SamplesPage } from "@/features/samples/samples";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageUser();
  return <SamplesPage key={JSON.stringify(await searchParams)} />;
}
