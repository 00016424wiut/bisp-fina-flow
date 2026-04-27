import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { authClient } from "@/lib/auth-client";
import { apiUrl } from "@/lib/api";
import VenueForm, { type VenueFormData } from "@/components/VenueForm";

type Booking = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  startTime: string;
  endTime: string;
  cost: number;
  eventName?: string;
  venue?: { name: string; category: string };
};

type Venue = {
  id: string;
  name: string;
  description?: string;
  category: string;
  pricePerHour: number;
  capacity?: number;
  address?: string;
  hours?: string;
  duration?: string;
  averageCheck?: string;
  rating?: number;
  tags?: string[];
  amenities?: string[];
  minGuests?: number;
  maxGuests?: number;
  photos?: string[];
  menuUrl?: string | null;
  isActive: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "#4ade80",
  PENDING: "#f7b731",
  CANCELLED: "#e05c5c",
};

const STATUS_BG: Record<string, string> = {
  CONFIRMED: "rgba(74,222,128,0.1)",
  PENDING: "rgba(247,183,49,0.1)",
  CANCELLED: "rgba(224,92,92,0.1)",
};

function fmt(cost: number) {
  return cost.toLocaleString() + " UZS";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

const inputStyle = {
  width: "100%", border: "none", borderBottom: "1px solid #d4a0a4",
  padding: "8px 0", fontSize: "13px", fontFamily: "Georgia, serif",
  background: "transparent", outline: "none", color: "#2c2c2c",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  fontSize: "10px", color: "#a0a0a0", textTransform: "uppercase" as const,
  letterSpacing: "1px", marginBottom: "4px", display: "block",
};

// ── PROFILE SECTION ──────────────────────────────────────────
// Client-side validators. Server enforces the same rules (see PATCH /api/me)
// — these are just here for instant feedback.
function validateProfile(form: {
  name: string;
  phone: string;
  telegramUsername: string;
  companyName: string;
}, isProvider: boolean): string | null {
  if (form.name.trim().length < 2) return "Name must be at least 2 characters";
  if (!form.phone.trim()) return "Phone number is required";
  const digits = form.phone.replace(/[\s\-()]/g, "");
  if (!/^\+?\d{7,15}$/.test(digits)) return "Phone number is not valid";
  if (isProvider) {
    if (form.companyName.trim().length < 2) return "Business name must be at least 2 characters";
    if (form.telegramUsername && !/^@?[A-Za-z0-9_]{3,32}$/.test(form.telegramUsername)) {
      return "Telegram username is not valid";
    }
  }
  return null;
}

function ProfileSection({ user, onUpdate }: { user: any; onUpdate: (u: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<any>(user);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    telegramUsername: "",
    companyName: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Hydrate from /api/me on mount so we always have phone + company.name even
  // if the Better-Auth session payload is stale.
  useEffect(() => {
    fetch(apiUrl("/api/me"), { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data) setProfile(data); })
      .catch(() => { });
  }, []);

  // Reset form when entering edit mode so it always reflects the latest profile.
  useEffect(() => {
    if (editing) {
      setForm({
        name: profile.name ?? "",
        phone: profile.phone ?? "",
        telegramUsername: profile.telegramUsername ?? "",
        companyName: profile.company?.name ?? "",
      });
      setError("");
    }
  }, [editing, profile]);

  const isProvider = profile.role === "PROVIDER";

  const handleSave = async () => {
    const validationError = validateProfile(form, isProvider);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/me"), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          telegramUsername: isProvider ? (form.telegramUsername || null) : undefined,
          companyName: isProvider ? form.companyName.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to save");
        return;
      }
      const updated = await res.json();
      setProfile(updated);
      onUpdate({ ...user, ...updated });
      setEditing(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ border: "1px solid #e8d4d6", borderRadius: "12px", padding: "24px", background: "white" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 400, color: "#2c2c2c", margin: 0 }}>Profile</h2>
        <button onClick={() => setEditing(!editing)} style={{
          background: "none", border: "1px solid #e8d4d6", borderRadius: "20px",
          padding: "6px 16px", fontSize: "12px", fontFamily: "Georgia, serif",
          color: "#7a7a7a", cursor: "pointer",
        }}>
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Full name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Your full name" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input value={profile.email ?? ""} disabled
              style={{ ...inputStyle, color: "#a0a0a0", cursor: "not-allowed" }} />
            <p style={{ fontSize: "11px", color: "#a0a0a0", margin: "4px 0 0" }}>
              Email is your sign-in identifier and cannot be changed here.
            </p>
          </div>

          <div>
            <label style={labelStyle}>Phone number *</label>
            <input type="tel" value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="+998 __ ___ __ __" style={inputStyle} />
          </div>

          {isProvider && (
            <>
              <div>
                <label style={labelStyle}>Business name *</label>
                <input value={form.companyName}
                  onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))}
                  placeholder="Your venue or service name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Telegram username</label>
                <input value={form.telegramUsername}
                  onChange={e => setForm(p => ({ ...p, telegramUsername: e.target.value }))}
                  placeholder="@username" style={inputStyle} />
                <p style={{ fontSize: "11px", color: "#a0a0a0", margin: "4px 0 0" }}>
                  Used for booking notifications.
                </p>
              </div>
            </>
          )}

          {error && (
            <p style={{ fontSize: "12px", color: "#e05c5c", margin: 0 }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button onClick={handleSave} disabled={saving} style={{
              background: saving ? "#d0d0d0" : "#2c2c2c", color: "white", border: "none",
              borderRadius: "20px", padding: "10px 24px", fontSize: "13px",
              fontFamily: "Georgia, serif", cursor: saving ? "not-allowed" : "pointer",
            }}>
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button onClick={() => setEditing(false)} disabled={saving} style={{
              background: "none", border: "1px solid #e8d4d6", borderRadius: "20px",
              padding: "10px 24px", fontSize: "13px", fontFamily: "Georgia, serif",
              color: "#7a7a7a", cursor: "pointer",
            }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {[
            { label: "Name", value: profile.name ?? "—" },
            { label: "Email", value: profile.email ?? "—" },
            { label: "Phone", value: profile.phone ?? "—" },
            { label: "Role", value: profile.role === "MANAGER" ? "Manager" : profile.role === "PROVIDER" ? "Provider" : profile.role === "ADMIN" ? "Administrator" : profile.role },
            ...(isProvider
              ? [
                  { label: "Business", value: profile.company?.name ?? "—" },
                  { label: "Telegram", value: profile.telegramUsername ?? "—" },
                ]
              : [
                  { label: "Company", value: profile.company?.name ?? "—" },
                ]),
          ].map(row => (
            <div key={row.label}>
              <p style={{ fontSize: "10px", color: "#a0a0a0", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px" }}>{row.label}</p>
              <p style={{ fontSize: "14px", color: "#2c2c2c", margin: 0, wordBreak: "break-word" }}>{row.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MANAGER DASHBOARD ────────────────────────────────────────
function ManagerDashboard({ user, onUpdate }: { user: any; onUpdate: (u: any) => void }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/api/bookings/my"), { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setBookings(data); })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const total = bookings.reduce((s, b) => s + Number(b.cost), 0);
  const confirmed = bookings.filter(b => b.status === "CONFIRMED").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <ProfileSection user={user} onUpdate={onUpdate} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {[
          { label: "Total bookings", value: bookings.length },
          { label: "Confirmed", value: confirmed },
          { label: "Total spent", value: fmt(total) },
        ].map(stat => (
          <div key={stat.label} style={{ border: "1px solid #e8d4d6", borderRadius: "12px", padding: "20px", background: "white", textAlign: "center" }}>
            <p style={{ fontSize: "24px", color: "#2c2c2c", margin: "0 0 4px" }}>{stat.value}</p>
            <p style={{ fontSize: "11px", color: "#a0a0a0", margin: 0, textTransform: "uppercase", letterSpacing: "1px" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid #e8d4d6", borderRadius: "12px", padding: "24px", background: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 400, color: "#2c2c2c", margin: 0 }}>Booking history</h2>
          <Link to="/cart" style={{ fontSize: "12px", color: "#c4848a", textDecoration: "none" }}>View cart →</Link>
        </div>
        {loading ? (
          <p style={{ fontSize: "13px", color: "#a0a0a0" }}>Loading...</p>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ fontSize: "13px", color: "#a0a0a0", margin: "0 0 16px" }}>No bookings yet</p>
            <Link to="/" style={{ fontSize: "13px", color: "#2c2c2c", textDecoration: "none", border: "1px solid #2c2c2c", padding: "8px 20px", borderRadius: "20px" }}>
              Browse venues
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {bookings.map(b => (
              <div key={b.id} style={{ border: "1px solid #f0dde0", borderRadius: "8px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "14px", color: "#2c2c2c", margin: "0 0 4px" }}>{b.venue?.name ?? "—"}</p>
                  <p style={{ fontSize: "12px", color: "#7a7a7a", margin: 0 }}>
                    {formatDate(b.startTime)} · {b.eventName ?? ""}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <span style={{ fontSize: "10px", padding: "3px 10px", borderRadius: "12px", background: STATUS_BG[b.status], color: STATUS_COLORS[b.status], fontWeight: 600 }}>
                    {b.status}
                  </span>
                  <span style={{ fontSize: "14px", color: "#2c2c2c" }}>{fmt(Number(b.cost))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── PROVIDER DASHBOARD ───────────────────────────────────────
function ProviderDashboard({ user, onUpdate }: { user: any; onUpdate: (u: any) => void }) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  // Edit/create state. `editingVenue: null` + `creating: true` → create mode.
  // `editingVenue: <venue>` → edit mode. Both null → form hidden.
  const [creating, setCreating] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(apiUrl("/api/venues/my"), { credentials: "include" }).then(r => r.json()),
      fetch(apiUrl("/api/bookings/provider"), { credentials: "include" }).then(r => r.json()),
    ]).then(([v, b]) => {
      if (Array.isArray(v)) setVenues(v);
      if (Array.isArray(b)) setBookings(b);
    }).catch(() => { }).finally(() => setLoading(false));
  }, []);

  const closeForm = () => {
    setCreating(false);
    setEditingVenue(null);
  };

  const handleSubmitVenue = async (data: VenueFormData) => {
    setSaving(true);
    try {
      const isEdit = !!editingVenue;
      const url = isEdit ? `/api/venues/${editingVenue!.id}` : "/api/venues";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(apiUrl(url), {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to save venue");
        return;
      }
      const venue: Venue = await res.json();
      setVenues(prev =>
        isEdit
          ? prev.map(v => (v.id === venue.id ? venue : v))
          : [...prev, venue],
      );
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmBooking = async (bookingId: string) => {
    const res = await fetch(apiUrl(`/api/bookings/${bookingId}/confirm`), {
      method: "PATCH",
      credentials: "include",
    });
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "CONFIRMED" as const } : b));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <ProfileSection user={user} onUpdate={onUpdate} />

      <div style={{ border: "1px solid #e8d4d6", borderRadius: "12px", padding: "24px", background: "white" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 20px" }}>Pending requests</h2>
        {bookings.filter(b => b.status === "PENDING").length === 0 ? (
          <p style={{ fontSize: "13px", color: "#a0a0a0" }}>No pending requests</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {bookings.filter(b => b.status === "PENDING").map(b => (
              <div key={b.id} style={{ border: "1px solid #f7b731", borderRadius: "8px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(247,183,49,0.05)" }}>
                <div>
                  <p style={{ fontSize: "14px", color: "#2c2c2c", margin: "0 0 4px" }}>{b.venue?.name ?? "—"}</p>
                  <p style={{ fontSize: "12px", color: "#7a7a7a", margin: 0 }}>{formatDate(b.startTime)} · {fmt(Number(b.cost))}</p>
                </div>
                <button onClick={() => handleConfirmBooking(b.id)} style={{
                  background: "#2c2c2c", color: "white", border: "none",
                  borderRadius: "20px", padding: "8px 20px", fontSize: "12px",
                  fontFamily: "Georgia, serif", cursor: "pointer",
                }}>
                  Confirm
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ border: "1px solid #e8d4d6", borderRadius: "12px", padding: "24px", background: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 400, color: "#2c2c2c", margin: 0 }}>My venues</h2>
          <button
            onClick={() => { setEditingVenue(null); setCreating(true); }}
            disabled={creating || !!editingVenue}
            style={{
              background: creating || editingVenue ? "#d0d0d0" : "#2c2c2c",
              color: "white", border: "none",
              borderRadius: "20px", padding: "8px 20px", fontSize: "12px",
              fontFamily: "Georgia, serif",
              cursor: creating || editingVenue ? "not-allowed" : "pointer",
            }}
          >
            + Add venue
          </button>
        </div>

        {(creating || editingVenue) && (
          <div style={{ marginBottom: "20px" }}>
            <VenueForm
              initialValue={editingVenue ?? undefined}
              saving={saving}
              onSubmit={handleSubmitVenue}
              onCancel={closeForm}
            />
          </div>
        )}

        {loading ? (
          <p style={{ fontSize: "13px", color: "#a0a0a0" }}>Loading...</p>
        ) : venues.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#a0a0a0" }}>No venues yet. Add your first venue!</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {venues.map(venue => (
              <div key={venue.id} style={{ border: "1px solid #f0dde0", borderRadius: "8px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <p style={{ fontSize: "14px", color: "#2c2c2c", margin: 0 }}>{venue.name}</p>
                    <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "12px", background: venue.isActive ? "rgba(74,222,128,0.1)" : "rgba(224,92,92,0.1)", color: venue.isActive ? "#4ade80" : "#e05c5c" }}>
                      {venue.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#7a7a7a", margin: 0 }}>
                    {venue.category} · {venue.address} · {fmt(Number(venue.pricePerHour))}/hr
                  </p>
                </div>
                <button
                  onClick={() => { setCreating(false); setEditingVenue(venue); }}
                  aria-label="Edit venue"
                  title="Edit venue"
                  style={{
                    background: "none", border: "1px solid #e8d4d6",
                    borderRadius: "50%", width: "32px", height: "32px",
                    cursor: "pointer", color: "#7a7a7a", fontSize: "14px",
                    fontFamily: "Georgia, serif",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  ✎
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ADMIN DASHBOARD ─────────────────────────────────────────
function AdminDashboard({ user, onUpdate }: { user: any; onUpdate: (u: any) => void }) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(apiUrl("/api/venues/my"), { credentials: "include" }).then(r => r.json()),
      fetch(apiUrl("/api/bookings/provider"), { credentials: "include" }).then(r => r.json()),
    ]).then(([v, b]) => {
      if (Array.isArray(v)) setVenues(v);
      if (Array.isArray(b)) setBookings(b);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleToggleActive = async (venueId: string) => {
    const res = await fetch(apiUrl(`/api/venues/${venueId}/toggle-active`), {
      method: "PATCH", credentials: "include",
    });
    if (res.ok) {
      const updated = await res.json();
      setVenues(prev => prev.map(v => v.id === updated.id ? { ...v, isActive: updated.isActive } : v));
    }
  };

  const handleConfirmBooking = async (bookingId: string) => {
    const res = await fetch(apiUrl(`/api/bookings/${bookingId}/confirm`), {
      method: "PATCH", credentials: "include",
    });
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "CONFIRMED" as const } : b));
    }
  };

  const handleSubmitVenue = async (data: VenueFormData) => {
    if (!editingVenue) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/venues/${editingVenue.id}`), {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const venue: Venue = await res.json();
        setVenues(prev => prev.map(v => v.id === venue.id ? venue : v));
        setEditingVenue(null);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to save venue");
      }
    } finally {
      setSaving(false);
    }
  };

  const totalBookings = bookings.length;
  const confirmed = bookings.filter(b => b.status === "CONFIRMED").length;
  const pending = bookings.filter(b => b.status === "PENDING");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <ProfileSection user={user} onUpdate={onUpdate} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        {[
          { label: "Total venues", value: venues.length },
          { label: "Active venues", value: venues.filter(v => v.isActive).length },
          { label: "Total bookings", value: totalBookings },
          { label: "Confirmed", value: confirmed },
        ].map(stat => (
          <div key={stat.label} style={{ border: "1px solid #e8d4d6", borderRadius: "12px", padding: "20px", background: "white", textAlign: "center" }}>
            <p style={{ fontSize: "24px", color: "#2c2c2c", margin: "0 0 4px" }}>{stat.value}</p>
            <p style={{ fontSize: "11px", color: "#a0a0a0", margin: 0, textTransform: "uppercase", letterSpacing: "1px" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Pending bookings */}
      <div style={{ border: "1px solid #e8d4d6", borderRadius: "12px", padding: "24px", background: "white" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 20px" }}>Pending requests</h2>
        {pending.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#a0a0a0" }}>No pending requests</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pending.map(b => (
              <div key={b.id} style={{ border: "1px solid #f7b731", borderRadius: "8px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(247,183,49,0.05)" }}>
                <div>
                  <p style={{ fontSize: "14px", color: "#2c2c2c", margin: "0 0 4px" }}>{b.venue?.name ?? "—"}</p>
                  <p style={{ fontSize: "12px", color: "#7a7a7a", margin: 0 }}>{formatDate(b.startTime)} · {fmt(Number(b.cost))}</p>
                </div>
                <button onClick={() => handleConfirmBooking(b.id)} style={{
                  background: "#2c2c2c", color: "white", border: "none",
                  borderRadius: "20px", padding: "8px 20px", fontSize: "12px",
                  fontFamily: "Georgia, serif", cursor: "pointer",
                }}>Confirm</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All venues management */}
      <div style={{ border: "1px solid #e8d4d6", borderRadius: "12px", padding: "24px", background: "white" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 20px" }}>All venues</h2>

        {editingVenue && (
          <div style={{ marginBottom: "20px" }}>
            <VenueForm
              initialValue={editingVenue}
              saving={saving}
              onSubmit={handleSubmitVenue}
              onCancel={() => setEditingVenue(null)}
            />
          </div>
        )}

        {loading ? (
          <p style={{ fontSize: "13px", color: "#a0a0a0" }}>Loading...</p>
        ) : venues.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#a0a0a0" }}>No venues found</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {venues.map(venue => (
              <div key={venue.id} style={{ border: "1px solid #f0dde0", borderRadius: "8px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <p style={{ fontSize: "14px", color: "#2c2c2c", margin: 0 }}>{venue.name}</p>
                    <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "12px", background: venue.isActive ? "rgba(74,222,128,0.1)" : "rgba(224,92,92,0.1)", color: venue.isActive ? "#4ade80" : "#e05c5c" }}>
                      {venue.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#7a7a7a", margin: 0 }}>
                    {venue.category} · {venue.address} · {fmt(Number(venue.pricePerHour))}/hr
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setEditingVenue(venue)}
                    title="Edit venue"
                    style={{
                      background: "none", border: "1px solid #e8d4d6",
                      borderRadius: "50%", width: "32px", height: "32px",
                      cursor: "pointer", color: "#7a7a7a", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >✎</button>
                  <button
                    onClick={() => handleToggleActive(venue.id)}
                    title={venue.isActive ? "Deactivate" : "Activate"}
                    style={{
                      background: "none", border: "1px solid #e8d4d6",
                      borderRadius: "20px", padding: "4px 12px",
                      fontSize: "11px", fontFamily: "Georgia, serif",
                      cursor: "pointer", color: venue.isActive ? "#e05c5c" : "#4ade80",
                    }}
                  >{venue.isActive ? "Deactivate" : "Activate"}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN DASHBOARD ───────────────────────────────────────────
export default function Dashboard() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!session && !isPending) navigate("/login");
    if (session?.user) setUser(session.user);
  }, [session, isPending, navigate]);

  if (isPending || !user) {
    return <div style={{ fontFamily: "Georgia, serif", padding: "48px", textAlign: "center" }}>Loading...</div>;
  }

  const role = user?.role;

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#ffffff", minHeight: "100vh" }}>
      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderBottom: "1px solid #e8d4d6", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: "56px" }}>
        <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
          <Link to="/" style={{ fontSize: "24px", color: "#2c2c2c", fontStyle: "italic", textDecoration: "none" }}>FLOW</Link>
          <div style={{ display: "flex", gap: "24px" }}>
            {["Restaurants", "Outdoor", "Master Classes", "Activities", "Gifts"].map(item => (
              <Link key={item} to={`/${item.toLowerCase().replace(" ", "-")}`} style={{ fontSize: "13px", color: "#5a5a5a", textDecoration: "none" }}>{item}</Link>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Link to="/cart" style={{ fontSize: "20px", color: "#2c2c2c", textDecoration: "none" }}>🛒</Link>
        </div>
      </nav>

      {/* Content */}
      {/* Content */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 4px" }}>
              Welcome, {user?.name}
            </h1>
            <p style={{ fontSize: "13px", color: "#a0a0a0", margin: 0 }}>
              {role === "MANAGER" ? "Manager account" : role === "PROVIDER" ? "Provider account" : role === "ADMIN" ? "Administrator" : ""}
            </p>
          </div>
          <button
            onClick={() => authClient.signOut().then(() => window.location.href = "/")}
            style={{ background: "#e8d4d6", border: "1px solid #e8d4d6", borderRadius: "20px", padding: "6px 16px", fontSize: "12px", fontFamily: "Georgia, serif", color: "#7a7a7a", cursor: "pointer" }}
          >
            Sign out
          </button>
        </div>

        {role === "MANAGER" && <ManagerDashboard user={user} onUpdate={setUser} />}
        {role === "PROVIDER" && <ProviderDashboard user={user} onUpdate={setUser} />}
        {role === "ADMIN" && <AdminDashboard user={user} onUpdate={setUser} />}
      </div>
    </div>
  );
}
