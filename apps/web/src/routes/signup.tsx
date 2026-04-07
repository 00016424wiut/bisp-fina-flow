// apps/web/src/routes/signup.tsx
// Форма регистрации — разная для manager и provider

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

const inputStyle = {
  width: "100%", border: "none",
  borderBottom: "1px solid #d4a0a4",
  padding: "10px 0", fontSize: "14px",
  fontFamily: "Georgia, serif", background: "transparent",
  outline: "none", color: "#2c2c2c",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  fontSize: "10px", color: "#a0a0a0",
  textTransform: "uppercase" as const,
  letterSpacing: "1px", marginBottom: "4px",
  display: "block",
};

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") === "provider" ? "provider" : "manager";
  const isProvider = role === "provider";

  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    companyName: "", password: "", confirmPassword: "",
    telegramUsername: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setError("");

    if (!form.name || !form.phone || !form.email || !form.password) {
      setError("Please fill in all required fields");
      return;
    }
    if (isProvider && !form.companyName) {
      setError("Please enter your business name");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      // Шаг 1 — регистрация через Better-Auth
      await authClient.signUp.email(
        {
          email: form.email,
          password: form.password,
          name: form.name,
        },
        {
          onError: (err) => {
            throw new Error(err.error.message || err.error.statusText);
          },
        }
      );

      // Шаг 2 — onboarding: создать компанию + установить роль
      const res = await fetch("http://localhost:3000/api/onboarding", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: isProvider ? "PROVIDER" : "MANAGER",
          companyName: isProvider ? form.companyName : form.companyName || `${form.name}'s Team`,
          phone: form.phone,
          telegramUsername: form.telegramUsername || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Setup failed");
      }

      toast.success("Account created successfully!");
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      fontFamily: "Georgia, serif",
      minHeight: "100vh", background: "#ffffff",
      display: "flex", alignItems: "center",
      justifyContent: "center", padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <span style={{ fontSize: "28px", fontStyle: "italic", color: "#2c2c2c" }}>FLOW</span>
        </div>

        {/* Back */}
        <button
          onClick={() => navigate("/onboarding")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#a0a0a0", marginBottom: "24px", fontFamily: "Georgia, serif", padding: 0 }}
        >
          ← Back
        </button>

        <h1 style={{ fontSize: "24px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 4px" }}>
          {isProvider ? "List your business" : "Create an account"}
        </h1>
        <p style={{ fontSize: "13px", color: "#a0a0a0", margin: "0 0 32px" }}>
          {isProvider ? "Set up your provider account" : "Start booking amazing venues"}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          <div>
            <label style={labelStyle}>Full name *</label>
            <input value={form.name} onChange={e => update("name", e.target.value)}
              placeholder="Your full name" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Phone number *</label>
            <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)}
              placeholder="+998 __ ___ __ __" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Email *</label>
            <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
              placeholder="your@email.com" style={inputStyle} />
          </div>

          {/* Только для provider */}
          {isProvider && (
            <>
              <div>
                <label style={labelStyle}>Business name *</label>
                <input value={form.companyName} onChange={e => update("companyName", e.target.value)}
                  placeholder="Your venue or service name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Telegram username (optional)</label>
                <input value={form.telegramUsername} onChange={e => update("telegramUsername", e.target.value)}
                  placeholder="@yourusername" style={inputStyle} />
                <p style={{ fontSize: "11px", color: "#a0a0a0", margin: "4px 0 0" }}>
                  For receiving booking notifications
                </p>
              </div>
            </>
          )}

          {/* Только для manager — название компании опционально */}
          {!isProvider && (
            <div>
              <label style={labelStyle}>Company name (optional)</label>
              <input value={form.companyName} onChange={e => update("companyName", e.target.value)}
                placeholder="Your company" style={inputStyle} />
            </div>
          )}

          <div>
            <label style={labelStyle}>Password *</label>
            <input type="password" value={form.password} onChange={e => update("password", e.target.value)}
              placeholder="Min 8 characters" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Confirm password *</label>
            <input type="password" value={form.confirmPassword} onChange={e => update("confirmPassword", e.target.value)}
              placeholder="Repeat password" style={inputStyle} />
          </div>

          {error && (
            <p style={{ fontSize: "12px", color: "#e05c5c", margin: 0 }}>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%", background: loading ? "#d0d0d0" : "#2c2c2c",
              color: "white", border: "none", borderRadius: "30px",
              padding: "14px", fontSize: "14px",
              fontFamily: "Georgia, serif",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "8px",
            }}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p style={{ textAlign: "center", fontSize: "13px", color: "#a0a0a0", margin: 0 }}>
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#2c2c2c", fontSize: "13px", fontFamily: "Georgia, serif", textDecoration: "underline" }}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
