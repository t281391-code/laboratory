import { requirePageUser } from "@/server/auth";
import { StandardsPage } from "@/features/standards/standards";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageUser();
  return <StandardsPage key={JSON.stringify(await searchParams)} />;
}
