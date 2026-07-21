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

console.log("No 'Pinned' section initially:", (await page.locator("text=Pinned").count()) === 0);

// Pin "Investments" (inside Personal Finance group)
const investmentsRow = page.locator("nav a:has-text('Investments')").locator("..");
await investmentsRow.locator('button[aria-label="Pin Investments"]').click();
await page.waitForTimeout(300);

console.log("Pinned section appears:", (await page.locator("text=Pinned").count()) > 0);
console.log("Investments appears twice (pinned + original group):", (await page.locator("nav a:has-text('Investments')").count()) === 2);

// Reload — pin should persist
await page.reload();
await page.waitForLoadState("networkidle");
console.log("Pin persists after reload:", (await page.locator("nav a:has-text('Investments')").count()) === 2);

// Unpin via the Pinned section's button (appears in both places while pinned — expected)
await page.locator('button[aria-label="Unpin Investments"]').first().click();
await page.waitForTimeout(300);
console.log("Pinned section disappears once empty:", (await page.locator("text=Pinned").count()) === 0);
console.log("Investments still in its normal group:", (await page.locator("nav a:has-text('Investments')").count()) === 1);

// Collapsing still works
await page.click('nav button:has-text("Personal Finance")');
await page.waitForTimeout(300);
console.log("Collapsing groups still works:", (await page.locator("nav a:has-text('Investments')").count()) === 0);

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
