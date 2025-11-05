// App.tsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HeaderLayout from "./components/HeaderLayout"; // adjust path if needed
import Landing from "./pages/Landing";
import PricePage_testing from "./pages/PricePage_testing";
import Profile from "./pages/Profile";

// Simple stub so HeaderLayout's "Feedback" link works.
// Replace with a real page when you have it.
// function Feedback() {
//   return <div className="p-4">Feedback page coming soon.</div>;
// }

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Parent route uses the layout that renders the header + <Outlet /> */}
        <Route element={<HeaderLayout />}>
          {/* Child routes render inside <Outlet /> */}
          <Route index element={<Landing />} />
          <Route path="/pricing_testing" element={<PricePage_testing />} />
          <Route path="/profile" element={<Profile />} />
          {/* <Route path="/feedback" element={<Feedback />} /> */}
          {/* (Optional) catch-all: 404 */}
          {/* <Route path="*" element={<div className="p-4">Not Found</div>} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
