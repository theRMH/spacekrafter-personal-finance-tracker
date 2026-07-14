import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const PAGES = [
  "/dashboard", "/transactions", "/accounts", "/import", "/add-entry",
  "/insurance", "/utilities", "/subscriptions", "/investments", "/plans",
  "/calendar", "/approvals", "/reports", "/users-access", "/settings", "/profile",
];

const browser = await chromium.launch();
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
const consoleErrors = [];
mobile.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
mobile.on("pageerror", (err) => consoleErrors.push(String(err)));

// Login page (mobile) — no horizontal overflow check exemption.
await mobile.goto(BASE + "/login");
await mobile.screenshot({ path: "scripts/.verify-screens/mobile-login.png" });
let overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log(`/login overflow: ${overflow}px`);

await mobile.fill('input[type="email"]', "owner@spacekrafters.com");
await mobile.fill('input[type="password"]', "0123456");
await mobile.click('button:has-text("Sign in")');
await mobile.waitForURL("**/dashboard", { timeout: 15000 });

const overflowResults = [];
for (const path of PAGES) {
  await mobile.goto(BASE + path);
  await mobile.waitForLoadState("networkidle");
  const ov = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  overflowResults.push({ path, overflow: ov });
  await mobile.screenshot({ path: `scripts/.verify-screens/mobile${path.replace(/\//g, "-")}.png` });
}

console.log("\nHorizontal overflow per page (should be 0 or near 0):");
for (const r of overflowResults) console.log(`  ${r.path}: ${r.overflow}px`);

// Hamburger drawer test on dashboard
await mobile.goto(BASE + "/dashboard");
await mobile.click('button[aria-label="Toggle menu"]');
await mobile.waitForTimeout(300);
await mobile.screenshot({ path: "scripts/.verify-screens/mobile-drawer-open.png" });
const navVisible = await mobile.isVisible("text=Transactions");
console.log(`\nDrawer opened, nav item visible: ${navVisible}`);

await mobile.click('a:has-text("Transactions")');
await mobile.waitForURL("**/transactions");
await mobile.waitForTimeout(300);
const drawerClosedAfterNav = !(await mobile.isVisible('div[aria-hidden="true"]'));
console.log(`Drawer closed after navigating: ${drawerClosedAfterNav}`);

console.log("\nConsole errors:", consoleErrors.length ? consoleErrors : "none");

// Desktop re-check
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desktop.goto(BASE + "/login");
await desktop.fill('input[type="email"]', "owner@spacekrafters.com");
await desktop.fill('input[type="password"]', "0123456");
await desktop.click('button:has-text("Sign in")');
await desktop.waitForURL("**/dashboard", { timeout: 15000 });
await desktop.screenshot({ path: "scripts/.verify-screens/desktop-recheck-dashboard.png" });
console.log("\nDesktop re-check screenshot saved.");

await browser.close();
