// apps/web/src/routes/onboarding.tsx
// Первый экран — выбор роли

import { useNavigate } from "react-router";

export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <div style={{
      fontFamily: "Georgia, serif",
      minHeight: "100vh", background: "#ffffff",
      display: "flex", alignItems: "center",
      justifyContent: "center", padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <span style={{ fontSize: "32px", fontStyle: "italic", color: "#2c2c2c" }}>FLOW</span>
        </div>

        <h1 style={{ fontSize: "24px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 8px", textAlign: "center" }}>
          Welcome to Flow
        </h1>
        <p style={{ fontSize: "14px", color: "#a0a0a0", textAlign: "center", margin: "0 0 48px" }}>
          How would you like to use Flow?
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Book */}
          <button
            onClick={() => navigate("/signup?role=manager")}
            style={{
              background: "white", border: "1px solid #e8d4d6",
              borderRadius: "16px", padding: "40px 24px",
              cursor: "pointer", textAlign: "center",
              transition: "all 0.2s", outline: "none",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "#2c2c2c";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "#e8d4d6";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "16px" }}>🗓</div>
            <h3 style={{ fontSize: "16px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 8px", fontFamily: "Georgia, serif" }}>
              I want to book
            </h3>
            <p style={{ fontSize: "12px", color: "#a0a0a0", margin: 0, fontFamily: "Georgia, serif", lineHeight: 1.5 }}>
              Find and book venues, activities and services for your events
            </p>
          </button>

          {/* List */}
          <button
            onClick={() => navigate("/signup?role=provider")}
            style={{
              background: "white", border: "1px solid #e8d4d6",
              borderRadius: "16px", padding: "40px 24px",
              cursor: "pointer", textAlign: "center",
              transition: "all 0.2s", outline: "none",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "#2c2c2c";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "#e8d4d6";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "16px" }}>🏢</div>
            <h3 style={{ fontSize: "16px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 8px", fontFamily: "Georgia, serif" }}>
              I want to list
            </h3>
            <p style={{ fontSize: "12px", color: "#a0a0a0", margin: 0, fontFamily: "Georgia, serif", lineHeight: 1.5 }}>
              List my venue, activity or service and reach customers
            </p>
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: "32px", fontSize: "13px", color: "#a0a0a0" }}>
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
  );
}
