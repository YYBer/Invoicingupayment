// Pricing.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, FileText, Edit, Wrench, Users, Download } from "lucide-react";
import Header from "@/components/Header";

type PlanName = "Free" | "Smart" | "Premium";

type BasePlan = {
  name: PlanName;
  price: string | null;
  description: string;
  features: { icon: any; text: string }[];
  buttonVariant: "default" | "outline";
  ctaLabel?: string;
};

const BASE_PLANS: BasePlan[] = [
  {
    name: "Free",
    price: null,
    description: "Best for trying things out.",
    features: [
      { icon: Mail, text: "3 emails/month" },
      { icon: FileText, text: "5 invoices created/month" },
      { icon: Edit, text: "5 invoice updates/month" },
      { icon: Wrench, text: "5 services added/month" },
      { icon: Users, text: "5 customers added/month" },
      { icon: Download, text: "1 downloads/month" },
    ],
    buttonVariant: "default",
    ctaLabel: "Start free",
  },
  {
    name: "Smart",
    price: "€6/month",
    description: "For growing teams sending regular invoices.",
    features: [
      { icon: Mail, text: "10 emails/month" },
      { icon: FileText, text: "50 invoices created/month" },
      { icon: Edit, text: "50 invoice updates/month" },
      { icon: Wrench, text: "50 services added/month" },
      { icon: Users, text: "100 customers added/month" },
      { icon: Download, text: "100 downloads/month" },
    ],
    buttonVariant: "default",
    ctaLabel: "Upgrade with TON to Smart",
  },
  {
    name: "Premium",
    price: "€14/month",
    description: "For businesses with higher volumes.",
    features: [
      { icon: Mail, text: "200 emails/month" },
      { icon: FileText, text: "300 invoices created/month" },
      { icon: Edit, text: "300 invoice updates/month" },
      { icon: Wrench, text: "300 services added/month" },
      { icon: Users, text: "1000 customers added/month" },
      { icon: Download, text: "100 downloads/month" },
    ],
    buttonVariant: "default",
    ctaLabel: "Upgrade with TON to Premium",
  },
];

// === MVP TON settings (0.1 TON fixed) ===
const MERCHANT_TON = import.meta.env.VITE_TON_MERCHANT_ADDRESS as string; // "UQxxxxxxxx..."
const FIXED_NANO = 100_000_000n; // 0.1 TON

function makeTonDeeplink(address: string, nano: bigint, memo: string) {
  return `ton://transfer/${address}?amount=${nano.toString()}&text=${encodeURIComponent(memo)}`;
}

export default function Pricing() {
  const [currentPlan, setCurrentPlan] = useState<PlanName | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<PlanName | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/billing/subscription", { credentials: "include" });
        const data = res.ok ? await res.json() : {};
        setCurrentPlan((data.plan as PlanName) ?? "Free");
      } catch {
        setCurrentPlan("Free");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const plans = useMemo(() => {
    return BASE_PLANS.map((p) => {
      const isCurrent = p.name === currentPlan;
      const buttonText = isCurrent ? "Current plan" : p.ctaLabel ?? "Select";
      const buttonVariant = isCurrent ? "outline" : p.buttonVariant;
      return { ...p, isCurrent, buttonText, buttonVariant };
    });
  }, [currentPlan]);

  const handleSelect = async (plan: PlanName) => {
    if (plan === currentPlan) return;

    try {
      setChanging(plan);

      if (plan === "Free") {
        const res = await fetch("/api/billing/downgrade", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "Free" }),
        });
        if (!res.ok) throw new Error("Failed to downgrade");
        setCurrentPlan("Free");
        return;
      }

      // === MVP TON FLOW: always 0.1 TON ===
      if (!MERCHANT_TON) throw new Error("Missing VITE_TON_MERCHANT_ADDRESS");
      const memo = `INV-${(crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2)}-${plan}`;
      const tonUrl = makeTonDeeplink(MERCHANT_TON, FIXED_NANO, memo);

      sessionStorage.setItem("tonMemo", memo);
      sessionStorage.setItem("tonPlan", plan);

      // Redirect to the TON wallet (extension/app should handle ton://)
      window.location.href = tonUrl;

      // (Optional MVP): provide a manual “I’ve paid” path later that calls /api/billing/activate
    } catch (e) {
      console.error(e);
      // TODO: show toast
    } finally {
      setChanging(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">
            Pricing for Invoicingu
          </h1>
          <p className="text-lg text-muted-foreground">
            Choose the plan that matches your invoicing volume. Clear usage limits per plan.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading your plan…</p>
        ) : (
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative p-8 ${plan.isCurrent ? "border-2 border-primary" : ""}`}
              >
                {plan.isCurrent && (
                  <Badge className="absolute right-4 top-4 bg-foreground text-background">
                    Current plan
                  </Badge>
                )}

                <div className="mb-6">
                  <h3 className="mb-2 text-2xl font-bold text-foreground">{plan.name}</h3>
                  {plan.price && <p className="mb-2 text-3xl font-bold text-foreground">{plan.price}</p>}
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <f.icon className="h-5 w-5 text-primary" />
                      <span className="text-sm text-foreground">{f.text}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${plan.isCurrent ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                  variant={plan.buttonVariant as any}
                  disabled={plan.isCurrent || changing === plan.name}
                  onClick={() => handleSelect(plan.name)}
                >
                  {changing === plan.name ? "Opening TON wallet…" : plan.buttonText}
                </Button>
              </Card>
            ))}
          </div>
        )}

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Paid with TON (MVP fixed 0.1 TON). Cancel anytime—access continues until the end of the paid term.
        </p>
      </main>
    </div>
  );
}
