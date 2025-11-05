import React, { useEffect, useMemo, useState } from "react";
import { clearCryptoDemo, currentPlanFromLocal } from "../lib/cryptoDemo";

export default function Profile() {
  const [user, setUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });

  useEffect(() => {
    const h = () => {
      try { setUser(JSON.parse(localStorage.getItem("user") || "null")); } catch { setUser(null); }
    };
    window.addEventListener("userUpdated", h);
    return () => window.removeEventListener("userUpdated", h);
  }, []);

  const plan = useMemo(() => currentPlanFromLocal(), [user]);
  const email = user?.email ?? "—";
  const status = user?.subscription_status ?? (plan !== "free" ? "active (crypto-demo)" : "—");

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">My Profile (demo)</h1>

      <div className="border rounded p-4 space-y-2">
        <div><b>Email:</b> {email}</div>
        <div><b>Plan:</b> <span className="capitalize">{plan}</span>
          {status?.includes("crypto-demo") && (
            <span className="ml-2 text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Crypto demo</span>
          )}
        </div>
        <div><b>Status:</b> {status}</div>
      </div>

      <div className="flex gap-3">
        <button
          className="px-3 py-2 rounded bg-emerald-600 text-white"
          onClick={() => {
            const u = { username: "demo", email: "demo@local", user_plan: "free" };
            localStorage.setItem("user", JSON.stringify(u));
            window.dispatchEvent(new Event("userUpdated"));
            alert("Demo user set.");
          }}
        >
          Create/Reset Demo User
        </button>

        <button
          className="px-3 py-2 rounded border"
          onClick={() => { clearCryptoDemo(); alert("Crypto demo cleared. Plan set to Free."); }}
        >
          Reset Crypto Demo
        </button>
      </div>
    </main>
  );
}
