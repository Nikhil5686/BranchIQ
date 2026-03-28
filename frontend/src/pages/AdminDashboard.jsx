import React, { useState, useEffect } from "react";
import {
  getAnalytics,
  getAdminDashboard,
  getAdminUsers,
  getAdminRequests,
  updateRequestStatus,
} from "../services/api";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import ProfilePanel from "../components/ProfilePanel";

const AnimatedNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    const end = parseFloat(value) || 0;
    if (end === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayValue(0);
      return;
    }
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / 1200, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(
        (ease * end).toFixed(value.toString().includes(".") ? 1 : 0),
      );
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [value]);
  return <span>{displayValue}</span>;
};

const COLORS = [
  "#0C447C",
  "#185FA5",
  "#3B82F6",
  "#60A5FA",
  "#93C5FD",
  "#BFDBFE",
];

const StatusBadge = ({ status }) => {
  const map = {
    pending: "bg-amber-100 text-amber-700",
    resolved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider ${map[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [actionLoading, setActionLoading] = useState({});

  const fetchAll = async () => {
    try {
      const [analyticsData, adminData, usersData, requestsData] =
        await Promise.allSettled([
          getAnalytics(),
          getAdminDashboard(),
          getAdminUsers(),
          getAdminRequests(),
        ]);
      if (analyticsData.status === "fulfilled") setStats(analyticsData.value);
      if (adminData.status === "fulfilled") setAdminStats(adminData.value);
      if (usersData.status === "fulfilled") setUsers(usersData.value);
      if (requestsData.status === "fulfilled") setRequests(requestsData.value);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const i = setInterval(fetchAll, 30000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    const c = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(c);
  }, []);

  const handleRequestAction = async (id, action) => {
    setActionLoading((p) => ({ ...p, [id]: true }));
    try {
      await updateRequestStatus(id, action);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: action === "approve" ? "resolved" : "rejected" }
            : r,
        ),
      );
    } catch (err) {
      alert(err.response?.data?.detail || "Action failed");
    } finally {
      setActionLoading((p) => ({ ...p, [id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 min-h-full pb-8 p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-md w-1/4 mb-4" />
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats && !adminStats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <p className="text-xl font-bold">Unable to load dashboard data.</p>
        <button
          onClick={fetchAll}
          className="mt-4 px-6 py-2 bg-[#185FA5] text-white rounded-xl font-bold shadow-md"
        >
          Retry
        </button>
      </div>
    );
  }

  const TABS = [
    { id: "overview", label: "Overview" },
    {
      id: "requests",
      label: `Requests ${adminStats ? `(${adminStats.pending_requests})` : ""}`,
    },
    { id: "users", label: `Users (${users.length})` },
    { id: "profile", label: "Profile" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6 min-h-full pb-8"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-extrabold text-[#0C447C]">
          Admin Dashboard
        </h1>
        <div className="text-gray-600 font-mono bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl font-bold shadow-sm tracking-widest text-sm">
          {currentTime.toLocaleTimeString()}
        </div>
      </div>

      {/* Top KPI Cards — admin + analytics combined */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Users",
            value: adminStats?.total_users || 0,
            color: "#185FA5",
          },
          {
            label: "Pending Requests",
            value: adminStats?.pending_requests || 0,
            color: "#633806",
          },
          {
            label: "Queries Today",
            value: stats?.total_queries || 0,
            color: "#0C447C",
          },
          {
            label: "Resolution Rate",
            value: stats?.resolution_rate || adminStats?.approval_rate || 0,
            color: "#27500A",
            suffix: "%",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
            style={{ borderLeft: `6px solid ${card.color}` }}
          >
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {card.label}
            </p>
            <p
              className="text-4xl font-extrabold mt-2"
              style={{ color: card.color }}
            >
              <AnimatedNumber value={card.value} />
              {card.suffix || ""}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2.5 text-sm font-bold rounded-t-xl border-b-2 transition-all ${
              activeTab === t.id
                ? "border-[#185FA5] text-[#185FA5] bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm">
            <h2 className="text-base font-extrabold text-gray-800 uppercase tracking-wider mb-6">
              Queries by Category
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.by_category}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#E5E7EB"
                  />
                  <XAxis
                    type="number"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={80}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    fontWeight="bold"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {stats.by_category.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} entry={entry} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm">
            <h2 className="text-base font-extrabold text-gray-800 uppercase tracking-wider mb-6">
              Language Breakdown
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.by_language}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#E5E7EB"
                  />
                  <XAxis
                    type="number"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={40}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    fontWeight="bold"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {stats.by_language.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={COLORS[(index + 2) % COLORS.length]}
                        entry={entry}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Queries */}
          {stats.recent_queries?.length > 0 && (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-base font-extrabold text-gray-800 uppercase tracking-wider">
                  Recent Queries
                </h2>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-widest">
                      <th className="pb-3 px-6 font-bold">Status</th>
                      <th className="pb-3 px-4 font-bold">Query</th>
                      <th className="pb-3 px-4 font-bold">Lang</th>
                      <th className="pb-3 px-4 font-bold text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-50">
                    {stats.recent_queries.map((q) => (
                      <tr
                        key={q.id}
                        className="hover:bg-gray-50/60 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <StatusBadge
                            status={
                              q.status === "Resolved" ? "resolved" : "pending"
                            }
                          />
                        </td>
                        <td className="py-4 px-4 text-gray-700 font-medium truncate max-w-[200px]">
                          {q.text}
                        </td>
                        <td className="py-4 px-4 text-gray-400 font-bold text-xs uppercase">
                          {q.language}
                        </td>
                        <td className="py-4 px-4 text-gray-500 text-right font-mono text-xs">
                          {q.time_taken}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === "requests" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-extrabold text-gray-800 uppercase text-sm tracking-wider">
              All Banking Requests
            </h2>
            <span className="text-xs text-gray-400">
              {requests.length} total
            </span>
          </div>
          {requests.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-semibold">No requests found</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-widest">
                    <th className="py-3 px-6 font-bold">Type</th>
                    <th className="py-3 px-4 font-bold">User</th>
                    <th className="py-3 px-4 font-bold">Description</th>
                    <th className="py-3 px-4 font-bold">Priority</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold">Date</th>
                    <th className="py-3 px-4 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {requests.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-6">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold uppercase">
                          {r.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-gray-800 text-xs">
                          {r.user_name}
                        </p>
                        <p className="text-gray-400 text-[10px]">
                          {r.user_email}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 max-w-[180px]">
                        <p className="text-gray-700 truncate text-xs">
                          {r.description}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                            r.priority === "high"
                              ? "bg-red-100 text-red-600"
                              : r.priority === "medium"
                                ? "bg-amber-100 text-amber-600"
                                : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {r.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 text-xs">
                        {new Date(r.created_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4">
                        {r.status === "pending" ? (
                          <div className="flex gap-1.5 justify-center">
                            <button
                              onClick={() =>
                                handleRequestAction(r.id, "approve")
                              }
                              disabled={actionLoading[r.id]}
                              className="px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                handleRequestAction(r.id, "reject")
                              }
                              disabled={actionLoading[r.id]}
                              className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic text-center block">
                            Done
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-extrabold text-gray-800 uppercase text-sm tracking-wider">
              Registered Users
            </h2>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-widest">
                  <th className="py-3 px-6 font-bold">User</th>
                  <th className="py-3 px-4 font-bold">Role</th>
                  <th className="py-3 px-4 font-bold">Account No.</th>
                  <th className="py-3 px-4 font-bold text-right">Balance</th>
                  <th className="py-3 px-4 font-bold">Email ✓</th>
                  <th className="py-3 px-4 font-bold">Phone ✓</th>
                  <th className="py-3 px-4 font-bold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="py-3.5 px-6">
                      <p className="font-semibold text-gray-800">{u.name}</p>
                      <p className="text-gray-400 text-xs">{u.email}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-50 text-blue-600"}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-600">
                      {u.account_number || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-gray-800">
                      {u.balance
                        ? new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format(u.balance)
                        : "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={
                          u.email_verified ? "text-green-500" : "text-gray-300"
                        }
                      >
                        {u.email_verified ? "✓" : "✗"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={
                          u.phone_verified ? "text-green-500" : "text-gray-300"
                        }
                      >
                        {u.phone_verified ? "✓" : "✗"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === "profile" && <ProfilePanel />}
    </motion.div>
  );
}
