import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";

test("optional company date stays empty and server errors point to the correct field", async ({ page }) => {
  const login = await page.request.post("/api/auth/login/", {
    headers: { Origin: process.env.TEST_URL || "http://127.0.0.1:3100" },
    data: { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD },
  });
  expect(login.ok()).toBeTruthy();
  await page.goto("/samples/");
  await page.getByRole("button", { name: "Сорьц бүртгэх", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("Сорьцын код").fill(`REGISTER-${randomBytes(5).toString("hex")}`);
  await modal.getByLabel("Төсөл", { exact: false }).fill("тбд");
  await modal.getByLabel("Бүтээц / авсан байршил").fill("1r зам");
  await expect(modal.locator('input[name="companyPlannedDate"]')).toHaveValue("");
  let attempts = 0;
  await page.route("**/api/samples/", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const payload = route.request().postDataJSON();
    expect(payload.data.companyPlannedDate).toBeNull();
    const error = attempts++ === 0
      ? { message: "Талбаруудаа шалгана уу.", fields: [{ path: "project", message: "Төслийн нэрийг шалгана уу." }] }
      : { message: "Хадгалж чадсангүй. Дахин оролдоно уу." };
    await route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ data: null, error }) });
  });
  await modal.getByRole("button", { name: "Сорьц бүртгэх", exact: true }).click();
  await expect(modal.getByLabel("Төсөл", { exact: false }).locator("..")).toContainText("Төслийн нэрийг шалгана уу.");
  await expect(modal.getByLabel("Сорьцын код").locator("..").locator(".field-error")).toHaveCount(0);
  await modal.getByRole("button", { name: "Сорьц бүртгэх", exact: true }).click();
  await expect(modal.getByRole("alert")).toHaveText("Хадгалж чадсангүй. Дахин оролдоно уу.");
  await expect(modal.getByLabel("Сорьцын код").locator("..").locator(".field-error")).toHaveCount(0);
  await page.unroute("**/api/samples/");
  const creating = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/samples/"));
  await modal.getByRole("button", { name: "Сорьц бүртгэх", exact: true }).click();
  const created = await creating;
  expect(created.status(), await created.text()).toBe(201);
  const sample = (await created.json()).data;
  try {
    expect(sample.companyPlannedDate).toBeNull();
    await expect(modal).not.toBeVisible();
  } finally {
    const removed = await page.request.delete(`/api/samples/${sample.id}/`, {
      headers: { Origin: process.env.TEST_URL || "http://127.0.0.1:3100" }, data: { version: sample.version },
    });
    expect(removed.ok()).toBeTruthy();
  }
});
