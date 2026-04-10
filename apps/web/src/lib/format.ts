// Shared currency helpers. UZS only — no shorthand (no "k", no "mln").

// Pulls a clean integer out of any user-entered or stored value:
//   "200,000 UZS" → 200000
//   "200.000 UZS" → 200000
//   "1 200 000"   → 1200000
//   200000        → 200000
//   null/""       → 0
export function parseAverageCheck(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const digits = value.replace(/\D+/g, "");
  return digits ? Number(digits) : 0;
}

// Canonical display: "40,000 UZS" / "1,200,000 UZS".
export function fmtUZS(value: number | string | null | undefined): string {
  const n = typeof value === "number" ? value : parseAverageCheck(value);
  return `${n.toLocaleString("en-US")} UZS`;
}
