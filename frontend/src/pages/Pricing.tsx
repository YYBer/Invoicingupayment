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
  ctaLabel?: string; // optional label override
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
    ctaLabel: "Upgrade with Ton to Smart",
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
    ctaLabel: "Upgrade with Ton to Premium",
  },
];

export default function Pricing() {
  const [currentPlan, setCurrentPlan] = useState<PlanName | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [changing, setChanging] = useState<PlanName | null>(null);

  // 1) On first load, ask backend what the user’s plan is.
  useEffect(() => {
    (async () => {
      try {
        // Expect something like: { plan: "Free" | "Smart" | "Premium" }
        const res = await fetch("/api/billing/subscription", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch subscription");
        const data = await res.json();
        setCurrentPlan((data.plan as PlanName) ?? "Free");
      } catch {
        // Default to Free if unknown
        setCurrentPlan("Free");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2) Derive plan cards with isCurrent flag and CTA label.
  const plans = useMemo(() => {
    return BASE_PLANS.map((p) => {
      const isCurrent = p.name === currentPlan;
      const buttonText = isCurrent ? "Current plan" : p.ctaLabel ?? "Select";
      const buttonVariant =
        isCurrent ? "outline" : p.buttonVariant;

      return { ...p, isCurrent, buttonText, buttonVariant };
    });
  }, [currentPlan]);

  // 3) Handle switching plans
  const handleSelect = async (plan: PlanName) => {
    if (plan === currentPlan) return; // no-op

    try {
      setChanging(plan);

      if (plan === "Free") {
        // Downgrade locally or via backend
        const res = await fetch("/api/billing/downgrade", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "Free" }),
        });
        if (!res.ok) throw new Error("Failed to downgrade");
        // The backend should update the user’s subscription; reflect it locally:
        setCurrentPlan("Free");
        return;
      }

      // For paid plans, create a Stripe Checkout Session on backend and redirect:
      const res = await fetch("/api/billing/checkout-session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }), // "Smart" or "Premium"
      });
      if (!res.ok) throw new Error("Failed to start checkout");
      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl; // off to Stripe
    } catch (e) {
      console.error(e);
      // (Optional) surface a toast/error UI here
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
                  {plan.price && (
                    <p className="mb-2 text-3xl font-bold text-foreground">{plan.price}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <feature.icon className="h-5 w-5 text-primary" />
                      <span className="text-sm text-foreground">{feature.text}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.isCurrent ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                  }`}
                  variant={plan.buttonVariant as any}
                  disabled={plan.isCurrent || changing === plan.name}
                  onClick={() => handleSelect(plan.name)}
                >
                  {changing === plan.name ? "Working…" : plan.buttonText}
                </Button>
              </Card>
            ))}
          </div>
        )}

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Billed monthly via Stripe. Cancel anytime—access continues until the end of the paid term.
          No refunds or credits for partial periods (except where required by law).
        </p>
      </main>
    </div>
  );
}

// import { Button } from "@/components/ui/button";
// import { Card } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Mail, FileText, Edit, Wrench, Users, Download } from "lucide-react";
// import Header from "@/components/Header";

// const Pricing = () => {
//   const plans = [
//     {
//       name: "Free",
//       price: null,
//       description: "Best for trying things out.",
//       features: [
//         { icon: Mail, text: "3 emails/month" },
//         { icon: FileText, text: "5 invoices created/month" },
//         { icon: Edit, text: "5 invoice updates/month" },
//         { icon: Wrench, text: "5 services added/month" },
//         { icon: Users, text: "5 customers added/month" },
//         { icon: Download, text: "1 downloads/month" },
//       ],
//       buttonText: "Start free",
//       buttonVariant: "default" as const,
//     },
//     {
//       name: "Smart",
//       price: "€6/month",
//       description: "For growing teams sending regular invoices.",
//       features: [
//         { icon: Mail, text: "10 emails/month" },
//         { icon: FileText, text: "50 invoices created/month" },
//         { icon: Edit, text: "50 invoice updates/month" },
//         { icon: Wrench, text: "50 services added/month" },
//         { icon: Users, text: "100 customers added/month" },
//         { icon: Download, text: "100 downloads/month" },
//       ],
//       buttonText: "Current plan",
//       buttonVariant: "outline" as const,
//       isCurrent: true,
//     },
//     {
//       name: "Premium",
//       price: "€14/month",
//       description: "For businesses with higher volumes.",
//       features: [
//         { icon: Mail, text: "200 emails/month" },
//         { icon: FileText, text: "300 invoices created/month" },
//         { icon: Edit, text: "300 invoice updates/month" },
//         { icon: Wrench, text: "300 services added/month" },
//         { icon: Users, text: "1000 customers added/month" },
//         { icon: Download, text: "100 downloads/month" },
//       ],
//       buttonText: "Go Premium",
//       buttonVariant: "default" as const,
//     },
//   ];

//   return (
//     <div className="min-h-screen bg-background">
//       <Header />
      
//       <main className="container mx-auto px-4 py-16">
//         <div className="mb-12 text-center">
//           <h1 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">
//             Pricing for Invoicingu
//           </h1>
//           <p className="text-lg text-muted-foreground">
//             Choose the plan that matches your invoicing volume. Clear usage limits per plan.
//           </p>
//         </div>

//         <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
//           {plans.map((plan) => (
//             <Card
//               key={plan.name}
//               className={`relative p-8 ${
//                 plan.isCurrent ? "border-2 border-primary" : ""
//               }`}
//             >
//               {plan.isCurrent && (
//                 <Badge className="absolute right-4 top-4 bg-foreground text-background">
//                   Current plan
//                 </Badge>
//               )}
              
//               <div className="mb-6">
//                 <h3 className="mb-2 text-2xl font-bold text-foreground">{plan.name}</h3>
//                 {plan.price && (
//                   <p className="mb-2 text-3xl font-bold text-foreground">{plan.price}</p>
//                 )}
//                 <p className="text-sm text-muted-foreground">{plan.description}</p>
//               </div>

//               <ul className="mb-8 space-y-3">
//                 {plan.features.map((feature, index) => (
//                   <li key={index} className="flex items-center gap-3">
//                     <feature.icon className="h-5 w-5 text-primary" />
//                     <span className="text-sm text-foreground">{feature.text}</span>
//                   </li>
//                 ))}
//               </ul>

//               <Button
//                 className={`w-full ${
//                   plan.isCurrent
//                     ? "bg-primary text-primary-foreground hover:bg-primary/90"
//                     : ""
//                 }`}
//                 variant={plan.buttonVariant}
//                 disabled={plan.isCurrent}
//               >
//                 {plan.buttonText}
//               </Button>
//             </Card>
//           ))}
//         </div>

//         <p className="mt-12 text-center text-sm text-muted-foreground">
//           Billed monthly via Stripe. Cancel anytime—access continues until the end of the paid 
//           term. No refunds or credits for partial periods (except where required by law).
//         </p>
//       </main>
//     </div>
//   );
// };

// export default Pricing;
