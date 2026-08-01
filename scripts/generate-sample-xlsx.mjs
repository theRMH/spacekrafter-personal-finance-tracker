import * as XLSX from "xlsx";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public");
const outFile = path.join(outDir, "sample_statement.xlsx");

const rows = [
  { Date: "2024-07-01", Narration: "SALARY CREDIT - EMPLOYER LTD",      Debit: "",        Credit: "85000.00", Reference: "SAL202407",    Category: "Income",        Subcategory: "Salary" },
  { Date: "2024-07-02", Narration: "SWIGGY ORDER PAYMENT UPI",           Debit: "450.00",  Credit: "",         Reference: "UPI240702001", Category: "Food & Dining", Subcategory: "Food Delivery" },
  { Date: "2024-07-03", Narration: "AMAZON PAY PURCHASE",                Debit: "1299.00", Credit: "",         Reference: "AMZ240703A",   Category: "Shopping",      Subcategory: "" },
  { Date: "2024-07-05", Narration: "BESCOM ELECTRICITY BILL PAYMENT",    Debit: "2340.00", Credit: "",         Reference: "BESCOM07245",  Category: "Utilities",     Subcategory: "Electricity" },
  { Date: "2024-07-07", Narration: "LIC PREMIUM AUTO-DEBIT",             Debit: "4500.00", Credit: "",         Reference: "LIC000198372", Category: "Insurance",     Subcategory: "Life Insurance" },
  { Date: "2024-07-10", Narration: "NETFLIX SUBSCRIPTION RENEWAL",       Debit: "649.00",  Credit: "",         Reference: "NFLX240710",   Category: "Subscriptions", Subcategory: "Streaming" },
  { Date: "2024-07-12", Narration: "TRANSFER TO SAVINGS A/C XX4521",     Debit: "20000.00",Credit: "",         Reference: "IMPS240712001",Category: "",              Subcategory: "" },
  { Date: "2024-07-15", Narration: "ZOMATO FOOD ORDER UPI",              Debit: "380.00",  Credit: "",         Reference: "UPI240715009", Category: "Food & Dining", Subcategory: "Food Delivery" },
  { Date: "2024-07-20", Narration: "FREELANCE PAYMENT RECEIVED",         Debit: "",        Credit: "12000.00", Reference: "NEFT240720B",  Category: "Income",        Subcategory: "Freelance" },
  { Date: "2024-07-31", Narration: "SAVINGS INTEREST CREDIT",            Debit: "",        Credit: "312.50",   Reference: "INT202407",    Category: "Income",        Subcategory: "Interest" },
];

const headers = ["Date", "Narration", "Debit", "Credit", "Reference", "Category", "Subcategory"];
const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

// Bold the header row
const range = XLSX.utils.decode_range(ws["!ref"]);
for (let col = range.s.c; col <= range.e.c; col++) {
  const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
  if (!ws[cellAddr]) continue;
  ws[cellAddr].s = { font: { bold: true } };
}

// Set column widths
ws["!cols"] = [{ wch: 14 }, { wch: 42 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Bank Statement");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
XLSX.writeFile(wb, outFile);
console.log("Generated:", outFile);
