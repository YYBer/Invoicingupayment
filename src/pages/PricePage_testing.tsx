import React, { useMemo, useState, useEffect } from "react";
import CryptoPayModal from "../components/CryptoPayModal";
import { currentPlanFromLocal, PlanKey } from "../lib/cryptoDemo";
import { useNavigate } from "react-router-dom";

function PlanCard({
  name, planKey, highlight, onSelect, isCurrent,
}: {
  name: string; planKey: PlanKey; highlight?: boolean;
  onSelect: (p: PlanKey) => void; isCurrent: boolean;
}) {
  return (
    <div className={`border rounded-lg p-4 flex flex-col gap-3 ${highlight ? "border-emerald-500" : ""}`}>
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">{name}</h3>
        {isCurrent && <span className="text-xs bg-gray-800 text-white rounded px-2 py-0.5">Current</span>}
      </div>
      <button
        disabled={isCurrent}
        onClick={() => onSelect(planKey)}
        className={`px-3 py-2 rounded ${highlight ? "bg-emerald-600 text-white" : "border"}`}
      >
        {isCurrent ? "Current plan" : (planKey === "free" ? "Start free" : "Pay with TON (demo)")}
      </button>
    </div>
  );
}

export default function PricePage_testing() {
  const nav = useNavigate();
  const [cryptoOpen, setCryptoOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);
  const [storedUser, setStoredUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });

  useEffect(() => {
    const h = () => {
      try { setStoredUser(JSON.parse(localStorage.getItem("user") || "null")); } catch { setStoredUser(null); }
    };
    window.addEventListener("userUpdated", h);
    return () => window.removeEventListener("userUpdated", h);
  }, []);

  const currentPlan = useMemo<PlanKey>(() => currentPlanFromLocal(), [storedUser]);

  const handleSelect = (plan: PlanKey) => {
    if (plan === "free") {
      const hasUser = !!storedUser;
      return hasUser ? nav("/profile") : nav("/"); // or to login page in your real app
    }
    setPendingPlan(plan);
    setCryptoOpen(true);
  };

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Pricing (Crypto Demo)</h1>
        <p className="text-gray-600">Click Smart/Premium to simulate a TON payment and upgrade locally.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <PlanCard name="Free"    planKey="free"    onSelect={handleSelect} isCurrent={currentPlan==="free"} />
        <PlanCard name="Smart €6" planKey="smart"   onSelect={handleSelect} isCurrent={currentPlan==="smart"} highlight />
        <PlanCard name="Premium €14" planKey="premium" onSelect={handleSelect} isCurrent={currentPlan==="premium"} />
      </div>

      <div className="text-center">
        <button className="underline text-sm" onClick={() => nav("/profile")}>Go to Profile</button>
      </div>

      <CryptoPayModal open={cryptoOpen} onClose={() => setCryptoOpen(false)} plan={pendingPlan} />
    </main>
  );
}
