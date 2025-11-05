import React, { useMemo, useState } from "react";
import { setCryptoIntent, markCryptoPaid } from "../lib/cryptoDemo";

type PlanKey = "free" | "smart" | "premium";

type Props = {
  open: boolean;
  onClose: () => void;
  plan: PlanKey | null;
};

const TON_ADDR = "UQ_DEMO_LOCALHOST_TON_ADDRESS________________";
const AMOUNTS: Record<Exclude<PlanKey, "free">, number> = { smart: 6, premium: 14 };

export default function CryptoPayModal({ open, onClose, plan }: Props) {
  const [tx, setTx] = useState("");
  const amount = useMemo(() => (plan && plan !== "free" ? AMOUNTS[plan] : 0), [plan]);
  if (!open || !plan || plan === "free") return null;

  const deeplink = `ton://transfer/${encodeURIComponent(TON_ADDR)}?amount=${Math.round(amount * 1e9)}`;

  const copy = (txt: string) => navigator.clipboard.writeText(txt).catch(() => {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow">
        <div className="border-b p-4 font-semibold">Pay with TON (demo)</div>
        <div className="p-4 space-y-3 text-sm">
          <p>This is a localhost demo. No real blockchain calls.</p>

          <div className="space-y-1">
            <div className="text-gray-700">Amount:</div>
            <div className="flex gap-2 items-center">
              <code className="bg-gray-100 px-2 py-1 rounded">{amount} TON</code>
              <button className="text-blue-600 underline" onClick={() => copy(String(amount))}>Copy</button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-gray-700">Send to:</div>
            <div className="flex gap-2 items-center overflow-hidden">
              <code className="bg-gray-100 px-2 py-1 rounded truncate">{TON_ADDR}</code>
              <button className="text-blue-600 underline" onClick={() => copy(TON_ADDR)}>Copy</button>
            </div>
          </div>

          <a href={deeplink} target="_blank" className="block w-full text-center bg-blue-600 text-white rounded py-2">
            Open wallet (demo)
          </a>

          <div className="space-y-1">
            <label className="text-gray-700">Tx hash / link (optional)</label>
            <input
              value={tx}
              onChange={(e) => setTx(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Paste anything for demo"
            />
          </div>
        </div>

        <div className="flex justify-between border-t p-4">
          <button onClick={onClose} className="px-3 py-2 rounded border">Cancel</button>
          <button
            className="px-3 py-2 rounded bg-emerald-600 text-white"
            onClick={() => {
              setCryptoIntent(plan, amount, TON_ADDR);
              markCryptoPaid(tx || undefined);
              onClose();
              alert(`Marked paid (demo). Upgraded to "${plan}".`);
            }}
          >
            Mark as paid (demo)
          </button>
        </div>
      </div>
    </div>
  );
}
