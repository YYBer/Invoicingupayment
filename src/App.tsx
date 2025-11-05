// App.tsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HeaderLayout from "./components/HeaderLayout"; // adjust path if needed
import Landing from "./pages/Landing";
import PricePage_testing from "./pages/PricePage_testing";
import Profile from "./pages/Profile";


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
          
          {/* (Optional) catch-all: 404 */}
          {/* <Route path="*" element={<div className="p-4">Not Found</div>} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
