import React, { useState, useEffect, useRef, useCallback } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  getMyAccount,
  getTransfers,
  makeTransfer,
  createRequest,
  getMyRequests,
  requestATMPinOTP,
  setATMPin,
  updateProfile,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import ProfilePanel, { Alert } from "../components/ProfilePanel";

// ── Sidebar tabs ───────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Overview", icon: "🏠" },
  { id: "transactions", label: "Transactions", icon: "📊" },
  { id: "transfer", label: "Transfer", icon: "💸" },
  { id: "atm", label: "ATM Services", icon: "🏧" },
  { id: "loan", label: "Loan", icon: "💰" },
  { id: "complaint", label: "Complaints", icon: "📋" },
  { id: "profile", label: "Profile", icon: "👤" },
];

// ── Shared utilities ──────────────────────────────────────────────────────────
const formatCurrency = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(v);
const formatDate = (ts) =>
  new Date(ts).toLocaleString("en-IN", {
    dateStyle: "short",
    timeStyle: "short",
  });

// Alert component now imported from ProfilePanel.jsx

// ── Overview Panel ─────────────────────────────────────────────────────────────
function OverviewPanel({ account, loading }) {
  if (loading) return <SkeletonLoader />;
  if (!account) return <EmptyState msg="Could not load account data." />;

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div
        className="rounded-3xl p-7 text-white shadow-xl relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0C447C 0%, #185FA5 60%, #1e7ad6 100%)",
        }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10 bg-white" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10 bg-white translate-y-1/2" />
        <p className="text-blue-200 text-sm font-semibold uppercase tracking-widest mb-1">
          Available Balance
        </p>
        <p className="text-5xl font-extrabold mb-4">
          {formatCurrency(account.balance)}
        </p>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-blue-200 text-xs uppercase tracking-wider">
              Account No.
            </p>
            <p className="font-bold font-mono tracking-widest">
              {account.account_number}
            </p>
          </div>
          <div>
            <p className="text-blue-200 text-xs uppercase tracking-wider">
              Type
            </p>
            <p className="font-bold capitalize">{account.account_type}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs uppercase tracking-wider">
              Status
            </p>
            <p
              className={`font-bold capitalize ${account.status === "active" ? "text-green-300" : "text-red-300"}`}
            >
              {account.status}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            ATM PIN
          </p>
          <p
            className={`text-lg font-extrabold mt-1 ${account.has_atm_pin ? "text-green-600" : "text-amber-500"}`}
          >
            {account.has_atm_pin ? "Set ✓" : "Not Set"}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Debit Card
          </p>
          <p
            className={`text-lg font-extrabold mt-1 ${account.card_applied ? "text-green-600" : "text-gray-500"}`}
          >
            {account.card_applied ? "Applied ✓" : "Not Applied"}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm col-span-2 md:col-span-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Since
          </p>
          <p className="text-base font-extrabold text-gray-700 mt-1">
            {new Date(account.created_at).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "short",
            })}
          </p>
        </div>
      </div>

      {/* Recent Transactions */}
      {account.recent_transactions?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-50">
            <h3 className="font-extrabold text-gray-800">
              Recent Transactions
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {account.recent_transactions.map((tx) => (
              <div
                key={tx.id}
                className="px-5 py-4 flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800 truncate max-w-xs">
                    {tx.description || "Transaction"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(tx.timestamp)}
                  </p>
                </div>
                <span
                  className={`font-extrabold text-base ${tx.type === "credit" ? "text-green-600" : "text-red-600"}`}
                >
                  {tx.type === "credit" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Transactions Panel ─────────────────────────────────────────────────────────
function TransactionsPanel() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTransfers()
      .then(setTxs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonLoader />;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-extrabold text-gray-800">Transaction History</h3>
        <span className="text-xs text-gray-400 font-medium">
          {txs.length} transactions
        </span>
      </div>
      {txs.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <div className="text-4xl mb-3">💳</div>
          <p className="font-semibold">No transactions yet</p>
        </div>
      ) : (
        <div className="overflow-auto max-h-[500px] divide-y divide-gray-50">
          {txs.map((tx) => (
            <div
              key={tx.id}
              className="px-5 py-4 flex justify-between items-center hover:bg-gray-50/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${tx.type === "credit" ? "bg-green-100" : "bg-red-100"}`}
                >
                  {tx.type === "credit" ? "⬇️" : "⬆️"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 max-w-[200px] truncate">
                    {tx.description || "Transaction"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(tx.timestamp)} · {tx.reference_id}
                  </p>
                </div>
              </div>
              <span
                className={`font-extrabold ${tx.type === "credit" ? "text-green-600" : "text-red-600"}`}
              >
                {tx.type === "credit" ? "+" : "-"}
                {formatCurrency(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Transfer Panel ─────────────────────────────────────────────────────────────
function TransferPanel({ onRefresh }) {
  const [form, setForm] = useState({
    to_account: "",
    amount: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const handleTransfer = async () => {
    setMsg({ text: "", type: "" });
    if (!form.to_account || !form.amount) {
      setMsg({ text: "Please fill all required fields", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await makeTransfer({
        to_account: form.to_account,
        amount: parseFloat(form.amount),
        description: form.description,
      });
      setMsg({
        text: `✓ Transfer of ${formatCurrency(res.amount)} successful! Ref: ${res.reference_id}`,
        type: "success",
      });
      setForm({ to_account: "", amount: "", description: "" });
      onRefresh && onRefresh();
    } catch (err) {
      setMsg({
        text: err.response?.data?.detail || "Transfer failed",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h3 className="text-lg font-extrabold text-gray-800 mb-5">
        Money Transfer
      </h3>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <Alert
          msg={msg.text}
          type={msg.type}
          onClose={() => setMsg({ text: "", type: "" })}
        />
        {[
          {
            key: "to_account",
            label: "Recipient Account Number *",
            placeholder: "IQ1234567890",
            type: "text",
          },
          {
            key: "amount",
            label: "Amount (₹) *",
            placeholder: "500",
            type: "number",
          },
          {
            key: "description",
            label: "Description (optional)",
            placeholder: "Rent, EMI, etc.",
            type: "text",
          },
        ].map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              {f.label}
            </label>
            <input
              type={f.type}
              value={form[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5] text-sm"
            />
          </div>
        ))}
        <button
          onClick={handleTransfer}
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #185FA5, #0C447C)" }}
        >
          {loading ? "Processing..." : "Transfer Money →"}
        </button>
        <p className="text-xs text-gray-400 text-center">
          Transfers within BranchIQ are instant. External transfers are
          simulated.
        </p>
      </div>
    </div>
  );
}

// ── ATM Services Panel ────────────────────────────────────────────────────────
function ATMPanel({ onRefresh }) {
  const [pinStep, setPinStep] = useState("idle"); // idle | otp | set | done
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const handleRequestOTP = async () => {
    setLoading(true);
    try {
      const res = await requestATMPinOTP();
      setDevOtp(res.dev_otp);
      setPinStep("otp");
    } catch (err) {
      setMsg({
        text: err.response?.data?.detail || "Failed to send OTP",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (pin !== confirmPin) {
      setMsg({ text: "PINs do not match", type: "error" });
      return;
    }
    if (pin.length !== 4) {
      setMsg({ text: "PIN must be exactly 4 digits", type: "error" });
      return;
    }
    setLoading(true);
    try {
      await setATMPin(otp, pin);
      setPinStep("done");
      setMsg({ text: "ATM PIN set successfully!", type: "success" });
      onRefresh && onRefresh();
    } catch (err) {
      setMsg({
        text: err.response?.data?.detail || "Failed to set PIN",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCardRequest = async () => {
    setLoading(true);
    try {
      await createRequest({
        type: "card",
        description: "Requesting issuance of a new debit card.",
        priority: "medium",
      });
      setMsg({
        text: "Card application submitted! Admin will review it.",
        type: "success",
      });
    } catch (err) {
      setMsg({
        text: err.response?.data?.detail || "Request failed",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-md">
      <h3 className="text-lg font-extrabold text-gray-800">ATM Services</h3>
      <Alert
        msg={msg.text}
        type={msg.type}
        onClose={() => setMsg({ text: "", type: "" })}
      />

      {/* ATM PIN Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🔑</span>
          <div>
            <h4 className="font-extrabold text-gray-800">ATM PIN Management</h4>
            <p className="text-xs text-gray-500">
              Set or change your 4-digit ATM PIN
            </p>
          </div>
        </div>
        {pinStep === "idle" && (
          <button
            onClick={handleRequestOTP}
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #185FA5, #0C447C)" }}
          >
            {loading ? "Sending OTP..." : "Generate / Change ATM PIN"}
          </button>
        )}
        {pinStep === "otp" && (
          <div className="space-y-3">
            {devOtp && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-bold text-amber-600">Demo OTP:</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-mono font-extrabold text-amber-700">
                    {devOtp}
                  </span>
                  <button
                    onClick={() => setOtp(devOtp)}
                    className="px-2 py-0.5 bg-amber-500 text-white rounded text-xs font-bold"
                  >
                    Use
                  </button>
                </div>
              </div>
            )}
            <input
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter OTP"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-center font-mono text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30"
            />
            <button
              onClick={() => otp.length === 6 && setPinStep("set")}
              disabled={otp.length !== 6}
              className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #185FA5, #0C447C)",
              }}
            >
              Verify OTP →
            </button>
          </div>
        )}
        {pinStep === "set" && (
          <div className="space-y-3">
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="New 4-digit PIN"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-center font-mono text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30"
            />
            <input
              type="password"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Confirm PIN"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-center font-mono text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30"
            />
            <button
              onClick={handleSetPin}
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #185FA5, #0C447C)",
              }}
            >
              {loading ? "Setting PIN..." : "Set ATM PIN ✓"}
            </button>
          </div>
        )}
        {pinStep === "done" && (
          <p className="text-green-600 font-bold text-center">
            ATM PIN updated successfully! ✓
          </p>
        )}
      </div>

      {/* Card Application */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">💳</span>
          <div>
            <h4 className="font-extrabold text-gray-800">
              Apply for Debit Card
            </h4>
            <p className="text-xs text-gray-500">
              Request a new debit card for your account
            </p>
          </div>
        </div>
        <button
          onClick={handleCardRequest}
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-sm border-2 border-[#185FA5] text-[#185FA5] hover:bg-[#F4F8FD] transition-all"
        >
          {loading ? "Submitting..." : "Apply for Debit Card"}
        </button>
      </div>
    </div>
  );
}

// ── Loan Panel ────────────────────────────────────────────────────────────────
function LoanPanel() {
  const [form, setForm] = useState({
    amount: "",
    loan_type: "home",
    tenure: "12",
    purpose: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [myRequests, setMyRequests] = useState([]);

  useEffect(() => {
    getMyRequests()
      .then((r) => setMyRequests(r.filter((x) => x.type === "loan")))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!form.amount) {
      setMsg({ text: "Please enter loan amount", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const desc = `${form.loan_type.toUpperCase()} Loan of ₹${form.amount} for ${form.tenure} months. Purpose: ${form.purpose || "Not specified"}`;
      await createRequest({
        type: "loan",
        description: desc,
        priority: "high",
      });
      setMsg({
        text: "Loan request submitted! An admin will review it shortly.",
        type: "success",
      });
      setForm({ amount: "", loan_type: "home", tenure: "12", purpose: "" });
      const updated = await getMyRequests();
      setMyRequests(updated.filter((x) => x.type === "loan"));
    } catch (err) {
      setMsg({
        text: err.response?.data?.detail || "Submission failed",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      pending: "bg-amber-100 text-amber-700",
      resolved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${colors[status] || "bg-gray-100 text-gray-600"}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="max-w-md">
        <h3 className="text-lg font-extrabold text-gray-800 mb-5">
          Apply for Loan
        </h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <Alert
            msg={msg.text}
            type={msg.type}
            onClose={() => setMsg({ text: "", type: "" })}
          />
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Loan Type
            </label>
            <select
              value={form.loan_type}
              onChange={(e) => setForm({ ...form, loan_type: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5] text-sm"
            >
              {["home", "personal", "education", "vehicle", "business"].map(
                (t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)} Loan
                  </option>
                ),
              )}
            </select>
          </div>
          {[
            {
              key: "amount",
              label: "Loan Amount (₹) *",
              placeholder: "500000",
              type: "number",
            },
            {
              key: "tenure",
              label: "Tenure (months)",
              placeholder: "60",
              type: "number",
            },
            {
              key: "purpose",
              label: "Purpose / Description",
              placeholder: "Brief description...",
              type: "text",
            },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                {f.label}
              </label>
              <input
                type={f.type}
                value={form[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5] text-sm"
              />
            </div>
          ))}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #185FA5, #0C447C)" }}
          >
            {loading ? "Submitting..." : "Submit Loan Application →"}
          </button>
        </div>
      </div>

      {myRequests.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-extrabold text-gray-800">
              My Loan Applications
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {myRequests.map((r) => (
              <div
                key={r.id}
                className="px-5 py-4 flex justify-between items-start"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {r.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(r.created_at)}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Complaint Panel ───────────────────────────────────────────────────────────
function ComplaintPanel() {
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "medium",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [myComplaints, setMyComplaints] = useState([]);

  useEffect(() => {
    getMyRequests()
      .then((r) => setMyComplaints(r.filter((x) => x.type === "complaint")))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!form.description) {
      setMsg({ text: "Please describe your complaint", type: "error" });
      return;
    }
    setLoading(true);
    try {
      await createRequest({
        type: "complaint",
        description: form.subject
          ? `[${form.subject}] ${form.description}`
          : form.description,
        priority: form.priority,
      });
      setMsg({
        text: "Complaint submitted! We will get back to you.",
        type: "success",
      });
      setForm({ subject: "", description: "", priority: "medium" });
      const updated = await getMyRequests();
      setMyComplaints(updated.filter((x) => x.type === "complaint"));
    } catch (err) {
      setMsg({
        text: err.response?.data?.detail || "Submission failed",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      pending: "bg-amber-100 text-amber-700",
      resolved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${colors[status] || "bg-gray-100 text-gray-600"}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="max-w-md">
        <h3 className="text-lg font-extrabold text-gray-800 mb-5">
          File a Complaint
        </h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <Alert
            msg={msg.text}
            type={msg.type}
            onClose={() => setMsg({ text: "", type: "" })}
          />
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Subject
            </label>
            <input
              type="text"
              value={form.subject}
              placeholder="Brief subject line"
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Description *
            </label>
            <textarea
              value={form.description}
              rows={4}
              placeholder="Describe your complaint in detail..."
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5] text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Priority
            </label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5] text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High — Urgent</option>
            </select>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #185FA5, #0C447C)" }}
          >
            {loading ? "Submitting..." : "Submit Complaint →"}
          </button>
        </div>
      </div>

      {myComplaints.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-extrabold text-gray-800">My Complaints</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {myComplaints.map((r) => (
              <div
                key={r.id}
                className="px-5 py-4 flex justify-between items-start"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {r.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(r.created_at)}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Profile Panel (Now imported) ─────────────────────────────────────────────

// ── Skeletons & Helpers ───────────────────────────────────────────────────────
const SkeletonLoader = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-48 bg-gray-200 rounded-3xl" />
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
      ))}
    </div>
  </div>
);
const EmptyState = ({ msg }) => (
  <div className="text-center py-20 text-gray-400">
    <div className="text-4xl mb-3">🏦</div>
    <p className="font-semibold">{msg}</p>
  </div>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [account, setAccount] = useState(null);
  const [accountLoading, setAccountLoading] = useState(true);

  const fetchAccount = () => {
    setAccountLoading(true);
    getMyAccount()
      .then(setAccount)
      .catch(() => {})
      .finally(() => setAccountLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAccount();
  }, []);

  return (
    <div
      className="flex h-full bg-[#F4F8FD]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Sidebar */}
      <div className="w-16 md:w-56 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col shadow-sm">
        {/* User info */}
        <div className="p-3 md:p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {user?.profile_photo ? (
              <img
                src={user.profile_photo}
                alt="avatar"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#185FA5]/20"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#185FA5] flex items-center justify-center text-white font-extrabold text-sm">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <div className="hidden md:block min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {account?.account_number || "..."}
              </p>
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="flex-1 p-2 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-[#185FA5] text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg flex-shrink-0">{tab.icon}</span>
              <span className="hidden md:block">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Balance mini */}
        <div className="p-3 md:p-4 border-t border-gray-100">
          <div className="hidden md:block p-3 bg-[#F4F8FD] rounded-xl border border-blue-100">
            <p className="text-xs text-gray-500 font-semibold">Balance</p>
            <p className="text-base font-extrabold text-[#185FA5] mt-0.5">
              {account ? formatCurrency(account.balance) : "..."}
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">
            {TABS.find((t) => t.id === activeTab)?.label}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back, {user?.name?.split(" ")[0]}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && (
              <OverviewPanel account={account} loading={accountLoading} />
            )}
            {activeTab === "transactions" && <TransactionsPanel />}
            {activeTab === "transfer" && (
              <TransferPanel onRefresh={fetchAccount} />
            )}
            {activeTab === "atm" && <ATMPanel onRefresh={fetchAccount} />}
            {activeTab === "loan" && <LoanPanel />}
            {activeTab === "complaint" && <ComplaintPanel />}
            {activeTab === "profile" && <ProfilePanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
