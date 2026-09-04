/** Money is stored in cents. Show it as a currency amount. */
export function formatCents(cents: number | null | undefined): string {
  const n = typeof cents === "number" ? cents : 0;
  return (n / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Turn a rule code into a readable label. */
const REASON_LABELS: Record<string, string> = {
  within_authority_and_balance: "Within limits",
  over_authority_limit: "Over authority limit",
  insufficient_available_balance: "Insufficient available balance",
  account_frozen: "Account frozen",
  hold_released: "Hold released",
  could_not_parse_request: "Could not parse request",
};

export function reasonLabel(reason: string | null | undefined): string {
  if (!reason) return "";
  return REASON_LABELS[reason] ?? reason;
}

/** Title-case a role or actor-kind code. */
export function titleCase(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** A short, stable local time for an epoch-ms timestamp. */
export function formatTime(epochMs: number | null | undefined): string {
  if (!epochMs) return "";
  return new Date(epochMs).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
