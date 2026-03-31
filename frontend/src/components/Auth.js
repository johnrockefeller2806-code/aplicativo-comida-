import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, ShoppingBag, Store, Bike } from "lucide-react";

export default function Auth() {
  const { role } = useParams();
  const nav = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);

  const roleInfo = {
    customer: { icon: ShoppingBag, title: "Customer", color: "#D97746" },
    restaurant: { icon: Store, title: "Restaurant", color: "#1E3F20" },
    rider: { icon: Bike, title: "Rider", color: "#8B5E3C" },
  };
  const info = roleInfo[role] || roleInfo.customer;

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

          <h1 className="font-heading font-bold text-3xl text-[#1A1D1A] mb-8">
            {isLogin ? "Welcome back" : "Create account"}
          </h1>

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
