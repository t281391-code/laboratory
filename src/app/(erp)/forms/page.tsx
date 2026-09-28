import { requirePageUser } from "@/server/auth";
import { FormsPage } from "@/features/forms/forms";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageUser();
  return <FormsPage key={JSON.stringify(await searchParams)} />;
}
