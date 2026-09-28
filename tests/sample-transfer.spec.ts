import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { TODAY, dayOffset, formatDate } from "../src/lib/utils";

const origin = { Origin: process.env.TEST_URL || "http://127.0.0.1:3100" };
const planned = dayOffset(TODAY, 7);
const sampleData = (code: string) => ({
  code, material: "Бетон", grade: "M400", project: "Transfer verification", element: "Төмөр бетон дэр",
  castingDate: TODAY, registeredDate: TODAY, age: 28, count: 6, status: "Бүртгэсэн", technician: "Verification Administrator", photos: [],
  companyPlannedDate: planned, product: "sleeper", track1Count: 1, track2Count: 2, track3Count: 3,
});
const registryData = (code: string) => ({
  code, material: "Бетон", description: "Бетон M400", project: "Transfer verification", location: "Төмөр бетон дэр",
  quantity: 6, unit: "ширхэг", sampledDate: TODAY, sampledBy: "Verification Administrator", notes: "", submittedLaboratory: null, sentDate: null,
});
async function login(request: APIRequestContext) {
  const response = await request.post("/api/auth/login/", { headers: origin, data: { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD } });
  expect(response.ok(), await response.text()).toBeTruthy();
}
async function ids(request: APIRequestContext) {
  const result: string[] = [];
  for (let page = 1; ; page++) {
    const response = await request.get(`/api/samples/?page=${page}&pageSize=100`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    result.push(...body.data.map((s: { id: string }) => s.id));
    if (result.length >= body.meta.total) return result;
  }
}
async function cleanup(request: APIRequestContext, samples: string[], records: string[]) {
  for (const [module, list] of [["sample-records", records], ["samples", samples]] as const) {
    for (const id of list) {
      const response = await request.get(`/api/${module}/${id}/`);
      if (response.status() === 404) continue;
      const record = (await response.json()).data;
      expect((await request.delete(`/api/${module}/${id}/`, { headers: origin, data: { version: record.version } })).ok()).toBeTruthy();
    }
  }
}

test("sample transfer is durable, atomic, unique and can match an existing code", async ({ request }) => {
  await login(request);
  const suffix = randomBytes(6).toString("hex"), samples: string[] = [], records: string[] = [];
  try {
    for (const mode of ["explicit", "code"] as const) {
      const code = `TRANSFER-${suffix}-${mode}`;
      const response = await request.post("/api/samples/", { headers: origin, data: { data: sampleData(code) } });
      expect(response.status(), await response.text()).toBe(201);
      const sample = (await response.json()).data; samples.push(sample.id);
      expect(sample.companyPlannedDate).toBe(planned);
      expect(await ids(request)).toContain(sample.id);
      for (const companyPlannedDate of ["2026-02-30", dayOffset(TODAY, -1)]) {
        expect((await request.patch(`/api/samples/${sample.id}/`, { headers: origin, data: { version: sample.version, data: { companyPlannedDate } } })).status()).toBe(422);
      }
      const failed = await request.post("/api/sample-records/", { headers: origin, data: { ...registryData(code), sourceSampleId: sample.id, quantity: 0 } });
      expect(failed.status()).toBe(422);
      expect(await ids(request)).toContain(sample.id);
      const payload = { ...registryData(code), ...(mode === "explicit" ? { sourceSampleId: sample.id } : {}) };
      const responses = await Promise.all([1, 2].map(() => request.post("/api/sample-records/", { headers: origin, data: payload })));
      expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
      const record = (await responses.find((r) => r.status() === 201)!.json()).data; records.push(record.id);
      expect(record).toMatchObject({ sourceSampleId: sample.id, companyPlannedDate: planned, status: "Бүртгэсэн" });
      expect(await ids(request)).not.toContain(sample.id);
      const original = (await (await request.get(`/api/samples/${sample.id}/`)).json()).data;
      expect(original).toMatchObject({ code, isActive: true, companyPlannedDate: planned, count: 6, track1Count: 1, track2Count: 2, track3Count: 3 });
      const renamed = await request.patch(`/api/sample-records/${record.id}/`, { headers: origin, data: { ...registryData(`${code}-renamed`), version: record.version } });
      expect(renamed.ok(), await renamed.text()).toBeTruthy();
      expect((await renamed.json()).data.sourceSampleId).toBe(sample.id);
      expect(await ids(request)).not.toContain(sample.id);
    }
  } finally { await cleanup(request, samples, records); }
});

test("plan, reload, cancel and register a sample; other browsers remove it live", async ({ page, browser }) => {
  test.setTimeout(120000);
  await login(page.request);
  const code = `TRANSFER-UI-${randomBytes(6).toString("hex")}`, samples: string[] = [], records: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const observer = await browser.newContext({ storageState: await page.context().storageState() });
  try {
    const incoming = await observer.newPage();
    await incoming.goto(`${process.env.TEST_URL || "http://127.0.0.1:3100"}/sample-registry/`);
    await incoming.getByLabel("Дээж хайх").fill(code);
    const incomingRow = incoming.locator(".reg-table tbody tr").filter({ hasText: code });
    await expect(incomingRow).toHaveCount(0);
    await page.goto("/samples/");
    await page.getByRole("button", { name: "Сорьц бүртгэх", exact: true }).click();
    const form = page.getByRole("dialog");
    await form.getByLabel("Сорьцын код").fill(code);
    await form.getByLabel("Төсөл").fill("Transfer UI");
    await form.getByLabel("Бүтээц / авсан байршил").fill("Суурийн хавтан");
    await form.getByLabel("БАРИЛГА АРХИТЕКТУР КОМПАНИ руу явах огноо").fill(planned);
    const creating = page.waitForResponse((r) => r.url().endsWith("/api/samples/") && r.request().method() === "POST");
    await form.getByRole("button", { name: "Сорьц бүртгэх", exact: true }).click();
    const created = await creating;
    expect(created.status(), await created.text()).toBe(201);
    const sample = (await created.json()).data; samples.push(sample.id);
    await expect(form).not.toBeVisible();
    await expect(incomingRow).toHaveCount(1);
    await expect(incomingRow).toContainText("Явахаар товлосон");
    await expect(incomingRow).toContainText(formatDate(planned));
    expect(await ids(page.request)).toContain(sample.id);
    await incoming.reload();
    await incoming.getByLabel("Дээж хайх").fill(code);
    await expect(incomingRow).toContainText("Явахаар товлосон");
    await page.reload();
    await page.getByLabel("Сорьц хайх").fill(code);
    const row = page.locator(".data-table tbody tr").filter({ hasText: code });
    await expect(row).toContainText(formatDate(planned));
    await row.getByRole("button").click();
    await form.getByLabel("Компани руу явах огноо", { exact: true }).fill(dayOffset(TODAY, 9));
    await form.getByRole("button", { name: "Огноо хадгалах" }).click();
    await expect(form.getByRole("link", { name: "Компанийн дээжийн бүртгэлд харах" })).toBeVisible();
    await expect(incomingRow).toContainText(formatDate(dayOffset(TODAY, 9)));
    // Cancelling the plan removes only its preview; restoring the date brings it back.
    const latest = (await (await page.request.get(`/api/samples/${sample.id}/`)).json()).data;
    const cleared = await page.request.patch(`/api/samples/${sample.id}/`, { headers: origin, data: { version: latest.version, data: { companyPlannedDate: null } } });
    expect(cleared.ok()).toBeTruthy();
    await expect(incomingRow).toHaveCount(0);
    expect(await ids(page.request)).toContain(sample.id);
    const restored = await page.request.patch(`/api/samples/${sample.id}/`, { headers: origin, data: { version: (await cleared.json()).data.version, data: { companyPlannedDate: dayOffset(TODAY, 9) } } });
    expect(restored.ok()).toBeTruthy();
    await expect(incomingRow).toContainText(formatDate(dayOffset(TODAY, 9)));
    await expect(form.getByRole("link", { name: "Компанийн дээжийн бүртгэлд харах" })).toBeVisible();
    await form.getByRole("link", { name: "Компанийн дээжийн бүртгэлд харах" }).click();
    const plannedRow = page.locator(".reg-table tbody tr").filter({ hasText: code });
    await expect(plannedRow).toHaveCount(1);
    await expect(plannedRow).toContainText("Явахаар товлосон");
    await page.getByLabel("Төлвөөр шүүх").selectOption("Бүртгэсэн");
    await expect(plannedRow).toHaveCount(0);
    await page.getByLabel("Төлвөөр шүүх").selectOption("Явахаар товлосон");
    await expect(plannedRow).toBeVisible();
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Excel татах" }).click();
    const downloaded = await downloading;
    const xlsx = await readFile((await downloaded.path())!, "utf8");
    expect(xlsx).toContain(code);
    expect(xlsx).toContain("Явахаар товлосон");
    expect(xlsx).toContain(dayOffset(TODAY, 9));
    await page.screenshot({ path: ".verification/planned-registry-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: ".verification/planned-registry-mobile.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await plannedRow.getByRole("button", { name: "Бүртгэл баталгаажуулах" }).click();
    await expect(form.getByLabel("Дээжийн код")).toHaveValue(code);
    await expect(form.getByLabel("Хэмжээ")).toHaveValue("6");
    await expect(form.getByLabel("Төсөл, объект")).toHaveValue("Transfer UI");
    await form.getByRole("button", { name: "Болих", exact: true }).click();
    expect(await ids(page.request)).toContain(sample.id);

    const watching = await observer.newPage();
    await watching.goto(`${process.env.TEST_URL || "http://127.0.0.1:3100"}/samples/`);
    await watching.getByLabel("Сорьц хайх").fill(code);
    const observedRow = watching.locator(".data-table tbody tr").filter({ hasText: code });
    await expect(observedRow).toBeVisible();

    await page.getByRole("button", { name: "Дээж бүртгэх", exact: true }).first().click();
    await form.getByLabel("Дээж, сорьц жагсаалтаас сонгох").selectOption(sample.id);
    await expect(form.getByLabel("Дээжийн код")).toHaveValue(code);
    await expect(form).toContainText(formatDate(dayOffset(TODAY, 9)));
    await form.getByRole("button", { name: "Болих", exact: true }).click();
    await page.goto(`/sample-registry/?sourceSample=${sample.id}`);
    await expect(form.getByLabel("Дээжийн код")).toHaveValue(code);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: ".verification/sample-transfer-mobile.png", fullPage: true });
    const registering = page.waitForResponse((r) => r.url().endsWith("/api/sample-records/") && r.request().method() === "POST");
    await form.getByRole("button", { name: "Дээж бүртгэх", exact: true }).click();
    const response = await registering;
    expect(response.status(), await response.text()).toBe(201);
    const record = (await response.json()).data; records.push(record.id);
    expect(record).toMatchObject({ sourceSampleId: sample.id, companyPlannedDate: dayOffset(TODAY, 9) });
    await expect(page).toHaveURL(new RegExp(`sample-registry/\\?id=${record.id}$`));
    await expect(observedRow).toHaveCount(0);
    await expect(incomingRow).toHaveCount(1);
    await expect(incomingRow).toContainText("Бүртгэсэн");
    await expect(incomingRow).not.toContainText("Явахаар товлосон");
    await expect(incomingRow).toContainText(formatDate(dayOffset(TODAY, 9)));
    await page.goto("/samples/");
    await page.getByLabel("Сорьц хайх").fill(code);
    await expect(row).toHaveCount(0);
    await page.goto(`/sample-registry/?id=${record.id}`);
    await expect(page.getByRole("dialog")).toContainText(code);
    await expect(page.getByRole("dialog")).toContainText(formatDate(dayOffset(TODAY, 9)));
    expect(errors).toEqual([]);
  } finally { await observer.close(); await cleanup(page.request, samples, records); }
});
