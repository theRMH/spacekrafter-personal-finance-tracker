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

// ---- Calendar: clickable days ----
await page.goto(BASE + "/calendar?year=2026&month=7");
await page.waitForLoadState("networkidle");

// Find a day cell that has at least one item (has a colored dot inside)
const dayButtons = page.locator("button:has(span.rounded-full):visible");
const dayCount = await dayButtons.count();
let clickedDayText = null;
let foundItemDay = false;
for (let i = 0; i < dayCount; i++) {
  const btn = dayButtons.nth(i);
  const dots = await btn.locator("span.rounded-full.shrink-0").count();
  if (dots > 0) {
    clickedDayText = await btn.locator("span.rounded-full:not(.shrink-0)").first().textContent();
    await btn.click();
    foundItemDay = true;
    break;
  }
}
console.log("Found a day with an item and clicked it:", foundItemDay, "day =", clickedDayText);
await page.waitForTimeout(200);
console.log("Agenda switched (Back to agenda visible):", (await page.locator("text=← Back to agenda").count()) > 0);

// Click the first item link in the day list (if any) and confirm navigation
const itemLink = page.locator("a:has-text('Home Electricity')").first();
const itemLinkCount = await itemLink.count();
console.log("Home Electricity item link present in day list:", itemLinkCount > 0);
if (itemLinkCount > 0) {
  await Promise.all([page.waitForURL("**/utilities", { timeout: 15000 }), itemLink.click()]);
  console.log("Navigated to:", page.url());
  console.log("Landed on /utilities:", page.url().includes("/utilities"));
}

// Fresh load, click day 8 again, then click an empty day and confirm empty state
await page.goto(BASE + "/calendar?year=2026&month=7");
await page.waitForLoadState("networkidle");
const allDayButtons = page.locator("button:has(span.rounded-full):visible");
const allCount = await allDayButtons.count();
let emptyClicked = false;
for (let i = 0; i < allCount; i++) {
  const btn = allDayButtons.nth(i);
  const dots = await btn.locator("span.rounded-full.shrink-0").count();
  if (dots === 0) {
    await btn.click();
    emptyClicked = true;
    break;
  }
}
await page.waitForTimeout(200);
console.log("Clicked empty day:", emptyClicked);
console.log("Empty state shown:", (await page.locator("text=Nothing due on this day").count()) > 0);

// Back to agenda
await page.click("text=← Back to agenda");
await page.waitForTimeout(200);
console.log("Back to default agenda (Agenda heading visible):", (await page.locator("h3:has-text('Agenda')").count()) > 0);

// ---- Reports: filters + insights ----
await page.goto(BASE + "/reports?tab=overview");
await page.waitForLoadState("networkidle");
console.log("Overview filter form visible:", (await page.locator('input[name="from"]').count()) > 0);

await page.fill('input[name="from"]', "2026-01-01");
await page.fill('input[name="to"]', "2026-07-15");
await page.click('button:has-text("Apply")');
await page.waitForLoadState("networkidle");
console.log("URL after apply:", page.url());
const overviewBody = await page.locator("body").textContent();
console.log("Overview shows 'vs previous period' delta:", overviewBody.includes("vs previous period") || overviewBody.includes("New"));

await page.goto(BASE + "/reports?tab=spend&from=2026-01-01&to=2026-07-15");
await page.waitForLoadState("networkidle");
const spendBody = await page.locator("body").textContent();
console.log("Spend tab shows 'Highest single expense':", spendBody.includes("Highest single expense"));
console.log("Spend tab shows 'Highest spend day':", spendBody.includes("Highest spend day"));
console.log("Spend tab shows bar chart svg:", (await page.locator("svg rect").count()) > 0);

await page.goto(BASE + "/reports?tab=investments");
await page.waitForLoadState("networkidle");
const invBody = await page.locator("body").textContent();
console.log("Investments tab shows 'Gain / Loss' column:", invBody.includes("Gain / Loss"));

// Confirm Accounts tab (unfiltered) stays unaffected by filters set earlier — no filter form
await page.goto(BASE + "/reports?tab=accounts");
await page.waitForLoadState("networkidle");
console.log("Accounts tab has no date filter form:", (await page.locator('input[name="from"]').count()) === 0);

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
