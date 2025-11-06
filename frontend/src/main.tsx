import "./polyfills";

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { TonConnectUIProvider } from "@tonconnect/ui-react";

const manifestUrl =
  "https://invoicingupayment-ton.vercel.app/.well-known/tonconnect-manifest.json";

createRoot(document.getElementById("root")!).render(
  <TonConnectUIProvider manifestUrl={manifestUrl}>
    <App />
  </TonConnectUIProvider>
);
