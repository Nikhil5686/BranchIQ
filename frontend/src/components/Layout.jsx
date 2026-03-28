import React from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useLanguage, useT, LANGUAGES } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

function Layout({ children }) {
  const location = useLocation();
  const { language, setLanguage } = useLanguage();
  const t = useT();
  const { user, logout, isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Authenticated routes based on role
  const adminNavItems = [
    { nameKey: "adminDashboard", path: "/admin", icon: DashboardIcon },
    { nameKey: "customerChat", path: "/chat", icon: ChatIcon },
    { nameKey: "voiceMode", path: "/voice", icon: MicIcon },
  ];

  const userNavItems = [
    { nameKey: "Dashboard", path: "/dashboard", icon: HomeIcon },
    { nameKey: "customerChat", path: "/chat", icon: ChatIcon },
    { nameKey: "voiceMode", path: "/voice", icon: MicIcon },
  ];

  const navItems = isAdmin() ? adminNavItems : userNavItems;
  const currentNav =
    navItems.find((item) => location.pathname.startsWith(item.path)) ||
    navItems[0];

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div
        className="w-16 md:w-[220px] flex-shrink-0 flex flex-col text-white transition-all duration-300 relative z-20 shadow-xl"
        style={{ backgroundColor: "#185FA5" }}
      >
        {/* Logo */}
        <div className="p-4 md:p-6 border-b border-white/10">
          <div className="flex items-center justify-center md:justify-start space-x-3">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-[#185FA5] font-extrabold text-xl shadow-sm">
              B
            </div>
            <div className="hidden md:block">
              <h1 className="text-lg font-bold leading-tight tracking-wide">
                BranchIQ
              </h1>
              <p className="text-[10px] text-blue-200 mt-0.5 uppercase tracking-wider font-semibold opacity-80">
                {isAdmin() ? "Admin Panel" : "AI Banking"}
              </p>
            </div>
          </div>
        </div>

        {/* User Avatar */}
        {isAuthenticated() && (
          <div className="px-3 md:px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              {user?.profile_photo ? (
                <img
                  src={user.profile_photo}
                  alt="avatar"
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-white/30"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
              <div className="hidden md:block min-w-0">
                <p className="text-white text-xs font-bold truncate">
                  {user?.name}
                </p>
                <p className="text-blue-200 text-[10px] uppercase font-semibold">
                  {user?.role}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Nav Items */}
        <div className="flex-1 mt-4">
          <nav className="space-y-1.5 px-3">
            {navItems.map((item) => {
              const isActive =
                item.path === "/dashboard"
                  ? location.pathname.startsWith("/dashboard")
                  : location.pathname === item.path;
              const label =
                item.nameKey === "Dashboard" ? "Dashboard" : t(item.nameKey);
              return (
                <Link
                  key={item.nameKey}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-md transition-all duration-200 ${
                    isActive
                      ? "bg-white/15 text-white font-medium shadow-sm"
                      : "text-blue-100/80 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon
                    className={`w-6 h-6 md:w-5 md:h-5 mx-auto md:mx-0 ${isActive ? "opacity-100" : "opacity-70"}`}
                  />
                  <span className="hidden md:inline text-sm">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Language Selector */}
        <div className="p-2 md:p-4 border-t border-white/10">
          <label className="hidden md:block text-xs text-blue-200/80 mb-1.5 px-1 font-medium uppercase tracking-wider">
            {t("language")}
          </label>
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full appearance-none bg-black/20 text-white text-sm rounded-md border border-white/10 px-3 py-2.5 pr-8 outline-none cursor-pointer focus:border-white/30 transition-colors shadow-inner"
            >
              {LANGUAGES.map((lang) => (
                <option
                  key={lang.name}
                  className="text-gray-900 bg-white"
                  value={lang.name}
                >
                  {lang.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/60">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        {isAuthenticated() && (
          <div className="p-2 md:p-3 pb-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-blue-100/80 hover:bg-red-500/20 hover:text-white transition-all"
            >
              <LogoutIcon className="w-5 h-5 mx-auto md:mx-0 flex-shrink-0" />
              <span className="hidden md:inline text-sm font-medium">
                Logout
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white shadow-[-4px_0_15px_rgba(0,0,0,0.05)] z-10">
        {/* Top Bar */}
        <header className="h-[64px] flex items-center justify-between px-6 md:px-8 border-b border-gray-100 bg-white flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">
              {currentNav.nameKey === "Dashboard"
                ? "My Dashboard"
                : t(currentNav.nameKey)}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("assistantTracking")} •{" "}
              <span className="text-[#185FA5] font-semibold">
                {language} {t("mode")}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2 bg-green-50/80 px-3 py-1.5 rounded-full border border-green-200 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-bold text-green-700 uppercase tracking-wide">
                {t("aiOnline")}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-white">
          <div
            className={`h-full ${location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard") ? "" : "p-4 md:p-6"}`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// SVG Icons
const ChatIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);
const DashboardIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
    />
  </svg>
);
const MicIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
    />
  </svg>
);
const HomeIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);
const LogoutIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </svg>
);

export default Layout;
