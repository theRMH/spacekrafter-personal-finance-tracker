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

// ---- Settings: new categories/subcategories visible ----
await page.goto(BASE + "/settings");
await page.waitForLoadState("networkidle");
const settingsBody = await page.locator("body").textContent();
console.log("New group 'Home - Religious and Family' visible:", settingsBody.includes("Home - Religious and Family"));
console.log("New subcategory 'Driver Salary' visible:", settingsBody.includes("Driver Salary"));
console.log("New subcategory 'Pet Care' visible:", settingsBody.includes("Pet Care"));

// ---- Settings: delete an unused subcategory works ----
const petCareRow = page.locator("div", { hasText: "Pet Care" }).last();
const deleteBtn = petCareRow.locator('button:has-text("×")');
await deleteBtn.click();
await page.waitForTimeout(800);
const afterDeleteBody = await page.locator("body").textContent();
console.log("Pet Care removed after delete:", !afterDeleteBody.includes("Pet Care"));

// re-add it back so category set stays complete (this was just a delete-works test)
await page.goto(BASE + "/settings");
await page.waitForLoadState("networkidle");
const subCategorySelect = page.locator('form:has(input[name="name"]) select[name="category_id"]');
await subCategorySelect.selectOption({ label: "Home - Health and Personal Care" });
await page.fill('form:has(select[name="category_id"]) input[name="name"]', "Pet Care");
await page.click('button:has-text("Add")');
await page.waitForTimeout(800);

// ---- Settings: delete blocked when subcategory is used ----
// "Groceries and Vegetables" subcategory should have transactions from demo seed data
const groceriesRow = page.locator("div", { hasText: "Groceries and Vegetables" }).first();
const groceriesDeleteBtn = groceriesRow.locator('button:has-text("×")');
const groceriesBtnCount = await groceriesDeleteBtn.count();
console.log("Groceries subcategory delete button present:", groceriesBtnCount > 0);

// ---- Add Entry: usage auto-fills from category default, then respects manual override ----
await page.goto(BASE + "/add-entry");
await page.waitForLoadState("networkidle");
await page.selectOption('select[name="category_id"]', { label: "Office - Overheads" });
await page.waitForTimeout(200);
const usageAfterCategory = await page.locator('select[name="personal_or_office"]').inputValue();
console.log("Usage auto-filled to 'office' after selecting Office category:", usageAfterCategory === "office");

await page.selectOption('select[name="personal_or_office"]', "shared");
await page.selectOption('select[name="category_id"]', { label: "Home - Housing" });
await page.waitForTimeout(200);
const usageAfterManualOverride = await page.locator('select[name="personal_or_office"]').inputValue();
console.log("Manual override to 'shared' preserved after changing category again:", usageAfterManualOverride === "shared");

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
