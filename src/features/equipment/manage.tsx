"use client";
import { useState } from "react";
import { api, deleteRecord, saveRecord } from "@/lib/api";
import { useLabStore } from "@/lib/store";
import type { Equipment } from "@/lib/types";
import { TODAY, formNames } from "@/lib/utils";
import { Modal, useUI } from "@/components/ui";
export function EquipmentManager({ equipment, onDeleted }: { equipment?: Equipment; onDeleted?: () => void }) {
  const user = useLabStore(s => s.user);
  const [mode, setMode] = useState<"edit" | "readings" | "maintenance" | "delete" | null>(null);
  const [steps, setSteps] = useState(equipment?.steps ?? []);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const open = (value: typeof mode) => { setError(""); setMode(value); setSteps(equipment?.steps ?? []); };
  const fields: [string, string, string?][] = [["name", "Төхөөрөмжийн нэр"], ["serial", "Төхөөрөмжийн код"], ["model", "Загвар"], ["healthStatus", "Техникийн байдал"], ["lastInspection", "Сүүлийн үзлэг", "date"], ["nextInspection", "Дараагийн үзлэг", "date"], ["calibrationDate", "Калибровк хүчинтэй хугацаа", "date"], ["purpose", "Зориулалт", "textarea"], ["specimens", "Туршилтын сорьц", "textarea"], ["tools", "Багаж хэрэгсэл", "textarea"], ["failureInfo", "Гэмтлийн мэдээлэл", "textarea"], ["maintenanceInfo", "Үйлчилгээний мэдээлэл", "textarea"], ["notes", "Тэмдэглэл", "textarea"]];
  return <><div className="product-module-actions">
    {user?.role === "ADMIN" && <button className="button secondary" onClick={() => open("edit")}>{equipment ? "Мэдээлэл засах" : "Төхөөрөмж нэмэх"}</button>}
    {equipment && <><button className="button secondary" onClick={() => open("readings")}>Хэмжилт бүртгэх</button><button className="button secondary" onClick={() => open("maintenance")}>Үйлчилгээ бүртгэх</button>{user?.role === "ADMIN" && <button className="button secondary" onClick={() => open("delete")}>Идэвхгүй болгох</button>}</>}
  </div>{mode && <Modal title={mode === "edit" ? "Төхөөрөмжийн бүртгэл" : mode === "readings" ? "Гараар хэмжилт бүртгэх" : mode === "maintenance" ? "Засвар, үйлчилгээ" : "Төхөөрөмжийг идэвхгүй болгох"} onClose={() => setMode(null)} wide={mode === "edit"}>
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError(""); const values = Object.fromEntries(new FormData(event.currentTarget));
      try {
        if (mode === "edit") await saveRecord("equipment", { ...values, date: equipment?.date ?? TODAY, steps }, equipment?.id, equipment?.version);
        else if (mode === "delete") { await deleteRecord("equipment", equipment!.id, equipment!.version!); onDeleted?.(); }
        else { const key = mode === "readings" ? "measuredAt" : "performedAt"; await api(`/api/equipment/${equipment!.id}/${mode}/`, { method: "POST", body: JSON.stringify({ ...values, [key]: new Date(`${values[key]}+08:00`).toISOString() }) }); }
        await useLabStore.getState().refresh("equipment"); setMode(null); useUI.getState().notify("Хадгалагдлаа.");
      } catch (e) { setError(e instanceof Error ? e.message : "Хадгалж чадсангүй."); } finally { setBusy(false); }
    }}>
      {mode === "edit" && <><div className="form-grid">{fields.map(([name,label,type]) => { const value = String(equipment?.[name as keyof Equipment] ?? ""); return <label className="field" key={name}><span>{label}</span>{type === "textarea" ? <textarea name={name} defaultValue={value} maxLength={2000} /> : <input name={name} type={type ?? "text"} defaultValue={value} required={["name","serial"].includes(name)} maxLength={120} />}</label>; })}
        <label className="field"><span>Төрөл</span><select name="kind" defaultValue={equipment?.kind ?? "meter"}>{Object.entries({ press: "Пресс", oven: "Хатаах шүүгээ", scale: "Жин", sieve: "Шигшүүр", meter: "Хэмжигч", cone: "Конус" }).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="field"><span>Төлөв</span><select name="status" defaultValue={equipment?.status ?? "Үзлэг шаардлагатай"}>{["Бэлэн","Үзлэг шаардлагатай","Засварт"].map(v => <option key={v}>{v}</option>)}</select></label>
        <label className="field"><span>Холбоотой маягт</span><select name="form" defaultValue={equipment?.form ?? "environment"}>{Object.entries(formNames).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      </div><h3>Ажиллуулах алхмууд</h3>{steps.map((step,index) => <div className="form-grid" key={index}><label className="field"><span>Алхам {index + 1}</span><input required value={step.title} maxLength={200} onChange={e => setSteps(steps.map((s,i) => i === index ? { ...s, title: e.target.value } : s))} /></label><label className="field"><span>Тайлбар</span><textarea value={step.description} maxLength={2000} onChange={e => setSteps(steps.map((s,i) => i === index ? { ...s, description: e.target.value } : s))} /></label><button type="button" className="button secondary small" onClick={() => setSteps(steps.filter((_,i) => i !== index))}>Алхам устгах</button></div>)}<button type="button" className="button secondary" disabled={steps.length >= 40} onClick={() => setSteps([...steps, { title: "", description: "" }])}>Алхам нэмэх</button></>}
      {mode === "readings" && <><p className="muted">Хэмжсэн утга болон бодит хэмжилтийн цагийг оруулна уу.</p><label className="field"><span>Хэмжилтийн утга</span><input name="value" type="number" step="any" required /></label><label className="field"><span>Нэгж</span><input name="unit" maxLength={24} required /></label><label className="field"><span>Хэмжсэн цаг · Улаанбаатар</span><input name="measuredAt" type="datetime-local" required /></label></>}
      {mode === "maintenance" && <><label className="field"><span>Үйлчилгээ хийсэн цаг · Улаанбаатар</span><input name="performedAt" type="datetime-local" required /></label><label className="field"><span>Хийсэн ажил</span><textarea name="description" required maxLength={2000} /></label></>}
      {mode === "delete" && <p>Төхөөрөмжийг идэвхтэй жагсаалтаас хасна. Бүртгэлийн түүх хадгалагдана.</p>}
      {error && <p className="field-error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="button secondary" onClick={() => setMode(null)}>Болих</button><button className="button primary" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</button></div>
    </form>
  </Modal>}</>;
}
