import * as React from "react";
import { ShieldCheck, ShieldX, ArrowRight } from "lucide-react";

import { useApp } from "@/lib/app-context";
import {
  listAccounts,
  transfer,
  placeHold,
  type Account,
  type ServicingResult,
} from "@/lib/api";
import { formatCents, reasonLabel, titleCase } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Kind = "transfer" | "hold";

type OutcomeView = { outcome: string; reason: string; amount_cents: number };

function toView(r: ServicingResult): OutcomeView {
  const o = r as { outcome?: unknown; reason?: unknown; amount_cents?: unknown };
  return {
    outcome: typeof o.outcome === "string" ? o.outcome : "",
    reason: typeof o.reason === "string" ? o.reason : "",
    amount_cents: typeof o.amount_cents === "number" ? o.amount_cents : 0,
  };
}

type LogEntry = OutcomeView & { actorName: string; kind: Kind; label: string };

export function ServicingConsole() {
  const { token, actor, refresh, refreshKey } = useApp();
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [accountId, setAccountId] = React.useState<number | null>(null);
  const [kind, setKind] = React.useState<Kind>("transfer");
  const [amount, setAmount] = React.useState("500.00");
  const [counterparty, setCounterparty] = React.useState("Acme Supplies");
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listAccounts(token)
      .then((rows) => {
        if (cancelled) return;
        setAccounts(rows);
        setAccountId((cur) => cur ?? (rows[0]?.id ?? null));
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  const findByLabel = (label: string) => accounts.find((a) => a.label === label) ?? accounts[0];

  function applyScenario(scenario: "in_limit" | "over_limit" | "insufficient" | "frozen") {
    setKind("transfer");
    if (scenario === "in_limit") {
      setAccountId(findByLabel("Everyday Checking")?.id ?? null);
      setAmount("500.00");
      setCounterparty("Acme Supplies");
    } else if (scenario === "over_limit") {
      setAccountId(findByLabel("Everyday Checking")?.id ?? null);
      setAmount("2000.00");
      setCounterparty("Global Freight Co");
    } else if (scenario === "insufficient") {
      setAccountId(findByLabel("Rainy Day Savings")?.id ?? null);
      setAmount("3000.00");
      setCounterparty("Movers LLC");
    } else {
      setAccountId(findByLabel("Business Checking")?.id ?? null);
      setAmount("100.00");
      setCounterparty("Utility Bill");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || accountId == null) return;
    const cents = Math.round(Number.parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const account = accounts.find((a) => a.id === accountId);
      const result =
        kind === "transfer"
          ? await transfer(token, { account_id: accountId, amount_cents: cents, counterparty })
          : await placeHold(token, { account_id: accountId, amount_cents: cents });
      const view = toView(result);
      setLog((prev) => [
        {
          ...view,
          actorName: actor?.name ?? "",
          kind,
          label: account?.label ?? `Account #${accountId}`,
        },
        ...prev,
      ]);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const limit = actor?.authority_limit_cents ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Servicing console</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Acting as</span>
              <span className="font-medium">{actor?.name}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="flex items-center gap-2">
                <Badge variant={actor?.actor_kind === "agent" ? "default" : "secondary"}>
                  {titleCase(actor?.actor_kind)}
                </Badge>
                {titleCase(actor?.role)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Authority limit</span>
              <span className="font-semibold">{formatCents(limit)}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Switch the actor in the header, then run the same amount again. The rule layer
              treats a person and the agent the same way.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => applyScenario("in_limit")}>
              In-limit
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyScenario("over_limit")}>
              Over limit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyScenario("insufficient")}
            >
              Low balance
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyScenario("frozen")}>
              Frozen account
            </Button>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="account">Account</Label>
              <Select
                id="account"
                value={accountId ?? ""}
                onChange={(e) => setAccountId(Number(e.target.value))}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} ({formatCents(a.balance_cents)})
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="kind">Action</Label>
                <Select id="kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                  <option value="transfer">Transfer</option>
                  <option value="hold">Hold</option>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            {kind === "transfer" && (
              <div className="grid gap-2">
                <Label htmlFor="counterparty">Counterparty</Label>
                <Input
                  id="counterparty"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={busy || !token}>
              {kind === "transfer" ? "Initiate transfer" : "Place hold"}
              <ArrowRight />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decisions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {log.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Run a transfer or hold to see the rule layer decide.
            </p>
          )}
          {log.map((entry, i) => {
            const allowed = entry.outcome === "allowed";
            return (
              <div
                key={i}
                className={
                  "rounded-lg border p-3 " +
                  (allowed ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium">
                    {allowed ? (
                      <ShieldCheck className="size-4 text-emerald-400" />
                    ) : (
                      <ShieldX className="size-4 text-destructive" />
                    )}
                    {allowed ? "Allowed" : "Refused"}
                  </span>
                  <Badge variant={allowed ? "success" : "destructive"}>
                    {reasonLabel(entry.reason)}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {entry.actorName} asked to {entry.kind} {formatCents(entry.amount_cents)} on{" "}
                  {entry.label}.
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
