import fs from 'node:fs';
const read = p => fs.readFileSync(p, 'utf8').replaceAll('\r\n','\n');
const write = (p,s) => fs.writeFileSync(p,s,'utf8');
const edit = (p, fn) => write(p,fn(read(p)));
const pages = { '': ['Dashboard','dashboard/dashboard'], equipment: ['EquipmentPage','equipment/equipment'], forms: ['FormsPage','forms/forms'], reports: ['ReportsPage','reports/reports'], samples: ['SamplesPage','samples/samples'], standards: ['StandardsPage','standards/standards'], tests: ['TestsPage','tests/tests'] };
for(const [path,[name,feature]] of Object.entries(pages)) write(`src/app/(erp)/${path ? path+'/' : ''}page.tsx`, `import { requirePageUser } from "@/server/auth";\nimport { ${name} } from "@/features/${feature}";\nexport default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {\n  await requirePageUser();\n  return <${name} key={JSON.stringify(await searchParams)} />;\n}\n`);
for(const name of ['secret','small','sleepers']) edit(`src/app/(erp)/${name}/page.tsx`, s => 'import { requirePageUser } from "@/server/auth";\n'+s.replace('export default function Page() {','export default async function Page() {\n  await requirePageUser();'));
edit('package.json', s => { const p=JSON.parse(s); Object.assign(p.scripts,{build:'prisma generate && next build',start:'next start --hostname 127.0.0.1 --port 3100','db:generate':'prisma generate','db:migrate':'prisma migrate deploy','db:seed':'prisma db seed','db:studio':'prisma studio','test:backend':'tsx --test tests/backend.test.ts'}); return JSON.stringify(p,null,2)+'\n'; });
edit('eslint.config.mjs',s=>s.replace('".next/**",','".next/**",\n    "src/generated/**",'));
edit('src/lib/utils.ts',s=>s.replace('export const TODAY = "2026-09-22";', 'export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());\nexport const TODAY = today();\nexport const formatTimestamp = (value?: string | null) => value ? new Intl.DateTimeFormat("mn-MN", { timeZone: "Asia/Ulaanbaatar", dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";'));
edit('src/components/shell.tsx',s=>{
  s=s.replace('import { useLabStore }','import { api } from "@/lib/api";\nimport { useLabStore }');
  s=s.replace('  RotateCcw,','  LogOut,').replace('ConfirmDialog, EmptyState','EmptyState');
  s=s.replace('  const [reset, setReset] = useState(false);','  const user = useLabStore(s => s.user);');
  s=s.replace('  const resetDemo = useLabStore((s) => s.resetDemo);','');
  s=s.replace('        </nav>','          {user?.role === "ADMIN" && <Link href="/admin/users/" className="nav-item"><ShieldCheck size={19} /><span>Хэрэглэгчийн удирдлага</span></Link>}\n        </nav>');
  s=s.replace('onClick={() => setReset(true)}','onClick={async () => { try { await api("/api/auth/logout/", { method: "POST" }); location.assign("/login/"); } catch { useUI.getState().notify("Гарах үйлдэл амжилтгүй боллоо."); } }}');
  s=s.replace('<RotateCcw size={16} />','<LogOut size={16} />').replace('Демо мэдээлэл сэргээх','Гарах');
  s=s.replace(/      \{reset && \([\s\S]*?      \)\}\n/, '');
  s=s.replace('  const path = usePathname();','  const connection = useLabStore(s => s.connection);\n  const user = useLabStore(s => s.user);\n  const path = usePathname();');
  s=s.replace('Дотоод демо','{connection}').replace('Төв лаборатори<small>Барилгын материал</small>','{user?.fullName || "Төв лаборатори"}<small>{user?.role || "Барилгын материал"}</small>');
  s=s.replace('  const storageError = useLabStore((s) => s.storageError);','  const error = useLabStore((s) => s.error);');
  s=s.replace(/  useEffect\(\(\) => \{\n    Promise.resolve\(useLabStore.persist.rehydrate\(\)\)[\s\S]*?  \}, \[\]\);\n/,'');
  s=s.replace('{storageError && (','{error && (').replace('            Хөтчийн хадгалах зай хүрэлцэхгүй байна. Сүүлийн өөрчлөлт зөвхөн энэ\n            цонхонд хадгалагдсан. Зургийн хэмжээг багасгана уу.','            {error}');
  s=s.replace('Мэдээлэл энэ төхөөрөмжид хадгалагдана','Мэдээлэл MySQL санд хадгалагдана').replace('Танилцуулгын ажлын орон зай','Нэгдсэн ажлын орон зай');
  return s;
});
edit('src/features/forms/config.ts',s=>{
 s=s.replace('  type: "select",\n  options: ["Б. Энхжин", "Д. Тэмүүлэн", "С. Номин", "Г. Бат-Эрдэнэ"],\n  default: "Б. Энхжин",','  default: "",');
 s=s.replace('let field = z.string().trim();','let field = z.string().trim().max(2000, "Текст хэт урт байна.");');
 s=s.replace('f.default || ""','f.type === "select" ? f.default || "" : f.type === "date" ? TODAY : ""');
 s=s.replaceAll('Демо өдрөөс','Өнөөдрөөс');
 s=s.replace('    if (f.type === "select")','    if (f.type === "time") field = field.regex(/^([01]\\d|2[0-3]):[0-5]\\d$/, "Зөв цаг оруулна уу.");\n    if (f.type === "select")');
 return s;
});
edit('src/features/forms/forms.tsx',s=>{
 s=s.replace('    ...defaultsFor(kind),','    ...defaultsFor(kind),\n    technician: useLabStore.getState().user?.fullName || "",');
 s=s.replace('  const save = (form: FormValues) => {','  const save = async (form: FormValues) => {');
 s=s.replace('    saveTest(record);\n    setSaved(record);\n    useUI.getState().notify(`${formCodes[kind]} маягт хадгалагдлаа`);','    try {\n      const saved = await saveTest(record);\n      setSaved(saved);\n      useUI.getState().notify(`${formCodes[kind]} маягт хадгалагдлаа`);\n    } catch (error) { useUI.getState().notify(error instanceof Error ? error.message : "Хадгалж чадсангүй."); }');
 return s;
});
edit('src/features/samples/samples.tsx',s=>{
 s=s.replaceAll('Демо өдрөөс','Өнөөдрөөс').replace('technician: "Б. Энхжин",','technician: useLabStore.getState().user?.fullName || "",');
 s=s.replace('onSubmit={handleSubmit((values) => {','onSubmit={handleSubmit(async (values) => {');
 s=s.replace('          addSample({','          try { await addSample({').replace('          onClose();\n        })}','          onClose();\n          } catch (error) { setError("code", { message: error instanceof Error ? error.message : "Хадгалж чадсангүй." }); }\n        })}');
 s=s.replace(/\["Б\. Энхжин", "Д\. Тэмүүлэн", "С\. Номин", "Г\. Бат-Эрдэнэ"\]/g,'[...new Set([useLabStore.getState().user?.fullName || "", ...samples.map(s => s.technician)])]');
 return s;
});
// Keep each data consumer subscribed to the same authenticated records.
const replacements = [
 ['src/features/equipment/equipment.tsx','export function EquipmentPage() {','equipment'],
 ['src/features/dashboard/command-center.tsx','export function CommandCenter({ readyCount }: { readyCount: number }) {','equipment'],
 ['src/features/dashboard/module-data.ts','export function useCommandModules() {','equipment'],
 ['src/features/dashboard/dashboard.tsx','export function Dashboard() {','equipment'],
 ['src/features/reports/reports.tsx', '  const allSamples = useLabStore((s) => s.samples);','equipment'],
 ['src/features/standards/standards.tsx','export function StandardsPage() {','standards'],
];
for(const [p,marker,field] of replacements) edit(p,s=> {
 const name = field === 'equipment' ? 'seedEquipment' : 'seedStandards';
 s=s.replace(`import { ${name} } from "@/data/mock";`, field === 'standards' ? 'import { useLabStore } from "@/lib/store";' : '');
 s=s.replace(marker,marker+`\n  const ${name} = useLabStore(s => s.${field});`);
 return s;
});
edit('src/features/standards/standards.tsx',s=>s.replace('5 баримт бичиг','{seedStandards.length} баримт бичиг'));
edit('src/features/reports/reports.tsx',s=>s.replace('№ ЛАБ-2026-0922 · Танилцуулгын тайлан','ЛАБ · {from} — {to}'));
edit('src/features/forms/product-modules.tsx',s=>{
 s=s.replace('import { uid }','import { DraftCell } from "@/components/draft-cell";\nimport { api } from "@/lib/api";\nimport { uid }');
 s=s.replace('                        <input\n                          {...inputProps}', '                        <DraftCell\n                          aria-label={inputProps["aria-label"]}\n                          value={inputProps.value}\n                          onCommit={value => onChange(rows.map(item => item.id === row.id ? { ...item, values: { ...item.values, [column.key]: value } } : item))}');
 s=s.replace('  return (\n    <>\n      <div','  const storedTotals = useProductModuleStore(s => s.totals);\n  return (\n    <>\n      <div');
 s=s.replace(/\{rows\n                        \.reduce\([\s\S]*?maximumFractionDigits: 10 \}\)\}/,'{storedTotals[column.key] ?? "0"}');
 s=s.replace('    track,\n    setTrack,','    date, setDate, saving, error,\n    track,\n    setTrack,');
 s=s.replace('onSubmit={(event) => {\n              event.preventDefault();\n              if (pin !== "2026") {\n                setPinError("PIN код буруу байна. Дахин оруулна уу.");\n                return;\n              }\n              setUnlocked(true);\n              setPin("");\n              setPinError("");\n            }}', 'onSubmit={async (event) => {\n              event.preventDefault();\n              try { await api("/api/auth/verify/", { method: "POST", body: JSON.stringify({ password: pin }) }); setUnlocked(true); setPin(""); setPinError(""); }\n              catch (error) { setPinError(error instanceof Error ? error.message : "Нууц үг буруу байна."); }\n            }}');
 s=s.replaceAll('PIN код','Нууц үг').replace('                inputMode="numeric"\n','').replace('                maxLength={4}','                maxLength={128}').replace('setPin(event.target.value.replace(/\\D/g, ""));','setPin(event.target.value);');
 s=s.replace('              Түр бүртгэл · Хуудсыг дахин ачаалахад оруулсан мэдээлэл арилна.','              {saving ? "Хадгалж байна…" : "Утга оруулаад талбараас гарахад MySQL санд хадгалагдана."}');
 s=s.replace('            {module === "sleepers" && (','            {error && <p className="field-error" role="alert">{error}</p>}\n            <label className="field product-module-temperature"><span>Бүртгэлийн огноо</span><input type="date" value={date} disabled={saving > 0} onChange={event => { if (event.target.value) setDate(event.target.value); }} /></label>\n            <fieldset className="erp-fields" disabled={saving > 0}>\n            {module === "sleepers" && (');
 s=s.replace('                    <input\n                      type="number"','                    <DraftCell\n                      type="number"').replace('                      onChange={(event) => {\n                        const temperature = event.target.value;','                      onCommit={(temperature) => {');
 s=s.replace('          </div>\n        )}', '            </fieldset>\n          </div>\n        )}');
 return s;
});
