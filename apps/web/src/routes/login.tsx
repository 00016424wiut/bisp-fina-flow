import { useState } from "react";
import { useNavigate } from "react-router";
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

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setError("");
    if (!form.email || !form.password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await authClient.signIn.email(
        { email: form.email, password: form.password },
        {
          onSuccess: () => {
            toast.success("Welcome back!");
            navigate("/");
          },
          onError: (err) => {
            setError(err.error.message || "Invalid email or password");
          },
        }
      );
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
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <span
            onClick={() => navigate("/")}
            style={{ fontSize: "28px", fontStyle: "italic", color: "#2c2c2c", cursor: "pointer" }}
          >
            FLOW
          </span>
        </div>

        <h1 style={{ fontSize: "24px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 4px" }}>
          Welcome back
        </h1>
        <p style={{ fontSize: "13px", color: "#a0a0a0", margin: "0 0 32px" }}>
          Sign in to your account
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => update("email", e.target.value)}
              placeholder="your@email.com"
              style={inputStyle}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => update("password", e.target.value)}
              placeholder="Your password"
              style={inputStyle}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {error && (
            <p style={{ fontSize: "12px", color: "#e05c5c", margin: 0 }}>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#d0d0d0" : "#2c2c2c",
              color: "white", border: "none", borderRadius: "30px",
              padding: "14px", fontSize: "14px",
              fontFamily: "Georgia, serif",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "8px",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p style={{ textAlign: "center", fontSize: "13px", color: "#a0a0a0", margin: 0 }}>
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/onboarding")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#2c2c2c", fontSize: "13px",
                fontFamily: "Georgia, serif", textDecoration: "underline",
              }}
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
