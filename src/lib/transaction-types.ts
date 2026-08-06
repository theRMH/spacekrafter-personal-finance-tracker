// Home (personal) entries only ever need Income/Expense. Office entries can
// also record the cash movements that don't fit either bucket cleanly:
// advances, transfers between accounts, loans, and money moved into an
// investment.
export const HOME_TYPES = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

export const OFFICE_TYPES = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "advance_received", label: "Advance Received" },
  { value: "advance_paid", label: "Advance Paid" },
  { value: "transfer", label: "Transfer" },
  { value: "loan_received", label: "Loan Received" },
  { value: "loan_paid", label: "Loan Paid" },
  { value: "investment", label: "Investment" },
];

export const ALL_TYPES = [...HOME_TYPES, ...OFFICE_TYPES.slice(2)];

export const TYPE_LABELS: Record<string, string> = Object.fromEntries(ALL_TYPES.map((t) => [t.value, t.label]));

// Whether a type is a real cash inflow to the account, vs. an outflow.
// "Income"/"Expense" are kept strict elsewhere (Dashboard/Reports KPIs) so
// advances/loans/transfers/investments don't dilute those accounting
// figures — but the actual bank balance has to reflect every rupee that
// really moved, regardless of which accounting bucket it's tagged with.
const INFLOW_TYPES = new Set(["income", "advance_received", "loan_received"]);

export function isInflow(type: string) {
  return INFLOW_TYPES.has(type);
}

export function typesForUsage(usage: string) {
  return usage === "office" ? OFFICE_TYPES : HOME_TYPES;
}
