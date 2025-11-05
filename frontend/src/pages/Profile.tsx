import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/Header";

type PlanName = "Free" | "Smart";
type SubStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "none";

type SubscriptionResponse = {
  plan: PlanName | null;           // "Smart" when paid, else null
  status: SubStatus;               // "active" when billing is good
  current_period_start?: string;   // ISO date if paid
  current_period_end?: string;     // ISO date if paid
};

type UsageRow = { label: string; key: string };
type UsageResponse = Record<string, number>; // e.g. { customers_added: 1, services_added: 0, invoices_created: 11, ... }

const USAGE_ROWS: UsageRow[] = [
  { label: "Add customers", key: "customers_added" },
  { label: "Add services", key: "services_added" },
  { label: "Created invoices", key: "invoices_created" },
  { label: "Update invoices", key: "invoices_updated" },
  { label: "Send invoices", key: "emails_sent" },
  { label: "Downloads (PDF or EXCEL)", key: "downloads" },
];

// Per-plan monthly limits
const LIMITS: Record<PlanName, Record<string, number>> = {
  Free: {
    customers_added: 5,
    services_added: 5,
    invoices_created: 5,
    invoices_updated: 5,
    emails_sent: 3,
    downloads: 1,
  },
  Smart: {
    customers_added: 100,
    services_added: 50,
    invoices_created: 50,
    invoices_updated: 50,
    emails_sent: 10,
    downloads: 100,
  },
};

function formatDateDDMMYYYY(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export default function Profile() {
  const [sub, setSub] = useState<SubscriptionResponse | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  // 1) Fetch subscription + usage
  useEffect(() => {
    (async () => {
      try {
        const [subRes, usageRes] = await Promise.all([
          fetch("/api/billing/subscription", { credentials: "include" }),
          fetch("/api/usage/current", { credentials: "include" }),
        ]);
        const subJson: SubscriptionResponse = subRes.ok
          ? await subRes.json()
          : { plan: null, status: "none" };
        const usageJson: UsageResponse = usageRes.ok ? await usageRes.json() : {};

        setSub(subJson);
        setUsage(usageJson);
      } catch (e) {
        console.error(e);
        setSub({ plan: null, status: "none" });
        setUsage({});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2) Decide plan by rule: only Smart if backend says plan=Smart AND status=active
  const effectivePlan: PlanName = useMemo(() => {
    if (sub?.plan === "Smart" && sub?.status === "active") return "Smart";
    return "Free";
  }, [sub]);

  const limits = LIMITS[effectivePlan];

  const periodText = useMemo(() => {
    const start = formatDateDDMMYYYY(sub?.current_period_start);
    const end = formatDateDDMMYYYY(sub?.current_period_end);
    return start && end ? `${start} – ${end} • Renews on ${end}` : "Free plan (no renewal date)";
  }, [sub]);

  const statusText = useMemo(() => {
    if (effectivePlan === "Free") return "Free";
    // For Smart, reflect exact billing state
    const s = sub?.status ?? "none";
    if (s === "active") return "Active";
    if (s === "past_due") return "Past due";
    if (s === "trialing") return "Trial";
    if (s === "canceled") return "Canceled";
    return s;
  }, [effectivePlan, sub]);

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      if (effectivePlan === "Free") {
        // Free users: start checkout to upgrade to Smart
        const res = await fetch("/api/billing/checkout-session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "Smart" }),
        });
        if (!res.ok) throw new Error("Failed to start checkout");
        const { checkoutUrl } = await res.json();
        window.location.href = checkoutUrl;
      } else {
        // Smart users: open Stripe customer portal
        const res = await fetch("/api/billing/portal-session", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to open portal");
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (e) {
      console.error(e);
      // TODO: show a toast
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <h1 className="mb-8 text-4xl font-bold text-foreground">My Profile</h1>

        <Card className="mb-8 p-8">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Plan:</span>
                  <span className="font-semibold">{effectivePlan}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <span className="font-semibold">{statusText}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Renews on:</span>
                  <span className="font-semibold">
                    {effectivePlan === "Smart"
                      ? formatDateDDMMYYYY(sub?.current_period_end)
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="mb-6 border-t pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">Usage this period</h2>
                  <p className="text-sm text-muted-foreground">
                    {periodText}
                  </p>
                </div>

                <div className="space-y-4">
                  {USAGE_ROWS.map((row) => {
                    const current = usage?.[row.key] ?? 0;
                    const limit = limits[row.key] ?? 0;
                    const pct = limit > 0 ? Math.min(100, (current / limit) * 100) : 0;
                    return (
                      <div key={row.key}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{row.label}</span>
                          <span className="text-sm font-semibold text-foreground">
                            {current} / {limit}
                          </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {effectivePlan === "Free"
                    ? portalLoading ? "Opening checkout…" : "Upgrade to Smart"
                    : portalLoading ? "Opening portal…" : "Manage Subscription"}
                </Button>
              </div>
            </>
          )}
        </Card>

        <Card className="p-8">
          <h2 className="text-xl font-bold text-foreground">Company Logo</h2>
          {/* your uploader here */}
        </Card>
      </main>
    </div>
  );
}
