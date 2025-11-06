// Pricing.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, FileText, Edit, Wrench, Users, Download } from "lucide-react";
import { Address, beginCell } from "@ton/core";
import Header from "@/components/Header";
import {
  useTonConnectUI,
  useTonAddress,
  useTonWallet,
  CHAIN,
  useIsConnectionRestored,
} from "@tonconnect/ui-react";

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

/* -----------------------------
   TON helpers (payload/address)
--------------------------------*/
function normalizeTestnetAddress(addr: string): string {
  const raw = stripTonLink(addr.trim());
  let parsed: Address;
  try {
    parsed = Address.parse(raw); // accepts both raw ("0:<64hex>") and friendly
  } catch (e) {
    console.error("Address.parse failed for:", raw, e);
    throw new Error("Merchant address is not a valid TON address string");
  }
  // Wallet-friendly, URL-safe, testnet user address
  const friendly = parsed.toString({ urlSafe: true, bounceable: false, testOnly: true });
  if (!/^[A-Za-z0-9_-]+$/.test(friendly)) {
    throw new Error("Normalized address contains invalid characters");
  }
  return friendly;
}



// Comment payload -> base64 BOC (browser-safe)
function makeCommentPayload(text: string): string {
  const safeText = text.length > 180 ? text.slice(0, 177) + "..." : text;
  const cell = beginCell().storeUint(0, 32).storeStringTail(safeText).endCell();
  const boc = cell.toBoc({ idx: false });
  // Convert Uint8Array → base64 (browser-friendly)
  let binary = "";
  for (let i = 0; i < boc.length; i++) {
    binary += String.fromCharCode(boc[i]);
  }
  return btoa(binary);
}

// function makeCommentPayload(text: string): string {
//   // Keep comments reasonably short for wallet UIs
//   const safeText = text.length > 180 ? text.slice(0, 177) + "..." : text;
//   const cell = beginCell().storeUint(0, 32).storeStringTail(safeText).endCell();
//   return cell.toBoc({ idx: false }).toString("base64");
// }

// Accepts raw address or ton://transfer/<addr>, returns testnet, non-bounceable, url-safe
function stripTonLink(s: string) {
  const t = s.trim();
  if (t.startsWith("ton://")) {
    try {
      const u = new URL(t);
      const addr = u.pathname.replace(/^\/+/, "");
      return addr || t;
    } catch {
      return t;
    }
  }
  return t;
}

// function normalizeTestnetAddress(addr: string): string {
//   const raw = stripTonLink(addr);
//   const parsed = Address.parse(raw); // throws if invalid
//   // Non-bounceable tends to be friendlier for typical wallets
//   return parsed.toString({ urlSafe: true, bounceable: false, testOnly: true });
// }

// Preflight checks before sendTransaction
function preflightTon({
  walletChain,
  merchantAddr,
  fixedNano,
}: {
  walletChain: string | undefined;
  merchantAddr: string;
  fixedNano: string;
}) {
  if (!merchantAddr) {
    throw new Error("Missing VITE_TON_MERCHANT_ADDRESS_TESTNET");
  }
  if (walletChain !== CHAIN.TESTNET) {
    throw new Error("Wallet is on Mainnet. Switch your wallet to Testnet and try again.");
  }
  if (!/^\d+$/.test(fixedNano)) {
    throw new Error("Invalid FIXED_NANO; must be a string of digits in nanotons.");
  }
}

function ensureEnvAddress(name: string, v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s || s.toLowerCase() === "undefined" || s.toLowerCase() === "null") {
    throw new Error(`${name} is missing or invalid. Put a FULL testnet address in your .env`);
  }
  return s;
}

function isRawAddr(s: string) {
  // raw form: "<workchain>:<64hex>", usually "0:<64hex>" or "-1:<64hex>"
  return /^(?:-?1|0):[0-9a-fA-F]{64}$/.test(s);
}



/* -----------------------------
   MVP TON settings (TESTNET)
--------------------------------*/
// const MERCHANT_TON = import.meta.env
//   .VITE_TON_MERCHANT_ADDRESS_TESTNET as string; // e.g. "kQxxxx..." (full, not shortened)
const MERCHANT_TON_RAW = ensureEnvAddress(
  "VITE_TON_MERCHANT_ADDRESS_TESTNET",
  import.meta.env.VITE_TON_MERCHANT_ADDRESS_TESTNET
);

const FIXED_NANO = "100000000"; // "0.1 TON" in nanotons (string)

const USER_REJECTED = "User rejected the request";

export default function Pricing() {
  const [currentPlan, setCurrentPlan] = useState<PlanName | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<PlanName | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // TonConnect hooks
  const [tonConnectUI] = useTonConnectUI();
  const isRestored = useIsConnectionRestored();
  const wallet = useTonWallet();
  const userAddress = useTonAddress(); // empty if not connected

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/billing/subscription", {
          credentials: "include",
        });
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
    if (plan === currentPlan || changing) return;
    try {
      setChanging(plan);
      setNetworkError(null);

      if (plan === "Free") {
        const r = await fetch("/api/billing/downgrade", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "Free" }),
        });
        if (!r.ok) throw new Error("Failed to downgrade");
        setCurrentPlan("Free");
        return;
      }

      if (!MERCHANT_TON_RAW) throw new Error("Missing VITE_TON_MERCHANT_ADDRESS_TESTNET");

      // Wait for TonConnect state to be restored
      if (!isRestored) {
        setNetworkError("Wallet is still initializing. Please try again in a moment.");
        return;
      }

      // 1) Ask user to connect wallet if not yet connected
      if (!userAddress) {
        await tonConnectUI.openModal(); // user connects here
      }

      // 2) Check that wallet is connected to TESTNET, and inputs are valid
      preflightTon({
        walletChain: wallet?.account?.chain,
        merchantAddr: MERCHANT_TON_RAW,
        fixedNano: FIXED_NANO,
      });

      // 3) Validate & normalize the merchant testnet address
      // const normalizedMerchant = normalizeTestnetAddress(MERCHANT_TON);
      const normalizedMerchant = normalizeTestnetAddress(MERCHANT_TON_RAW);
      console.log("[TON] about to send", {
        chain: wallet?.account?.chain,
        merchant: normalizedMerchant,
        length: normalizedMerchant.length,
        startsWith: normalizedMerchant.slice(0, 2),
      });

      // function normalizeTestnetAddress(addr: string): string {
      //   const raw = stripTonLink(addr);
      //   const parsed = Address.parse(raw); // throws if invalid
      //   // Non-bounceable tends to be friendlier for typical wallets
      //   return parsed.toString({ urlSafe: true, bounceable: false, testOnly: true });
      // }
      

      // 4) Optional comment so you can match payments on the backend
      const comment = `InvoicingU ${plan} | ${userAddress || "unknown"} | ${new Date().toISOString()}`;
      const payloadBase64 = makeCommentPayload(comment);

      // 5) Send 0.1 TON to merchant (testnet)
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes
        messages: [
          {
            address: normalizedMerchant,   // full, testnet-safe format
            amount: FIXED_NANO,            // string in nanotons ("100000000" = 0.1 TON)
            payload: payloadBase64,        // base64 BOC (comment cell)
          },
        ],
      });

      // 6) (Optional) Trust-based unlock for MVP
      const act = await fetch("/api/billing/activate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!act.ok) throw new Error("Failed to activate plan after payment");
      setCurrentPlan(plan);
    } catch (err: any) {
      console.error(err);
      const msg =
        typeof err?.message === "string" ? err.message : "Unknown TON error";
      if (msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("cancel")) {
        setNetworkError(USER_REJECTED);
      } else if (msg.toLowerCase().includes("address")) {
        setNetworkError("Invalid TON address. Re-check VITE_TON_MERCHANT_ADDRESS_TESTNET (full, no '...').");
      } else if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("mainnet")) {
        setNetworkError("Wrong network. Please switch your wallet to Testnet.");
      } else {
        setNetworkError(`TON error: ${msg}`);
      }
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

        {loading || !isRestored ? (
          <p className="text-center text-muted-foreground">Loading…</p>
        ) : (
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative p-8 ${
                  plan.isCurrent ? "border-2 border-primary" : ""
                }`}
              >
                {plan.isCurrent && (
                  <Badge className="absolute right-4 top-4 bg-foreground text-background">
                    Current plan
                  </Badge>
                )}

                <div className="mb-6">
                  <h3 className="mb-2 text-2xl font-bold text-foreground">
                    {plan.name}
                  </h3>
                  {plan.price && (
                    <p className="mb-2 text-3xl font-bold text-foreground">
                      {plan.price}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
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
                  className={`w-full ${
                    plan.isCurrent
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : ""
                  }`}
                  variant={plan.buttonVariant as any}
                  disabled={plan.isCurrent || changing === plan.name}
                  onClick={() => handleSelect(plan.name)}
                >
                  {changing === plan.name
                    ? "Opening wallet..."
                    : plan.buttonText}
                </Button>

                {networkError && (
                  <p className="mt-4 text-center text-sm text-red-600">
                    {networkError}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Paid with TON (Testnet, fixed 0.1 TON). Cancel anytime—access
          continues until the end of the paid term.
        </p>

        {wallet && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Wallet network:{" "}
            {wallet.account.chain === CHAIN.TESTNET
              ? "Testnet ✅"
              : "Mainnet ⚠️"}
          </p>
        )}
      </main>
    </div>
  );
}
