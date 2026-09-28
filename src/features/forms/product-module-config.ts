import { LockKeyhole, Package, Rows3 } from "lucide-react";

export type ProductModule = "sleepers" | "secret" | "small";

export const productModulePaths = {
  sleepers: "/sleepers/",
  secret: "/secret/",
  small: "/small/",
} as const;

export const productModules = [
  {
    id: "sleepers",
    href: productModulePaths.sleepers,
    title: "Төмөр бетон дэр",
    description: "3 зам · 8 цагийн температурын бүртгэл",
    icon: Rows3,
  },
  {
    id: "secret",
    href: productModulePaths.secret,
    title: "Secret лаборатори",
    description: "Туршилт · Материалын найрлага",
    icon: LockKeyhole,
  },
  {
    id: "small",
    href: productModulePaths.small,
    title: "Жижиг эдлэл",
    description: "Төмөр бетон хоолой, цагирагийн бүртгэл",
    icon: Package,
  },
] as const;
