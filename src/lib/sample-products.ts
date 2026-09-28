import { z } from "zod";

export const sampleProducts = {
  other: "Бусад дээж, сорьц",
  sleeper: "Төмөр бетон дэр",
  "ot-slab": "Оюу толгойн хавтан",
} as const;
export type SampleProduct = keyof typeof sampleProducts;

export const sampleTracks = [
  { key: "track1Count", label: "1-р зам" },
  { key: "track2Count", label: "2-р зам" },
  { key: "track3Count", label: "3-р зам" },
] as const;
export type SampleTrackKey = (typeof sampleTracks)[number]["key"];
type TrackCounts = Partial<Record<SampleTrackKey, number>>;

const trackCount = z.number({ error: "Дээжийн тоог оруулна уу." })
  .int("Бүхэл тоо оруулна уу.")
  .min(0, "Сөрөг тоо оруулах боломжгүй.")
  .max(100, "100-аас ихгүй байна.");

export const sampleTrackingFields = {
  product: z.enum(["other", "sleeper", "ot-slab"]),
  track1Count: trackCount,
  track2Count: trackCount,
  track3Count: trackCount,
};

export function totalTrackSamples(value: TrackCounts) {
  return sampleTracks.reduce((total, { key }) => total + (value[key] ?? 0), 0);
}

export function sampleTrackSummary(value: TrackCounts) {
  return sampleTracks
    .filter(({ key }) => (value[key] ?? 0) > 0)
    .map(({ key, label }) => `${label}: ${value[key]} дээж`)
    .join(" · ");
}

export function validateSampleTracking(
  value: TrackCounts & { product: SampleProduct; material: string; count: number },
  ctx: z.RefinementCtx,
) {
  const total = totalTrackSamples(value);
  if (value.product === "other") {
    if (total !== 0) ctx.addIssue({ code: "custom", path: ["product"], message: "Замаар бүртгэх бүтээгдэхүүн сонгоно уу." });
    return;
  }
  if (value.material !== "Бетон") ctx.addIssue({ code: "custom", path: ["material"], message: "Энэ бүтээгдэхүүний материал Бетон байна." });
  if (total < 1) ctx.addIssue({ code: "custom", path: ["count"], message: "Аль нэг замын дээжийн тоог оруулна уу." });
  if (total !== value.count) ctx.addIssue({ code: "custom", path: ["count"], message: "Нийт сорьцын тоо замуудын нийлбэртэй тэнцүү байна." });
}
