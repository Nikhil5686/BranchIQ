import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      if (data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || "Login failed. Check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Left Hero Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0C447C 0%, #185FA5 60%, #1e7ad6 100%)",
        }}
      >
        {/* Circles decoration */}
        <div
          className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-10"
          style={{ background: "#fff" }}
        />
        <div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10 translate-x-1/3 translate-y-1/3"
          style={{ background: "#fff" }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#185FA5] font-extrabold text-xl shadow">
              B
            </div>
            <div>
              <p className="text-white font-bold text-xl">BranchIQ</p>
              <p className="text-blue-200 text-xs font-medium uppercase tracking-widest">
                AI Banking Platform
              </p>
            </div>
          </div>
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
            Banking
            <br />
            of the Future,
            <br />
            <span className="text-blue-200">Today.</span>
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed max-w-md">
            Manage your finances, apply for services, and get AI-powered support
            — all in one secure platform.
          </p>
        </div>

        {/* Feature pills */}
        <div className="relative z-10 flex flex-wrap gap-3">
          {[
            "AI-Powered Chat",
            "Instant Transfers",
            "Multilingual",
            "Bank-Grade Security",
          ].map((f) => (
            <span
              key={f}
              className="px-4 py-2 bg-white/10 text-white text-sm rounded-full border border-white/20 font-medium backdrop-blur-sm"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#F4F8FD]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[#185FA5] rounded-lg flex items-center justify-center text-white font-bold">
              B
            </div>
            <span className="font-bold text-[#0C447C] text-xl">BranchIQ</span>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900">
                Welcome back
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Sign in to your banking account
              </p>
            </div>

            {error && (
              <div className="mb-5 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5] text-gray-900 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5] text-gray-900 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-blue-200 disabled:opacity-60"
                style={{
                  background: loading
                    ? "#888"
                    : "linear-gradient(135deg, #185FA5, #0C447C)",
                }}
              >
                {loading ? "Signing in..." : "Sign In to BranchIQ"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-[#185FA5] font-bold hover:underline"
              >
                Create Account
              </Link>
            </div>

            {/* Demo credentials */}
            <div className="mt-5 p-4 bg-[#F4F8FD] rounded-xl border border-blue-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Demo Credentials
              </p>
              <div className="space-y-1.5">
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-bold">
                    Admin
                  </span>
                  <span className="text-gray-600">
                    nikhilshukla5686@gmail.com / Nikhil@12345
                  </span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">
                    User
                  </span>
                  <span className="text-gray-600">
                    priya@example.com / password123
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
