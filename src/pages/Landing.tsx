import React from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const nav = useNavigate();

  const fakeLogin = () => {
    const user = { username: "demo", email: "demo@local", user_plan: "free" };
    localStorage.setItem("user", JSON.stringify(user));
    window.dispatchEvent(new Event("userUpdated"));
    alert("Logged in (demo).");
  };

  const fakeLogout = () => {
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("userUpdated"));
    alert("Logged out.");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">Invoicingu (localhost demo)</h1>
      <p className="text-gray-600">Minimal landing page: navigate to pricing or profile.</p>
      <div className="flex gap-3">
        <button className="px-4 py-2 rounded bg-black text-white" onClick={() => nav("/pricing_testing")}>
          Pricing (Crypto Demo)
        </button>
        <button className="px-4 py-2 rounded border" onClick={() => nav("/profile")}>
          Profile
        </button>
      </div>

      <div className="mt-6 flex gap-3">
        <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={fakeLogin}>
          Fake Login
        </button>
        <button className="px-3 py-2 rounded border" onClick={fakeLogout}>
          Logout
        </button>
      </div>
    </main>
  );
}
