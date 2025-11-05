import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Landing from "./pages/Landing";
import PricePage_testing from "./pages/PricePage_testing";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <nav className="flex gap-3 p-3 border-b">
        <Link to="/" className="underline">Landing</Link>
        <Link to="/pricing_testing" className="underline">Pricing</Link>
        <Link to="/profile" className="underline">Profile</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pricing_testing" element={<PricePage_testing />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}
