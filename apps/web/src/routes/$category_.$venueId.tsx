import { Link, useParams, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import BookingModal, { type BookingData } from "../components/BookingModal";
import SearchBox from "../components/SearchBox";
import { authClient } from "@/lib/auth-client";
import { apiUrl } from "@/lib/api";

export default function VenuePage() {
  const { category, venueId } = useParams<{ category: string; venueId: string }>();
  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(apiUrl(`/api/venues/${venueId}`))
      .then(r => r.json())
      .then(data => { setVenue(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [venueId]);

  const handleChatSend = async () => {
    const q = question.trim();
    if (!q || chatLoading) return;
    setChatMessages(prev => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setChatLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/venue-chat/${venueId}/chat`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "bot", text: data.answer ?? data.error ?? "Sorry, something went wrong." }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "bot", text: "Failed to connect. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return <div style={{ fontFamily: "Georgia, serif", padding: "48px", textAlign: "center" }}>Loading...</div>;
  }

  if (!venue) {
    return (
      <div style={{ fontFamily: "Georgia, serif", padding: "48px", textAlign: "center" }}>
        <h1 style={{ fontSize: "24px", color: "#2c2c2c", marginBottom: "16px" }}>Venue not found</h1>
        <Link to="/" style={{ color: "#c4848a" }}>← Back to Home</Link>
      </div>
    );
  }

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
          <Link to="/" style={{ fontSize: "24px", color: "#2c2c2c", fontStyle: "italic", textDecoration: "none" }}>
            FLOW
          </Link>
          <div style={{ display: "flex", gap: "24px" }}>
            {["Restaurants", "Outdoor", "Master Classes", "Activities", "Gifts"].map(item => {
              const slug = item.toLowerCase().replace(" ", "-");
              const isActive = slug === category;
              return (
                <Link key={item} to={`/${slug}`} style={{
                  fontSize: "13px", textDecoration: "none",
                  color: isActive ? "#2c2c2c" : "#5a5a5a",
                  borderBottom: isActive ? "1px solid #2c2c2c" : "none",
                  paddingBottom: "2px",
                }}>
                  {item}
                </Link>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <SearchBox />
          <span style={{ color: "#d4a0a4" }}>|</span>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            {session ? (
              <>
                <button
                  onClick={() => navigate("/cart")}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#2c2c2c" }}
                >
                  🛒
                </button>
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowUserMenu(prev => !prev)}
                    style={{
                      background: "none", border: "1px solid #e8d4d6",
                      borderRadius: "50%", width: "32px", height: "32px",
                      cursor: "pointer", fontSize: "14px", color: "#2c2c2c",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    👤
                  </button>
                  {showUserMenu && (
                    <div style={{
                      position: "absolute", top: "40px", right: 0,
                      background: "white", border: "1px solid #e8d4d6",
                      borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                      minWidth: "140px", zIndex: 200, overflow: "hidden",
                    }}>
                      <button onClick={() => { setShowUserMenu(false); navigate("/dashboard"); }}
                        style={{ width: "100%", padding: "10px 16px", background: "none", border: "none", borderBottom: "1px solid #f0dde0", fontSize: "13px", fontFamily: "Georgia, serif", color: "#2c2c2c", cursor: "pointer", textAlign: "left" }}>
                        Dashboard
                      </button>
                      <button onClick={() => { authClient.signOut().then(() => window.location.href = "/"); }}
                        style={{ width: "100%", padding: "10px 16px", background: "none", border: "none", fontSize: "13px", fontFamily: "Georgia, serif", color: "#e05c5c", cursor: "pointer", textAlign: "left" }}>
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" style={{ fontSize: "13px", color: "#5a5a5a", textDecoration: "none" }}>Login</Link>
                <Link to="/onboarding" style={{
                  fontSize: "13px", color: "#2c2c2c", textDecoration: "none",
                  border: "1px solid #2c2c2c", padding: "6px 16px", borderRadius: "20px",
                }}>Sign Up</Link>
              </>
            )}
          </div>

        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div style={{ padding: "32px 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", maxWidth: "1200px", margin: "0 auto" }}>

        {/* LEFT: Фото + описание + меню */}
        <div>
          {/* Фото галерея */}
          <div style={{
            width: "100%", height: "280px",
            background: "#f0dde0", borderRadius: "6px",
            marginBottom: "12px", position: "relative", overflow: "hidden",
          }}>
            {venue.photos && venue.photos.length > 0 ? (
              <img
                src={apiUrl(venue.photos[activePhoto] ?? venue.photos[0])}
                alt={venue.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <>
                <div style={{ position: "absolute", top: "16px", left: "16px", width: "55%", height: "55%", background: "#d9c4c6", borderRadius: "4px" }} />
                <div style={{ position: "absolute", bottom: "16px", right: "16px", width: "45%", height: "40%", background: "#c9b4b6", borderRadius: "4px" }} />
                <div style={{ position: "absolute", bottom: "32px", left: "30%", width: "40%", height: "35%", background: "#b9a4a6", borderRadius: "4px" }} />
              </>
            )}
          </div>

          {/* Миниатюры */}
          {venue.photos && venue.photos.length > 1 && (
            <div style={{
              display: "flex", gap: "8px", marginBottom: "24px",
              overflowX: "auto", paddingBottom: "4px",
            }}>
              {venue.photos.map((photo: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setActivePhoto(i)}
                  style={{
                    flexShrink: 0, width: "72px", height: "56px",
                    border: i === activePhoto ? "2px solid #c4848a" : "1px solid #e8d4d6",
                    borderRadius: "4px", padding: 0, cursor: "pointer",
                    background: "#f0dde0", overflow: "hidden",
                  }}
                >
                  <img src={apiUrl(photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
          {(!venue.photos || venue.photos.length <= 1) && <div style={{ marginBottom: "12px" }} />}

          {/* Описание */}
          <p style={{ fontSize: "13px", color: "#5a5a5a", lineHeight: 1.7, margin: "0 0 28px" }}>
            {venue.description}
          </p>

          {/* Меню PDF */}
          {venue.menuUrl && (
            <div>
              <p style={{ fontSize: "13px", color: "#2c2c2c", margin: "0 0 12px", fontWeight: 400 }}>Menu:</p>
              <a
                href={apiUrl(venue.menuUrl)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "10px",
                  border: "1px solid #e8d4d6", borderRadius: "6px",
                  padding: "10px 16px", fontSize: "12px",
                  color: "#5a5a5a", textDecoration: "none",
                  fontFamily: "Georgia, serif",
                }}
              >
                📄 View menu (PDF)
              </a>
            </div>
          )}
        </div>

        {/* RIGHT: Детали + теги + чат + Book */}
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 16px" }}>
            {venue.name}
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
            <p style={{ fontSize: "13px", color: "#5a5a5a", margin: 0 }}>
              Rating: <span style={{ color: "#c4848a" }}>★ {venue.rating}</span>
            </p>
            <p style={{ fontSize: "13px", color: "#5a5a5a", margin: 0 }}>
              Open hours: {venue.hours}
            </p>
            {venue.duration && (
              <p style={{ fontSize: "13px", color: "#5a5a5a", margin: 0 }}>
                Duration: {venue.duration}
              </p>
            )}
            <p style={{ fontSize: "13px", color: "#5a5a5a", margin: 0 }}>
              Location: {venue.address}
            </p>
            <p style={{ fontSize: "13px", color: "#5a5a5a", margin: 0 }}>
              Capacity: {venue.minGuests ?? 1}–{venue.maxGuests ?? venue.capacity ?? "—"} guests
            </p>
            <p style={{ fontSize: "13px", color: "#5a5a5a", margin: 0 }}>
              Average check: {venue.averageCheck}
            </p>
          </div>

          {/* Теги */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
            {venue.tags && venue.tags.map((tag: any) => (
              <span key={tag} style={{
                border: "1px solid #d4a0a4", borderRadius: "20px",
                padding: "4px 14px", fontSize: "11px",
                color: "#5a5a5a", fontFamily: "Georgia, serif",
              }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Удобства */}
          {venue.amenities && venue.amenities.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "28px" }}>
              {venue.amenities.map((a: string) => (
                <span key={a} style={{
                  border: "1px solid #a0c4a4", borderRadius: "20px",
                  padding: "4px 14px", fontSize: "11px",
                  color: "#5a5a5a", fontFamily: "Georgia, serif",
                }}>
                  {a}
                </span>
              ))}
            </div>
          )}
          {(!venue.amenities || venue.amenities.length === 0) && <div style={{ marginBottom: "16px" }} />}

          {/* Chat block */}
          <div style={{
            background: "#f5f0f0", borderRadius: "12px",
            padding: "16px", marginBottom: "16px",
          }}>
            {chatOpen && (
              <div style={{ marginBottom: "12px", maxHeight: "240px", overflowY: "auto" }}>
                {chatMessages.length === 0 && (
                  <p style={{ fontSize: "12px", color: "#7a7a7a", margin: 0, fontStyle: "italic" }}>
                    Ask anything about {venue.name} — hours, capacity, pricing, amenities...
                  </p>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    marginBottom: "8px",
                  }}>
                    <div style={{
                      background: msg.role === "user" ? "#2c2c2c" : "white",
                      color: msg.role === "user" ? "white" : "#2c2c2c",
                      borderRadius: "12px", padding: "8px 14px",
                      fontSize: "12px", maxWidth: "80%", lineHeight: 1.5,
                      border: msg.role === "bot" ? "1px solid #e8d4d6" : "none",
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "8px" }}>
                    <div style={{
                      background: "white", border: "1px solid #e8d4d6",
                      borderRadius: "12px", padding: "8px 14px",
                      fontSize: "12px", color: "#a0a0a0", fontStyle: "italic",
                    }}>
                      Thinking...
                    </div>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={() => setChatOpen(!chatOpen)}
                style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: "white", border: "1px solid #e8d4d6",
                  cursor: "pointer", fontSize: "14px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                💬
              </button>
              <input
                placeholder="Do you have any questions?"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleChatSend()}
                style={{
                  flex: 1, border: "none", background: "transparent",
                  fontSize: "12px", fontFamily: "Georgia, serif",
                  color: "#5a5a5a", outline: "none",
                }}
              />
              {chatOpen && question.trim() && (
                <button
                  onClick={handleChatSend}
                  disabled={chatLoading}
                  style={{
                    background: "#2c2c2c", color: "white", border: "none",
                    borderRadius: "50%", width: "28px", height: "28px",
                    cursor: chatLoading ? "wait" : "pointer", fontSize: "12px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  ↑
                </button>
              )}
            </div>
          </div>

          {/* BOOK button */}
          <button
            onClick={() => {
              if (!session) {
                navigate("/login");
                return;
              }
              setBookingOpen(true);
            }}
            style={{
              width: "100%", background: "#2c2c2c", color: "white",
              border: "none", borderRadius: "30px",
              padding: "14px", fontSize: "14px",
              fontFamily: "Georgia, serif", cursor: "pointer",
              letterSpacing: "0.5px",
            }}
          >
            {session ? "Book this venue" : "Sign in to book"}
          </button>

          {/* Попап бронирования */}
          {bookingOpen && (
            <BookingModal
              venueName={venue.name}
              venueId={String(venue.id)}
              averageCheck={venue.averageCheck}
              hours={venue.hours}
              duration={venue.duration}
              onClose={() => setBookingOpen(false)}
              onConfirm={async (data: BookingData) => {
                try {
                  const response = await fetch(apiUrl("/api/bookings"), {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      venueId: String(venue.id),
                      startTime: `${data.date}T${data.startTime}:00`,
                      endTime: `${data.date}T${data.endTime}:00`,
                      eventName: venue.name,
                      notes: data.comment,
                      guestCount: data.guests,
                    }),
                  });

                  if (!response.ok) {
                    const err = await response.json();
                    alert(err.error || "Booking failed");
                    return;
                  }

                  setBookingOpen(false);
                  setBookingDone(true);
                } catch {
                  alert("Server error. Please try again.");
                }
              }}

            />
          )}

          {/* Уведомление об успехе */}
          {bookingDone && (
            <div style={{
              position: "fixed", bottom: "32px", right: "32px", zIndex: 300,
              background: "#2c2c2c", color: "white", borderRadius: "12px",
              padding: "16px 24px", fontSize: "13px", fontFamily: "Georgia, serif",
            }}>
              ✓ Booking request sent! We'll contact you soon.
            </div>
          )}

          {/* Назад к каталогу */}
          <Link to={`/${category}`} style={{
            display: "block", textAlign: "center", marginTop: "12px",
            fontSize: "12px", color: "#a0a0a0", textDecoration: "none",
          }}>
            ← Back to {category}
          </Link>
        </div>
      </div>
    </div>
  );
}
