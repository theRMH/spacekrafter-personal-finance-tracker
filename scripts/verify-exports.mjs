import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto(BASE + "/login");
await page.fill('input[type="email"]', "owner@spacekrafters.com");
await page.fill('input[type="password"]', "0123456");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/dashboard", { timeout: 60000 });

// Grab cookies to make authenticated fetch requests directly (avoids relying on browser download UI).
const cookies = await context.cookies();
const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

async function checkCsv(path, expectHeaderStart) {
  const res = await fetch(BASE + path, { headers: { cookie: cookieHeader } });
  const text = await res.text();
  const firstLine = text.split("\n")[0];
  console.log(`${path} -> status ${res.status}, content-type ${res.headers.get("content-type")}, header: ${firstLine}`);
  console.log(`  header matches expected prefix: ${firstLine.startsWith(expectHeaderStart)}, row count: ${text.split("\n").length - 1}`);
}

await checkCsv("/api/export/investments", "Type,Name,Invested");
await checkCsv("/api/export/insurance", "Name,Usage,Type,Provider");
await checkCsv("/api/export/utilities", "Name,Usage,Type,Provider");
await checkCsv("/api/export/subscriptions", "Name,Usage,Category");
await checkCsv("/api/export/transactions", "Date,Type,Usage");
await checkCsv("/api/export/transactions?usage=office", "Date,Type,Usage");

// Reports export buttons carry filters through
await page.goto(BASE + "/reports?tab=overview&from=2026-07-01&to=2026-07-31&usage=office");
await page.waitForLoadState("networkidle");
const exportHref = await page.locator('a:has-text("Export transactions (CSV)")').getAttribute("href");
console.log("Reports export href reflects filters:", exportHref);
const pdfHref = await page.locator('a:has-text("Download PDF")').getAttribute("href");
console.log("Reports PDF href reflects filters:", pdfHref);

// Print page renders, hides sidebar in print, print button works
await page.goto(BASE + "/reports/print?from=2026-07-01&to=2026-07-31&usage=office");
await page.waitForLoadState("networkidle");
console.log("Print page heading present:", (await page.locator("text=Financial Overview").count()) > 0);
console.log("Sidebar has print:hidden class:", (await page.locator("aside.print\\:hidden").count()) > 0);
console.log("Print button present:", (await page.locator('button:has-text("Print / Save as PDF")').count()) > 0);

// Export buttons present on the 4 target pages
for (const [path, label] of [["/investments", "Export (CSV)"], ["/insurance", "Export (CSV)"], ["/utilities", "Export (CSV)"], ["/subscriptions", "Export (CSV)"]]) {
  await page.goto(BASE + path);
  await page.waitForLoadState("networkidle");
  console.log(`${path} has export link:`, (await page.locator(`a:has-text("${label}")`).count()) > 0);
}

await browser.close();
