import type { Metadata } from "next";
import { Suspense } from "react";
import GlobalFocus from "@/components/GlobalFocus/GlobalFocus";
import "./globals.css";
import "./command.css";
import "./sidebar-instrument.css";
import "./registry.css";
export const metadata: Metadata = {
  title: "Улаан баатар БҮК Лаборатори",
  description: "Барилгын материалын лабораторийн нэгдсэн ажлын орон зай",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn">
      <body>
        <a className="skip-link" href="#main-content">
          Үндсэн агуулга руу очих
        </a>
        <Suspense
          fallback={<div className="loading-state">Ачаалж байна...</div>}
        >
          {children}
        </Suspense>
        <GlobalFocus />
      </body>
    </html>
  );
}
