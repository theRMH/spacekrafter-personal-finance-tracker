import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

// ---- Unauthenticated access is still redirected to /login ----
await page.context().clearCookies();
await page.goto(BASE + "/dashboard");
await page.waitForLoadState("networkidle");
console.log("Unauthenticated /dashboard redirects to /login:", page.url().includes("/login"));

await page.goto(BASE + "/reports");
await page.waitForLoadState("networkidle");
console.log("Unauthenticated /reports redirects to /login:", page.url().includes("/login"));

// ---- Login flow ----
await page.goto(BASE + "/login");
await page.fill('input[type="email"]', "owner@spacekrafters.com");
await page.fill('input[type="password"]', "0123456");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/dashboard");
console.log("Login succeeds and lands on /dashboard:", page.url().includes("/dashboard"));

// ---- Authenticated user hitting /login gets bounced to /dashboard ----
await page.goto(BASE + "/login");
await page.waitForLoadState("networkidle");
console.log("Authenticated /login redirects to /dashboard:", page.url().includes("/dashboard"));

// ---- Identity displays correctly (profile, topbar, users-access) ----
await page.goto(BASE + "/dashboard");
await page.waitForLoadState("networkidle");
const dashBody = await page.locator("body").textContent();
console.log("Dashboard greets by name (contains 'Nirmal'):", dashBody.includes("Nirmal"));

await page.goto(BASE + "/profile");
await page.waitForLoadState("networkidle");
const profileBody = await page.locator("body").textContent();
console.log("Profile shows full name (Nirmal Kumar):", profileBody.includes("Nirmal Kumar"));
console.log("Profile shows email:", profileBody.includes("@"));
const emailInputVal = await page.locator('input[disabled]').inputValue();
console.log("Profile email input populated:", emailInputVal.includes("@"));

await page.goto(BASE + "/users-access");
await page.waitForLoadState("networkidle");
const uaBody = await page.locator("body").textContent();
console.log("Users & Access shows name + email:", uaBody.includes("Nirmal") && uaBody.includes("@"));

// ---- Topbar identity + notification bell still work (regression check) ----
const bellButton = page.locator('button[aria-label="Notifications"]');
console.log("Bell button visible:", (await bellButton.count()) > 0);
console.log("Topbar shows initials/name:", (await page.locator("text=NK").count()) > 0 || (await page.locator("text=Nirmal Kumar").count()) > 0);

// ---- Sign out still works ----
const signOutBtn = page.locator('button:has-text("Sign out")');
console.log("Sign out button visible:", (await signOutBtn.count()) > 0);
await signOutBtn.click();
await page.waitForURL("**/login");
console.log("Sign out redirects to /login:", page.url().includes("/login"));

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
