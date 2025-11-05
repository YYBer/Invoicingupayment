// src/components/HeaderLayout.tsx
import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
// import UserMenu from "./UserMenu";
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
    <div className="font-[Poppins] min-h-screen bg-white flex flex-col">
      <Helmet>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/png" href="/invoicingu1.png" />
      </Helmet>

      {/* Header */}
      <header className="w-full px-4 sm:px-6 py-4 bg-white shadow-md sticky top-0 z-50">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Logo */}
          <div onClick={handleLogoClick} className="flex items-center gap-3 cursor-pointer">
            <img src="/invoicingu1.png" alt="Logo" className="h-10 sm:h-10 w-auto" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800">
              InvoicingU
            </h1>
          </div>

          {/* Right side: nav + user menu */}
          <div className="flex items-center gap-6">
            {/* Public links */}
            <nav className="hidden sm:flex items-center gap-6">
              <NavLink
                to="/pricing_testing"
                className={({ isActive }) =>
                  `text-sm font-medium ${
                    isActive
                      ? "text-emerald-700"
                      : "text-gray-700 hover:text-emerald-700"
                  }`
                }
              >
                Pricing
              </NavLink>

              {/* <NavLink
                to="/feedback"
                className={({ isActive }) =>
                  `text-sm font-medium ${
                    isActive
                      ? "text-emerald-700"
                      : "text-gray-700 hover:text-emerald-700"
                  }`
                }
              >
                Feedback
              </NavLink> */}
            </nav>

            {/* User menu */}
            {/* <UserMenu userName={user?.username || "Guest"} /> */}
          </div>
        </div>
      </header>

      {/* Main outlet */}
      <main className="flex-grow p-5 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default HeaderLayout;
