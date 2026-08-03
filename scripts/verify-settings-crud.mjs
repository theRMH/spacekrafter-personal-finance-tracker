import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE + "/login");
await page.fill('input[type="email"]', "owner@spacekrafters.com");
await page.fill('input[type="password"]', "0123456");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/dashboard", { timeout: 60000 });

await page.goto(BASE + "/settings");
await page.waitForLoadState("networkidle");

const panel = page.locator("section", { has: page.locator("h3", { hasText: "Categories" }) }).first();
await panel.locator('button:has-text("Home - Groceries and Food")').click();
await page.waitForTimeout(300);

// Add a subcategory scoped to this category
await panel.locator('input[name="name"]').first().fill("ZZZ Test Sub");
await panel.locator('button:has-text("Add")').first().click();
await page.waitForTimeout(1000);

await page.goto(BASE + "/settings");
await page.waitForLoadState("networkidle");
const panel2 = page.locator("section", { has: page.locator("h3", { hasText: "Categories" }) }).first();
await panel2.locator('button:has-text("Home - Groceries and Food")').click();
await page.waitForTimeout(300);
console.log("New subcategory added via panel:", (await panel2.locator("text=ZZZ Test Sub").count()) > 0);

// Delete it
const chip = panel2.locator("form", { hasText: "ZZZ Test Sub" });
await chip.locator('button:has-text("×")').click();
await page.waitForTimeout(1000);

await page.goto(BASE + "/settings");
await page.waitForLoadState("networkidle");
const panel3 = page.locator("section", { has: page.locator("h3", { hasText: "Categories" }) }).first();
await panel3.locator('button:has-text("Home - Groceries and Food")').click();
await page.waitForTimeout(300);
console.log("Subcategory removed after delete:", (await panel3.locator("text=ZZZ Test Sub").count()) === 0);

await browser.close();
