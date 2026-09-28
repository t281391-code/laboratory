import fs from 'node:fs';
const edit=(p,fn)=>fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8').replaceAll('\r\n','\n')));
edit('src/features/dashboard/dashboard.tsx',s=>{
 s=s.replace('import { dayOffset, TODAY }', 'import { useTelemetry } from "./telemetry";\nimport { dayOffset, daysBetween, formatTimestamp, TODAY }');
 s=s.replace(/const telemetryReadings: TelemetryReading\[\] = \[[\s\S]*?\n\];\n/,'');
 s=s.replace('function TelemetryCards() {',`function TelemetryCards() {
  const telemetry = useTelemetry();
  const equipment = useLabStore(s => s.equipment);
  const telemetryReadings: TelemetryReading[] = [
    ...telemetry.map(t => ({ name: t.label, tone: (t.timestamp ? "normal" : "empty") as TelemetryReading["tone"], value: t.value, unit: t.unit, gauge: null, measurements: [["Өмнөх", t.previous + " " + t.unit], ["Эх үүсвэр", "Гараар бүртгэсэн"]] as [string,string][], health: null, healthLabel: "Гараар бүртгэсэн хэмжилт", trend: (t.change === null || t.change === 0 ? "flat" : t.change > 0 ? "up" : "down") as TelemetryReading["trend"], change: t.change === null ? "Мэдээлэлгүй" : t.change.toFixed(2) + " " + t.unit, updated: t.updated })),
    ...equipment.map(e => ({ name: e.name, tone: (e.status === "Засварт" ? "critical" : e.status === "Үзлэг шаардлагатай" ? "warning" : e.readings?.length ? "normal" : "empty") as TelemetryReading["tone"], value: e.readings?.[0]?.value ?? "—", unit: e.readings?.[0]?.unit ?? "", gauge: null, measurements: [["Төлөв", e.status], ["Эх үүсвэр", "Гараар бүртгэсэн"]] as [string,string][], health: null, healthLabel: e.healthStatus || "Мэдээлэлгүй", trend: "flat" as const, change: "Бүртгэлийн утга", updated: formatTimestamp(e.latestMeasurementAt) })),
  ];`);
 s=s.replace('normal: "Хэвийн"','normal: "Бүртгэгдсэн"');
 s=s.replace('<time dateTime={`${TODAY}T${reading.updated}:00`}>','<time>');
 s=s.replace('8 үзүүлэлт · Хажуу тийш гүйлгэх','{telemetryReadings.length} үзүүлэлт · Хажуу тийш гүйлгэх');
 s=s.replace('Жишээ үзүүлэлт · Бодит холболтгүй','MySQL · Гараар бүртгэсэн хэмжилт');
 s=s.replace('  const ready28 = ready.filter((s) => s.age === 28).length;','  const ready28 = ready.filter((s) => s.age === 28).length;\n  const dueEquipment = seedEquipment.filter(e => e.calibrationDate && daysBetween(TODAY, e.calibrationDate) <= 30);');
 s=s.replace('{["09:00", "10:30", "11:00"][i]}','{dayOffset(s.castingDate, s.age)}');
 s=s.replace(/            <Link href="\/forms\/\?type=sand&sample=[\s\S]*?            <\/Link>\n/, '');
 s=s.replace('{2 + (drafts.fresh ? 1 : 0)}','{dueEquipment.length + (review.length ? 1 : 0) + (drafts.fresh ? 1 : 0)}');
 s=s.replace('            <Link href="/equipment/?id=eq-1">','            {dueEquipment.map(e => <Link key={e.id} href={`/equipment/?id=${e.id}`}>');
 s=s.replace('Калибровк дуусахад 18 хоног','Калибровк · {daysBetween(TODAY, e.calibrationDate)} хоног');
 s=s.replace('{seedEquipment[0].name} №1','{e.name}');
 s=s.replace('            </Link>\n            <Link href="/tests/?filter=review">','            </Link>)}\n            <Link href="/tests/?filter=review">');
 s=s.replace('2 төхөөрөмжийн калибровк ойртож байна','{dueEquipment.length} төхөөрөмжийн калибровк ойртож байна');
 s=s.replace('style={{ width: `${(age / 28) * 100}%` }}','style={{ width: `${ready.length ? ready.filter(s => s.age === age).length / ready.length * 100 : 0}%` }}');
 return s;
});
edit('src/features/dashboard/command-center.tsx',s=>{
 s=s.replace('import { useId, useState, type ReactNode }','import { motion } from "motion/react";\nimport { useTelemetry } from "./telemetry";\nimport { useId, useState, type ReactNode }');
 s=s.replace('    (readyEquipment / seedEquipment.length) * 100,','    seedEquipment.length ? (readyEquipment / seedEquipment.length) * 100 : 0,');
 s=s.replace(/  const latestFresh = \[\.\.\.tests\][\s\S]*?  const hourValues =/,`  const connection = useLabStore(s => s.connection);
  const selectedDate = useProductModuleStore(s => s.date);
  const compositions = useProductModuleStore(s => s.records.compositions);
  const composition = compositions?.find(c => c.date === selectedDate);
  const fractions = ["fine", "medium", "coarse"].map(key => Number(composition?.totals?.[key] ?? 0));
  const telemetry = useTelemetry();
  const metricIcons = { concreteTemp: Thermometer, ambientTemp: Wind, flow: Expand, air: Activity };
  const hourValues =`);
 s=s.replace('title="Шууд телеметр"','title="Сүүлийн хэмжилт"').replace('{latestFresh ? "БҮРТГЭЛ" : "ДЕМО"}','{connection}');
 s=s.replace('({ label, key, value, unit, icon: Icon, trend }) => {\n                  const actual = latestFresh?.values[key];','({ label, key, value, unit, trend, updated }) => {\n                  const Icon = metricIcons[key as keyof typeof metricIcons];');
 s=s.replace('                      key={key}\n','                      key={key}\n                      title={updated}\n');
 s=s.replace('{actual || (latestFresh ? "—" : value)}','{value}');
 s=s.replace(/                      <Sparkline\n                        values=\{[\s\S]*?                      \/>/,'                      <Sparkline values={trend} />');
 s=s.replace(/              \{latestFresh\n[\s\S]*?Бодит холболтгүй"\}/,'              Гараар бүртгэсэн хэмжилт · {telemetry.find(t => t.timestamp)?.updated ?? "Хэмжилт байхгүй"}');
 s=s.replace('      <path\n        d={path}\n        fill="none"','      <motion.path\n        animate={{ d: path }}\n        transition={{ duration: 0.35 }}\n        fill="none"');
 s=s.replace('{String(i + 8).padStart(2, "0")}','{temperatureTracks[track].rows[i]?.values.time || "—"}');
 s=s.replace(/            <svg\n              className="hud-material-surface"[\s\S]*?            <\/svg>/,`            <svg className="hud-material-surface" viewBox="0 0 260 100" role="img" aria-label="Хадгалсан найрлагын нийт утга">
              {fractions.map((value, index) => <g key={index}><motion.rect x={index * 86 + 15} width={55} fill="#fc8651" animate={{ y: 75 - value / Math.max(...fractions, 1) * 55, height: value / Math.max(...fractions, 1) * 55 }} transition={{ duration: .35 }} /><text x={index * 86 + 20} y={90} fill="#9ba8b4" fontSize="9">{["0–3", "3–8", "8–13"][index]}: {value}</text></g>)}
            </svg>`);
 s=s.replace('Ширхэглэлийн бүдүүвч · Сорьцын бүртгэл','{composition ? `Найрлага · ${composition.date} ${composition.time || ""}` : "Найрлагын бүртгэл байхгүй"}');
 s=s.replace('3 ЗАМ <b>/</b> 8 ЦАГ <b>/</b> 24 БҮРТГЭЛ','3 ЗАМ <b>/</b> 8 ЦАГ <b>/</b> {tracks.reduce((sum, t) => sum + t.values.filter(Boolean).length, 0)} БҮРТГЭЛ');
 return s;
});
