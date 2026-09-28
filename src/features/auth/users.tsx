"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLabStore } from "@/lib/store";
import type { AuthUser } from "@/lib/contracts";
import { Modal, PageHeading, useUI } from "@/components/ui";
export function UsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]), [page, setPage] = useState(1), [total, setTotal] = useState(0);
  const [create, setCreate] = useState(false), [reset, setReset] = useState<AuthUser | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const me = useLabStore(s => s.user);
  const load = useCallback(async () => { try { const r = await api<AuthUser[]>(`/api/admin/users/?page=${page}`); setUsers(r.data); setTotal(r.meta?.total ?? 0); } catch (e) { setError(e instanceof Error ? e.message : "Мэдээлэл ачаалж чадсангүй."); } }, [page]);
  useEffect(() => { void Promise.resolve().then(load); const update = (e: Event) => { if ((e as CustomEvent).detail.entityType === "users") void load(); }; window.addEventListener("laboratory:change", update); return () => window.removeEventListener("laboratory:change", update); }, [load]);
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : "Хадгалж чадсангүй.");
  return <><PageHeading title="Хэрэглэгчийн удирдлага" eyebrow="ADMIN" description="Нэвтрэх эрх, хэрэглэгчийн бүртгэл"><button className="button primary" onClick={() => { setCreate(true); setError(""); }}>Хэрэглэгч нэмэх</button></PageHeading>
    {error && <p role="alert" className="field-error">{error}</p>}
    <section className="panel table-scroll"><table className="data-table"><thead><tr><th>Овог нэр</th><th>Нэвтрэх нэр</th><th>Эрх</th><th>Төлөв</th><th>Үйлдэл</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td>{user.fullName}</td><td>{user.username}</td><td>{user.role}</td><td>{user.isActive ? "Идэвхтэй" : "Идэвхгүй"}</td><td><button className="button secondary small" disabled={busy || user.id === me?.id} onClick={async () => { setBusy(true); try { await api(`/api/admin/users/${user.id}/`, { method: "PATCH", body: JSON.stringify({ isActive: !user.isActive }) }); await load(); } catch (e) { fail(e); } finally { setBusy(false); } }}>{user.isActive ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}</button><button className="button secondary small" disabled={user.id === me?.id} onClick={() => { setReset(user); setError(""); }}>Нууц үг шинэчлэх</button></td></tr>)}</tbody></table></section>
    <div className="product-module-actions"><button className="button secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Өмнөх</button><span>{page} · {total} хэрэглэгч</span><button className="button secondary" disabled={page * 100 >= total} onClick={() => setPage(page + 1)}>Дараах</button></div>
    {(create || reset) && <Modal title={reset ? `${reset.fullName} · Нууц үг шинэчлэх` : "Шинэ хэрэглэгч"} onClose={() => { setCreate(false); setReset(null); }}><form onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError(""); const form = new FormData(e.currentTarget);
      try { await api(reset ? `/api/admin/users/${reset.id}/reset-password/` : "/api/admin/users/", { method: "POST", body: JSON.stringify(reset ? { password: form.get("password") } : Object.fromEntries(form)) }); setCreate(false); setReset(null); await load(); useUI.getState().notify("Хадгалагдлаа."); }
      catch (e) { fail(e); } finally { setBusy(false); }
    }}>{!reset && <><label className="field"><span>Овог нэр</span><input name="fullName" required minLength={2} maxLength={120} /></label><label className="field"><span>Нэвтрэх нэр</span><input name="username" autoComplete="off" required minLength={3} maxLength={64} /></label></>}
      <label className="field"><span>Нууц үг</span><input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></label>
      {!reset && <label className="field"><span>Эрх</span><select name="role"><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select></label>}
      {error && <p role="alert" className="field-error">{error}</p>}<button className="button primary" disabled={busy}>Хадгалах</button>
    </form></Modal>}
  </>;
}
