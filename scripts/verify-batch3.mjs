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

// ---- Investments: verify correct form per tab ----
const tabs = [
  { type: "", addButton: "+ Add investment", shouldHaveDropdown: true },
  { type: "mutual_fund", addButton: "+ Add Mutual Fund", mfFieldsExpected: true },
  { type: "share", addButton: "+ Add Share", shareFieldsExpected: true },
  { type: "fd_rd", addButton: "+ Add Fixed Deposit / RD" },
  { type: "ppf_nps", addButton: "+ Add PPF / NPS" },
  { type: "gold_bond", addButton: "+ Add Gold / Bond" },
  { type: "real_estate", addButton: "+ Add Real Estate" },
  { type: "business_capital", addButton: "+ Add Business Capital" },
  { type: "other", addButton: "+ Add Investment" },
];

for (const t of tabs) {
  const url = t.type ? `${BASE}/investments?type=${t.type}` : `${BASE}/investments`;
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  const btn = page.locator(`button:has-text("${t.addButton}")`).first();
  const btnCount = await btn.count();
  console.log(`[${t.type || "overview"}] Add button "${t.addButton}" found:`, btnCount > 0);
  if (btnCount > 0) {
    await btn.click();
    const hasDropdown = await page.locator('select[name="investment_type"]').count();
    const hasMfFields = await page.locator('input[name="amc"]').count();
    const hasShareFields = await page.locator('input[name="symbol"]').count();
    console.log(`  dropdown=${hasDropdown > 0} mfFields=${hasMfFields > 0} shareFields=${hasShareFields > 0}`);
  }
}

// Create a Mutual Fund via its dedicated tab
await page.goto(BASE + "/investments?type=mutual_fund");
await page.click('button:has-text("+ Add Mutual Fund")');
await page.fill('input[name="name"]', "Test MF Direct");
await page.fill('input[name="invested_amount"]', "10000");
await page.fill('input[name="amc"]', "Test AMC");
await page.click('button[type="submit"]:has-text("Add Mutual Fund")');
await page.waitForTimeout(1500);

// ---- Notification bell ----
await page.goto(BASE + "/dashboard");
await page.waitForLoadState("networkidle");
const bellButton = page.locator('button[aria-label="Notifications"]');
console.log("Bell button visible:", (await bellButton.count()) > 0);
await bellButton.click();
await page.waitForTimeout(300);
const dropdownText = await page.locator("text=Due today").count();
console.log("Bell dropdown opened:", dropdownText > 0);
const bodyText = await page.locator("body").textContent();
console.log("Shows 'Pending approvals' line:", bodyText.includes("Pending approvals"));

// click outside to close
await page.mouse.click(10, 10);
await page.waitForTimeout(300);
const stillOpen = await page.locator("text=Due today").count();
console.log("Bell closed on outside click:", stillOpen === 0);

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
