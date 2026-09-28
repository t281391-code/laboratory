import { requirePageUser } from "@/server/auth";
import { SampleRegistryPage } from "@/features/registry/registry";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageUser();
  return <SampleRegistryPage key={JSON.stringify(await searchParams)} />;
}
