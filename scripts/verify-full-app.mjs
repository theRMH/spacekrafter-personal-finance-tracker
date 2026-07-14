import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3000";
const OWNER_EMAIL = "owner@spacekrafters.com";
const OWNER_PASSWORD = "Xx7Aa!F6BzxyYYnELe";
const CSV_PATH = path.join(__dirname, "..", "sample-data", "dummy_statement.csv");

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
page.on("pageerror", (err) => consoleErrors.push(String(err)));

const shot = (name) => page.screenshot({ path: `scripts/.verify-screens/${name}.png`, fullPage: true });

try {
  // Login
  await page.goto(BASE + "/login");
  await page.fill('input[type="email"]', OWNER_EMAIL);
  await page.fill('input[type="password"]', OWNER_PASSWORD);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("OK: login");

  // Second account for transfer testing
  await page.goto(BASE + "/accounts");
  if (!(await page.locator("text=ICICI Office").count())) {
    await page.fill('input[name="name"]', "ICICI Office");
    await page.selectOption('select[name="type"]', "bank");
    await page.selectOption('select[name="personal_or_office"]', "office");
    await page.fill('input[name="opening_balance"]', "200000");
    await page.click('button:has-text("Add account")');
    await page.waitForSelector("text=ICICI Office");
  }
  console.log("OK: ICICI Office account ready");
  await shot("01-accounts");

  // Provisional entry on HDFC Personal (will merge with CSV row 4 - Zoho Corp)
  await page.goto(BASE + "/add-entry");
  await page.fill('input[name="transaction_date"]', "2026-07-04");
  await page.fill('input[name="amount"]', "4899");
  await page.selectOption('select[name="type"]', "expense");
  await page.selectOption('select[name="personal_or_office"]', "office");
  await page.selectOption('select[name="account_id"]', { label: "HDFC Personal" });
  await page.fill('input[name="payee_payer"]', "Zoho Corp");
  await page.click('button:has-text("Save entry")');
  await page.waitForURL("**/transactions");
  console.log("OK: provisional Zoho entry created");

  // Provisional income entry on ICICI Office (will transfer-match with CSV row 8)
  await page.goto(BASE + "/add-entry");
  await page.fill('input[name="transaction_date"]', "2026-07-08");
  await page.fill('input[name="amount"]', "15000");
  await page.selectOption('select[name="type"]', "income");
  await page.selectOption('select[name="personal_or_office"]', "office");
  await page.selectOption('select[name="account_id"]', { label: "ICICI Office" });
  await page.fill('input[name="payee_payer"]', "Internal transfer");
  await page.click('button:has-text("Save entry")');
  await page.waitForURL("**/transactions");
  console.log("OK: provisional ICICI transfer-side entry created");
  await shot("02-transactions-provisional");

  // Commitments: Insurance, Utility, Subscription
  await page.goto(BASE + "/insurance");
  await page.fill('input[name="name"]', "LIC Life Cover");
  await page.selectOption('select[name="insurance_type"]', "Life");
  await page.fill('input[name="expected_amount"]', "8500");
  await page.fill('input[name="due_date"]', "2026-07-10");
  await page.selectOption('select[name="linked_account_id"]', { label: "HDFC Personal" });
  await page.click('button:has-text("Add policy")');
  await page.waitForSelector("text=LIC Life Cover");
  console.log("OK: insurance policy created");

  await page.goto(BASE + "/utilities");
  await page.fill('input[name="name"]', "Home Electricity");
  await page.selectOption('select[name="utility_type"]', "Electricity");
  await page.selectOption('select[name="location"]', "Home");
  await page.fill('input[name="expected_amount"]', "2150");
  await page.fill('input[name="due_date"]', "2026-07-08");
  await page.selectOption('select[name="linked_account_id"]', { label: "HDFC Personal" });
  await page.click('button:has-text("Add connection")');
  await page.waitForSelector("text=Home Electricity");
  console.log("OK: utility connection created");

  await page.goto(BASE + "/subscriptions");
  await page.fill('input[name="name"]', "Netflix");
  await page.fill('input[name="category"]', "Entertainment");
  await page.fill('input[name="expected_amount"]', "649");
  await page.fill('input[name="due_date"]', "2026-07-09");
  await page.selectOption('select[name="linked_account_id"]', { label: "HDFC Personal" });
  await page.click('button:has-text("Add subscription")');
  await page.waitForSelector("text=Netflix");
  console.log("OK: subscription created");
  await shot("03-commitments");

  // Category rules
  await page.goto(BASE + "/settings");
  const addRule = async (keyword, categoryLabel) => {
    await page.fill('input[name="keyword"]', keyword);
    await page.selectOption('form:has(input[name="keyword"]) select[name="category_id"]', { label: categoryLabel });
    await page.click('button:has-text("Add rule")');
    await page.waitForSelector(`td.font-mono:has-text("${keyword}")`);
  };
  await addRule("SALARY", "Income - Salary and Personal");
  await addRule("SWIGGY", "Home - Groceries and Food");
  await addRule("INTEREST", "Income - Salary and Personal");
  console.log("OK: category rules created");
  await shot("04-settings-rules");

  // Import statement
  await page.goto(BASE + "/import");
  await page.selectOption("select", { label: "HDFC Personal" });
  await page.setInputFiles('input[type="file"]', CSV_PATH);
  await page.waitForSelector("text=Column mapping");
  await page.click('button:has-text("Upload and process")');
  await page.waitForSelector("text=Total rows", { timeout: 60000 });
  await shot("05-import-summary");

  const summaryText = await page.textContent("body");
  console.log("Import summary snippet captured.");

  // Transactions: verify needs_review rows present
  await page.goto(BASE + "/transactions?status=needs_review");
  await page.waitForSelector("text=AMAZON RETAIL");
  console.log("OK: Amazon row in needs_review queue");
  await shot("06-transactions-needs-review");

  // Confirm one needs_review row inline
  const row = page.locator("tr", { hasText: "AMAZON RETAIL" });
  await row.locator('select[name="category_id"]').selectOption({ label: "Home - Lifestyle and Entertainment" });
  await row.locator('button:has-text("Confirm")').click();
  await page.waitForTimeout(1000);
  console.log("OK: categorized Amazon row from review queue");

  // Insurance/Utilities/Subscriptions should now show Paid
  await page.goto(BASE + "/insurance");
  await page.waitForSelector("text=paid");
  console.log("OK: insurance commitment auto-marked paid via import match");

  await page.goto(BASE + "/utilities");
  await page.waitForSelector("text=paid");
  console.log("OK: utility commitment auto-marked paid via import match");

  await page.goto(BASE + "/subscriptions");
  await page.waitForSelector("text=paid");
  console.log("OK: subscription commitment auto-marked paid via import match");
  await shot("07-commitments-paid");

  // Investments
  await page.goto(BASE + "/investments");
  await page.selectOption('select[name="investment_type"]', "mutual_fund");
  await page.fill('input[name="name"]', "Axis Bluechip Fund");
  await page.fill('input[name="invested_amount"]', "50000");
  await page.fill('input[name="current_value"]', "54000");
  await page.fill('input[name="valuation_date"]', "2026-07-14");
  await page.fill('input[name="amc"]', "Axis Mutual Fund");
  await page.fill('input[name="scheme_name"]', "Axis Bluechip");
  await page.click('button:has-text("+ Add investment")');
  await page.waitForSelector("text=Axis Bluechip Fund");
  console.log("OK: investment created");
  await shot("08-investments");

  // Plans
  await page.goto(BASE + "/plans");
  await page.fill('input[name="personal_income"]', "130000");
  await page.fill('input[name="home_expense"]', "40000");
  await page.click('button:has-text("Save projections")');
  await page.waitForTimeout(1000);
  console.log("OK: plan projections saved");
  await shot("09-plans");

  // Calendar
  await page.goto(BASE + "/calendar");
  await page.waitForSelector("text=Agenda");
  console.log("OK: calendar renders");
  await shot("10-calendar");

  // Reports (all tabs)
  for (const tab of ["overview", "spend", "counterparty", "accounts", "commitments", "investments", "operations"]) {
    await page.goto(BASE + `/reports?tab=${tab}`);
    await page.waitForSelector("h1:has-text('Reports')");
  }
  console.log("OK: all report tabs render");
  await shot("11-reports");

  // Dashboard final
  await page.goto(BASE + "/dashboard");
  await page.waitForSelector("text=Attention required");
  await shot("12-dashboard-final");
  console.log("OK: dashboard final state");

  // Approvals & Users and Access
  await page.goto(BASE + "/approvals");
  await page.waitForSelector("text=Approvals");
  await page.goto(BASE + "/users-access");
  await page.waitForSelector("text=Invite Accountant");
  console.log("OK: approvals + users-access render");

  console.log("\nConsole errors:", consoleErrors.length ? consoleErrors : "none");
  console.log("\nFULL APP VERIFICATION PASSED");
} catch (err) {
  console.error("VERIFICATION FAILED:", err);
  await shot("FAILURE");
  process.exitCode = 1;
} finally {
  await browser.close();
}
