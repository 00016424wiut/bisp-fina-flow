// Unified create/edit form for venues. Handles file uploads to /api/uploads
// and emits a flat data object via onSubmit. Pass `initialValue` to switch
// to edit mode (pre-fills inputs and changes the submit button label).

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import { parseAverageCheck } from "@/lib/format";
import { categories } from "@/data/categories";

export type VenueFormData = {
  name: string;
  description: string;
  category: string;
  pricePerHour?: number;
  capacity?: number;
  minGuests?: number;
  maxGuests?: number;
  address: string;
  hours: string;
  duration: string;
  averageCheck: string;
  rating?: number;
  tags: string[];
  amenities: string[];
  photos: string[];
  menuUrl: string | null;
};

type VenueFormProps = {
  initialValue?: Partial<VenueFormData> & { id?: string };
  saving: boolean;
  onSubmit: (data: VenueFormData) => Promise<void> | void;
  onCancel: () => void;
};

const CATEGORIES = ["RESTAURANTS", "OUTDOOR", "MASTER_CLASSES", "ACTIVITIES", "GIFTS"];

const CATEGORY_SLUG: Record<string, string> = {
  RESTAURANTS: "restaurants",
  OUTDOOR: "outdoor",
  MASTER_CLASSES: "master-classes",
  ACTIVITIES: "activities",
  GIFTS: "gifts",
};

const AMENITY_PRESETS = [
  "WiFi", "Parking", "AC", "Projector", "Sound system",
  "Outdoor area", "Wheelchair access", "Smoking area",
];

// Mask raw user input → "1,234,567" with thousand separators.
function maskMoney(value: string): string {
  const digits = value.replace(/\D+/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
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

const sectionStyle = {
  borderTop: "1px solid #f0dde0",
  paddingTop: "16px",
  marginTop: "16px",
};

const sectionTitleStyle = {
  fontSize: "11px", color: "#7a7a7a", textTransform: "uppercase" as const,
  letterSpacing: "1.5px", margin: "0 0 16px",
};

export default function VenueForm({ initialValue, saving, onSubmit, onCancel }: VenueFormProps) {
  const isEdit = !!initialValue?.id;

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "RESTAURANTS",
    pricePerHour: "",      // displayed masked
    capacity: "",
    minGuests: "",
    maxGuests: "",
    address: "",
    hours: "",
    duration: "",
    averageCheck: "",       // displayed masked
    rating: "",
    tags: "",                // comma-separated text
  });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [menuUrl, setMenuUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [menuUploading, setMenuUploading] = useState(false);

  // Pre-fill from initialValue when entering edit mode.
  useEffect(() => {
    if (!initialValue) return;
    setForm({
      name: initialValue.name ?? "",
      description: initialValue.description ?? "",
      category: initialValue.category ?? "RESTAURANTS",
      pricePerHour: initialValue.pricePerHour
        ? Number(initialValue.pricePerHour).toLocaleString("en-US")
        : "",
      capacity: initialValue.capacity != null ? String(initialValue.capacity) : "",
      minGuests: initialValue.minGuests != null ? String(initialValue.minGuests) : "",
      maxGuests: initialValue.maxGuests != null ? String(initialValue.maxGuests) : "",
      address: initialValue.address ?? "",
      hours: initialValue.hours ?? "",
      duration: initialValue.duration ?? "",
      averageCheck: initialValue.averageCheck
        ? parseAverageCheck(initialValue.averageCheck).toLocaleString("en-US")
        : "",
      rating: initialValue.rating != null ? String(initialValue.rating) : "",
      tags: Array.isArray(initialValue.tags) ? initialValue.tags.join(", ") : "",
    });
    setAmenities(Array.isArray(initialValue.amenities) ? initialValue.amenities : []);
    setPhotos(Array.isArray(initialValue.photos) ? initialValue.photos : []);
    setMenuUrl(initialValue.menuUrl ?? null);
  }, [initialValue]);

  const update = (field: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const toggleAmenity = (a: string) => {
    setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };
  const addCustomAmenity = () => {
    const trimmed = customAmenity.trim();
    if (!trimmed) return;
    if (!amenities.includes(trimmed)) setAmenities(prev => [...prev, trimmed]);
    setCustomAmenity("");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPhotoUploading(true);
    setError("");
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append("files", f));
      const res = await fetch(apiUrl("/api/uploads/photos"), {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Photo upload failed");
        return;
      }
      const { urls }: { urls: string[] } = await res.json();
      setPhotos(prev => [...prev, ...urls]);
    } catch {
      setError("Network error during upload");
    } finally {
      setPhotoUploading(false);
      e.target.value = ""; // reset so the same file can be re-picked
    }
  };

  const removePhoto = (url: string) => {
    setPhotos(prev => prev.filter(p => p !== url));
  };

  const handleMenuUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMenuUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(apiUrl("/api/uploads/menu"), {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Menu upload failed");
        return;
      }
      const { url }: { url: string } = await res.json();
      setMenuUrl(url);
    } catch {
      setError("Network error during upload");
    } finally {
      setMenuUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    setError("");
    // Client-side validation — server enforces the same rules.
    if (form.name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    const price = parseAverageCheck(form.pricePerHour);
    if (form.pricePerHour && price < 0) {
      setError("Price per hour cannot be negative");
      return;
    }
    const minG = form.minGuests ? Number(form.minGuests) : undefined;
    const maxG = form.maxGuests ? Number(form.maxGuests) : undefined;
    if (minG != null && maxG != null && minG > maxG) {
      setError("Minimum guests cannot exceed maximum guests");
      return;
    }

    const data: VenueFormData = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      pricePerHour: price > 0 ? price : 0,
      capacity: form.capacity ? Number(form.capacity) : undefined,
      minGuests: minG,
      maxGuests: maxG,
      address: form.address.trim(),
      hours: form.hours.trim(),
      duration: form.duration.trim(),
      averageCheck: form.averageCheck ? `${form.averageCheck} UZS` : "",
      rating: form.rating ? Number(form.rating) : undefined,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      amenities,
      photos,
      menuUrl,
    };

    await onSubmit(data);
  };

  return (
    <div style={{
      border: "1px solid #e8d4d6", borderRadius: "10px",
      padding: "24px", background: "#faf8f8",
    }}>
      <h3 style={{ fontSize: "14px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 4px" }}>
        {isEdit ? "Edit venue" : "New venue"}
      </h3>
      <p style={{ fontSize: "11px", color: "#a0a0a0", margin: "0 0 16px" }}>
        {isEdit ? "Update the details for this location." : "All fields below describe a single venue."}
      </p>

      {/* ── Basics ─────────────────────────────────────────────── */}
      <h4 style={sectionTitleStyle}>Basics</h4>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <label style={labelStyle}>Name *</label>
          <input value={form.name} onChange={e => update("name", e.target.value)}
            placeholder="Venue name" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Category *</label>
          <select value={form.category} onChange={e => update("category", e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Address</label>
          <input value={form.address} onChange={e => update("address", e.target.value)}
            placeholder="Street, city" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Open hours</label>
          <input value={form.hours} onChange={e => update("hours", e.target.value)}
            placeholder="e.g. 9:00 - 22:00" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Rating</label>
          <input value={form.rating} onChange={e => update("rating", e.target.value)}
            placeholder="e.g. 4.5" style={inputStyle} />
        </div>
        {(form.category === "MASTER_CLASSES" || form.category === "ACTIVITIES") && (
          <div>
            <label style={labelStyle}>Duration</label>
            <input value={form.duration} onChange={e => update("duration", e.target.value)}
              placeholder="e.g. 2 hours" style={inputStyle} />
          </div>
        )}
      </div>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>Pricing</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Price per hour (UZS)</label>
            <input value={form.pricePerHour}
              onChange={e => update("pricePerHour", maskMoney(e.target.value))}
              inputMode="numeric" placeholder="e.g. 50,000" style={inputStyle} />
            {form.pricePerHour && (
              <p style={{ fontSize: "11px", color: "#a0a0a0", margin: "4px 0 0" }}>
                {form.pricePerHour} UZS
              </p>
            )}
          </div>
          <div>
            <label style={labelStyle}>Average check (UZS)</label>
            <input value={form.averageCheck}
              onChange={e => update("averageCheck", maskMoney(e.target.value))}
              inputMode="numeric" placeholder="e.g. 200,000" style={inputStyle} />
            {form.averageCheck && (
              <p style={{ fontSize: "11px", color: "#a0a0a0", margin: "4px 0 0" }}>
                {form.averageCheck} UZS
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Capacity ───────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>Capacity</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Total capacity</label>
            <input value={form.capacity} onChange={e => update("capacity", e.target.value)}
              inputMode="numeric" placeholder="e.g. 50" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Min guests</label>
            <input value={form.minGuests} onChange={e => update("minGuests", e.target.value)}
              inputMode="numeric" placeholder="e.g. 4" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Max guests</label>
            <input value={form.maxGuests} onChange={e => update("maxGuests", e.target.value)}
              inputMode="numeric" placeholder="e.g. 30" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* ── Description ────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>Description</h4>
        <textarea
          value={form.description}
          onChange={e => update("description", e.target.value)}
          placeholder="Tell guests what makes this place special..."
          rows={4}
          style={{
            ...inputStyle, borderBottom: "none",
            border: "1px solid #e8d4d6", borderRadius: "8px",
            padding: "10px 12px", resize: "vertical", minHeight: "80px",
          }}
        />
      </div>

      {/* ── Amenities ──────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>Amenities</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
          {AMENITY_PRESETS.map(a => {
            const active = amenities.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                style={{
                  border: `1px solid ${active ? "#2c2c2c" : "#d4a0a4"}`,
                  background: active ? "#2c2c2c" : "transparent",
                  color: active ? "white" : "#5a5a5a",
                  borderRadius: "20px", padding: "5px 14px",
                  fontSize: "11px", fontFamily: "Georgia, serif",
                  cursor: "pointer",
                }}
              >
                {a}
              </button>
            );
          })}
          {/* Custom amenities the user added beyond the presets */}
          {amenities.filter(a => !AMENITY_PRESETS.includes(a)).map(a => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAmenity(a)}
              style={{
                border: "1px solid #2c2c2c", background: "#2c2c2c", color: "white",
                borderRadius: "20px", padding: "5px 14px",
                fontSize: "11px", fontFamily: "Georgia, serif", cursor: "pointer",
              }}
            >
              {a} ×
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            value={customAmenity}
            onChange={e => setCustomAmenity(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomAmenity(); } }}
            placeholder="Add custom amenity"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            type="button"
            onClick={addCustomAmenity}
            style={{
              background: "none", border: "1px solid #d4a0a4", borderRadius: "20px",
              padding: "6px 16px", fontSize: "11px", fontFamily: "Georgia, serif",
              color: "#7a7a7a", cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* ── Tags ───────────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>Tags</h4>
        {(() => {
          const slug = CATEGORY_SLUG[form.category];
          const hints = slug && categories[slug] ? categories[slug].filters : [];
          const currentTags = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
          return hints.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
              {hints.map(hint => {
                const active = currentTags.some(t => t.toLowerCase() === hint.toLowerCase());
                return (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => {
                      if (active) {
                        const filtered = currentTags.filter(t => t.toLowerCase() !== hint.toLowerCase());
                        update("tags", filtered.join(", "));
                      } else {
                        update("tags", [...currentTags, hint].join(", "));
                      }
                    }}
                    style={{
                      border: `1px solid ${active ? "#2c2c2c" : "#d4a0a4"}`,
                      background: active ? "#2c2c2c" : "transparent",
                      color: active ? "white" : "#5a5a5a",
                      borderRadius: "20px", padding: "5px 14px",
                      fontSize: "11px", fontFamily: "Georgia, serif",
                      cursor: "pointer",
                    }}
                  >
                    {hint}
                  </button>
                );
              })}
            </div>
          ) : null;
        })()}
        <input value={form.tags} onChange={e => update("tags", e.target.value)}
          placeholder="Comma separated, e.g. Rooftop, Romantic, Live music"
          style={inputStyle} />
        <p style={{ fontSize: "11px", color: "#a0a0a0", margin: "4px 0 0" }}>
          Click suggestions above or type your own. Tags help customers find your venue.
        </p>
      </div>

      {/* ── Photos ─────────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>Photos (JPG / PNG, up to 10)</h4>
        <input
          type="file"
          accept="image/jpeg,image/png"
          multiple
          disabled={photoUploading}
          onChange={handlePhotoUpload}
          style={{ fontSize: "12px", fontFamily: "Georgia, serif", marginBottom: "12px" }}
        />
        {photoUploading && (
          <p style={{ fontSize: "11px", color: "#a0a0a0", margin: "0 0 12px" }}>Uploading…</p>
        )}
        {photos.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: "10px",
          }}>
            {photos.map(url => (
              <div key={url} style={{ position: "relative" }}>
                <img
                  src={apiUrl(url)}
                  alt=""
                  style={{
                    width: "100%", height: "90px", objectFit: "cover",
                    borderRadius: "6px", border: "1px solid #e8d4d6",
                  }}
                />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  aria-label="Remove photo"
                  style={{
                    position: "absolute", top: "4px", right: "4px",
                    width: "22px", height: "22px", borderRadius: "50%",
                    background: "rgba(0,0,0,0.7)", color: "white",
                    border: "none", cursor: "pointer", fontSize: "12px",
                    lineHeight: 1, padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Menu PDF ───────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>Menu (PDF)</h4>
        {menuUrl ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            border: "1px solid #e8d4d6", borderRadius: "8px",
            padding: "10px 14px", background: "white",
          }}>
            <a
              href={apiUrl(menuUrl)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "12px", color: "#2c2c2c", textDecoration: "none" }}
            >
              📄 View current menu
            </a>
            <div style={{ display: "flex", gap: "8px" }}>
              <label style={{
                background: "none", border: "1px solid #d4a0a4", borderRadius: "20px",
                padding: "4px 12px", fontSize: "11px", fontFamily: "Georgia, serif",
                color: "#7a7a7a", cursor: "pointer",
              }}>
                Replace
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleMenuUpload}
                  style={{ display: "none" }}
                />
              </label>
              <button
                type="button"
                onClick={() => setMenuUrl(null)}
                style={{
                  background: "none", border: "1px solid #e8d4d6", borderRadius: "20px",
                  padding: "4px 12px", fontSize: "11px", fontFamily: "Georgia, serif",
                  color: "#d4a0a4", cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <input
            type="file"
            accept="application/pdf"
            disabled={menuUploading}
            onChange={handleMenuUpload}
            style={{ fontSize: "12px", fontFamily: "Georgia, serif" }}
          />
        )}
        {menuUploading && (
          <p style={{ fontSize: "11px", color: "#a0a0a0", margin: "8px 0 0" }}>Uploading…</p>
        )}
      </div>

      {/* ── Error + actions ────────────────────────────────────── */}
      {error && (
        <p style={{ fontSize: "12px", color: "#e05c5c", margin: "16px 0 0" }}>{error}</p>
      )}
      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? "#d0d0d0" : "#2c2c2c", color: "white", border: "none",
            borderRadius: "20px", padding: "10px 24px", fontSize: "13px",
            fontFamily: "Georgia, serif", cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Save venue"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          style={{
            background: "none", border: "1px solid #e8d4d6", borderRadius: "20px",
            padding: "10px 24px", fontSize: "13px", fontFamily: "Georgia, serif",
            color: "#7a7a7a", cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
