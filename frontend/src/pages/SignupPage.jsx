import React, { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { registerUser, verifyOTP, uploadPhoto } from "../services/api";
import { useAuth } from "../context/AuthContext";

const STEPS = ["Role", "Info", "Email OTP", "Phone OTP", "Photo", "Done"];

const StepIndicator = ({ current }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {STEPS.map((s, i) => (
      <React.Fragment key={s}>
        <div
          className={`flex items-center gap-1.5 ${i <= current ? "text-[#185FA5]" : "text-gray-300"}`}
        >
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              i < current
                ? "bg-[#185FA5] border-[#185FA5] text-white"
                : i === current
                  ? "bg-white border-[#185FA5] text-[#185FA5]"
                  : "bg-white border-gray-200 text-gray-300"
            }`}
          >
            {i < current ? "✓" : i + 1}
          </div>
          <span className="hidden sm:block text-xs font-semibold">{s}</span>
        </div>
        {i < STEPS.length - 1 && (
          <div
            className={`flex-1 h-0.5 max-w-8 ${i < current ? "bg-[#185FA5]" : "bg-gray-200"}`}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

export default function SignupPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [role, setRole] = useState("customer");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
    adminToken: "",
  });
  const [regData, setRegData] = useState(null); // { user_id, dev_email_otp, dev_sms_otp, account_number }
  const [emailOtp, setEmailOtp] = useState("");
  const [smsOtp, setSmsOtp] = useState("");
  const [photoBase64, setPhotoBase64] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camActive, setCamActive] = useState(false);

  const goNext = () => {
    setError("");
    setStep((s) => s + 1);
  };

  // ── Step 0: Role ─────────────────────────────────────────────────────────────
  const RoleStep = () => (
    <div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
        Who are you?
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Select your account type to get started.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            key: "customer",
            label: "Customer",
            desc: "Access banking services, transfers & more",
            icon: "👤",
            color: "#185FA5",
          },
          {
            key: "admin",
            label: "Admin",
            desc: "Manage users, approve requests & analytics",
            icon: "🛡️",
            color: "#27500A",
          },
        ].map((r) => (
          <button
            key={r.key}
            onClick={() => setRole(r.key)}
            className={`p-5 rounded-2xl border-2 text-left transition-all ${role === r.key ? "border-[#185FA5] bg-[#F4F8FD] shadow-md" : "border-gray-200 bg-white hover:border-gray-300"}`}
          >
            <div className="text-3xl mb-3">{r.icon}</div>
            <p className="font-bold text-gray-900">{r.label}</p>
            <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
          </button>
        ))}
      </div>
      <button
        onClick={goNext}
        className="w-full mt-6 py-3.5 rounded-xl text-white font-bold text-sm"
        style={{ background: "linear-gradient(135deg, #185FA5, #0C447C)" }}
      >
        Continue as {role === "admin" ? "Admin" : "Customer"} →
      </button>
    </div>
  );

  // ── Step 1: Info ─────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const params = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        password: form.password,
        role,
      };
      if (role === "admin") params.admin_invite_token = form.adminToken;
      const data = await registerUser(params);
      setRegData(data);
      goNext();
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const InfoStep = () => (
    <div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
        Create your account
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Fill in your personal details below.
      </p>
      <div className="space-y-4">
        {[
          {
            key: "name",
            label: "Full Name",
            type: "text",
            placeholder: "John Doe",
          },
          {
            key: "email",
            label: "Email Address",
            type: "email",
            placeholder: "you@example.com",
          },
          {
            key: "phone",
            label: "Phone Number",
            type: "tel",
            placeholder: "+91-9876543210",
          },
          {
            key: "address",
            label: "Address",
            type: "text",
            placeholder: "City, State",
          },
          {
            key: "password",
            label: "Password",
            type: "password",
            placeholder: "••••••••",
          },
          {
            key: "confirmPassword",
            label: "Confirm Password",
            type: "password",
            placeholder: "••••••••",
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5] text-sm transition-all"
            />
          </div>
        ))}
        {role === "admin" && (
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Admin Invite Token (if not whitelisted)
            </label>
            <input
              type="text"
              value={form.adminToken}
              placeholder="BRANCHIQ-ADMIN-2024"
              onChange={(e) => setForm({ ...form, adminToken: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5] text-sm transition-all"
            />
          </div>
        )}
      </div>
      {error && (
        <p className="mt-4 text-red-600 text-sm font-medium">{error}</p>
      )}
      <button
        onClick={handleRegister}
        disabled={loading}
        className="w-full mt-5 py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, #185FA5, #0C447C)" }}
      >
        {loading ? "Creating account..." : "Create Account & Get OTPs →"}
      </button>
    </div>
  );

  // ── Step 2: Email OTP ─────────────────────────────────────────────────────────
  const handleEmailOTP = async () => {
    setError("");
    setLoading(true);
    try {
      await verifyOTP(form.email, "email", emailOtp);
      goNext();
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const OTPStep = ({
    title,
    desc,
    otpValue,
    setOtp,
    devOtp,
    onSubmit,
    otpType,
  }) => (
    <div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-1">{title}</h2>
      <p className="text-gray-500 text-sm mb-6">{desc}</p>

      {devOtp && (
        <div className="p-4 mb-5 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
            Demo OTP (no provider needed)
          </p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-mono font-extrabold text-amber-700 tracking-widest">
              {devOtp}
            </span>
            <button
              onClick={() => setOtp(devOtp)}
              className="px-3 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold"
            >
              Use This OTP
            </button>
          </div>
        </div>
      )}

      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
        Enter 6-Digit OTP
      </label>
      <input
        type="text"
        maxLength={6}
        value={otpValue}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        placeholder="000000"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5] text-2xl font-mono text-center tracking-widest transition-all"
      />

      {error && (
        <p className="mt-3 text-red-600 text-sm font-medium">{error}</p>
      )}

      <button
        onClick={onSubmit}
        disabled={loading || otpValue.length !== 6}
        className="w-full mt-5 py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, #185FA5, #0C447C)" }}
      >
        {loading ? "Verifying..." : `Verify ${otpType} OTP →`}
      </button>
    </div>
  );

  // ── Step 4: SMS OTP ───────────────────────────────────────────────────────────
  const handleSmsOTP = async () => {
    setError("");
    setLoading(true);
    try {
      await verifyOTP(form.email, "sms", smsOtp);
      goNext();
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: Webcam ────────────────────────────────────────────────────────────
  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamActive(true);
    } catch {
      setError("Could not access camera. Please allow camera permission.");
    }
  };

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.8);
    setPhotoBase64(base64);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCamActive(false);
  }, []);

  const handlePhotoUpload = async () => {
    if (!photoBase64) {
      setError("Please capture a photo first");
      return;
    }
    setLoading(true);
    try {
      await uploadPhoto(form.email, photoBase64);
      // Auto-login after photo
      await authLogin(form.email, form.password);
      goNext();
    } catch {
      setError("Photo upload failed. Continuing...");
      try {
        await authLogin(form.email, form.password);
      } catch {
        // ignore fallback error
      }
      goNext();
    } finally {
      setLoading(false);
    }
  };

  const PhotoStep = () => (
    <div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
        Profile Photo
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Take a live photo for your account verification.
      </p>

      <div className="rounded-2xl overflow-hidden bg-gray-900 aspect-video mb-4 flex items-center justify-center">
        {camActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : photoBase64 ? (
          <img
            src={photoBase64}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center text-gray-400">
            <div className="text-5xl mb-3">📷</div>
            <p className="text-sm">Camera not started</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {!camActive && !photoBase64 && (
          <button
            onClick={startCam}
            className="flex-1 py-3 rounded-xl bg-[#185FA5] text-white font-bold text-sm"
          >
            Start Camera
          </button>
        )}
        {camActive && (
          <button
            onClick={capturePhoto}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm"
          >
            Capture Photo
          </button>
        )}
        {photoBase64 && (
          <button
            onClick={() => {
              setPhotoBase64(null);
              startCam();
            }}
            className="px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm"
          >
            Retake
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-red-600 text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          onClick={handlePhotoUpload}
          disabled={loading}
          className="py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #185FA5, #0C447C)" }}
        >
          {loading ? "Saving..." : "Save & Continue →"}
        </button>
        <button
          onClick={async () => {
            try {
              await authLogin(form.email, form.password);
            } catch {
              // ignore
            }
            goNext();
          }}
          className="py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm"
        >
          Skip for Now
        </button>
      </div>
    </div>
  );

  // ── Step 5: Done ──────────────────────────────────────────────────────────────
  const DoneStep = () => (
    <div className="text-center">
      <div className="text-7xl mb-4">🎉</div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
        Account Created!
      </h2>
      <p className="text-gray-500 text-sm mb-2">
        Your BranchIQ banking account is ready.
      </p>
      {regData?.account_number && (
        <p className="text-[#185FA5] font-bold text-sm mb-6">
          Account Number: {regData.account_number}
        </p>
      )}
      <button
        onClick={() => {
          if (role === "admin") navigate("/admin");
          else navigate("/dashboard");
        }}
        className="w-full py-3.5 rounded-xl text-white font-bold"
        style={{ background: "linear-gradient(135deg, #185FA5, #0C447C)" }}
      >
        Go to Dashboard →
      </button>
    </div>
  );

  const stepContent = [
    <RoleStep key="role" />,
    <InfoStep key="info" />,
    <OTPStep
      key="emailotp"
      title="Email Verification"
      desc={`We sent an OTP to ${form.email}`}
      otpValue={emailOtp}
      setOtp={setEmailOtp}
      devOtp={regData?.dev_email_otp}
      onSubmit={handleEmailOTP}
      otpType="Email"
    />,
    <OTPStep
      key="smsotp"
      title="Phone Verification"
      desc={`We sent an OTP to ${form.phone}`}
      otpValue={smsOtp}
      setOtp={setSmsOtp}
      devOtp={regData?.dev_sms_otp}
      onSubmit={handleSmsOTP}
      otpType="SMS"
    />,
    <PhotoStep key="photo" />,
    <DoneStep key="done" />,
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#F4F8FD] p-4"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-8 h-8 bg-[#185FA5] rounded-lg flex items-center justify-center text-white font-bold">
            B
          </div>
          <span className="font-bold text-[#0C447C] text-xl">BranchIQ</span>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <StepIndicator current={step} />
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {stepContent[step]}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[#185FA5] font-bold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
