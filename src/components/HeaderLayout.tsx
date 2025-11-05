import React from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { Helmet } from "react-helmet";

const HeaderLayout: React.FC = () => {
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
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            {/* <img src="/invoicingu1.png" alt="InvoicingU logo" className="h-9 w-9 sm:h-7 sm:w-7" /> */}
            {/* <img src="/invoicingu1.png" alt="InvoicingU logo" className="h-7 w-auto" /> */}
            <img
                src="/invoicingu1.png"
                alt="InvoicingU logo"
                width={80}
                height={80}
                style={{ height: 80, width: 'auto', objectFit: 'contain', display: 'block' }}
            />

            <h1 className="text-xl sm:text-2xl font-bold text-emerald-700 tracking-tight">
              InvoicingU
            </h1>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `text-sm font-medium transition ${
                  isActive ? "text-emerald-700" : "text-gray-600 hover:text-emerald-700"
                }`
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/pricing_testing"
              className={({ isActive }) =>
                `text-sm font-medium transition ${
                  isActive ? "text-emerald-700" : "text-gray-600 hover:text-emerald-700"
                }`
              }
            >
              Pricing
            </NavLink>

            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `text-sm font-medium transition ${
                  isActive ? "text-emerald-700" : "text-gray-600 hover:text-emerald-700"
                }`
              }
            >
              Profile
            </NavLink>

            {/* <NavLink
              to="/feedback"
              className={({ isActive }) =>
                `text-sm font-medium transition ${
                  isActive ? "text-emerald-700" : "text-gray-600 hover:text-emerald-700"
                }`
              }
            >
              Feedback
            </NavLink> */}
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
