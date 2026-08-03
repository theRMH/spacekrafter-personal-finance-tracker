// Detects payment mode from a bank statement narration line. Patterns match
// the prefixes Indian bank statements actually use (confirmed against a real
// statement tested this session): UPI-, IMPS-, NEFT, POS, cheque, ATM/cash
// withdrawal codes, etc. Order matters — more specific patterns first.
export function detectPaymentMode(narration: string): string | null {
  const n = narration.toUpperCase();
  if (n.startsWith("UPI-") || n.includes("UPIINTENT") || n.includes("-UPI")) return "UPI";
  if (n.startsWith("IMPS-") || n.includes("P2AMOB")) return "IMPS";
  if (n.includes("NEFT")) return "NEFT";
  if (n.includes("RTGS")) return "RTGS";
  if (n.startsWith("POS ") || n.startsWith("POS-") || n.includes("ME DC SI")) return "Card";
  if (n.startsWith("ATM") || n.startsWith("NWD-") || n.startsWith("EAW-")) return "ATM / Cash Withdrawal";
  if (n.includes("CASH DEPOSIT")) return "Cash";
  if (n.includes("CHQ") || n.includes("CHEQUE")) return "Cheque";
  if (n.startsWith("FT-") || n.includes("CLEARING CORPORATION")) return "Bank Transfer";
  if (n.includes("FD THROUGH MOBILE") || n.startsWith("IB FD")) return "Internal (FD)";
  return null;
}

export const PAYMENT_MODES = ["UPI", "IMPS", "NEFT", "RTGS", "Card", "Cash", "Cheque", "Bank Transfer", "Internet Banking", "Other"];
