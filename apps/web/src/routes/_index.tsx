import { Link, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";

type AiSearchResult = {
  id: string;
  name: string;
  score: number;
  reason: string;
  category: string;
  pricePerHour: string;
  capacity: number | null;
  rating: number | null;
};

type Venue = {
  id: string;
  name: string;
  category: string;
  pricePerHour: string;
  capacity: number | null;
  rating: number | null;
};

const Divider = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 48px" }}>
    <div style={{ width: "800px", height: "1px", background: "#d4a0a4" }} />
    <div style={{ width: "8px", height: "8px", background: "#d4a0a4", transform: "rotate(45deg)", margin: "0 16px", flexShrink: 0 }} />
    <div style={{ width: "800px", height: "1px", background: "#d4a0a4" }} />
  </div>
);

export default function Home() {
  const [when, setWhen] = useState("");
  const [guests, setGuests] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const [trendingVenues, setTrendingVenues] = useState<Venue[]>([]);
  const [vibeQuery, setVibeQuery] = useState("");
  const [vibeResults, setVibeResults] = useState<AiSearchResult[]>([]);
  const [vibeLoading, setVibeLoading] = useState(false);
  const [vibeSearched, setVibeSearched] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/api/venues"), { credentials: "include" })
      .then(res => res.json())
      .then(data => setTrendingVenues(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => {});
  }, []);

  const handleVibeSearch = async () => {
    if (!vibeQuery.trim()) return;
    setVibeLoading(true);
    setVibeSearched(true);
    try {
      const res = await fetch(apiUrl("/api/ai-search"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: vibeQuery.trim() }),
      });
      const data = await res.json();
      setVibeResults(data.results ?? []);
    } catch {
      setVibeResults([]);
    } finally {
      setVibeLoading(false);
    }
  };

  const categorySlug = (cat: string) =>
    cat.toLowerCase().replace(/_/g, "-");

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#ffffff", minHeight: "100vh" }}>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid #e8d4d6",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: "56px",
      }}>
        <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
          <span style={{ fontSize: "24px", color: "#2c2c2c", fontStyle: "italic" }}>FLOW</span>
          <div style={{ display: "flex", gap: "24px" }}>
            {["Restaurants", "Outdoor", "Master Classes", "Activities", "Gifts"].map(item => (
              <Link
                key={item}
                to={`/${item.toLowerCase().replace(" ", "-")}`}
                style={{ fontSize: "13px", color: "#5a5a5a", textDecoration: "none" }}
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {session ? (
            // После логина — иконки корзины и профиля
            <>
              <button
                onClick={() => navigate ( "/cart" )}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#2c2c2c" }}
              >
                🛒
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                style={{
                  background: "none", border: "1px solid #e8d4d6",
                  borderRadius: "50%", width: "32px", height: "32px",
                  cursor: "pointer", fontSize: "14px", color: "#2c2c2c",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                title="Sign out"
              >
                👤
              </button>
            </>
          ) : (
            // Не залогинен — Login и Sign Up
            <>
              <Link to="/login" style={{ fontSize: "13px", color: "#5a5a5a", textDecoration: "none" }}>Login</Link>
              <Link to="/onboarding" style={{
                fontSize: "13px", color: "#2c2c2c", textDecoration: "none",
                border: "1px solid #2c2c2c", padding: "6px 16px", borderRadius: "20px",
              }}>Sign Up</Link>
            </>
          )}
        </div>

      </nav>

      {/* HERO */}
      <section style={{ textAlign: "center", padding: "80px 48px 60px" }}>
        <h1 style={{
          fontSize: "clamp(36px, 6vw, 68px)", fontWeight: 400,
          color: "#2c2c2c", lineHeight: 1.1, margin: "0 0 16px",
          letterSpacing: "-1px",
        }}>
          STOP SEARCHING,<br />START PARTYING
        </h1>
        <p style={{ fontSize: "14px", color: "#7a7a7a", margin: "0 0 40px" }}>
          From underground neon lofts to rooftop terraces. Find the ultimate spot for your next legendary night.
        </p>
        {/* Search bar */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "0",
          background: "white", border: "1px solid #d4a0a4",
          borderRadius: "40px", padding: "14px 8px 14px 28px",
          boxShadow: "0 2px 20px rgba(212,160,164,0.1)",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "0 20px 0 0" }}>
            <span style={{ fontSize: "15px", color: "#000000", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "4px" }}>When?</span>
            <input type="date" value={when} onChange={e => setWhen(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: "13px", fontFamily: "Georgia, serif", color: "#2c2c2c", background: "transparent", width: "130px" }} />
          </div>

          <div style={{ width: "1px", height: "28px", background: "#e8d4d6", flexShrink: 0 }} />

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "0 20px" }}>
            <span style={{ fontSize: "15px", color: "#000000", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "4px" }}>How many guests?</span>
            <input type="number" placeholder="20" value={guests} onChange={e => setGuests(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: "13px", fontFamily: "Georgia, serif", color: "#2c2c2c", background: "transparent", width: "80px" }} />
          </div>

          <button style={{
            background: "#2c2c2c", color: "white", border: "none",
            borderRadius: "30px", padding: "12px 28px", fontSize: "13px",
            fontFamily: "Georgia, serif", cursor: "pointer", marginLeft: "8px",
            whiteSpace: "nowrap",
          }}>Let's Party</button>
        </div>

        {/* AI Vibe Search */}
        <div style={{ marginTop: "24px" }}>
          <p style={{ fontSize: "13px", color: "#7a7a7a", fontStyle: "italic", margin: "0 0 12px" }}>
            or describe your perfect vibe...
          </p>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0",
            background: "white", border: "1px solid #d4a0a4",
            borderRadius: "40px", padding: "6px 6px 6px 24px",
            boxShadow: "0 2px 20px rgba(212,160,164,0.1)",
            maxWidth: "600px", width: "100%",
          }}>
            <input
              type="text"
              placeholder="e.g. cozy rooftop with live jazz for 20 people"
              value={vibeQuery}
              onChange={e => setVibeQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleVibeSearch()}
              style={{
                border: "none", outline: "none", fontSize: "13px",
                fontFamily: "Georgia, serif", color: "#2c2c2c",
                background: "transparent", flex: 1, minWidth: 0,
              }}
            />
            <button
              onClick={handleVibeSearch}
              disabled={vibeLoading}
              style={{
                background: "#2c2c2c", color: "white", border: "none",
                borderRadius: "30px", padding: "10px 24px", fontSize: "13px",
                fontFamily: "Georgia, serif", cursor: vibeLoading ? "wait" : "pointer",
                whiteSpace: "nowrap", opacity: vibeLoading ? 0.7 : 1,
              }}
            >
              {vibeLoading ? "Searching..." : "Find My Vibe"}
            </button>
          </div>
        </div>

        {/* Vibe Search Results */}
        {vibeLoading && (
          <p style={{ fontSize: "13px", color: "#c4848a", fontStyle: "italic", marginTop: "20px" }}>
            Searching for your vibe...
          </p>
        )}

        {!vibeLoading && vibeSearched && vibeResults.length === 0 && (
          <p style={{ fontSize: "13px", color: "#7a7a7a", marginTop: "20px" }}>
            No venues matched your vibe. Try a different description.
          </p>
        )}

        {!vibeLoading && vibeResults.length > 0 && (
          <div style={{ marginTop: "28px", maxWidth: "800px", marginLeft: "auto", marginRight: "auto" }}>
            <p style={{ fontSize: "12px", color: "#a0a0a0", margin: "0 0 16px" }}>
              {vibeResults.length} {vibeResults.length === 1 ? "match" : "matches"} found
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
              {vibeResults.map(r => (
                <Link
                  key={r.id}
                  to={`/${categorySlug(r.category)}/${r.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{
                    background: "white", border: "1px solid #e8d4d6",
                    borderRadius: "8px", padding: "16px", textAlign: "left",
                    transition: "box-shadow 0.2s", cursor: "pointer",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(212,160,164,0.2)")}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "14px", color: "#2c2c2c" }}>{r.name}</span>
                      <span style={{
                        fontSize: "11px", background: "#f0dde0", color: "#c4848a",
                        padding: "3px 10px", borderRadius: "12px",
                      }}>
                        {r.score}% match
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#7a7a7a", fontStyle: "italic", margin: "0 0 8px", lineHeight: 1.5 }}>
                      {r.reason}
                    </p>
                    <div style={{ fontSize: "11px", color: "#a0a0a0", display: "flex", gap: "12px" }}>
                      <span>{categorySlug(r.category).replace(/-/g, " ")}</span>
                      {r.capacity && <span>{r.capacity} guests</span>}
                      <span>{Number(r.pricePerHour).toLocaleString()} UZS/hr</span>
                      {r.rating && <span>★ {r.rating}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </section>

      {/* WHY FLOW */}
      <section style={{ padding: "40px 48px 60px", textAlign: "center" }}>
        <h2 style={{ fontSize: "25px", color: "#000000", letterSpacing: "3px", textTransform: "uppercase", margin: "0 0 40px" }}>
          WHY FLOW?
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "32px", maxWidth: "800px", margin: "0 auto" }}>
          {[
            { icon: "✦", title: "Vetted for Vibes", desc: "We personally check every space. Only epic spots made the cut." },
            { icon: "⚡️", title: "Instant Booking", desc: "No slow email back-and-forth. Secure your spot in one click." },
            { icon: "◈", title: "No Hidden Buzzkills", desc: "Transparent pricing. What you see is what you pay." },
          ].map(item => (
            <div key={item.title}>
              <div style={{ fontSize: "25px", marginBottom: "12px", color: "#c4848a" }}>{item.icon}</div>
              <h3 style={{ fontSize: "15px", fontWeight: 400, margin: "0 0 8px", color: "#2c2c2c" }}>{item.title}</h3>
              <p style={{ fontSize: "13px", color: "#7a7a7a", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DIVIDER TOP */}
      <Divider />

      {/* CTA */}
      <div style={{ padding: "32px 48px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "300px", marginBottom: "32px" }}>
          <div style={{ width: "280px", textAlign: "right" }}>
            <h2 style={{
              fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 400,
              color: "#2c2c2c", margin: 0, fontStyle: "italic",
              fontFamily: "Georgia, serif",
            }}>
              Got an Epic Space?
            </h2>
          </div>
          <div style={{ width: "280px", textAlign: "left" }}>
            <h2 style={{
              fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 400,
              color: "#2c2c2c", margin: 0, fontStyle: "italic",
              fontFamily: "Georgia, serif",
            }}>
              Host with Us!
            </h2>
          </div>
        </div>
        <button
          onClick={() => navigate(session ? "/dashboard" : "/onboarding")}
          style={{
            background: "transparent", color: "#2c2c2c",
            border: "1px solid #2c2c2c", borderRadius: "30px",
            padding: "12px 48px", fontSize: "13px",
            fontFamily: "Georgia, serif", cursor: "pointer",
          }}>
          Start Hosting
        </button>
      </div>


      {/* DIVIDER BOTTOM */}
      <div style={{ marginBottom: "48px" }}>
        <Divider />
      </div>

      {/* TRENDING COMBOS */}
      <section style={{ padding: "0 48px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 400, color: "#2c2c2c", margin: 0 }}>Trending Combos</h2>
          <Link to="/restaurants" style={{ fontSize: "13px", color: "#c4848a", textDecoration: "none" }}>View all →</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {trendingVenues.map(venue => (
            <Link
              key={venue.id}
              to={`/${categorySlug(venue.category)}/${venue.id}`}
              style={{ textDecoration: "none" }}
            >
              <div style={{
                background: "white", border: "1px solid #e8d4d6",
                borderRadius: "8px", overflow: "hidden", cursor: "pointer",
                transition: "box-shadow 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(212,160,164,0.2)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
              >
                <div style={{
                  height: "140px",
                  background: "linear-gradient(135deg, #f0dde0 0%, #e8c4c8 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: "28px", opacity: 0.3 }}>◈</span>
                </div>
                <div style={{ padding: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "14px", color: "#2c2c2c" }}>{venue.name}</span>
                    {venue.rating && <span style={{ fontSize: "11px", color: "#c4848a" }}>★ {venue.rating}</span>}
                  </div>
                  <p style={{ fontSize: "12px", color: "#a0a0a0", margin: "0 0 8px" }}>
                    {categorySlug(venue.category).replace(/-/g, " ")} {venue.capacity ? `· ${venue.capacity} guests` : ""}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#2c2c2c" }}>{Number(venue.pricePerHour).toLocaleString()} UZS<span style={{ color: "#a0a0a0", fontSize: "11px" }}>/hr</span></span>
                    <span style={{ fontSize: "11px", background: "#f0dde0", color: "#c4848a", padding: "3px 10px", borderRadius: "12px" }}>Book</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CONTACT WITH US */}
      <section style={{ padding: "0 48px 60px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 24px" }}>
          Contact with us
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "160px" }}>
            <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
              style={{ border: "none", borderBottom: "1px solid #d4a0a4", padding: "10px 0", fontSize: "13px", fontFamily: "Georgia, serif", background: "transparent", outline: "none", color: "#2c2c2c" }} />
            <input placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
              style={{ border: "none", borderBottom: "1px solid #d4a0a4", padding: "10px 0", fontSize: "13px", fontFamily: "Georgia, serif", background: "transparent", outline: "none", color: "#2c2c2c" }} />
            <input placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)}
              style={{ border: "none", borderBottom: "1px solid #d4a0a4", padding: "10px 0", fontSize: "13px", fontFamily: "Georgia, serif", background: "transparent", outline: "none", color: "#2c2c2c" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <textarea placeholder="Your message" value={message} onChange={e => setMessage(e.target.value)}
              style={{
                border: "1px solid #d4a0a4", borderRadius: "4px",
                padding: "12px", fontSize: "13px",
                fontFamily: "Georgia, serif", background: "transparent",
                outline: "none", color: "#2c2c2c",
                resize: "none", height: "160px",
              }} />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                disabled={sending}
                onClick={async () => {
                  if (!name.trim() || !email.trim() || !message.trim()) {
                    toast.error("Please fill in your name, email and message");
                    return;
                  }
                  setSending(true);
                  try {
                    console.log("API_URL:", apiUrl("/api/contact"))
                    const res = await fetch(apiUrl("/api/contact"), {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name, email, phone, message }),
                    });
                    if (!res.ok) throw new Error();
                    toast.success("Thank you! We'll get back to you soon.");
                    setName("");
                    setEmail("");
                    setPhone("");
                    setMessage("");
                  } catch {
                    toast.error("Failed to send message. Please try again.");
                  } finally {
                    setSending(false);
                  }
                }}
                style={{
                  background: "#d9d9d9", color: "#2c2c2c",
                  border: "1px solid #b0b0b0", borderRadius: "4px",
                  padding: "10px 100px", fontSize: "13px",
                  fontFamily: "Georgia, serif", cursor: sending ? "wait" : "pointer",
                  opacity: sending ? 0.7 : 1,
                }}>
                {sending ? "Sending..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "20px 48px", borderTop: "1px solid #e8d4d6", textAlign: "right" }}>
        <span style={{ fontSize: "11px", color: "#a0a0a0" }}>© 2026 Flow</span>
      </footer>

    </div>
  );
}
