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
await page.waitForURL("**/dashboard", { timeout: 60000 });

function cardFor(page, text) {
  const label = page.getByText(text, { exact: true });
  return label.locator("xpath=ancestor::div[contains(@class,'rounded-card')][1]");
}

// ---- Delete the already-created test account ----
await page.goto(BASE + "/accounts");
await page.waitForLoadState("networkidle");
const testCard = cardFor(page, "Test Delete Account");
console.log("Test account card found:", (await testCard.count()) > 0);
await testCard.locator('button:has-text("Delete")').click();
await page.waitForTimeout(1000);

await page.goto(BASE + "/accounts");
await page.waitForLoadState("networkidle");
console.log("Test account gone from UI after delete:", (await page.locator("text=Test Delete Account").count()) === 0);

// Account WITH transactions should be blocked
const hdfcCard = cardFor(page, "HDFC Personal");
await hdfcCard.locator('button:has-text("Delete")').click();
await page.waitForTimeout(1000);
await page.goto(BASE + "/accounts");
await page.waitForLoadState("networkidle");
console.log("HDFC Personal still exists after blocked delete attempt:", (await page.locator("text=HDFC Personal").count()) > 0);

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
