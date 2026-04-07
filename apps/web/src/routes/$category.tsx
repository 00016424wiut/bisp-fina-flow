import { Link, useNavigate, useParams } from "react-router";
import { useState, useEffect } from "react";
import { categories } from "../data/categories";
import { authClient } from "@/lib/auth-client";

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const data = categories[category ?? "restaurants"];
  const [selected, setSelected] = useState<string[]>([]);
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const [venues, setVenues] = useState<any[]>([]);

  useEffect(() => {
    const categoryEnum = category?.toUpperCase().replace("-", "_");
    fetch(`http://localhost:3000/api/venues?category=${categoryEnum}`, {
      credentials: "include",
    })
      .then(r => r.json())
      .then(data => setVenues(Array.isArray(data) ? data : []))
      .catch(() => setVenues([]));
  }, [category]);  

  // Если категория не найдена
  if (!data) {
    return (
      <div style={{ fontFamily: "Georgia, serif", padding: "48px", textAlign: "center" }}>
        <h1 style={{ fontSize: "24px", color: "#2c2c2c" }}>Category not found</h1>
        <Link to="/" style={{ color: "#c4848a" }}>← Back to Home</Link>
      </div>
    );
  }

  const toggle = (f: string) =>
    setSelected(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const filtered = data.venues.filter(v =>
    selected.length === 0 || selected.includes(v.filter)
  );

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
          <div style={{ position: "relative" }}>
            <input placeholder="Search" style={{
              border: "1px solid #d4a0a4", borderRadius: "20px",
              padding: "6px 32px 6px 14px", fontSize: "12px",
              fontFamily: "Georgia, serif", background: "transparent",
              outline: "none", color: "#2c2c2c", width: "160px",
            }} />
            <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#a0a0a0" }}>⌕</span>
          </div>
          <span style={{ color: "#d4a0a4" }}>|</span>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            {session ? (
              // После логина — иконки корзины и профиля
              <>
                <button
                  onClick={() => navigate("/cart")}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#2c2c2c" }}
                >
                  🛒
                </button>
                <button
                  onClick={() => authClient.signOut().then(() => window.location.href = "/")}
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

        </div>
      </nav>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", minHeight: "calc(100vh - 56px)" }}>

        {/* FILTERS */}
        <aside style={{ borderRight: "1px solid #e8d4d6", padding: "32px 24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 20px" }}>Filters</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.filters.map(f => (
              <label key={f} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                onClick={() => toggle(f)}>
                <div style={{
                  width: "14px", height: "14px", flexShrink: 0,
                  border: "1px solid #d4a0a4", borderRadius: "2px",
                  background: selected.includes(f) ? "#d4a0a4" : "transparent",
                }} />
                <span style={{ fontSize: "13px", color: "#5a5a5a" }}>{f}</span>
              </label>
            ))}
          </div>

          {/* Сброс фильтров */}
          {selected.length > 0 && (
            <button onClick={() => setSelected([])} style={{
              marginTop: "20px", background: "none",
              border: "1px solid #d4a0a4", borderRadius: "20px",
              padding: "6px 14px", fontSize: "11px",
              fontFamily: "Georgia, serif", color: "#c4848a",
              cursor: "pointer",
            }}>
              Clear filters
            </button>
          )}
        </aside>

        {/* VENUE GRID */}
        <main style={{ padding: "32px" }}>
          {/* Количество результатов */}
          <p style={{ fontSize: "12px", color: "#a0a0a0", margin: "0 0 20px" }}>
            {filtered.length} {filtered.length === 1 ? "location" : "locations"} found
            {selected.length > 0 && ` · filtered by: ${selected.join(", ")}`}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
            {venues.map(venue => (
              <Link key={venue.id} to={`/${category}/${venue.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  border: "1px solid #e8d4d6", borderRadius: "6px",
                  overflow: "hidden", background: "white",
                  transition: "box-shadow 0.2s",
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(212,160,164,0.2)"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}
                >
                  {/* Image placeholder */}
                  <div style={{ position: "relative", background: "#f0dde0", height: "160px" }}>
                    <div style={{ position: "absolute", top: "12px", left: "12px", width: "55%", height: "55%", background: "#d9c4c6", borderRadius: "2px" }} />
                    <div style={{ position: "absolute", bottom: "12px", right: "12px", width: "45%", height: "40%", background: "#c9b4b6", borderRadius: "2px" }} />
                    <div style={{ position: "absolute", bottom: "28px", left: "30%", width: "40%", height: "35%", background: "#b9a4a6", borderRadius: "2px" }} />
                  </div>

                  {/* Info */}
                  <div style={{ padding: "12px 14px 14px" }}>
                    <p style={{ fontSize: "13px", color: "#2c2c2c", margin: "0 0 4px" }}>{venue.name}</p>
                    <p style={{ fontSize: "12px", color: "#7a7a7a", margin: "0 0 2px" }}>Location: {venue.address}</p>
                    <p style={{ fontSize: "12px", color: "#7a7a7a", margin: "0 0 12px" }}>
                      Capacity: <span style={{ color: "#c4848a" }}>{venue.capacity} people</span>
                    </p>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                      <button style={{ background: "none", border: "1px solid #e8d4d6", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontSize: "12px", color: "#7a7a7a", display: "flex", alignItems: "center", justifyContent: "center" }}>💬</button>
                      <button style={{ background: "none", border: "1px solid #e8d4d6", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontSize: "12px", color: "#7a7a7a", display: "flex", alignItems: "center", justifyContent: "center" }}>📞</button>
                      <button style={{ background: "white", border: "1px solid #d4a0a4", borderRadius: "20px", padding: "5px 14px", fontSize: "11px", fontFamily: "Georgia, serif", cursor: "pointer", color: "#2c2c2c" }}>
                        Contact via messenger
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
