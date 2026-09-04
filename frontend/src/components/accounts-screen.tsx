import * as React from "react";
import { Landmark, Snowflake, CheckCircle2 } from "lucide-react";

import { useApp } from "@/lib/app-context";
import { getAccount, listAccounts, type Account, type AccountDetail } from "@/lib/api";
import { formatCents, titleCase } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AccountsScreen() {
  const { token, refreshKey } = useApp();
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [selected, setSelected] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<AccountDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listAccounts(token)
      .then((rows) => {
        if (cancelled) return;
        setAccounts(rows);
        setSelected((cur) => cur ?? (rows[0]?.id ?? null));
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  React.useEffect(() => {
    if (!token || selected == null) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    getAccount(token, selected)
      .then((d) => !cancelled && setDetail(d))
      .catch(() => !cancelled && setDetail(null));
    return () => {
      cancelled = true;
    };
  }, [token, selected, refreshKey]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Accounts</h2>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="space-y-3">
          {accounts.map((a) => {
            const available = (a.balance_cents ?? 0) - (a.hold_cents ?? 0);
            const active = a.id === selected;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelected(a.id)}
                className={
                  "w-full rounded-lg border p-4 text-left transition-colors " +
                  (active ? "border-ring bg-accent/40" : "border-border hover:bg-accent/20")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Landmark className="size-4 text-muted-foreground" />
                    <span className="font-medium">{a.label}</span>
                    <Badge variant="secondary">{titleCase(a.type)}</Badge>
                  </div>
                  {a.status === "frozen" ? (
                    <Badge variant="destructive">
                      <Snowflake className="size-3" /> Frozen
                    </Badge>
                  ) : (
                    <Badge variant="success">
                      <CheckCircle2 className="size-3" /> Active
                    </Badge>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <Figure label="Balance" value={formatCents(a.balance_cents)} />
                  <Figure label="Held" value={formatCents(a.hold_cents)} />
                  <Figure label="Available" value={formatCents(available)} strong />
                </div>
              </button>
            );
          })}
          {accounts.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">Loading accounts...</p>
          )}
        </div>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Account detail</CardTitle>
        </CardHeader>
        <CardContent>
          {detail ? (
            <dl className="space-y-3 text-sm">
              <Row label="Account">{detail.label}</Row>
              <Row label="Type">{titleCase(detail.type)}</Row>
              <Row label="Status">
                {detail.status === "frozen" ? (
                  <Badge variant="destructive">Frozen</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </Row>
              <Row label="Balance">{formatCents(detail.balance_cents)}</Row>
              <Row label="Held">{formatCents(detail.hold_cents)}</Row>
              <Row label="Available">
                {/* available_cents is a computed stack var, so it infers as unknown. */}
                <span className="font-semibold">{formatCents(Number(detail.available_cents))}</span>
              </Row>
              <p className="pt-2 text-xs text-muted-foreground">
                Available balance is computed by the API as balance minus held funds. The
                servicing rules check the available balance, not the raw balance.
              </p>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Select an account to see its detail.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={strong ? "font-semibold" : ""}>{value}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
