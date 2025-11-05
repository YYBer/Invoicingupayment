export type PlanKey = "free" | "smart" | "premium";
const DEMO_KEY = "invoicingu.cryptoDemo";
const USER_KEY = "user";

export type CryptoDemoState = {
  plan: PlanKey | null;
  amount: number | null;
  address: string | null;
  txRef?: string;
  markedPaidAt?: string;
};

export function getCryptoDemo(): CryptoDemoState {
  try { return JSON.parse(localStorage.getItem(DEMO_KEY) || "null") ?? {}; } catch { return {}; }
}

export function setCryptoIntent(plan: PlanKey, amount: number, address: string) {
  const next: CryptoDemoState = { plan, amount, address };
  localStorage.setItem(DEMO_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("userUpdated"));
}

export function markCryptoPaid(txRef?: string) {
  const cur = getCryptoDemo();
  if (!cur?.plan) return;
  const next: CryptoDemoState = { ...cur, txRef, markedPaidAt: new Date().toISOString() };
  localStorage.setItem(DEMO_KEY, JSON.stringify(next));

  // patch local "user"
  let user: any = {};
  try { user = JSON.parse(localStorage.getItem(USER_KEY) || "{}"); } catch {}
  user.user_plan = cur.plan;
  user.subscription_status = "active (crypto-demo)";
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("userUpdated"));
}

export function clearCryptoDemo() {
  localStorage.removeItem(DEMO_KEY);
  // also downgrade user to free for the demo
  let user: any = {};
  try { user = JSON.parse(localStorage.getItem(USER_KEY) || "{}"); } catch {}
  user.user_plan = "free";
  delete user.subscription_status;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("userUpdated"));
}

export function currentPlanFromLocal(): PlanKey {
  let plan: PlanKey = "free";
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    plan = (u?.user_plan ?? "free") as PlanKey;
  } catch {}
  const demo = getCryptoDemo();
  if (demo?.markedPaidAt && demo?.plan) return demo.plan;
  return plan;
}
