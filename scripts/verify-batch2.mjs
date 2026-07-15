import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(BASE + "/login");
await page.fill('input[type="email"]', "owner@spacekrafters.com");
await page.fill('input[type="password"]', "0123456");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/dashboard");

// ---- Insurance ----
await page.goto(BASE + "/insurance");
await page.waitForLoadState("networkidle");
console.log("Insurance form fields before expand:", await page.locator('input[name="name"]').count());
await page.click('button:has-text("+ Add policy")');
console.log("Insurance form fields after expand:", await page.locator('input[name="name"]').count());
await page.fill('input[name="name"]', "Bike Insurance Test");
await page.selectOption('select[name="insurance_type"]', "Bike");
await page.fill('input[name="due_date"]', "2026-12-01");
await page.click('button[type="submit"]:has-text("Add policy")');
await page.waitForTimeout(1000);
console.log("Insurance created:", (await page.locator("text=Bike Insurance Test").count()) > 0);
console.log("Insurance form collapsed after submit:", (await page.locator('input[name="name"]').count()) === 0);

// ---- Utilities ----
await page.goto(BASE + "/utilities");
console.log("Utilities form fields before expand:", await page.locator('input[name="name"]').count());
await page.click('button:has-text("+ Add connection")');
await page.fill('input[name="name"]', "Test Water Connection");
await page.selectOption('select[name="utility_type"]', "Water");
await page.selectOption('select[name="location"]', "Home");
await page.fill('input[name="due_date"]', "2026-12-05");
await page.click('button[type="submit"]:has-text("Add connection")');
await page.waitForTimeout(1000);
console.log("Utility created:", (await page.locator("text=Test Water Connection").count()) > 0);

// ---- Subscriptions: add form + Restart ----
await page.goto(BASE + "/subscriptions");
console.log("Subscriptions form fields before expand:", await page.locator('input[name="name"]').count());
await page.click('button:has-text("+ Add subscription")');
await page.fill('input[name="name"]', "Test Spotify");
await page.fill('input[name="due_date"]', "2026-12-10");
await page.click('button[type="submit"]:has-text("Add subscription")');
await page.waitForTimeout(1000);
console.log("Subscription created:", (await page.locator("text=Test Spotify").count()) > 0);

// Restart the already-cancelled Netflix subscription
const netflixRow = page.locator("tr", { hasText: "Netflix" });
const restartVisible = await netflixRow.locator('input[name="restart_date"]').count();
console.log("Netflix restart control visible:", restartVisible > 0);
await netflixRow.locator('input[name="restart_date"]').fill("2026-08-01");
await netflixRow.locator('button:has-text("Restart")').click();
await page.waitForTimeout(1000);
const netflixStatusAfter = await page.locator("tr", { hasText: "Netflix" }).locator("span.capitalize").first().textContent();
console.log("Netflix status after restart:", netflixStatusAfter);

console.log("Console errors so far:", errors.length ? errors : "none");
await browser.close();
