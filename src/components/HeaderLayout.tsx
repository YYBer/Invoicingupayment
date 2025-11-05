import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { Helmet } from "react-helmet";

const HeaderLayout: React.FC = () => {
  const [user, setUser] = useState<{ username: string; firstName: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    const handleUserUpdate = () => {
      const updatedUser = localStorage.getItem("user");
      setUser(updatedUser ? JSON.parse(updatedUser) : null);
    };

    window.addEventListener("userUpdated", handleUserUpdate);
    return () => window.removeEventListener("userUpdated", handleUserUpdate);
  }, []);

  const handleLogoClick = () => navigate("/");

  return (
    <div className="font-[Poppins] min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/png" href="/invoicingu1.png" />
      </Helmet>

      {/* Header */}
      <header className="w-full bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 py-3">
          {/* Logo + Brand */}
          <div
            onClick={handleLogoClick}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer"
          >
            <img src="/invoicingu1.png" alt="InvoicingU logo" className="h-9 w-9" />
            <h1 className="text-xl sm:text-2xl font-bold text-emerald-700 tracking-tight">
              InvoicingU
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `text-sm font-medium transition ${
                  isActive
                    ? "text-emerald-700"
                    : "text-gray-600 hover:text-emerald-700"
                }`
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/pricing_testing"
              className={({ isActive }) =>
                `text-sm font-medium transition ${
                  isActive
                    ? "text-emerald-700"
                    : "text-gray-600 hover:text-emerald-700"
                }`
              }
            >
              Pricing
            </NavLink>

            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `text-sm font-medium transition ${
                  isActive
                    ? "text-emerald-700"
                    : "text-gray-600 hover:text-emerald-700"
                }`
              }
            >
              Profile
            </NavLink>

            <NavLink
              to="/feedback"
              className={({ isActive }) =>
                `text-sm font-medium transition ${
                  isActive
                    ? "text-emerald-700"
                    : "text-gray-600 hover:text-emerald-700"
                }`
              }
            >
              Feedback
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow px-4 sm:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-gray-500 border-t border-gray-100">
        © {new Date().getFullYear()} InvoicingU — All rights reserved.
      </footer>
    </div>
  );
};

export default HeaderLayout;
