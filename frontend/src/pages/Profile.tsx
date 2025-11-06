import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
// import { useTonstakers } from "@/hooks/useTonstakers"; // REMOVED
import { toast } from "sonner";
import { TrendingUp, Users, Wallet, Clock } from "lucide-react";

// --- MOCK DATA/TYPES FOR STANING (REPLACING TONSTAKERS SDK) ---

// Mock data structure for Tonstakers rates/balances
const MOCK_TONSTAKERS_DATA = {
  isConnected: true,
  isInitialized: true,
  isLoading: false,

  // Mock Balances (in nanoton)
  tonBalance: "100500000000",
  availableBalance: "99000000000",
  stakedBalance: "50000000000",
  instantLiquidity: "5000000000000", // 5000 TON

  // Mock Rates/Stats
  rates: {
    TONUSD: 2.5,
    tsTONTON: 1.061,
    tsTONTONProjected: 1.0615,
  },
  currentApy: 5.25,
  tvl: "12345678900000000", // 12,345,678.9 TON
  stakersCount: 9876,

  // Mock Withdrawal NFTs
  withdrawalNFTs: [
    {
      amount: "1000000000", // 1 tsTON
      estimatedPayoutDate: new Date(Date.now() + 86400000 * 7), // 7 days from now
      roundEndTime: new Date(Date.now() + 86400000 * 5), // 5 days from now
      address: "EQCD39VS5bxFasf-F90qj_N9lT1w0wI7y6j0Q1H7BvJ9GvWl",
    },
    {
      amount: "5000000000", // 5 tsTON
      estimatedPayoutDate: new Date(Date.now() + 86400000 * 14), // 14 days from now
      roundEndTime: new Date(Date.now() + 86400000 * 12), // 12 days from now
      address: "EQASJ6qD-I8T9G-T0b8D-k7sA2J-S0i1Y5X1z4L3h2E1c0B",
    },
  ],
};

// Mock functions to prevent runtime errors
const mockStake = async (amount: string) => { console.log("MOCK: Staking", amount); await new Promise(resolve => setTimeout(resolve, 1000)); };
const mockStakeMax = async () => { console.log("MOCK: Staking Max"); await new Promise(resolve => setTimeout(resolve, 1000)); };
const mockUnstake = async (amount: string) => { console.log("MOCK: Regular Unstake", amount); await new Promise(resolve => setTimeout(resolve, 1000)); };
const mockUnstakeInstant = async (amount: string) => { console.log("MOCK: Instant Unstake", amount); await new Promise(resolve => setTimeout(resolve, 1000)); };
const mockUnstakeBestRate = async (amount: string) => { console.log("MOCK: Best Rate Unstake", amount); await new Promise(resolve => setTimeout(resolve, 1000)); };

const mockTonstakers = {
    ...MOCK_TONSTAKERS_DATA,
    stake: mockStake,
    stakeMax: mockStakeMax,
    unstake: mockUnstake,
    unstakeInstant: mockUnstakeInstant,
    unstakeBestRate: mockUnstakeBestRate,
};
// --- END MOCK DATA ---

type PlanName = "Free" | "Smart";
type SubStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "incomplete_expired" | "unpaid" | "none";

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
  return (num / 1e9).toFixed(2);
}

export default function Profile() {
  const [sub, setSub] = useState<SubscriptionResponse | null>({ plan: "Free", status: "none", current_period_start: new Date().toISOString(), current_period_end: new Date(Date.now() + 86400000 * 30).toISOString() }); // MOCK: Default to Free plan
  const [usage, setUsage] = useState<UsageResponse | null>({
    customers_added: 3,
    services_added: 1,
    invoices_created: 2,
    invoices_updated: 4,
    emails_sent: 1,
    downloads: 0,
  }); // MOCK: Mock usage data
  const [loading, setLoading] = useState(false); // MOCK: Set to false to show UI immediately
  const [portalLoading, setPortalLoading] = useState(false);

  // const tonstakers = useTonstakers(); // REMOVED
  const tonstakers = mockTonstakers; // MOCK: Use mock data

  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [stakeLoading, setStakeLoading] = useState(false);
  const [unstakeLoading, setUnstakeLoading] = useState(false);

  useEffect(() => {
    // Retain API calls but set loading to false in finally block to ensure UI shows
    // The state is pre-mocked above, so this block primarily simulates the *end* of loading.
    (async () => {
      try {
        const [subRes, usageRes] = await Promise.all([
          fetch("/api/billing/subscription", { credentials: "include" }).catch(() => null),
          fetch("/api/usage/current", { credentials: "include" }).catch(() => null),
        ]);

        let subJson: SubscriptionResponse = { plan: null, status: "none" };
        let usageJson: UsageResponse = {};

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

        // Only update if fetch was successful, otherwise rely on mock/initial state
        if(subJson.plan) setSub(subJson);
        if(Object.keys(usageJson).length > 0) setUsage(usageJson);
      } catch (e) {
        console.error("Error fetching subscription data:", e);
      } finally {
        setLoading(false); // Ensure loading is false to render UI
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
    return start && end ? `${start} – ${end} • Renews on ${end}` : "Free plan (no renewal date)";
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
        // MOCK: Replace fetch with toast for demonstration
        toast.info("MOCK: Redirecting to Smart plan checkout...");
        // const res = await fetch("/api/billing/checkout-session", { ... });
        // const { checkoutUrl } = await res.json();
        // window.location.href = checkoutUrl;
      } else {
        // MOCK: Replace fetch with toast for demonstration
        toast.info("MOCK: Redirecting to Stripe Customer Portal...");
        // const res = await fetch("/api/billing/portal-session", { ... });
        // const { url } = await res.json();
        // window.location.href = url;
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to manage subscription");
    } finally {
      setPortalLoading(false);
    }
  };

  // --- STAKING HANDLERS (UPDATED TO USE MOCK) ---
  const handleStake = async () => {
    // Removed connection/initialization checks
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setStakeLoading(true);
      const amountInNano = (parseFloat(stakeAmount) * 1e9).toString();
      await tonstakers.stake(amountInNano);
      toast.success("MOCK: Staking transaction sent!");
      setStakeAmount("");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Staking failed";
      toast.error(message);
    } finally {
      setStakeLoading(false);
    }
  };

  const handleStakeMax = async () => {
    // Removed connection/initialization checks
    try {
      setStakeLoading(true);
      await tonstakers.stakeMax();
      toast.success("MOCK: Max staking transaction sent!");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Staking failed";
      toast.error(message);
    } finally {
      setStakeLoading(false);
    }
  };

  const handleUnstake = async (type: "regular" | "instant" | "bestRate") => {
    // Removed connection/initialization checks
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
          toast.success("MOCK: Withdrawal request submitted!", { duration: 5000 });
          break;
        case "instant":
          await tonstakers.unstakeInstant(amountInNano);
          toast.success("MOCK: Instant withdrawal sent!");
          break;
        case "bestRate":
          await tonstakers.unstakeBestRate(amountInNano);
          toast.success("MOCK: Best rate withdrawal sent!");
          break;
      }

      setUnstakeAmount("");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Withdrawal failed";
      toast.error(message);
    } finally {
      setUnstakeLoading(false);
    }
  };
  // --- END STAKING HANDLERS ---

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <h1 className="mb-8 text-4xl font-bold text-foreground">My Profile</h1>

        {/* Subscription Plan Card */}
        <Card className="mb-8 p-8">
          <h2 className="mb-6 text-2xl font-bold text-foreground">Subscription Plan</h2>
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
                    {effectivePlan === "Smart" ? formatDateDDMMYYYY(sub?.current_period_end) : "—"}
                  </span>
                </div>
              </div>

              <div className="mb-6 border-t pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-foreground">Usage this period</h3>
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

              <Button className="bg-primary hover:bg-primary/90" onClick={handleManageSubscription} disabled={portalLoading}>
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

        {/* TON Staking Card - Simplified to render immediately */}
        <Card className="mb-8 p-8">
          <h2 className="mb-6 text-2xl font-bold text-foreground">TON Staking (Testnet)</h2>

          {/* This Tabs component is now rendered unconditionally, simulating connected/initialized state */}
          <Tabs defaultValue="balances" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="balances">Balances</TabsTrigger>
              <TabsTrigger value="staking">Staking</TabsTrigger>
              <TabsTrigger value="withdrawal">Withdrawal</TabsTrigger>
            </TabsList>

            <TabsContent value="balances" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">TON Balance</h3>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{formatTON(tonstakers.tonBalance)} TON</p>
                  <p className="mt-2 text-sm text-muted-foreground">Available: {formatTON(tonstakers.availableBalance)} TON</p>
                </Card>

                <Card className="p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Staked Balance (tsTON)</h3>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{formatTON(tonstakers.stakedBalance)} tsTON</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    ≈ {(parseFloat(formatTON(tonstakers.stakedBalance)) * tonstakers.rates.tsTONTON).toFixed(2)} TON
                  </p>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-foreground">Exchange Rates</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">TON/USD</p>
                    <p className="text-2xl font-bold text-foreground">${tonstakers.rates.TONUSD.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">tsTON/TON (Current)</p>
                    <p className="text-2xl font-bold text-foreground">{tonstakers.rates.tsTONTON.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">tsTON/TON (Projected)</p>
                    <p className="text-2xl font-bold text-foreground">{tonstakers.rates.tsTONTONProjected.toFixed(6)}</p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="staking" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-medium text-muted-foreground">Current APY</h3>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{tonstakers.currentApy.toFixed(2)}%</p>
                </Card>

                <Card className="p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-medium text-muted-foreground">Total Value Locked</h3>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{formatTON(tonstakers.tvl)} TON</p>
                </Card>

                <Card className="p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-medium text-muted-foreground">Total Stakers</h3>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{tonstakers.stakersCount.toLocaleString()}</p>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-foreground">Stake TON</h3>
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
                    <p className="mt-1 text-sm text-muted-foreground">Available: {formatTON(tonstakers.availableBalance)} TON</p>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleStake} disabled={stakeLoading || !stakeAmount} className="flex-1">
                      {stakeLoading ? "Processing…" : "Stake"}
                    </Button>
                    <Button onClick={handleStakeMax} disabled={stakeLoading} variant="outline">
                      Stake Max
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="withdrawal" className="space-y-6">
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-foreground">Withdraw tsTON</h3>
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
                    <p className="mt-1 text-sm text-muted-foreground">Staked: {formatTON(tonstakers.stakedBalance)} tsTON</p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => handleUnstake("regular")}
                      disabled={unstakeLoading || !unstakeAmount}
                      className="w-full"
                    >
                      {unstakeLoading ? "Processing…" : "Regular Unstake (Delayed, Best Rate)"}
                    </Button>

                    <Button
                      onClick={() => handleUnstake("instant")}
                      disabled={unstakeLoading || !unstakeAmount}
                      variant="outline"
                      className="w-full"
                    >
                      Instant Unstake (Uses Liquidity Pool)
                    </Button>

                    <Button
                      onClick={() => handleUnstake("bestRate")}
                      disabled={unstakeLoading || !unstakeAmount}
                      variant="outline"
                      className="w-full"
                    >
                      Best Rate Unstake (Wait Till Round End)
                    </Button>

                    <p className="text-sm text-muted-foreground">
                      Available instant liquidity: {formatTON(tonstakers.instantLiquidity)} TON
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-foreground">My Withdrawals</h3>
                {tonstakers.withdrawalNFTs.length === 0 ? (
                  <p className="text-center text-muted-foreground">No active withdrawal requests</p>
                ) : (
                  <div className="space-y-4">
                    {tonstakers.withdrawalNFTs.map((nft, index) => (
                      <Card key={index} className="border p-4">
                        <div className="grid gap-2 md:grid-cols-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Amount</p>
                            <p className="text-lg font-semibold text-foreground">{formatTON(nft.amount)} tsTON</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Estimated Payout</p>
                            <p className="text-sm font-medium text-foreground">{nft.estimatedPayoutDate.toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Round Ends</p>
                            <p className="text-sm font-medium text-foreground">{nft.roundEndTime.toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          NFT: {nft.address.slice(0, 8)}...{nft.address.slice(-6)}
                        </p>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Company Logo Card */}
        <Card className="p-8">
          <h2 className="text-xl font-bold text-foreground">Company Logo</h2>
        </Card>
      </main>
    </div>
  );
}