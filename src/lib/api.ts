/* A new authentication context must discard all cached ERP data. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
"use client";
import { writable } from "./contracts";
export class RequestError extends Error {
  constructor(public status: number, message: string, public fields: { path: string; message: string }[] = []) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<{ data: T; meta?: { page: number; pageSize: number; total: number } }> {
  const response = await fetch(path, { ...options, credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", ...options.headers } });
  let payload;
  try { payload = await response.json(); } catch { throw new RequestError(response.status, "Сервертэй холбогдож чадсангүй."); }
  if (!response.ok) {
    if (response.status === 401 && !path.includes("/auth/login") && !location.pathname.startsWith("/login")) location.assign("/login/");
    throw new RequestError(response.status, payload.error?.message ?? "Хүсэлт амжилтгүй боллоо.", payload.error?.fields);
  }
  return payload;
}
export async function allRecords<T>(module: string): Promise<T[]> {
  const records: T[] = []; let page = 1, total = 0;
  do {
    const result = await api<T[]>(`/api/${module}/?page=${page++}&pageSize=100`);
    records.push(...result.data); total = result.meta?.total ?? records.length;
  } while (records.length < total);
  return records;
}
export async function saveRecord<T>(module: string, data: object, id?: string, version?: number): Promise<T> {
  return (await api<T>(`/api/${module}/${id ? `${id}/` : ""}`, { method: id ? "PATCH" : "POST", body: JSON.stringify({ data: writable(module, data), ...(id ? { version } : {}) }) })).data;
}
export async function deleteRecord(module: string, id: string, version: number) {
  await api(`/api/${module}/${id}/`, { method: "DELETE", body: JSON.stringify({ version }) });
}
