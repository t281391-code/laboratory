import { z } from "zod";
import { conclusions, itemConclusions } from "@/lib/registry";
import { date } from "./validation";

const text = (max: number) => z.string().trim().max(max);
const optional = (max: number) => text(max).default("");
const version = z.number().int().min(1);

export const recordInput = z.object({
  code: text(100).min(3), material: text(100).min(1), description: text(300).min(2), project: text(200).min(2), location: text(200).min(2),
  quantity: z.number().int().min(1).max(1000000), unit: text(24).min(1), sampledDate: date, sampledBy: text(120).min(1), notes: optional(2000),
  submittedLaboratory: z.union([text(200).min(1), z.null()]).default(null),
  sentDate: z.union([date, z.null()]).default(null),
}).strict();
export const recordUpdateInput = recordInput.extend({ version }).strict();
export const recordCreateInput = recordInput.extend({ sourceSampleId: z.string().uuid().optional() }).strict();
export const sendInput = z.object({ version, submittedLaboratory: text(200).min(1), sentDate: date }).strict();
export const versionInput = z.object({ version }).strict();

const item = z.object({
  testName: text(200).min(1), resultValue: optional(200), unit: optional(50), standardRequirement: optional(300), testStandard: optional(200),
  itemConclusion: z.enum(itemConclusions), notes: optional(1000),
}).strict();
export const resultInput = z.object({
  reportNumber: text(100).min(1), receivedDate: date, resultLaboratory: text(200).min(1), testedBy: text(120).min(1),
  conclusion: z.enum(conclusions), isComplete: z.boolean(), notes: optional(4000), items: z.array(item).max(100),
}).strict();
export const resultUpdateInput = resultInput.extend({ version }).strict();
export type ResultInput = z.infer<typeof resultInput>;
