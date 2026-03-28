// Trigger deployment with frontend root directory
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/Layout";
import ChatInterface from "./components/ChatInterface";
import VoicePage from "./pages/VoicePage";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

// ── Protected Route: requires login ──────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ── Admin Route: requires admin role ─────────────────────────────────────────
function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Root redirect: sends to right dashboard ───────────────────────────────────
function RootRedirect() {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin() ? "/admin" : "/dashboard"} replace />;
}

// ── Public route: redirect authenticated users ────────────────────────────────
function PublicRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (user)
    return <Navigate to={isAdmin() ? "/admin" : "/dashboard"} replace />;
  return children;
}

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F4F8FD]">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-[#185FA5] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-500 font-medium text-sm">Loading BranchIQ...</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <SignupPage />
                </PublicRoute>
              }
            />

            {/* Root redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Layout>
                    <div className="p-4 md:p-6 min-h-full">
                      <AdminDashboard />
                    </div>
                  </Layout>
                </AdminRoute>
              }
            />

            {/* User dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <UserDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Shared authenticated routes */}
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="h-full bg-white flex flex-col pt-2 pb-6 px-4 md:px-8">
                      <div className="mb-4">
                        <p className="text-gray-500 font-medium">
                          Hello, how can we help you today?
                        </p>
                      </div>
                      <div className="flex-1 min-h-0 bg-gray-50/50 p-2 md:p-6 rounded-2xl border border-gray-100">
                        <ChatInterface />
                      </div>
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/voice"
              element={
                <ProtectedRoute>
                  <Layout>
                    <VoicePage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
