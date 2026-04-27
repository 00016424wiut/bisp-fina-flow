import { Link, useNavigate, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { apiUrl } from "@/lib/api";
import SearchBox from "../components/SearchBox";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const when = searchParams.get("when") || "";
  const guests = searchParams.get("guests") || "";
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const categorySlug = (cat: string) => cat.toLowerCase().replace(/_/g, "-");

  useEffect(() => {
    const params = new URLSearchParams();
    if (guests) params.set("capacity", guests);
    setLoading(true);
    fetch(apiUrl(`/api/venues${params.toString() ? `?${params}` : ""}`), {
      credentials: "include",
    })
      .then(r => r.json())
      .then(data => setVenues(Array.isArray(data) ? data : []))
      .catch(() => setVenues([]))
      .finally(() => setLoading(false));
  }, [guests]);

  const heading = [
    guests ? `${guests}+ guests` : null,
    when ? new Date(when).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null,
  ].filter(Boolean).join(" · ");

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#ffffff", minHeight: "100vh" }}>
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
            {["Restaurants", "Outdoor", "Master Classes", "Activities", "Gifts"].map(item => (
              <Link key={item} to={`/${item.toLowerCase().replace(" ", "-")}`} style={{
                fontSize: "13px", textDecoration: "none", color: "#5a5a5a",
              }}>
                {item}
              </Link>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <SearchBox />
          <span style={{ color: "#d4a0a4" }}>|</span>
          {session ? (
            <>
              <button onClick={() => navigate("/cart")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#2c2c2c" }}>🛒</button>
              <button onClick={() => navigate("/dashboard")} style={{ background: "none", border: "1px solid #e8d4d6", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "14px", color: "#2c2c2c", display: "flex", alignItems: "center", justifyContent: "center" }}>👤</button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ fontSize: "13px", color: "#5a5a5a", textDecoration: "none" }}>Login</Link>
              <Link to="/onboarding" style={{ fontSize: "13px", color: "#2c2c2c", textDecoration: "none", border: "1px solid #2c2c2c", padding: "6px 16px", borderRadius: "20px" }}>Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      <main style={{ padding: "32px 48px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 4px" }}>
          Search Results
        </h1>
        {heading && (
          <p style={{ fontSize: "14px", color: "#c4848a", margin: "0 0 24px" }}>{heading}</p>
        )}

        {loading ? (
          <p style={{ fontSize: "13px", color: "#a0a0a0" }}>Loading...</p>
        ) : venues.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: "16px", color: "#7a7a7a", margin: "0 0 12px" }}>No venues found</p>
            <p style={{ fontSize: "13px", color: "#a0a0a0" }}>Try adjusting your guest count or browse categories above</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: "12px", color: "#a0a0a0", margin: "0 0 20px" }}>
              {venues.length} {venues.length === 1 ? "venue" : "venues"} found
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
              {venues.map(venue => (
                <Link
                  key={venue.id}
                  to={`/${categorySlug(venue.category)}/${venue.id}${when ? `?when=${when}` : ""}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{
                    border: "1px solid #e8d4d6", borderRadius: "6px",
                    overflow: "hidden", background: "white", transition: "box-shadow 0.2s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(212,160,164,0.2)")}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                  >
                    <div style={{ background: "#f0dde0", height: "160px", overflow: "hidden" }}>
                      {venue.photos?.[0] ? (
                        <img src={apiUrl(venue.photos[0])} alt={venue.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#b9a4a6", fontSize: "13px" }}>No image</div>
                      )}
                    </div>
                    <div style={{ padding: "12px 14px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <p style={{ fontSize: "13px", color: "#2c2c2c", margin: 0 }}>{venue.name}</p>
                        <span style={{ fontSize: "11px", background: "#f0dde0", color: "#c4848a", padding: "3px 10px", borderRadius: "12px" }}>
                          {categorySlug(venue.category).replace(/-/g, " ")}
                        </span>
                      </div>
                      <p style={{ fontSize: "12px", color: "#7a7a7a", margin: "0 0 2px" }}>Location: {venue.address}</p>
                      <p style={{ fontSize: "12px", color: "#7a7a7a", margin: "0 0 8px" }}>
                        Capacity: <span style={{ color: "#c4848a" }}>{venue.capacity} people</span>
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "13px", color: "#2c2c2c" }}>
                          {Number(venue.pricePerHour).toLocaleString()} UZS<span style={{ color: "#a0a0a0", fontSize: "11px" }}>/hr</span>
                        </span>
                        {venue.rating && <span style={{ fontSize: "11px", color: "#c4848a" }}>★ {venue.rating}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
