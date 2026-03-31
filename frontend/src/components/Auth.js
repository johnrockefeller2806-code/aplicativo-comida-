import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, ShoppingBag, Store, Bike } from "lucide-react";

export default function Auth() {
  const { role } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const hasProcessedSession = useRef(false);

  const roleInfo = {
    customer: { icon: ShoppingBag, title: "Customer", color: "#D97746" },
    restaurant: { icon: Store, title: "Restaurant", color: "#1E3F20" },
    rider: { icon: Bike, title: "Rider", color: "#8B5E3C" },
  };
  const info = roleInfo[role] || roleInfo.customer;

  // Process Google OAuth callback (session_id in URL hash)
  useEffect(() => {
    if (hasProcessedSession.current) return;

    const hash = window.location.hash;
    if (!hash || !hash.includes("session_id=")) return;

    hasProcessedSession.current = true;
    const sessionId = hash.split("session_id=")[1]?.split("&")[0];
    if (!sessionId) return;

    // Clean the hash from URL
    window.history.replaceState(null, "", window.location.pathname);

    setGoogleLoading(true);
    axios
      .post(`${API}/auth/google`, { session_id: sessionId, role: role || "customer" })
      .then((res) => {
        login(res.data.token, res.data.user);
        toast.success("Login com Google realizado!");
        nav("/");
      })
      .catch((err) => {
        toast.error(err.response?.data?.detail || "Erro no login com Google");
        setGoogleLoading(false);
      });
  }, [location.hash, role, login, nav]);

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + "/auth/" + (role || "customer");
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin
        ? { email: form.email, password: form.password }
        : { ...form, role };
      const res = await axios.post(`${API}${endpoint}`, payload);
      login(res.data.token, res.data.user);
      toast.success(isLogin ? "Welcome back!" : "Account created!");
      nav("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (googleLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="Kangaroos" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <p className="text-[#5C635A] font-medium">Entrando com Google...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex" data-testid="auth-page">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12" style={{ background: info.color }}>
        <div className="text-white text-center max-w-md">
          <img src="/logo.png" alt="Kangaroos" className="w-24 h-24 mx-auto mb-8 object-contain" />
          <h2 className="font-heading font-bold text-4xl mb-4">Kangaroos</h2>
          <p className="text-white/80 text-lg">Fast Delivery, Fair for Everyone</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button
            onClick={() => nav("/")}
            className="flex items-center gap-2 text-[#5C635A] hover:text-[#1A1D1A] mb-8 transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <info.icon className="w-6 h-6" style={{ color: info.color }} />
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: info.color }}>
              {info.title}
            </span>
          </div>

          <h1 className="font-heading font-bold text-3xl text-[#1A1D1A] mb-6">
            {isLogin ? "Welcome back" : "Create account"}
          </h1>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-4 rounded-xl font-bold text-[#1A1D1A] bg-white border-2 border-[#E5E1D8] hover:border-[#D5CFC5] hover:bg-[#FAFAFA] transition-all active:scale-[0.98] flex items-center justify-center gap-3 mb-6 shadow-sm"
            data-testid="google-login-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Entrar com Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-[#E5E1D8]" />
            <span className="text-xs text-[#B8B0A4] font-medium uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-[#E5E1D8]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-[#5C635A] mb-1">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] bg-white focus:border-[#D97746] focus:ring-1 focus:ring-[#D97746] outline-none transition-colors"
                  placeholder="Your name"
                  required
                  data-testid="name-input"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#5C635A] mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] bg-white focus:border-[#D97746] focus:ring-1 focus:ring-[#D97746] outline-none transition-colors"
                placeholder="your@email.com"
                required
                data-testid="email-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#5C635A] mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] bg-white focus:border-[#D97746] focus:ring-1 focus:ring-[#D97746] outline-none transition-colors"
                placeholder="Min 6 characters"
                required
                minLength={6}
                data-testid="password-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ background: info.color }}
              data-testid="auth-submit-btn"
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-[#5C635A] mt-6">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-semibold hover:underline"
              style={{ color: info.color }}
              data-testid="toggle-auth-btn"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
