import { z } from "zod";
import type { FormKind, FormValues, ResultState } from "@/lib/types";
import { gradeTarget, mean, resultState, strength, TODAY } from "@/lib/utils";
export interface FieldDefinition {
  name: string;
  label: string;
  type?: "number" | "date" | "time" | "select" | "textarea";
  unit?: string;
  options?: string[];
  min?: number;
  max?: number;
  optional?: boolean;
  default?: string;
  hint?: string;
}
export interface FormDefinition {
  description: string;
  material: string;
  sections: { title: string; description: string; fields: FieldDefinition[] }[];
}
const sample: FieldDefinition = {
  name: "sampleCode",
  label: "Сорьцын код",
  default: "U-C-3588–3593",
};
const date: FieldDefinition = {
  name: "testDate",
  label: "Туршилтын огноо",
  type: "date",
  default: TODAY,
};
const technician: FieldDefinition = {
  name: "technician",
  label: "Хариуцсан ажилтан",
  default: "",
};
const notes: FieldDefinition = {
  name: "notes",
  label: "Нэмэлт тэмдэглэл",
  type: "textarea",
  optional: true,
};
const numeric = (
  name: string,
  label: string,
  unit: string,
  value: string,
  min: number,
  max: number,
): FieldDefinition => ({
  name,
  label,
  unit,
  default: value,
  type: "number",
  min,
  max,
});
export const formDefinitions: Record<FormKind, FormDefinition> = {
  environment: {
    description: "Өглөө, оройн температур болон харьцангуй чийгийн хяналт.",
    material: "Лабораторийн орчин",
    sections: [
      {
        title: "Өдөр, ажилтны мэдээлэл",
        description: "Орчны хяналтын огноо болон бүртгэгчийг сонгоно уу.",
        fields: [date, technician],
      },
      {
        title: "Орчны хэмжилт",
        description: "Хэмжигчийн заалтыг өглөө, орой тус тус бүртгэнэ.",
        fields: [
          {
            name: "morningTime",
            label: "Өглөөний цаг",
            type: "time",
            default: "08:30",
          },
          numeric("morningTemp", "Өглөөний температур", "°C", "21.4", -20, 60),
          numeric("morningHumidity", "Өглөөний чийг", "%", "56", 0, 100),
          {
            name: "eveningTime",
            label: "Оройн цаг",
            type: "time",
            default: "17:30",
          },
          numeric("eveningTemp", "Оройн температур", "°C", "22.1", -20, 60),
          numeric("eveningHumidity", "Оройн чийг", "%", "58", 0, 100),
          notes,
        ],
      },
    ],
  },
  fresh: {
    description:
      "Бетон хольцын температур, хөдөлгөөнт чанар, агаарын агууламж.",
    material: "Бетон",
    sections: [
      {
        title: "Сорьц, бүтээцийн мэдээлэл",
        description: "Хүлээн авсан бетон хольцын мэдээллийг бүртгэнэ.",
        fields: [
          sample,
          date,
          {
            name: "testTime",
            label: "Туршилтын цаг",
            type: "time",
            default: "09:30",
          },
          {
            name: "grade",
            label: "Бетоны марк",
            type: "select",
            options: ["M400", "M600"],
            default: "M400",
          },
          { name: "element", label: "Бүтээц", default: "Суурийн хавтан" },
          technician,
        ],
      },
      {
        title: "Бетон хольцын үзүүлэлт",
        description: "Нэгжийг шалгаж, хэмжилтийн утгуудыг оруулна уу.",
        fields: [
          numeric("ambientTemp", "Агаарын температур", "°C", "18.5", -40, 60),
          numeric("concreteTemp", "Бетоны температур", "°C", "22.3", -10, 60),
          numeric("slump", "Суулт", "мм", "180", 0, 300),
          numeric("flow", "Тархалт", "мм", "520", 100, 1000),
          numeric("air", "Агаарын агууламж", "%", "3.5", 0, 20),
          numeric("count", "Сорьцын тоо", "ш", "6", 1, 100),
          notes,
        ],
      },
    ],
  },
  compression: {
    description: "Сорьцын хэмжилтээс шахалтын бат бэхийг автоматаар тооцоолно.",
    material: "Бетон",
    sections: [
      {
        title: "Сорьцын мэдээлэл",
        description: "Сорьцын код, марк болон туршилтын огноог шалгана уу.",
        fields: [
          sample,
          {
            name: "grade",
            label: "Бетоны марк",
            type: "select",
            options: ["M400", "M600"],
            default: "M400",
          },
          {
            name: "castingDate",
            label: "Цутгасан огноо",
            type: "date",
            default: "2026-08-25",
          },
          date,
          technician,
          {
            name: "failure",
            label: "Эвдрэлийн хэлбэр",
            type: "select",
            options: [
              "Хэвийн конус хэлбэрийн",
              "Хажуугийн хагарал",
              "Жигд бус эвдрэл",
            ],
            default: "Хэвийн конус хэлбэрийн",
          },
        ],
      },
      {
        title: "Хэмжилт ба эвдрэлийн хүч",
        description:
          "Ижил хэмжээтэй 3 сорьцын хамгийн их ачааллыг кН-оор оруулна.",
        fields: [
          numeric("width", "Сорьцын өргөн", "мм", "150", 40, 300),
          numeric("length", "Сорьцын урт", "мм", "150", 40, 300),
          numeric("mass", "Сорьцын масс", "кг", "8.15", 0.1, 100),
          numeric("load", "1-р сорьцын эвдрэлийн хүч", "кН", "963", 1, 5000),
          numeric("load2", "2-р сорьцын эвдрэлийн хүч", "кН", "972", 1, 5000),
          numeric("load3", "3-р сорьцын эвдрэлийн хүч", "кН", "954", 1, 5000),
          notes,
        ],
      },
    ],
  },
  sand: {
    description: "Чийг, нягт, хольц болон ширхэглэлийн иж бүрэн шинжилгээ.",
    material: "Элс",
    sections: [
      {
        title: "Дээжийн мэдээлэл",
        description: "Элс 0–5 мм · төлөөлөхүйц дээжийн мэдээлэл.",
        fields: [{ ...sample, default: "UA-2938–2941" }, date, technician],
      },
      {
        title: "Элсний шинжилгээ",
        description: "Шигшүүрийн үлдэгдлүүдийн нийлбэр 100% байна.",
        fields: [
          numeric("wetMass", "Нойтон дээжийн масс", "г", "515", 1, 10000),
          numeric("dryMass", "Хуурай дээжийн масс", "г", "500", 1, 10000),
          numeric(
            "bulkMass",
            "Асгаасан материалын масс",
            "кг",
            "1.55",
            0.01,
            100,
          ),
          numeric("volume", "Савны эзлэхүүн", "л", "1", 0.01, 100),
          numeric("density", "Ширхэгийн нягт", "кг/м³", "2650", 1000, 4000),
          numeric("dust", "Тоос, шаварлаг хольц", "%", "1.8", 0, 100),
          ...[
            ["sieve25", "2.5 мм", "8"],
            ["sieve125", "1.25 мм", "18"],
            ["sieve063", "0.63 мм", "28"],
            ["sieve0315", "0.315 мм", "26"],
            ["sieve016", "0.16 мм", "15"],
            ["pan", "Ёроол", "5"],
          ].map(([key, label, value]) =>
            numeric(key, `${label} үлдэгдэл`, "%", value, 0, 100),
          ),
          {
            name: "conclusion",
            label: "Дүгнэлт",
            type: "textarea",
            default: "Ширхэглэлийн бүрэлдэхүүн жигд, хольцын хэмжээ хэвийн.",
          },
          notes,
        ],
      },
    ],
  },
  aggregate: {
    description: "Хайрга, дайрганы нягт, бутрагдалт, хэлбэр болон ширхэглэл.",
    material: "Дайрга",
    sections: [
      {
        title: "Дээжийн мэдээлэл",
        description: "10–20 мм дайрганы хүлээн авсан дээжийг бүртгэнэ.",
        fields: [{ ...sample, default: "UA-2942–2945" }, date, technician],
      },
      {
        title: "Дайрганы шинжилгээ",
        description: "Шигшүүрийн үлдэгдлүүдийн нийлбэр 100% байна.",
        fields: [
          numeric("wetMass", "Нойтон масс", "г", "5050", 1, 20000),
          numeric("dryMass", "Хуурай масс", "г", "5000", 1, 20000),
          numeric("density", "Ширхэгийн нягт", "кг/м³", "2700", 1000, 4000),
          numeric(
            "bulkMass",
            "Асгаасан материалын масс",
            "кг",
            "7.5",
            0.01,
            100,
          ),
          numeric("volume", "Савны эзлэхүүн", "л", "5", 0.01, 100),
          numeric("crushing", "Бутрагдалт", "%", "12", 0, 100),
          numeric("flaky", "Нимгэн, үзүүрлэг хэсэг", "%", "14", 0, 100),
          numeric("crushed", "Бутлагдсан хэсэг", "%", "95", 0, 100),
          numeric("dust", "Тоос, шаварлаг хольц", "%", ".8", 0, 100),
          numeric("sieve20", "20 мм үлдэгдэл", "%", "5", 0, 100),
          numeric("sieve10", "10 мм үлдэгдэл", "%", "85", 0, 100),
          numeric("sieve5", "5 мм үлдэгдэл", "%", "8", 0, 100),
          numeric("pan", "Ёроолын үлдэгдэл", "%", "2", 0, 100),
          {
            name: "conclusion",
            label: "Дүгнэлт",
            type: "textarea",
            default: "Дайрганы ширхэглэл болон бутрагдалтын үзүүлэлт хэвийн.",
          },
          notes,
        ],
      },
    ],
  },
  cement: {
    description:
      "PC 52.5 цементийн физик шинж чанар, 3 ба 28 хоногийн бат бэх.",
    material: "Цемент",
    sections: [
      {
        title: "Цементийн дээж",
        description: "PC 52.5 цементийн шинжилгээний үндсэн мэдээлэл.",
        fields: [{ ...sample, default: "CP8-497–498" }, date, technician],
      },
      {
        title: "Физик шинж чанар, бат бэх",
        description: "28 хоногийн 3 хэмжилтээс дундаж бат бэхийг тооцно.",
        fields: [
          numeric("fineness", "Нунтаглалт", "м²/кг", "360", 100, 1000),
          numeric("soundness", "Эзлэхүүний тогтворжилт", "мм", "1.5", 0, 50),
          numeric(
            "settingStart",
            "Барьцалдаж эхлэх хугацаа",
            "мин",
            "140",
            1,
            1000,
          ),
          numeric(
            "settingEnd",
            "Барьцалдаж дуусах хугацаа",
            "мин",
            "220",
            1,
            1500,
          ),
          numeric(
            "flex3",
            "3 хоногийн гулзайлтын бат бэх",
            "МПа",
            "5.8",
            0.1,
            30,
          ),
          numeric(
            "flex28",
            "28 хоногийн гулзайлтын бат бэх",
            "МПа",
            "8.6",
            0.1,
            30,
          ),
          numeric(
            "comp3",
            "3 хоногийн шахалтын бат бэх",
            "МПа",
            "31.2",
            0.1,
            120,
          ),
          numeric("comp28", "28 хоног · 1-р сорьц", "МПа", "56.4", 0.1, 120),
          numeric("comp28b", "28 хоног · 2-р сорьц", "МПа", "57.1", 0.1, 120),
          numeric("comp28c", "28 хоног · 3-р сорьц", "МПа", "55.8", 0.1, 120),
          {
            name: "conclusion",
            label: "Дүгнэлт",
            type: "textarea",
            default: "28 хоногийн дундаж бат бэх 52.5 МПа-аас дээш байна.",
          },
          notes,
        ],
      },
    ],
  },
};
export function defaultsFor(kind: FormKind): FormValues {
  return Object.fromEntries(
    formDefinitions[kind].sections
      .flatMap((s) => s.fields)
      .map((f) => [f.name, f.type === "select" ? f.default || "" : f.type === "date" ? TODAY : ""]),
  );
}
export function schemaFor(kind: FormKind) {
  const fields = formDefinitions[kind].sections.flatMap((s) => s.fields);
  const shape: Record<
    string,
    z.ZodString | z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>
  > = {};
  fields.forEach((f) => {
    let field = z.string().trim().max(2000, "Текст хэт урт байна.");
    if (!f.optional) field = field.min(1, `${f.label} оруулна уу.`);
    if (f.type === "number")
      field = field
        .refine(
          (v) => (f.optional && v === "") || (v !== "" && Number.isFinite(+v)),
          "Зөв тоон утга оруулна уу.",
        )
        .refine(
          (v) =>
            !v || (+v >= (f.min ?? -Infinity) && +v <= (f.max ?? Infinity)),
          `${f.min}–${f.max} ${f.unit} хооронд байна.`,
        );
    if (f.type === "date")
      field = field
        .refine(
          (v) =>
            /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)),
          "Зөв огноо оруулна уу.",
        )
        .refine(
          (v) => v <= TODAY,
          "Өнөөдрөөс хойших огноо оруулах боломжгүй.",
        );
    if (f.type === "time") field = field.regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Зөв цаг оруулна уу.");
    if (f.type === "select")
      field = field.refine(
        (v) => !!f.options?.includes(v),
        "Жагсаалтаас сонгоно уу.",
      );
    shape[f.name] = field;
  });
  return z.object(shape).superRefine((values, ctx) => {
    const error = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (kind === "compression" && values.testDate < values.castingDate)
      error("testDate", "Туршилтын огноо цутгасан огнооноос өмнө байна.");
    if (["sand", "aggregate"].includes(kind)) {
      if (+values.wetMass < +values.dryMass)
        error("dryMass", "Хуурай масс нойтон массаас их байж болохгүй.");
      const sieveKeys =
        kind === "sand"
          ? ["sieve25", "sieve125", "sieve063", "sieve0315", "sieve016", "pan"]
          : ["sieve20", "sieve10", "sieve5", "pan"];
      if (
        Math.abs(sieveKeys.reduce((sum, k) => sum + +values[k], 0) - 100) > 0.1
      )
        error("pan", "Шигшүүрийн үлдэгдлийн нийлбэр 100% байх ёстой.");
    }
    if (kind === "cement" && +values.settingEnd <= +values.settingStart)
      error("settingEnd", "Дуусах хугацаа эхлэх хугацаанаас их байна.");
    if (kind === "fresh" && !Number.isInteger(+values.count))
      error("count", "Сорьцын тоо бүхэл тоо байна.");
    if (kind === "environment" && values.eveningTime <= values.morningTime)
      error("eveningTime", "Оройн цаг өглөөний цагаас хойш байна.");
  });
}
export interface Calculation {
  value: number;
  unit: string;
  label: string;
  formula: string;
  substitution: string;
  state: ResultState;
  extras: { label: string; value: string }[];
  note: string;
}
export function calculate(kind: FormKind, v: FormValues): Calculation {
  const n = (key: string) => Number(v[key]) || 0;
  if (kind === "compression") {
    const area = n("width") * n("length");
    const results = ["load", "load2", "load3"].map((k) =>
      strength(n(k), n("width"), n("length")),
    );
    const value = mean(results);
    const age =
      Math.max(
        0,
        Math.round(
          (Date.parse(v.testDate) - Date.parse(v.castingDate)) / 86400000,
        ),
      ) || 0;
    const target = gradeTarget(v.grade);
    return {
      value,
      unit: "МПа",
      label: "Дундаж шахалтын бат бэх",
      formula: "R = F × 1000 / A",
      substitution: `R₁ = ${n("load")} × 1000 / ${area.toLocaleString("en-US")} = ${results[0].toFixed(2)} МПа`,
      state: age < 28 ? "warning" : resultState(value, target),
      extras: [
        {
          label: "Ачаалсан талбай",
          value: `${area.toLocaleString("en-US")} мм²`,
        },
        { label: "Туршилтын хоног", value: `${age} хоног` },
        ...results.map((r, i) => ({
          label: `${i + 1}-р сорьцын бат бэх`,
          value: `${r.toFixed(2)} МПа`,
        })),
      ],
      note:
        age < 28
          ? "Эрт үеийн үр дүн. Эцсийн үнэлгээг 28 хоногийн туршилтаар хийнэ."
          : `Демо босго: ${v.grade || "M400"} ≥ ${target} МПа. 90–100% үед анхааруулна. Энэ нь стандартын тохирлын гэрчилгээ биш.`,
    };
  }
  if (kind === "sand" || kind === "aggregate") {
    const value =
      n("dryMass") > 0
        ? ((n("wetMass") - n("dryMass")) / n("dryMass")) * 100
        : 0;
    const density = n("volume") > 0 ? (n("bulkMass") / n("volume")) * 1000 : 0;
    const sieve = ["sieve25", "sieve125", "sieve063", "sieve0315", "sieve016"];
    const modulus =
      sieve.reduce(
        (sum, _, i) =>
          sum + sieve.slice(0, i + 1).reduce((a, k) => a + n(k), 0),
        0,
      ) / 100;
    const fail =
      value > 8 ||
      n("dust") > 5 ||
      (kind === "aggregate" && (n("crushing") > 30 || n("flaky") > 35));
    const warning =
      value > 5 ||
      n("dust") > 3 ||
      (kind === "aggregate" && (n("crushing") > 20 || n("flaky") > 25));
    return {
      value,
      unit: "%",
      label: "Дээжийн чийг",
      formula: "W = (mнойтон − mхуурай) / mхуурай × 100",
      substitution: `(${n("wetMass")} − ${n("dryMass")}) / ${n("dryMass")} × 100 = ${value.toFixed(2)}%`,
      state: fail ? "fail" : warning ? "warning" : "pass",
      extras: [
        { label: "Асгаасан нягт", value: `${density.toFixed(0)} кг/м³` },
        { label: "Тоос, шаварлаг хольц", value: `${n("dust")}%` },
        ...(kind === "sand"
          ? [{ label: "Ширхэгийн модуль", value: modulus.toFixed(2) }]
          : [
              { label: "Бутрагдалт", value: `${n("crushing")}%` },
              { label: "Нимгэн, үзүүрлэг хэсэг", value: `${n("flaky")}%` },
            ]),
      ],
      note: "Демо хяналтын босго: чийг ≤ 5%, хольц ≤ 3%. Бодит шаардлагыг төслийн батлагдсан аргачлалаар тогтооно.",
    };
  }
  if (kind === "cement") {
    const value = mean([n("comp28"), n("comp28b"), n("comp28c")]);
    const state =
      n("soundness") > 10 || n("settingStart") < 45
        ? "fail"
        : resultState(value, 52.5);
    return {
      value,
      unit: "МПа",
      label: "28 хоногийн дундаж бат бэх",
      formula: "Rдундаж = (R₁ + R₂ + R₃) / 3",
      substitution: `(${n("comp28")} + ${n("comp28b")} + ${n("comp28c")}) / 3 = ${value.toFixed(2)} МПа`,
      state,
      extras: [
        { label: "3 хоногийн шахалт", value: `${n("comp3")} МПа` },
        { label: "28 хоногийн гулзайлт", value: `${n("flex28")} МПа` },
        {
          label: "Барьцалдах хугацаа",
          value: `${n("settingStart")}–${n("settingEnd")} мин`,
        },
      ],
      note: "PC 52.5 · Демо босго 52.5 МПа. Тохирлыг лабораторийн батлагдсан аргачлалаар хянана.",
    };
  }
  if (kind === "environment") {
    const value = mean([n("morningTemp"), n("eveningTemp")]);
    const fail = [n("morningTemp"), n("eveningTemp")].some(
      (t) => t < 15 || t > 30,
    );
    const warning =
      [n("morningTemp"), n("eveningTemp")].some((t) => t < 18 || t > 25) ||
      [n("morningHumidity"), n("eveningHumidity")].some(
        (h) => h < 40 || h > 70,
      );
    return {
      value,
      unit: "°C",
      label: "Өдрийн дундаж температур",
      formula: "Tдундаж = (Tөглөө + Tорой) / 2",
      substitution: `(${n("morningTemp")} + ${n("eveningTemp")}) / 2 = ${value.toFixed(2)} °C`,
      state: fail ? "fail" : warning ? "warning" : "pass",
      extras: [
        {
          label: "Дундаж чийг",
          value: `${mean([n("morningHumidity"), n("eveningHumidity")]).toFixed(1)}%`,
        },
      ],
      note: "Демо орчны хяналт: 18–25 °C, чийг 40–70%. Туршилт бүрийн нөхцөлийг тусад нь хянана.",
    };
  }
  const value = n("slump");
  const fail =
    value < 30 ||
    value > 250 ||
    n("air") > 8 ||
    n("concreteTemp") < 5 ||
    n("concreteTemp") > 35;
  const warning =
    value < 50 ||
    value > 210 ||
    n("air") > 6 ||
    n("flow") < 350 ||
    n("flow") > 700;
  return {
    value,
    unit: "мм",
    label: "Бетон хольцын суулт",
    formula: "Суулт = конусын өндөр − хольцын өндөр",
    substitution: `Хэмжсэн суулт: ${value} мм · Тархалт: ${n("flow")} мм`,
    state: fail ? "fail" : warning ? "warning" : "pass",
    extras: [
      { label: "Бетоны температур", value: `${n("concreteTemp")} °C` },
      { label: "Агаарын агууламж", value: `${n("air")}%` },
      { label: "Тархалт", value: `${n("flow")} мм` },
    ],
    note: "Демо босго: суулт 50–210 мм, тархалт 350–700 мм, агаар ≤ 6%. Төслийн шаардлагаар эцэслэн үнэлнэ.",
  };
}
