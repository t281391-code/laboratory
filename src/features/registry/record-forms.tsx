"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Save, Send } from "lucide-react";
import { Modal, useUI } from "@/components/ui";
import { useLabStore } from "@/lib/store";
import { canEditRecord, isSent, type SampleRecordDto } from "@/lib/registry";
import { formatDate, TODAY } from "@/lib/utils";
import { registryApi } from "./store";

const schema = z.object({
  code: z.string().trim().min(3, "Дээжийн кодыг оруулна уу (3+ тэмдэгт)."),
  material: z.string().trim().min(1, "Материалын төрлийг оруулна уу."),
  description: z.string().trim().min(2, "Дээжийн нэрийг оруулна уу."),
  project: z.string().trim().min(2, "Төслийн нэрийг оруулна уу."),
  location: z.string().trim().min(2, "Авсан байршлыг оруулна уу."),
  quantity: z.number({ error: "Хэмжээг оруулна уу." }).int("Бүхэл тоо оруулна уу.").min(1, "1-ээс бага байж болохгүй.").max(1000000, "Хэт их байна."),
  unit: z.string().trim().min(1, "Нэгжийг оруулна уу."),
  sampledDate: z.string().min(1, "Огноо сонгоно уу.").refine((v) => v <= TODAY, "Өнөөдрөөс хойших огноо сонгох боломжгүй."),
  sampledBy: z.string().trim().min(1, "Ажилтны нэрийг оруулна уу."),
  notes: z.string().trim().max(2000, "2000 тэмдэгтээс ихгүй байна."),
  sendNow: z.boolean(),
  submittedLaboratory: z.string().trim().max(200),
  sentDate: z.string(),
}).superRefine((v, ctx) => {
  if (!v.sendNow) return;
  if (!v.submittedLaboratory) ctx.addIssue({ code: "custom", path: ["submittedLaboratory"], message: "Лабораторийн нэрийг оруулна уу." });
  if (!v.sentDate) ctx.addIssue({ code: "custom", path: ["sentDate"], message: "Илгээсэн огноог сонгоно уу." });
  else if (v.sentDate > TODAY) ctx.addIssue({ code: "custom", path: ["sentDate"], message: "Өнөөдрөөс хойших огноо сонгох боломжгүй." });
  else if (v.sentDate < v.sampledDate) ctx.addIssue({ code: "custom", path: ["sentDate"], message: "Дээж авсан огнооноос өмнө байж болохгүй." });
});
type FormValues = z.infer<typeof schema>;

export function RecordFormModal({ record, sourceSampleId, onClose, onSaved }: { record?: SampleRecordDto; sourceSampleId?: string; onClose: () => void; onSaved?: (record: SampleRecordDto) => void }) {
  const editing = !!record, sent = record ? isSent(record.status) : false;
  const samples = useLabStore((s) => s.samples);
  const user = useLabStore((s) => s.user);
  const [selectedSourceId, setSelectedSourceId] = useState(sourceSampleId ?? "");
  const source = samples.find((s) => s.id === selectedSourceId);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: record?.code ?? source?.code ?? "", material: record?.material ?? source?.material ?? "Бетон",
      description: record?.description ?? (source ? `${source.material}, ${source.grade}` : ""), project: record?.project ?? source?.project ?? "", location: record?.location ?? source?.element ?? "",
      quantity: record?.quantity ?? source?.count ?? 1, unit: record?.unit ?? "ширхэг", sampledDate: record?.sampledDate ?? source?.castingDate ?? TODAY,
      sampledBy: record?.sampledBy ?? source?.technician ?? user?.fullName ?? "", notes: record?.notes ?? "",
      sendNow: sent, submittedLaboratory: record?.submittedLaboratory ?? "", sentDate: record?.sentDate ?? TODAY,
    },
  });
  const sendNow = useWatch({ control, name: "sendNow" });
  const sampledDate = useWatch({ control, name: "sampledDate" });
  const error = (name: keyof FormValues) => errors[name] ? <span className="field-error">{errors[name]?.message}</span> : null;
  return (
    <Modal title={editing ? "Дээжийн бүртгэл засах" : "Шинэ дээж бүртгэх"} onClose={onClose} wide>
      <p className="modal-intro">
        {editing ? "Дээжийн мэдээллийг шинэчилнэ. Төлөв хариуны бүртгэлээс автоматаар тодорхойлогдоно." : "Лабораторид илгээх дээжийн мэдээллийг оруулна уу. Бүртгэсний дараа лабораторид илгээж, хариуг оруулна."}
      </p>
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setServerError("");
          if (!editing && selectedSourceId && !source) { setServerError("Эх сорьц жагсаалтад байхгүй байна. Өөр хэрэглэгч бүртгэсэн байж болзошгүй тул жагсаалтаа шинэчилнэ үү."); return; }
          const dispatch = values.sendNow;
          const input = {
            code: values.code, material: values.material, description: values.description, project: values.project, location: values.location,
            quantity: values.quantity, unit: values.unit, sampledDate: values.sampledDate, sampledBy: values.sampledBy, notes: values.notes,
            submittedLaboratory: dispatch ? values.submittedLaboratory : null, sentDate: dispatch ? values.sentDate : null,
          };
          try {
            const saved = record ? await registryApi.update(record.id, record.version, input) : await registryApi.create({ ...input, ...(selectedSourceId ? { sourceSampleId: selectedSourceId } : {}) });
            useUI.getState().notify(editing ? `${saved.code} бүртгэл шинэчлэгдлээ` : `${saved.code} дээж бүртгэгдлээ`);
            onSaved?.(saved); onClose();
          } catch (e) { setServerError(e instanceof Error ? e.message : "Хадгалж чадсангүй."); }
        })}
      >
        <div className="form-grid">
          {!editing && (
            <label className="field span-2">
              <span>Дээж, сорьц жагсаалтаас сонгох</span>
              <select value={selectedSourceId} disabled={!!sourceSampleId} onChange={(event) => {
                const id = event.target.value;
                setSelectedSourceId(id);
                const sample = samples.find((s) => s.id === id);
                setValue("code", sample?.code ?? ""); setValue("material", sample?.material ?? "Бетон");
                setValue("description", sample ? `${sample.material}, ${sample.grade}` : "");
                setValue("project", sample?.project ?? ""); setValue("location", sample?.element ?? "");
                setValue("quantity", sample?.count ?? 1); setValue("unit", "ширхэг");
                setValue("sampledDate", sample?.castingDate ?? TODAY); setValue("sampledBy", sample?.technician ?? user?.fullName ?? "");
              }}>
                <option value="">Шинэ дээжийн мэдээлэл оруулах</option>
                {samples.filter((s) => user && canEditRecord(user, s)).map((s) => <option key={s.id} value={s.id}>{s.code} · {s.project}{s.companyPlannedDate ? ` · Явах ${formatDate(s.companyPlannedDate)}` : ""}</option>)}
              </select>
              {source && <small>Бүртгэсний дараа «Бүртгэл ба хяналт → Дээж, сорьц» жагсаалтаас хасагдана. Явах огноо: {source.companyPlannedDate ? formatDate(source.companyPlannedDate) : "Товлоогүй"}.</small>}
            </label>
          )}
          <label className="field">
            <span>Дээжийн код <b>*</b></span>
            <input {...register("code")} placeholder="Жишээ: БА-2026-014" aria-invalid={!!errors.code} />
            {error("code")}
          </label>
          <label className="field">
            <span>Материалын төрөл <b>*</b></span>
            <input {...register("material")} list="reg-materials" aria-invalid={!!errors.material} />
            {error("material")}
          </label>
          <label className="field span-2">
            <span>Дээжийн нэр, тодорхойлолт <b>*</b></span>
            <input {...register("description")} placeholder="Жишээ: Бетон, B30, 150×150×150 мм куб" aria-invalid={!!errors.description} />
            {error("description")}
          </label>
          <label className="field">
            <span>Төсөл, объект <b>*</b></span>
            <input {...register("project")} placeholder="Төслийн нэр" aria-invalid={!!errors.project} />
            {error("project")}
          </label>
          <label className="field">
            <span>Дээж авсан байршил, бүтээц <b>*</b></span>
            <input {...register("location")} placeholder="Жишээ: 3-р давхрын багана" aria-invalid={!!errors.location} />
            {error("location")}
          </label>
          <label className="field">
            <span>Хэмжээ <b>*</b></span>
            <input type="number" min={1} step={1} {...register("quantity", { valueAsNumber: true })} aria-invalid={!!errors.quantity} />
            {error("quantity")}
          </label>
          <label className="field">
            <span>Нэгж <b>*</b></span>
            <input {...register("unit")} list="reg-units" aria-invalid={!!errors.unit} />
            {error("unit")}
          </label>
          <label className="field">
            <span>Дээж авсан огноо <b>*</b></span>
            <input type="date" max={TODAY} {...register("sampledDate")} aria-invalid={!!errors.sampledDate} />
            {error("sampledDate")}
          </label>
          <label className="field">
            <span>Дээж авсан ажилтан <b>*</b></span>
            <input {...register("sampledBy")} list="reg-staff" aria-invalid={!!errors.sampledBy} />
            {error("sampledBy")}
          </label>
          <label className="field span-2">
            <span>Тайлбар</span>
            <textarea rows={3} {...register("notes")} />
            {error("notes")}
          </label>
          {!editing && (
            <label className="reg-check span-2">
              <input type="checkbox" {...register("sendNow")} />
              <span>Дээжийг шууд лабораторид илгээсэн гэж бүртгэх</span>
            </label>
          )}
          {(editing ? sent : sendNow) && (
            <>
              <label className="field">
                <span>Илгээсэн лаборатори <b>*</b></span>
                <input {...register("submittedLaboratory")} list="reg-labs" placeholder="Лабораторийн нэр" aria-invalid={!!errors.submittedLaboratory} />
                {error("submittedLaboratory")}
              </label>
              <label className="field">
                <span>Илгээсэн огноо <b>*</b></span>
                <input type="date" min={sampledDate || undefined} max={TODAY} {...register("sentDate")} aria-invalid={!!errors.sentDate} />
                {error("sentDate")}
              </label>
            </>
          )}
        </div>
        {serverError && <p className="field-error reg-server-error" role="alert">{serverError}</p>}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>Болих</button>
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {editing ? <Save size={16} /> : <Plus size={16} />}
            {editing ? "Хадгалах" : "Дээж бүртгэх"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const sendSchema = z.object({ submittedLaboratory: z.string().trim().min(1, "Лабораторийн нэрийг оруулна уу.").max(200), sentDate: z.string().min(1, "Огноо сонгоно уу.") });
export function SendModal({ record, onClose }: { record: SampleRecordDto; onClose: () => void }) {
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof sendSchema>>({
    resolver: zodResolver(sendSchema), defaultValues: { submittedLaboratory: "", sentDate: TODAY },
  });
  return (
    <Modal title="Лабораторид илгээх" onClose={onClose}>
      <p className="modal-intro"><strong>{record.code}</strong> · {record.description}. Илгээсний дараа лабораторийн хариуг оруулах боломжтой болно.</p>
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setServerError("");
          if (values.sentDate > TODAY || values.sentDate < record.sampledDate) { setError("sentDate", { message: "Огноо дээж авсан өдрөөс өмнө эсвэл ирээдүйд байж болохгүй." }); return; }
          try {
            await registryApi.send(record.id, record.version, values.submittedLaboratory, values.sentDate);
            useUI.getState().notify(`${record.code} дээж лабораторид илгээгдлээ`); onClose();
          } catch (e) { setServerError(e instanceof Error ? e.message : "Хадгалж чадсангүй."); }
        })}
      >
        <div className="form-grid">
          <label className="field span-2">
            <span>Илгээх лаборатори <b>*</b></span>
            <input autoFocus {...register("submittedLaboratory")} list="reg-labs" placeholder="Лабораторийн нэр" aria-invalid={!!errors.submittedLaboratory} />
            {errors.submittedLaboratory && <span className="field-error">{errors.submittedLaboratory.message}</span>}
          </label>
          <label className="field span-2">
            <span>Илгээсэн огноо <b>*</b></span>
            <input type="date" min={record.sampledDate} max={TODAY} {...register("sentDate")} aria-invalid={!!errors.sentDate} />
            {errors.sentDate && <span className="field-error">{errors.sentDate.message}</span>}
          </label>
        </div>
        {serverError && <p className="field-error reg-server-error" role="alert">{serverError}</p>}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>Болих</button>
          <button className="button primary" type="submit" disabled={isSubmitting}><Send size={16} />Илгээх</button>
        </div>
      </form>
    </Modal>
  );
}
