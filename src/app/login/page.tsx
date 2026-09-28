import { redirect } from "next/navigation";
import { Inter } from "next/font/google";
import { getCurrentUser } from "@/server/auth";
import { LoginForm } from "@/features/auth/login";
const inter = Inter({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600"], display: "swap" });
export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <div className={inter.className}>
      <LoginForm />
    </div>
  );
}
