import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Interceptors ─────────────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("branchiq_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("branchiq_token");
      localStorage.removeItem("branchiq_user");
    }
    return Promise.reject(error);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const registerUser = async (userData) => {
  const res = await api.post("/api/auth/register", userData);
  return res.data;
};

export const verifyOTP = async (email, otpType, code) => {
  const res = await api.post("/api/auth/verify-otp", {
    email,
    otp_type: otpType,
    code,
  });
  return res.data;
};

export const uploadPhoto = async (email, photoBase64) => {
  const res = await api.post("/api/auth/upload-photo", {
    email,
    photo_base64: photoBase64,
  });
  return res.data;
};

export const login = async (email, password) => {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);
  const res = await api.post("/api/auth/login", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (res.data.access_token) {
    localStorage.setItem("branchiq_token", res.data.access_token);
    localStorage.setItem("branchiq_user", JSON.stringify(res.data.user));
  }
  return res.data;
};

export const logout = () => {
  localStorage.removeItem("branchiq_token");
  localStorage.removeItem("branchiq_user");
};

export const getMe = async () => {
  const res = await api.get("/api/auth/me");
  return res.data;
};

export const requestATMPinOTP = async () => {
  const res = await api.post("/api/auth/request-atm-pin-otp");
  return res.data;
};

export const setATMPin = async (otpCode, newPin) => {
  const res = await api.post("/api/auth/set-atm-pin", {
    otp_code: otpCode,
    new_pin: newPin,
  });
  return res.data;
};

// ─── Account ──────────────────────────────────────────────────────────────────
export const getMyAccount = async () => {
  const res = await api.get("/api/accounts/me");
  return res.data;
};

// ─── Transfers ────────────────────────────────────────────────────────────────
export const makeTransfer = async (data) => {
  const res = await api.post("/api/transfers/", data);
  return res.data;
};

export const getTransfers = async () => {
  const res = await api.get("/api/transfers/");
  return res.data;
};

// ─── Banking Requests ─────────────────────────────────────────────────────────
export const createRequest = async (data) => {
  const res = await api.post("/api/requests/", data);
  return res.data;
};

export const getMyRequests = async () => {
  const res = await api.get("/api/requests/");
  return res.data;
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const getAdminDashboard = async () => {
  const res = await api.get("/api/admin/dashboard");
  return res.data;
};

export const getAdminUsers = async () => {
  const res = await api.get("/api/admin/users");
  return res.data;
};

export const getAdminRequests = async () => {
  const res = await api.get("/api/admin/requests");
  return res.data;
};

export const updateRequestStatus = async (id, action, notes = "") => {
  const res = await api.patch(`/api/admin/requests/${id}`, { action, notes });
  return res.data;
};

// ─── Chat & Voice (existing) ──────────────────────────────────────────────────
export const sendMessage = async (
  sessionId,
  message,
  language,
  channel,
  history,
) => {
  const res = await api.post("/api/chat/message", {
    session_id: sessionId,
    message,
    language,
    channel,
    history,
  });
  return res.data;
};

export const transcribeVoice = async (audioBlob) => {
  const formData = new FormData();
  formData.append("file", audioBlob, "voice_recording.webm");
  const res = await axios.post(`${BASE_URL}/api/voice/transcribe`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${localStorage.getItem("branchiq_token")}`,
    },
  });
  return res.data;
};

export const getAnalytics = async () => {
  const res = await api.get("/api/analytics/stats");
  return res.data;
};
