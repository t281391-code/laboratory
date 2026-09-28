import { activeResults, conclusionLabels, itemConclusionLabels, plannedRegistryStatus, recordOutcome, responseDays, versionLabel, type SampleRecordDto } from "@/lib/registry";
import type { Sample } from "@/lib/types";
import { TODAY } from "@/lib/utils";
import { buildXlsx, type Cell } from "@/lib/xlsx";

/** Two sheets: one row per sample, and one row per measurement of every active laboratory result. */
export function exportRegistryExcel(records: SampleRecordDto[], planned: Sample[] = []) {
  const samples: Cell[][] = [[
    "Дээжийн код", "Материал", "Дээжийн нэр", "Төсөл", "Авсан байршил", "Хэмжээ", "Нэгж", "Дээж авсан огноо", "Дээж авсан ажилтан", "Бүртгэсэн огноо",
    "Компани руу явах огноо", "Илгээсэн лаборатори", "Илгээсэн огноо", "Төлөв", "Хариуны тоо", "Сүүлийн хариуны дугаар", "Хариу өгсөн лаборатори", "Хариу авсан огноо", "Хариу ирэх хоног", "Нийт дүгнэлт", "Тайлбар",
  ]];
  const measurements: Cell[][] = [[
    "Дээжийн код", "Хувилбар", "Хариуны дугаар", "Илгээсэн лаборатори", "Хариу өгсөн лаборатори", "Илгээсэн огноо", "Хариу авсан огноо", "Шинжилгээ хийсэн ажилтан",
    "Ерөнхий дүгнэлт", "Хариуны байдал", "№", "Үзүүлэлт", "Үр дүн", "Нэгж", "Стандартын шаардлага", "Туршилтын стандарт", "Үзүүлэлтийн дүгнэлт", "Үзүүлэлтийн тайлбар", "Хариуны тайлбар", "Хавсралт",
  ]];
  for (const sample of planned) {
    samples.push([
      sample.code, sample.material, `${sample.material}, ${sample.grade}`, sample.project, sample.element, sample.count, "ширхэг", sample.castingDate, sample.technician, sample.registeredDate,
      sample.companyPlannedDate, "", "", plannedRegistryStatus, 0, "", "", "", "", "", "",
    ]);
  }
  for (const record of records) {
    const active = activeResults(record), latest = active[active.length - 1], outcome = recordOutcome(record);
    samples.push([
      record.code, record.material, record.description, record.project, record.location, record.quantity, record.unit, record.sampledDate, record.sampledBy, record.registeredDate,
      record.companyPlannedDate, record.submittedLaboratory, record.sentDate, record.status, active.length, latest?.reportNumber, latest?.resultLaboratory, latest?.receivedDate, responseDays(record),
      outcome ? conclusionLabels[outcome] : "", record.notes,
    ]);
    for (const result of active) {
      const head: Cell[] = [record.code, versionLabel(record, result), result.reportNumber, record.submittedLaboratory, result.resultLaboratory, record.sentDate, result.receivedDate, result.testedBy, conclusionLabels[result.conclusion], result.isComplete ? "Бүрэн дууссан" : "Хэсэгчилсэн"];
      const tail: Cell[] = [result.notes, result.attachments.map((a) => a.name).join(", ")];
      if (!result.items.length) measurements.push([...head, null, null, null, null, null, null, null, null, ...tail]);
      for (const [i, item] of result.items.entries())
        measurements.push([...head, i + 1, item.testName, item.resultValue, item.unit, item.standardRequirement, item.testStandard, itemConclusionLabels[item.itemConclusion], item.notes, ...tail]);
    }
  }
  const bytes = buildXlsx([
    { name: "Дээжүүд", rows: samples, widths: [18, 14, 30, 24, 24, 9, 9, 14, 20, 14, 20, 24, 14, 22, 10, 18, 24, 14, 10, 14, 30] },
    { name: "Хариуны үзүүлэлт", rows: measurements, widths: [18, 12, 18, 24, 24, 14, 14, 20, 14, 16, 5, 28, 14, 10, 24, 22, 14, 24, 30, 30] },
  ]);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url; link.download = `дээжийн-бүртгэл-${TODAY}.xlsx`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
