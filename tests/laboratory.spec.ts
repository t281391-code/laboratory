import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { TODAY } from "../src/lib/utils";
const base = process.env.TEST_URL || "http://127.0.0.1:3100";
async function login(page: Page) {
  await page.goto("/login/");
  await page.getByLabel("Нэвтрэх нэр", {exact:true}).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel("Нууц үг", {exact:true}).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", {name:"Нэвтрэх",exact:true}).click();
  await expect(page.locator(".command-heading h1")).toBeVisible();
  await expect(page.locator(".demo-pill")).toContainText("LIVE");
}
async function post(request: APIRequestContext, path: string, data: object) {
  const response = await request.post(path,{data,headers:{Origin:base}});
  expect(response.ok(),await response.text()).toBeTruthy(); return (await response.json()).data;
}
async function unlock(page: Page) {
  await page.getByLabel("Нууц үг",{exact:true}).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button",{name:"Нээх",exact:true}).click();
  await expect(page.getByRole("button",{name:"Туршилт нэмэх",exact:true})).toBeVisible();
}
test("real MySQL forms, empty dashboard, independent browser synchronization and reconnect", async ({ page, browser }) => {
  test.setTimeout(240000);
  expect(process.env.ADMIN_USERNAME,"Configure the test database and seed administrator before running browser tests").toBeTruthy();
  const errors:string[]=[]; page.on("pageerror",e=>errors.push(e.message));
  await login(page);
  const initial = await page.request.get("/api/samples/");
  if ((await initial.json()).meta.total === 0) {
    await expect(page.locator(".hud-telemetry-row strong")).toHaveText(["—°C","—°C","—мм","—%"]);
    await expect(page.locator(".hud-system-main strong")).toHaveText("0%");
    await page.screenshot({path:".verification/empty-dashboard.png",fullPage:true});
  }
  const context2 = await browser.newContext({baseURL:base});
  const second = await context2.newPage(); second.on("pageerror",e=>errors.push(e.message)); await login(second);
  const suffix = randomBytes(5).toString("hex"), code=`UI-${suffix}`;
  await page.goto("/samples/"); await page.getByRole("button",{name:"Сорьц бүртгэх",exact:true}).click();
  const modal=page.getByRole("dialog");
  await modal.getByLabel("Сорьцын код").fill(code);
  await modal.getByLabel("Төсөл").fill("Browser verification project");
  await modal.getByLabel("Бүтээц / авсан байршил").fill("Browser verification element");
  await modal.getByRole("button",{name:"Сорьц бүртгэх",exact:true}).click();
  await expect(modal).not.toBeVisible();
  await expect(second.locator(".recent-panel")).toContainText(code);
  await page.reload(); await expect(page.locator(".data-table")).toContainText(code);

  await page.goto("/sleepers/"); await second.goto("/sleepers/");
  const firstHour="1-р зам, 1-р мөр, Хэмжилтийн утга";
  await page.getByLabel(firstHour,{exact:true}).fill("44.125"); await page.getByLabel(firstHour,{exact:true}).press("Tab");
  await expect(second.getByLabel(firstHour,{exact:true})).toHaveValue("44.125");
  await page.reload(); await expect(page.getByLabel(firstHour,{exact:true})).toHaveValue("44.125");
  await second.context().setOffline(true);
  await expect(second.locator(".demo-pill")).toContainText("OFFLINE");
  await page.getByLabel(firstHour,{exact:true}).fill("46.875"); await page.getByLabel(firstHour,{exact:true}).press("Tab");
  await expect(page.locator("fieldset")).toBeEnabled();
  await second.context().setOffline(false);
  await expect(second.getByLabel(firstHour,{exact:true})).toHaveValue("46.875");
  await expect(second.locator(".demo-pill")).toContainText("LIVE");

  await page.goto("/secret/"); await second.goto("/secret/"); await unlock(page); await unlock(second);
  await page.getByRole("button",{name:"Туршилт нэмэх",exact:true}).click();
  await expect(second.locator(".product-module-table tbody input")).toHaveCount(7);
  for(const [label,value] of [["Хэддүгээр туршилт","1"],["Тархалт, мм","610.25"],["Бетоны температур, °C","25.125"],["Орчны температур, °C","18.75"],["Агаарын агууламж, %","3.25"],["Цаг","10:15"]]) {
    const field=page.getByLabel(`Туршилт, 1-р мөр, ${label}`,{exact:true}); await field.fill(value); await field.press("Tab"); await expect(page.locator("fieldset")).toBeEnabled(); await expect(second.getByLabel(`Туршилт, 1-р мөр, ${label}`,{exact:true})).toHaveValue(value);
  }
  await page.getByRole("button",{name:"Найрлага",exact:true}).click(); await second.getByRole("button",{name:"Найрлага",exact:true}).click();
  await page.getByRole("button",{name:"Мөр нэмэх",exact:true}).click();
  await expect(second.getByLabel("Найрлага, 1-р мөр, 0–3",{exact:true})).toBeVisible();
  for(const [label,value] of [["0–3","100.125"],["3–8","200.25"],["8–13","300.5"]]) {
    const field=page.getByLabel(`Найрлага, 1-р мөр, ${label}`,{exact:true}); await field.fill(value); await field.press("Tab"); await expect(second.getByLabel(`${label} нийт`,{exact:true})).toHaveText(value);
  }

  await page.goto("/small/"); await second.goto("/small/"); await page.getByRole("button",{name:"Тогоо нэмэх",exact:true}).click();
  const countLabel="Төмөр бетон хоолой, Тогоо №1, 1-р мөр, Дээжийн тоо";
  await expect(second.getByLabel(countLabel,{exact:true})).toBeVisible(); await page.getByLabel(countLabel,{exact:true}).fill("9"); await page.getByLabel(countLabel,{exact:true}).press("Tab"); await expect(second.getByLabel(countLabel,{exact:true})).toHaveValue("9");
  await page.reload(); await expect(page.getByLabel(countLabel,{exact:true})).toHaveValue("9");

  await page.goto("/equipment/"); await page.getByRole("button",{name:"Төхөөрөмж нэмэх",exact:true}).click();
  await page.getByRole("dialog").getByLabel("Төхөөрөмжийн нэр",{exact:true}).fill(`Browser Meter ${suffix}`);
  await page.getByRole("dialog").getByLabel("Төхөөрөмжийн код",{exact:true}).fill(`E-${suffix}`);
  await page.getByRole("dialog").getByRole("button",{name:"Хадгалах",exact:true}).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const equipment=(await (await page.request.get("/api/equipment/")).json()).data.find((e:{serial:string})=>e.serial===`E-${suffix}`);
  await second.goto("/equipment/"); await expect(second.getByRole("heading",{name:`Browser Meter ${suffix}`})).toBeVisible();
  const updated=await page.request.patch(`/api/equipment/${equipment.id}/`,{headers:{Origin:base},data:{version:equipment.version,data:{status:"Бэлэн"}}}); expect(updated.ok()).toBeTruthy();
  await expect(second.locator(".equipment-card").filter({hasText:`Browser Meter ${suffix}`})).toContainText("Бэлэн");
  await post(page.request,`/api/equipment/${equipment.id}/readings/`,{value:"21.75",unit:"°C",measuredAt:new Date().toISOString()});
  await second.goto("/"); await expect(second.locator(".telemetry-card").filter({hasText:`Browser Meter ${suffix}`})).toContainText("21.75");
  await expect(second.locator(".hud-telemetry-row").filter({hasText:"Бетоны температур"})).toContainText("25.125");

  // Complete an existing multi-step form through its real UI.
  await page.goto("/forms/?type=environment");
  await page.getByRole("button",{name:"Үргэлжлүүлэх",exact:true}).click();
  for(const [label,value] of [["Өглөөний цаг","08:30"],["Өглөөний температур","20.25"],["Өглөөний чийг","55"],["Оройн цаг","17:30"],["Оройн температур","21.25"],["Оройн чийг","57"]]) await page.getByLabel(label,{exact:false}).fill(value);
  await page.getByRole("button",{name:"Үргэлжлүүлэх",exact:true}).click(); await page.getByRole("button",{name:"Үр дүн хадгалах",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Үр дүн хянахад бэлэн боллоо."})).toBeVisible();
  await expect(second.locator(".hud-progress-label")).toContainText("Нийт 1");

  // Admin-controlled creation and persistence use the same production UI.
  await page.goto("/admin/users/"); await page.getByRole("button",{name:"Хэрэглэгч нэмэх",exact:true}).click();
  await page.getByRole("dialog").getByLabel("Овог нэр",{exact:true}).fill("Browser User");
  await page.getByRole("dialog").getByLabel("Нэвтрэх нэр",{exact:true}).fill(`browser_${suffix}`);
  await page.getByRole("dialog").getByLabel("Нууц үг",{exact:true}).fill(randomBytes(12).toString("hex"));
  await page.getByRole("dialog").getByRole("button",{name:"Хадгалах",exact:true}).click(); await expect(page.getByRole("dialog")).not.toBeVisible(); await expect(page.locator(".data-table")).toContainText(`browser_${suffix}`);
  for(const route of ["/tests/","/forms/","/reports/","/standards/","/samples/"]) { await page.goto(route); await expect(page.locator(".main-content h1").first()).toBeVisible(); }
  await second.screenshot({path:".verification/connected-dashboard.png",fullPage:true});
  expect(errors).toEqual([]); await context2.close();
});
