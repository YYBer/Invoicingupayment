import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import { useTonstakers } from "@/hooks/useTonstakers";
import { toast } from "sonner";
import { Calendar, TrendingUp, Users, Wallet, Clock } from "lucide-react";

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
  plan: PlanName | null;
  status: SubStatus;
  current_period_start?: string;
  current_period_end?: string;
};

type UsageRow = { label: string; key: string };
type UsageResponse = Record<string, number>;

const USAGE_ROWS: UsageRow[] = [
  { label: "Add customers", key: "customers_added" },
  { label: "Add services", key: "services_added" },
  { label: "Created invoices", key: "invoices_created" },
  { label: "Update invoices", key: "invoices_updated" },
  { label: "Send invoices", key: "emails_sent" },
  { label: "Downloads (PDF or EXCEL)", key: "downloads" },
];

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
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatTON(amount: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return "0.00";
  return (num / 1e9).toFixed(2); // Convert from nanotons to TON
}

export default function Profile() {
  // Stripe subscription states
  const [sub, setSub] = useState<SubscriptionResponse | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  // TON staking states
  const tonstakers = useTonstakers();
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [stakeLoading, setStakeLoading] = useState(false);
  const [unstakeLoading, setUnstakeLoading] = useState(false);

  // Fetch subscription + usage
  useEffect(() => {
    (async () => {
      try {
        const [subRes, usageRes] = await Promise.all([
          fetch("/api/billing/subscription", { credentials: "include" }).catch(() => null),
          fetch("/api/usage/current", { credentials: "include" }).catch(() => null),
        ]);

        let subJson: SubscriptionResponse = { plan: null, status: "none" };
        let usageJson: UsageResponse = {};

        // Only parse JSON if we got a valid response
        if (subRes && subRes.ok) {
          const contentType = subRes.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            try {
              subJson = await subRes.json();
            } catch (e) {
              console.warn("Failed to parse subscription response:", e);
            }
          }
        }

        if (usageRes && usageRes.ok) {
          const contentType = usageRes.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            try {
              usageJson = await usageRes.json();
            } catch (e) {
              console.warn("Failed to parse usage response:", e);
            }
          }
        }

        setSub(subJson);
        setUsage(usageJson);
      } catch (e) {
        console.error("Error fetching subscription data:", e);
        setSub({ plan: null, status: "none" });
        setUsage({});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const effectivePlan: PlanName = useMemo(() => {
    if (sub?.plan === "Smart" && sub?.status === "active") return "Smart";
    return "Free";
  }, [sub]);

  const limits = LIMITS[effectivePlan];

  const periodText = useMemo(() => {
    const start = formatDateDDMMYYYY(sub?.current_period_start);
    const end = formatDateDDMMYYYY(sub?.current_period_end);
    return start && end
      ? `${start} – ${end} • Renews on ${end}`
      : "Free plan (no renewal date)";
  }, [sub]);

  const statusText = useMemo(() => {
    if (effectivePlan === "Free") return "Free";
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
      toast.error("Failed to manage subscription");
    } finally {
      setPortalLoading(false);
    }
  };

  // Handle staking
  const handleStake = async () => {
    if (!tonstakers.isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!tonstakers.isInitialized) {
      toast.error("Tonstakers SDK is still initializing. Please wait a moment and try again.");
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setStakeLoading(true);
      const amountInNano = (parseFloat(stakeAmount) * 1e9).toString();
      await tonstakers.stake(amountInNano);
      toast.success("Staking transaction sent successfully!");
      setStakeAmount("");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Staking failed. Please try again.";
      toast.error(message);
    } finally {
      setStakeLoading(false);
    }
  };

  const handleStakeMax = async () => {
    if (!tonstakers.isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!tonstakers.isInitialized) {
      toast.error("Tonstakers SDK is still initializing. Please wait a moment and try again.");
      return;
    }

    try {
      setStakeLoading(true);
      await tonstakers.stakeMax();
      toast.success("Max staking transaction sent successfully!");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Staking failed. Please try again.";
      toast.error(message);
    } finally {
      setStakeLoading(false);
    }
  };

  // Handle unstaking
  const handleUnstake = async (type: "regular" | "instant" | "bestRate") => {
    if (!tonstakers.isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!tonstakers.isInitialized) {
      toast.error("Tonstakers SDK is still initializing. Please wait a moment and try again.");
      return;
    }

    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setUnstakeLoading(true);
      const amountInNano = (parseFloat(unstakeAmount) * 1e9).toString();

      switch (type) {
        case "regular":
          await tonstakers.unstake(amountInNano);
          toast.success(
            "Withdrawal request submitted! Your withdrawal NFT has been generated. Please check 'My Withdrawals' for the estimated payout time.",
            { duration: 5000 }
          );
          break;
        case "instant":
          await tonstakers.unstakeInstant(amountInNano);
          toast.success("Instant withdrawal transaction sent!");
          break;
        case "bestRate":
          await tonstakers.unstakeBestRate(amountInNano);
          toast.success("Best rate withdrawal transaction sent!");
          break;
      }

      setUnstakeAmount("");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Withdrawal failed. Please try again.";
      toast.error(message);
    } finally {
      setUnstakeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <h1 className="mb-8 text-4xl font-bold text-foreground">My Profile</h1>

        {/* Stripe Subscription Card */}
        <Card className="mb-8 p-8">
          <h2 className="mb-6 text-2xl font-bold text-foreground">
            Subscription Plan
          </h2>
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
                  <h3 className="text-xl font-bold text-foreground">
                    Usage this period
                  </h3>
                  <p className="text-sm text-muted-foreground">{periodText}</p>
                </div>

                <div className="space-y-4">
                  {USAGE_ROWS.map((row) => {
                    const current = usage?.[row.key] ?? 0;
                    const limit = limits[row.key] ?? 0;
                    const pct = limit > 0 ? Math.min(100, (current / limit) * 100) : 0;
                    return (
                      <div key={row.key}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            {row.label}
                          </span>
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

              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleManageSubscription}
                disabled={portalLoading}
              >
                {effectivePlan === "Free"
                  ? portalLoading
                    ? "Opening checkout…"
                    : "Upgrade to Smart"
                  : portalLoading
                    ? "Opening portal…"
                    : "Manage Subscription"}
              </Button>
            </>
          )}
        </Card>

        {/* TON Staking Card */}
        <Card className="mb-8 p-8">
          <h2 className="mb-6 text-2xl font-bold text-foreground">
            TON Staking
          </h2>

          {!tonstakers.isConnected ? (
            <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
              <Wallet className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-lg font-medium text-foreground">
                Connect your wallet to start staking
              </p>
              <p className="text-sm text-muted-foreground">
                Click the "Connect Wallet" button in the header to connect your
                TonKeeper wallet
              </p>
            </div>
          ) : !tonstakers.isInitialized ? (
            <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
              <Clock className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
              <p className="mb-4 text-lg font-medium text-foreground">
                Initializing Tonstakers SDK...
              </p>
              <p className="text-sm text-muted-foreground">
                This may take up to 30 seconds. Check browser console for details.
              </p>
              {tonstakers.isLoading && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Please wait while we connect to the staking protocol...
                </p>
              )}
            </div>
          ) : tonstakers.isLoading ? (
            <p className="text-muted-foreground">Loading staking data…</p>
          ) : (
            <Tabs defaultValue="balances" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="balances">Balances</TabsTrigger>
                <TabsTrigger value="staking">Staking</TabsTrigger>
                <TabsTrigger value="withdrawal">Withdrawal</TabsTrigger>
              </TabsList>

              {/* Balances Tab */}
              <TabsContent value="balances" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="p-6">
                    <div className="mb-2 flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">
                        TON Balance
                      </h3>
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      {formatTON(tonstakers.tonBalance)} TON
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Available: {formatTON(tonstakers.availableBalance)} TON
                    </p>
                  </Card>

                  <Card className="p-6">
                    <div className="mb-2 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">
                        Staked Balance (tsTON)
                      </h3>
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      {formatTON(tonstakers.stakedBalance)} tsTON
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      ≈ {(parseFloat(formatTON(tonstakers.stakedBalance)) * tonstakers.rates.tsTONTON).toFixed(2)} TON
                    </p>
                  </Card>
                </div>

                <Card className="p-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">
                    Exchange Rates
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">TON/USD</p>
                      <p className="text-2xl font-bold text-foreground">
                        ${tonstakers.rates.TONUSD.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        tsTON/TON (Current)
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {tonstakers.rates.tsTONTON.toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        tsTON/TON (Projected)
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {tonstakers.rates.tsTONTONProjected.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Staking Tab */}
              <TabsContent value="staking" className="space-y-6">
                {/* Pool Information */}
                <div className="grid gap-6 md:grid-cols-3">
                  <Card className="p-6">
                    <div className="mb-2 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Current APY
                      </h3>
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      {tonstakers.currentApy.toFixed(2)}%
                    </p>
                  </Card>

                  <Card className="p-6">
                    <div className="mb-2 flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Total Value Locked
                      </h3>
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      {formatTON(tonstakers.tvl)} TON
                    </p>
                  </Card>

                  <Card className="p-6">
                    <div className="mb-2 flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Total Stakers
                      </h3>
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      {tonstakers.stakersCount.toLocaleString()}
                    </p>
                  </Card>
                </div>

                {/* Staking Operations */}
                <Card className="p-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">
                    Stake TON
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="stake-amount">Amount (TON)</Label>
                      <Input
                        id="stake-amount"
                        type="number"
                        placeholder="Enter amount to stake"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        min="0"
                        step="0.01"
                      />
                      <p className="mt-1 text-sm text-muted-foreground">
                        Available: {formatTON(tonstakers.availableBalance)} TON
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleStake}
                        disabled={stakeLoading || !stakeAmount || !tonstakers.isInitialized}
                        className="flex-1"
                      >
                        {stakeLoading ? "Processing…" : !tonstakers.isInitialized ? "Initializing..." : "Stake"}
                      </Button>
                      <Button
                        onClick={handleStakeMax}
                        disabled={stakeLoading || !tonstakers.isInitialized}
                        variant="outline"
                      >
                        {!tonstakers.isInitialized ? "Initializing..." : "Stake Max"}
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Round Information */}
                {tonstakers.roundTimestamps && (
                  <Card className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">
                        Current Staking Round
                      </h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Round Start
                        </p>
                        <p className="text-lg font-medium text-foreground">
                          {tonstakers.roundTimestamps.start.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Round End</p>
                        <p className="text-lg font-medium text-foreground">
                          {tonstakers.roundTimestamps.end.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* Withdrawal Tab */}
              <TabsContent value="withdrawal" className="space-y-6">
                {/* Unstaking Operations */}
                <Card className="p-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">
                    Withdraw tsTON
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="unstake-amount">Amount (tsTON)</Label>
                      <Input
                        id="unstake-amount"
                        type="number"
                        placeholder="Enter amount to withdraw"
                        value={unstakeAmount}
                        onChange={(e) => setUnstakeAmount(e.target.value)}
                        min="0"
                        step="0.01"
                      />
                      <p className="mt-1 text-sm text-muted-foreground">
                        Staked: {formatTON(tonstakers.stakedBalance)} tsTON
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Button
                        onClick={() => handleUnstake("regular")}
                        disabled={unstakeLoading || !unstakeAmount || !tonstakers.isInitialized}
                        className="w-full"
                      >
                        {unstakeLoading
                          ? "Processing…"
                          : !tonstakers.isInitialized
                          ? "Initializing..."
                          : "Regular Unstake (Delayed, Best Rate)"}
                      </Button>

                      <Button
                        onClick={() => handleUnstake("instant")}
                        disabled={unstakeLoading || !unstakeAmount || !tonstakers.isInitialized}
                        variant="outline"
                        className="w-full"
                      >
                        {!tonstakers.isInitialized ? "Initializing..." : "Instant Unstake (Uses Liquidity Pool)"}
                      </Button>

                      <Button
                        onClick={() => handleUnstake("bestRate")}
                        disabled={unstakeLoading || !unstakeAmount || !tonstakers.isInitialized}
                        variant="outline"
                        className="w-full"
                      >
                        {!tonstakers.isInitialized ? "Initializing..." : "Best Rate Unstake (Wait Till Round End)"}
                      </Button>

                      <p className="text-sm text-muted-foreground">
                        Available instant liquidity:{" "}
                        {formatTON(tonstakers.instantLiquidity)} TON
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Withdrawal NFTs */}
                <Card className="p-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">
                    My Withdrawals
                  </h3>
                  {tonstakers.withdrawalNFTs.length === 0 ? (
                    <p className="text-center text-muted-foreground">
                      No active withdrawal requests
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {tonstakers.withdrawalNFTs.map((nft, index) => (
                        <Card key={index} className="border p-4">
                          <div className="grid gap-2 md:grid-cols-3">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Amount
                              </p>
                              <p className="text-lg font-semibold text-foreground">
                                {formatTON(nft.amount)} tsTON
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Estimated Payout
                              </p>
                              <p className="text-sm font-medium text-foreground">
                                {nft.estimatedPayoutDate.toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Round Ends
                              </p>
                              <p className="text-sm font-medium text-foreground">
                                {nft.roundEndTime.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            NFT: {nft.address.slice(0, 8)}...
                            {nft.address.slice(-6)}
                          </p>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </Card>

        {/* Company Logo Card */}
        <Card className="p-8">
          <h2 className="text-xl font-bold text-foreground">Company Logo</h2>
          {/* your uploader here */}
        </Card>
      </main>
    </div>
  );
}
