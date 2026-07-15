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
await page.waitForLoadState("networkidle");

await page.screenshot({ path: "scripts/.verify-screens/chart-before-hover.png" });

// Hover over the last data point in the trend chart (rightmost hit-target rect).
const rects = page.locator("svg rect");
const count = await rects.count();
console.log("hit-target rects found:", count);
await rects.nth(count - 1).hover();
await page.waitForTimeout(200);
const tooltipText = await page.locator("div.bg-navy.text-white").first().textContent();
console.log("Tooltip text on last point:", tooltipText);
await page.screenshot({ path: "scripts/.verify-screens/chart-hover-last.png" });

// Hover over the first point.
await rects.nth(0).hover();
await page.waitForTimeout(200);
const tooltipText2 = await page.locator("div.bg-navy.text-white").first().textContent();
console.log("Tooltip text on first point:", tooltipText2);
await page.screenshot({ path: "scripts/.verify-screens/chart-hover-first.png" });

// Card subtitle text check
const cardSubs = await page.locator(".text-\\[11px\\].text-muted.mt-2").allTextContents();
console.log("Card subtitles:", cardSubs);

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
