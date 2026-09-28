import { requirePageUser } from "@/server/auth";
import { UsersPage } from "@/features/auth/users";
export default async function Page() { await requirePageUser(true); return <UsersPage />; }
