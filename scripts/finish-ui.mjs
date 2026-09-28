import fs from 'node:fs';
const edit=(p,fn)=>fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8').replaceAll('\r\n','\n')));
edit('src/features/equipment/equipment.tsx',s=>{
 s=s.replace('import { useLabStore }','import { EquipmentManager } from "./manage";\nimport { formatTimestamp } from "@/lib/utils";\nimport { useLabStore }');
 s=s.replace('              8.150','              —').replace('              21.4','              —').replace('              56 %','              — %');
 s=s.replace('disabled={equipment.status === "Засварт"}','disabled={equipment.status === "Засварт" || !equipment.steps.length}');
 s=s.replace('      <button\n        className="button primary full-width guide-start"','      <EquipmentManager equipment={equipment} onDeleted={onClose} />\n      <p className="muted">Сүүлийн гараар бүртгэсэн хэмжилт: {equipment.readings?.[0] ? `${equipment.readings[0].value} ${equipment.readings[0].unit} · ${formatTimestamp(equipment.latestMeasurementAt)}` : "Хэмжилт байхгүй"}</p>\n      <button\n        className="button primary full-width guide-start"');
 s=s.replace(/          <div className="activity-timeline">[\s\S]*?          <\/div>\n          <Link/,`          <div className="activity-timeline">{equipment.maintenance?.length ? equipment.maintenance.map(entry => <div key={entry.id}><strong>{formatTimestamp(entry.performedAt)}</strong><p>{entry.description}</p></div>) : <p className="muted">Үйлчилгээний бүртгэл байхгүй.</p>}</div>
          <Link`);
 s=s.replace('Шалгалт бүрийн төлөв энэ хөтөч дээр хадгалагдана.','Шалгалт бүрийн төлөв MySQL санд хадгалагдана.').replace('Гүйцэтгэсэн алхмууд энэ хөтөч дээр хадгалагдсан.','Гүйцэтгэсэн алхмууд MySQL санд хадгалагдсан.');
 s=s.replace('        <Link href="/reports/?type=equipment"','        <EquipmentManager />\n        <Link href="/reports/?type=equipment"');
 s=s.replace('Калибровк ойртсон<strong>2</strong>','Калибровк ойртсон<strong>{seedEquipment.filter(e => e.calibrationDate && daysBetween(TODAY, e.calibrationDate) <= 30).length}</strong>');
 s=s.replace('Засварт<strong>1</strong>','Засварт<strong>{seedEquipment.filter(e => e.status === "Засварт").length}</strong>');
 s=s.replace('equipment={selected}','equipment={seedEquipment.find(e => e.id === selected.id) ?? selected}').replace('equipment={guide}','equipment={seedEquipment.find(e => e.id === guide.id) ?? guide}');
 s=s.replace('  const days = daysBetween(TODAY, equipment.calibrationDate);','  const days = equipment.calibrationDate ? daysBetween(TODAY, equipment.calibrationDate) : null;');
 s=s.replace('${days < 30 ?','${days !== null && days < 30 ?').replace('{days < 30\n','{days === null ? "Калибровкийн огноо байхгүй" : days < 30\n');
 return s;
});
edit('src/app/command.css',s=>s+`\n.auth-screen { min-height:100dvh; display:grid; place-items:center; padding:24px; background:#101720; color:#dce5ef; }\n.auth-panel { width:min(440px,100%); padding:32px; }\n.auth-panel form { display:grid; gap:18px; margin-top:24px; }\n.auth-panel .hud-eyebrow { margin-top:32px; }\n.erp-fields { padding:0; margin:0; border:0; min-width:0; }\n.erp-fields:disabled { opacity:.75; }\n.hud-material-surface rect, .hud-hour-slots span, .hud-progress-line span { transition:all .35s ease; }\n`);
edit('src/app/api/auth/verify/route.ts',s=>s.replace('new ApiError(401,','new ApiError(403,'));
edit('src/server/validation.ts',s=>s.replace('schemaFor(v.kind).safeParse(v.values)','schemaFor(v.kind).strict().safeParse(v.values)'));
edit('src/features/reports/report-record.tsx',s=>s.replace('Танилцуулгын мэдээлэл · Албан ёсны дүгнэлт биш','Лабораторийн бүртгэлийн мэдээлэл'));
// The illustration retains its schematic appearance without simulated measurements.
edit('src/features/dashboard/monitoring-visual.tsx',s=>s.replace('X: 047.9185','СХЕМАТИК ДҮРСЛЭЛ').replace('Y: 106.9177','ХЭМЖИЛТИЙН ЭХ ҮҮСВЭР БИШ'));
