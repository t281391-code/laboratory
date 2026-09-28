"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Save } from "lucide-react";
import { SectionHeading, useUI } from "@/components/ui";
import { canEditRecord, plannedRegistryStatus } from "@/lib/registry";
import { saveRecord } from "@/lib/api";
import { useLabStore, type Saved } from "@/lib/store";
import type { Sample } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function CompanyTransfer({ sample }: { sample: Sample }) {
  const current = useLabStore((s) => s.samples.find((row) => row.id === sample.id));
  const user = useLabStore((s) => s.user);
  const [version, setVersion] = useState(current?.version);
  const [error, setError] = useState("");
  const schema = z.object({
    companyPlannedDate: z.union([z.literal(""), z.iso.date("Огноо зөв оруулна уу.")])
      .refine((value) => !value || value >= sample.castingDate, "Явах огноо дээж авсан огнооноос өмнө байж болохгүй."),
  });
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema), defaultValues: { companyPlannedDate: sample.companyPlannedDate ?? "" },
  });
  const editable = !!user && !!current && canEditRecord(user, current);
  return (
    <section className="sample-company-transfer">
      <SectionHeading title="БАРИЛГА АРХИТЕКТУР КОМПАНИ" subtitle="Явах огноо хадгалмагц компанийн дээжийн бүртгэлд автоматаар харагдана." />
      {editable ? (
        <form noValidate onSubmit={handleSubmit(async (values) => {
          setError("");
          try {
            const saved = await saveRecord<Saved<Sample>>("samples", { companyPlannedDate: values.companyPlannedDate || null }, current.id, version);
            useLabStore.setState((s) => ({ samples: s.samples.map((row) => row.id === saved.id ? saved : row) }));
            reset({ companyPlannedDate: saved.companyPlannedDate ?? "" });
            setVersion(saved.version);
            useUI.getState().notify("Компани руу явах огноо хадгалагдлаа");
          } catch (e) { setError(e instanceof Error ? e.message : "Хадгалж чадсангүй."); }
        })}>
          <label className="field">
            <span>Компани руу явах огноо</span>
            <input type="date" min={sample.castingDate} {...register("companyPlannedDate")} aria-invalid={!!errors.companyPlannedDate} />
            {errors.companyPlannedDate && <span className="field-error">{errors.companyPlannedDate.message}</span>}
          </label>
          {error && <p className="field-error" role="alert">{error}</p>}
          <button type="submit" className="button secondary small" disabled={isSubmitting}><Save size={15} />Огноо хадгалах</button>
          {isDirty && <p className="muted">Бүртгэлд шилжихээс өмнө огноогоо хадгална уу.</p>}
          {!isDirty && !isSubmitting && <Link className="related-link" href={sample.companyPlannedDate ? `/sample-registry/?q=${encodeURIComponent(sample.code)}&status=${encodeURIComponent(plannedRegistryStatus)}` : `/sample-registry/?sourceSample=${sample.id}`}>
            <span>{sample.companyPlannedDate ? "Компанийн дээжийн бүртгэлд харах" : "Компанийн дээжийн бүртгэлд оруулах"}</span><ArrowRight size={18} />
          </Link>}
        </form>
      ) : <p>Явах огноо: {sample.companyPlannedDate ? formatDate(sample.companyPlannedDate) : "Товлоогүй"}</p>}
      <p className="muted">«Дээжийн бүртгэл»-д амжилттай бүртгэгдсэний дараа энэ жагсаалтаас хасагдана.</p>
    </section>
  );
}
