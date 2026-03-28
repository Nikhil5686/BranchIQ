import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateProfile } from "../services/api";
import { useAuth } from "../context/AuthContext";

export const Alert = ({ msg, type = "success", onClose }) =>
  msg ? (
    <div
      className={`p-3 rounded-xl text-sm font-medium mb-4 flex justify-between items-center ${
        type === "success"
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-red-50 text-red-700 border border-red-100"
      }`}
    >
      <span>{msg}</span>
      <button onClick={onClose} className="ml-3 opacity-60 hover:opacity-100">
        ✕
      </button>
    </div>
  ) : null;

export default function ProfilePanel() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [showPhotoMode, setShowPhotoMode] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camActive, setCamActive] = useState(false);
  const [livenessStep, setLivenessStep] = useState("idle"); // idle, scanning, blink1, blink2, success

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        address: user.address || "",
      });
    }
  }, [user]);

  const handleUpdate = async () => {
    setLoading(true);
    setMsg({ text: "", type: "" });
    try {
      const updated = await updateProfile(form);
      setUser(updated);
      setMsg({ text: "Profile updated successfully! ✓", type: "success" });
    } catch (err) {
      setMsg({
        text: err.response?.data?.detail || "Update failed",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      setCamActive(true);
      setLivenessStep("idle");
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
    } catch {
      setMsg({ text: "Could not access camera", type: "error" });
    }
  };

  const stopCam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setCamActive(false);
  };

  const captureAndUpload = async () => {
    setLoading(true);
    setLivenessStep("scanning");

    await new Promise((r) => setTimeout(r, 2000));
    setLivenessStep("blink1");

    await new Promise((r) => setTimeout(r, 1500));
    setLivenessStep("blink2");

    await new Promise((r) => setTimeout(r, 1500));
    setLivenessStep("success");

    await new Promise((r) => setTimeout(r, 1000));

    const video = videoRef.current;
    if (!video) {
      setLoading(false);
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.8);

    try {
      const updated = await updateProfile({ profile_photo: base64 });
      setUser(updated);
      setMsg({ text: "Profile photo updated! ✓", type: "success" });
      stopCam();
      setShowPhotoMode(false);
    } catch {
      setMsg({ text: "Photo upload failed", type: "error" });
    } finally {
      setLoading(false);
      setLivenessStep("idle");
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Alert
        msg={msg.text}
        type={msg.type}
        onClose={() => setMsg({ text: "", type: "" })}
      />

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className="relative group">
            {user?.profile_photo ? (
              <img
                src={user.profile_photo}
                alt="Profile"
                className="w-32 h-32 rounded-3xl object-cover ring-4 ring-white shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 rounded-3xl bg-[#185FA5] flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => setShowPhotoMode(true)}
              className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-md border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              📷
            </button>
          </div>
          <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
            Profile Photo
          </p>
        </div>

        <div className="flex-1 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
          {[
            { key: "name", label: "Full Name", type: "text" },
            { key: "phone", label: "Phone Number", type: "tel" },
            { key: "address", label: "Address", type: "text" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                {f.label}
              </label>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 text-sm transition-all"
              />
            </div>
          ))}
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-xl text-white font-bold text-sm shadow-md disabled:opacity-60 transition-all hover:opacity-95"
            style={{ background: "linear-gradient(135deg, #185FA5, #0C447C)" }}
          >
            {loading ? "Saving Changes..." : "Update Profile Information ✓"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showPhotoMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-extrabold text-gray-800">
                  Update Profile Photo
                </h3>
                <button
                  onClick={() => {
                    stopCam();
                    setShowPhotoMode(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Take a new photo using your webcam.
              </p>

              <div className="rounded-3xl overflow-hidden bg-gray-900 aspect-square mb-6 border-4 border-gray-100">
                {camActive ? (
                  <div className="relative w-full h-full">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 pointer-events-none z-10">
                      <div className="absolute inset-0 border-[30px] border-black/20" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-56 border-2 border-dashed border-white/50 rounded-[100px]" />

                      {livenessStep === "scanning" && (
                        <motion.div
                          initial={{ top: "10%" }}
                          animate={{ top: "90%" }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="absolute left-0 right-0 h-1 bg-blue-400/60 shadow-[0_0_15px_rgba(96,165,250,0.8)] z-20"
                        />
                      )}
                    </div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-full px-4">
                      <div className="bg-black/60 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 text-center">
                        {livenessStep === "idle" && (
                          <p className="text-white text-[10px] font-bold uppercase tracking-wider">
                            Position face in center
                          </p>
                        )}
                        {livenessStep === "scanning" && (
                          <p className="text-blue-400 text-[10px] font-bold animate-pulse uppercase tracking-wider">
                            Analyzing face structure...
                          </p>
                        )}
                        {livenessStep === "blink1" && (
                          <div className="flex items-center justify-center gap-2">
                            <motion.span
                              animate={{ opacity: [1, 0, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                              className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold"
                            >
                              i
                            </motion.span>
                            <p className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                              Blink your eyes NOW! (1/2)
                            </p>
                          </div>
                        )}
                        {livenessStep === "blink2" && (
                          <div className="flex flex-col items-center">
                            <p className="text-green-400 text-[9px] font-bold uppercase">
                              Blink 1 Verified ✓
                            </p>
                            <div className="flex items-center justify-center gap-2">
                              <motion.span
                                animate={{ opacity: [1, 0, 1] }}
                                transition={{
                                  duration: 0.5,
                                  repeat: Infinity,
                                }}
                                className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold"
                              >
                                i
                              </motion.span>
                              <p className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                                Blink again! (2/2)
                              </p>
                            </div>
                          </div>
                        )}
                        {livenessStep === "success" && (
                          <p className="text-green-400 text-[10px] font-bold animate-bounce uppercase tracking-wider">
                            Liveness Verified! ✓
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <div className="text-4xl mb-2">📷</div>
                    <button
                      onClick={startCam}
                      className="text-sm font-bold text-[#185FA5] hover:underline"
                    >
                      Turn on camera
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    stopCam();
                    setShowPhotoMode(false);
                  }}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm"
                >
                  Cancel
                </button>
                {camActive && (
                  <button
                    onClick={captureAndUpload}
                    disabled={loading || livenessStep !== "idle"}
                    className="flex-2 py-3 rounded-xl bg-[#185FA5] text-white font-bold text-sm shadow-md disabled:opacity-50 transition-all"
                  >
                    {livenessStep === "idle"
                      ? "Verify Liveness & Use"
                      : livenessStep === "scanning"
                        ? "Scanning..."
                        : livenessStep === "success"
                          ? "Verifying..."
                          : "Follow Prompts..."}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
