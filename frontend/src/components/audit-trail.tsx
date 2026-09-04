import * as React from "react";

import { useApp } from "@/lib/app-context";
import { listAccounts, listAudit, type Account, type AuditRow } from "@/lib/api";
import { formatCents, formatTime, reasonLabel, titleCase } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type KindFilter = "all" | "human" | "agent";

export function AuditTrail() {
  const { token, refreshKey, actorName } = useApp();
  const [rows, setRows] = React.useState<AuditRow[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [kindFilter, setKindFilter] = React.useState<KindFilter>("all");
  const [accountFilter, setAccountFilter] = React.useState<string>("all");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listAccounts(token)
      .then((a) => !cancelled && setAccounts(a))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const filters: { account_id?: number; actor_kind?: "human" | "agent" } = {};
    if (kindFilter !== "all") filters.actor_kind = kindFilter;
    if (accountFilter !== "all") filters.account_id = Number(accountFilter);
    listAudit(token, filters)
      .then((r) => !cancelled && setRows(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey, kindFilter, accountFilter]);

  const refused = rows.filter((r) => r.outcome === "refused").length;

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Audit trail</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length} actions, {refused} refused. Every attempt is logged with the actor kind
              and the rule that fired.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1">
              <Label htmlFor="kind-filter" className="text-xs text-muted-foreground">
                Actor kind
              </Label>
              <Select
                id="kind-filter"
                className="h-8 w-36"
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value as KindFilter)}
              >
                <option value="all">All actors</option>
                <option value="human">Human</option>
                <option value="agent">Agent</option>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="account-filter" className="text-xs text-muted-foreground">
                Account
              </Label>
              <Select
                id="account-filter"
                className="h-8 w-44"
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
              >
                <option value="all">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Actor</th>
                <th className="py-2 pr-4 font-medium">Action</th>
                <th className="py-2 pr-4 font-medium">Requested</th>
                <th className="py-2 pr-4 font-medium">Outcome</th>
                <th className="py-2 pr-4 font-medium">Rule that fired</th>
                <th className="py-2 font-medium">Version</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                    {formatTime(r.created_at)}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={r.actor_kind === "agent" ? "default" : "secondary"}>
                        {titleCase(r.actor_kind)}
                      </Badge>
                      <span className="whitespace-nowrap">{actorName(r.actor_id)}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">{titleCase(r.action)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {formatCents(r.requested_amount_cents)}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge variant={r.outcome === "allowed" ? "success" : "destructive"}>
                      {titleCase(r.outcome)}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">{reasonLabel(r.reason)}</td>
                  <td className="py-2 text-muted-foreground">{r.rule_version}</td>
                </tr>
              ))}
              {rows.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    No actions yet. Run a transfer in the servicing console.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
