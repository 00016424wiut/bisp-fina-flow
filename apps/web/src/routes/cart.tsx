// apps/web/src/routes/cart.tsx

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { authClient } from "@/lib/auth-client";
import { apiUrl } from "@/lib/api";
import { fmtUZS, parseAverageCheck } from "@/lib/format";

type BookingItem = {
    id: string;
    venueName: string;
    category: string;
    date: string;
    startTime: string;
    endTime: string;
    guests: number;
    averageCheck: number; // per-guest price, parsed from venue.averageCheck
    status: "PENDING" | "CONFIRMED" | "CANCELLED";
    eventName?: string;
    notes?: string;
};

// Live cost = averageCheck × guests
const lineTotal = (item: BookingItem) => item.averageCheck * item.guests;

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

const PAYMENT_METHODS = [
    { id: "cash", label: "Cash", icon: "💵", desc: "Pay at the venue" },
    { id: "card", label: "Card transfer", icon: "💳", desc: "Bank card transfer" },
    { id: "invoice", label: "Invoice", icon: "📄", desc: "Corporate invoice (B2B)", corporate: true },
];

function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
}
function mapBooking(b: any): BookingItem {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    const pad = (n: number) => String(n).padStart(2, "0");
    const guests = b.guestCount ?? 1;
    // Prefer the venue's averageCheck (per-guest price). Fall back to deriving
    // it from the stored cost so older bookings still display a sensible total.
    const parsedAvg = parseAverageCheck(b.venue?.averageCheck);
    const averageCheck = parsedAvg > 0
        ? parsedAvg
        : Math.round(Number(b.cost) / Math.max(guests, 1));
    return {
        id: b.id,
        venueName: b.venue?.name ?? "Unknown venue",
        category: b.venue?.category ?? "",
        date: start.toISOString().split("T")[0],
        startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
        endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
        guests,
        averageCheck,
        status: b.status,
        eventName: b.eventName ?? "My Event",
        notes: b.notes,
    };
}

// ── Print-only styles injected into <head> ──────────────────────────────────
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #pdf-content, #pdf-content * { visibility: visible !important; }
  #pdf-content {
    position: fixed !important; top: 0; left: 0;
    width: 100%; padding: 32px;
    font-family: Georgia, serif;
    background: white !important;
  }
  @page { margin: 20mm; }
}
`;

export default function CartPage() {
    const navigate = useNavigate();
    const { data: session } = authClient.useSession();
    const [bookings, setBookings] = useState<BookingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [paymentMethod, setPaymentMethod] = useState("card");
    const [confirmed, setConfirmed] = useState(false);
    const isCorporate = !!(session?.user as any)?.companyId;

    // Inject print styles once
    useEffect(() => {
        const tag = document.createElement("style");
        tag.innerHTML = PRINT_STYLE;
        document.head.appendChild(tag);
        return () => { document.head.removeChild(tag); };
    }, []);

    // Load bookings from real API
    useEffect(() => {
        fetch(apiUrl("/api/bookings/my"), { credentials: "include" })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const mapped = data.map(mapBooking);
                    setBookings(mapped);
                    setSelectedIds(new Set(mapped.filter(b => b.status !== "CANCELLED").map(b => b.id)));
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    // Group by eventName
    const grouped = bookings.reduce((acc, b) => {
        const key = b.eventName || "Other bookings";
        if (!acc[key]) acc[key] = [];
        acc[key].push(b);
        return acc;
    }, {} as Record<string, BookingItem[]>);

    const selected = bookings.filter(b => selectedIds.has(b.id) && b.status !== "CANCELLED");
    const total = selected.reduce((s, b) => s + lineTotal(b), 0);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const updateGuests = (id: string, guests: number) => {
        setBookings(prev => prev.map(b =>
            b.id === id ? { ...b, guests: Math.max(1, Math.floor(guests || 1)) } : b
        ));
    };

    const handleRemove = async (id: string) => {
        // Optimistic update — drop from local state immediately, roll back on error.
        const snapshot = bookings;
        setBookings(prev => prev.filter(b => b.id !== id));
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });

        try {
            const res = await fetch(apiUrl(`/api/bookings/${id}/cancel`), {
                method: "PATCH",
                credentials: "include",
            });
            if (!res.ok) throw new Error("cancel failed");
        } catch {
            setBookings(snapshot);
        }
    };

    const handleConfirm = () => setConfirmed(true);
    const handleDownloadPDF = async () => {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF();

        let y = 20;

        // Header
        doc.setFontSize(24);
        doc.text("FLOW", 20, y);
        y += 8;
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text("Event Booking Order", 20, y);
        y += 6;
        doc.text(`Date: ${new Date().toLocaleDateString("en-US")}`, 20, y);
        doc.text(`Customer: ${session?.user?.name ?? "—"}`, 100, y);
        y += 10;

        // Line
        doc.setDrawColor(44, 44, 44);
        doc.line(20, y, 190, y);
        y += 10;

        // Bookings
        selected.forEach(item => {
            doc.setFontSize(11);
            doc.setTextColor(44, 44, 44);
            doc.text(item.venueName, 20, y);
            doc.text(fmtUZS(lineTotal(item)), 170, y, { align: "right" });
            y += 6;
            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.text(`${formatDate(item.date)} · ${item.startTime} — ${item.endTime} · ${item.guests} guests`, 20, y);
            y += 10;
        });

        // Total
        doc.setDrawColor(200);
        doc.line(20, y, 190, y);
        y += 8;
        doc.setFontSize(12);
        doc.setTextColor(44, 44, 44);
        doc.text("Total:", 20, y);
        doc.text(fmtUZS(total), 170, y, { align: "right" });

        doc.save("flow-booking.pdf");
    };


    // ── Nav ──────────────────────────────────────────────────────────────────
    const Nav = () => (
        <nav style={{
            position: "sticky", top: 0, zIndex: 100,
            background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
            borderBottom: "1px solid #e8d4d6",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 48px", height: "56px",
        }}>
            <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
                <Link to="/" style={{ fontSize: "24px", color: "#2c2c2c", fontStyle: "italic", textDecoration: "none" }}>FLOW</Link>
                <div style={{ display: "flex", gap: "24px" }}>
                    {["Restaurants", "Outdoor", "Master Classes", "Activities", "Gifts"].map(item => (
                        <Link key={item} to={`/${item.toLowerCase().replace(" ", "-")}`}
                            style={{ fontSize: "13px", color: "#5a5a5a", textDecoration: "none" }}>
                            {item}
                        </Link>
                    ))}
                </div>
            </div>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                {session ? (
                    <>
                        <button onClick={() => navigate("/cart")}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#c4848a" }}>
                            🛒 <span style={{ fontSize: "12px", fontFamily: "Georgia, serif" }}>{bookings.length}</span>
                        </button>
                        <button onClick={() => navigate("/dashboard")}
                            style={{ background: "none", border: "1px solid #e8d4d6", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "14px", color: "#2c2c2c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            👤
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login" style={{ fontSize: "13px", color: "#5a5a5a", textDecoration: "none" }}>Login</Link>
                        <Link to="/onboarding" style={{ fontSize: "13px", color: "#2c2c2c", textDecoration: "none", border: "1px solid #2c2c2c", padding: "6px 16px", borderRadius: "20px" }}>Sign Up</Link>
                    </>
                )}
            </div>
        </nav>
    );

    // ── PDF-only content (hidden on screen, visible on print) ─────────────────
    const PdfContent = () => (
        <div id="pdf-content" style={{ display: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                <div>
                    <div style={{ fontSize: "28px", fontStyle: "italic", color: "#2c2c2c", marginBottom: "4px" }}>FLOW</div>
                    <div style={{ fontSize: "12px", color: "#7a7a7a" }}>Event Booking Order</div>
                </div>
                <div style={{ textAlign: "right", fontSize: "12px", color: "#7a7a7a" }}>
                    <div>Date: {new Date().toLocaleDateString("en-US")}</div>
                    {isCorporate && <div>Company: {(session?.user as any)?.company?.name ?? "—"}</div>}
                    <div>Customer: {session?.user?.name ?? "—"}</div>
                </div>
            </div>

            <div style={{ borderTop: "2px solid #2c2c2c", marginBottom: "20px" }} />

            {/* Selected items grouped */}
            {Object.entries(grouped).map(([eventName, items]) => {
                const eventSelected = items.filter(i => selectedIds.has(i.id));
                if (eventSelected.length === 0) return null;
                return (
                    <div key={eventName} style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "bold", color: "#2c2c2c", marginBottom: "10px" }}>
                            {eventName}
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #e8d4d6" }}>
                                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#7a7a7a" }}>Venue</th>
                                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#7a7a7a" }}>Date</th>
                                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#7a7a7a" }}>Time</th>
                                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#7a7a7a" }}>Guests</th>
                                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#7a7a7a" }}>Status</th>
                                    <th style={{ textAlign: "right", padding: "6px 8px", color: "#7a7a7a" }}>Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {eventSelected.map(item => (
                                    <tr key={item.id} style={{ borderBottom: "1px solid #f0dde0" }}>
                                        <td style={{ padding: "8px" }}>{item.venueName}</td>
                                        <td style={{ padding: "8px" }}>{formatDate(item.date)}</td>
                                        <td style={{ padding: "8px" }}>{item.startTime} — {item.endTime}</td>
                                        <td style={{ padding: "8px" }}>{item.guests}</td>
                                        <td style={{ padding: "8px" }}>{item.status}</td>
                                        <td style={{ padding: "8px", textAlign: "right" }}>{fmtUZS(lineTotal(item))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            })}

            <div style={{ borderTop: "2px solid #2c2c2c", paddingTop: "12px", display: "flex", justifyContent: "flex-end", gap: "32px" }}>
                <span style={{ fontSize: "14px", color: "#2c2c2c" }}>Total:</span>
                <span style={{ fontSize: "16px", fontWeight: "bold", color: "#2c2c2c" }}>{fmtUZS(total)}</span>
            </div>

            <div style={{ marginTop: "12px", fontSize: "12px", color: "#7a7a7a" }}>
                Payment method: {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label ?? paymentMethod}
            </div>

            <div style={{ borderTop: "1px solid #e8d4d6", marginTop: "32px", paddingTop: "12px", fontSize: "11px", color: "#a0a0a0", textAlign: "center" }}>
                FLOW · Event Booking Platform · {new Date().getFullYear()}
            </div>
        </div>
    );

    // ── Main render ───────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div style={{ fontFamily: "Georgia, serif", minHeight: "100vh", background: "#fff" }}>
                <Nav />
                <div style={{ padding: "80px", textAlign: "center", color: "#a0a0a0", fontSize: "14px" }}>
                    Loading your bookings...
                </div>
            </div>
        );
    }

    return (
        <div style={{ fontFamily: "Georgia, serif", background: "#ffffff", minHeight: "100vh" }}>
            <PdfContent />
            <Nav />

            <div style={{ padding: "40px 48px", maxWidth: "1200px", margin: "0 auto" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "32px" }}>
                    <div>
                        <h1 style={{ fontSize: "28px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 4px" }}>Your bookings</h1>
                        <p style={{ fontSize: "13px", color: "#a0a0a0", margin: 0 }}>
                            {bookings.length} {bookings.length === 1 ? "item" : "items"} · {selectedIds.size} selected for payment
                        </p>
                    </div>
                    <button onClick={handleDownloadPDF} style={{
                        background: "none", border: "1px solid #d4a0a4", borderRadius: "20px",
                        padding: "8px 20px", fontSize: "12px", fontFamily: "Georgia, serif",
                        color: "#c4848a", cursor: "pointer",
                    }}>
                        ⬇ Download PDF {selected.length > 0 ? `(${selected.length} item)` : ""}
                    </button>
                </div>

                {/* Success state */}
                {confirmed && (
                    <div style={{
                        background: "rgba(74,222,128,0.08)", border: "1px solid #4ade80",
                        borderRadius: "10px", padding: "20px 24px", marginBottom: "24px",
                        display: "flex", alignItems: "center", gap: "12px",
                    }}>
                        <span style={{ fontSize: "20px" }}>✓</span>
                        <div>
                            <div style={{ fontSize: "14px", color: "#2c2c2c" }}>Order confirmed!</div>
                            <div style={{ fontSize: "12px", color: "#7a7a7a" }}>
                                Payment via {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}. Venues will contact you within 24 hours.
                            </div>
                        </div>
                    </div>
                )}

                {bookings.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "80px 0" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛒</div>
                        <h2 style={{ fontSize: "20px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 8px" }}>Your cart is empty</h2>
                        <p style={{ fontSize: "14px", color: "#a0a0a0", margin: "0 0 24px" }}>Browse our venues to get started</p>
                        <Link to="/" style={{ fontSize: "13px", color: "#2c2c2c", textDecoration: "none", border: "1px solid #2c2c2c", padding: "10px 24px", borderRadius: "20px" }}>
                            Explore venues
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "40px", alignItems: "start" }}>

                        {/* LEFT: Grouped bookings */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                            {Object.entries(grouped).map(([eventName, items]) => (
                                <div key={eventName}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                                        <h2 style={{ fontSize: "16px", fontWeight: 400, color: "#2c2c2c", margin: 0 }}>{eventName}</h2>
                                        <span style={{ fontSize: "11px", color: "#a0a0a0", background: "#f0dde0", padding: "3px 10px", borderRadius: "12px" }}>
                                            {items.length} {items.length === 1 ? "service" : "services"}
                                        </span>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        {items.map(item => {
                                            const isSelected = selectedIds.has(item.id);
                                            const isCancelled = item.status === "CANCELLED";
                                            return (
                                                <div key={item.id} style={{
                                                    border: `1px solid ${isSelected && !isCancelled ? "#2c2c2c" : "#e8d4d6"}`,
                                                    borderRadius: "10px", padding: "16px 20px", background: "white",
                                                    opacity: isCancelled ? 0.5 : 1, transition: "border 0.15s",
                                                }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                        <div style={{ display: "flex", gap: "12px", flex: 1 }}>
                                                            {/* Checkbox */}
                                                            {!isCancelled && (
                                                                <div
                                                                    onClick={() => toggleSelect(item.id)}
                                                                    style={{
                                                                        width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0, marginTop: "2px",
                                                                        border: `2px solid ${isSelected ? "#2c2c2c" : "#d4a0a4"}`,
                                                                        background: isSelected ? "#2c2c2c" : "white",
                                                                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                                                    }}
                                                                >
                                                                    {isSelected && <span style={{ color: "white", fontSize: "11px", lineHeight: 1 }}>✓</span>}
                                                                </div>
                                                            )}

                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                                                                    <span style={{ fontSize: "15px", color: "#2c2c2c" }}>{item.venueName}</span>
                                                                    <span style={{
                                                                        fontSize: "10px", padding: "2px 8px", borderRadius: "12px",
                                                                        background: STATUS_BG[item.status], color: STATUS_COLORS[item.status], fontWeight: 600,
                                                                    }}>{item.status}</span>
                                                                </div>
                                                                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                                                                    <span style={{ fontSize: "12px", color: "#7a7a7a" }}>📅 {formatDate(item.date)}</span>
                                                                    <span style={{ fontSize: "12px", color: "#7a7a7a" }}>🕐 {item.startTime} — {item.endTime}</span>
                                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#7a7a7a" }}>
                                                                        👥
                                                                        <button
                                                                            type="button"
                                                                            disabled={isCancelled || item.guests <= 1}
                                                                            onClick={() => updateGuests(item.id, item.guests - 1)}
                                                                            style={{
                                                                                width: "20px", height: "20px", borderRadius: "50%",
                                                                                border: "1px solid #d4a0a4", background: "white",
                                                                                cursor: isCancelled || item.guests <= 1 ? "not-allowed" : "pointer",
                                                                                color: "#7a7a7a", fontSize: "12px", lineHeight: 1,
                                                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                                                padding: 0,
                                                                            }}
                                                                        >−</button>
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            value={item.guests}
                                                                            disabled={isCancelled}
                                                                            onChange={e => updateGuests(item.id, Number(e.target.value))}
                                                                            style={{
                                                                                width: "44px", textAlign: "center",
                                                                                border: "1px solid #e8d4d6", borderRadius: "6px",
                                                                                padding: "2px 4px", fontSize: "12px",
                                                                                fontFamily: "Georgia, serif", color: "#2c2c2c",
                                                                                background: "white", outline: "none",
                                                                            }}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            disabled={isCancelled}
                                                                            onClick={() => updateGuests(item.id, item.guests + 1)}
                                                                            style={{
                                                                                width: "20px", height: "20px", borderRadius: "50%",
                                                                                border: "1px solid #d4a0a4", background: "white",
                                                                                cursor: isCancelled ? "not-allowed" : "pointer",
                                                                                color: "#7a7a7a", fontSize: "12px", lineHeight: 1,
                                                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                                                padding: 0,
                                                                            }}
                                                                        >+</button>
                                                                        guests
                                                                    </span>
                                                                    {item.notes && (
                                                                        <span style={{ fontSize: "12px", color: "#7a7a7a", fontStyle: "italic" }}>💬 “{item.notes}”</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div style={{ textAlign: "right", marginLeft: "20px" }}>
                                                            <div style={{ fontSize: "15px", color: "#2c2c2c", marginBottom: "8px" }}>{fmtUZS(lineTotal(item))}</div>
                                                            <button onClick={() => handleRemove(item.id)} style={{
                                                                background: "none", border: "none", cursor: "pointer",
                                                                fontSize: "11px", color: "#d4a0a4", fontFamily: "Georgia, serif",
                                                            }}>Remove</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px", paddingRight: "4px" }}>
                                        <span style={{ fontSize: "12px", color: "#7a7a7a" }}>
                                            Subtotal: {fmtUZS(items.filter(i => selectedIds.has(i.id)).reduce((s, i) => s + lineTotal(i), 0))}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* RIGHT: Order summary */}
                        <div style={{ position: "sticky", top: "72px" }}>
                            <div style={{ border: "1px solid #e8d4d6", borderRadius: "12px", padding: "24px", background: "white" }}>
                                <h3 style={{ fontSize: "16px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 20px" }}>Order summary</h3>

                                {selected.length === 0 ? (
                                    <p style={{ fontSize: "13px", color: "#a0a0a0", margin: "0 0 16px" }}>
                                        Select items to pay for
                                    </p>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                                        {selected.map(b => (
                                            <div key={b.id} style={{ display: "flex", justifyContent: "space-between" }}>
                                                <span style={{ fontSize: "12px", color: "#7a7a7a" }}>{b.venueName}</span>
                                                <span style={{ fontSize: "12px", color: "#2c2c2c" }}>{fmtUZS(lineTotal(b))}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ borderTop: "1px solid #e8d4d6", paddingTop: "12px", marginBottom: "20px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                        <span style={{ fontSize: "14px", color: "#2c2c2c" }}>Total</span>
                                        <span style={{ fontSize: "18px", color: "#2c2c2c" }}>{fmtUZS(total)}</span>
                                    </div>
                                </div>

                                {/* Payment methods */}
                                <h4 style={{ fontSize: "11px", color: "#a0a0a0", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" }}>
                                    Payment method
                                </h4>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                                    {PAYMENT_METHODS.filter(m => !m.corporate || isCorporate).map(method => (
                                        <label key={method.id} onClick={() => setPaymentMethod(method.id)} style={{
                                            display: "flex", alignItems: "center", gap: "10px",
                                            padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
                                            border: `1px solid ${paymentMethod === method.id ? "#2c2c2c" : "#e8d4d6"}`,
                                            background: paymentMethod === method.id ? "#f9f6f6" : "white",
                                            transition: "all 0.15s",
                                        }}>
                                            <div style={{
                                                width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0,
                                                border: `2px solid ${paymentMethod === method.id ? "#2c2c2c" : "#d4a0a4"}`,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                            }}>
                                                {paymentMethod === method.id && (
                                                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2c2c2c" }} />
                                                )}
                                            </div>
                                            <span style={{ fontSize: "14px" }}>{method.icon}</span>
                                            <div>
                                                <div style={{ fontSize: "13px", color: "#2c2c2c" }}>{method.label}</div>
                                                <div style={{ fontSize: "11px", color: "#a0a0a0" }}>{method.desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                <button onClick={handleConfirm} disabled={selected.length === 0} style={{
                                    width: "100%", background: selected.length > 0 ? "#2c2c2c" : "#d0d0d0",
                                    color: "white", border: "none", borderRadius: "30px", padding: "14px",
                                    fontSize: "14px", fontFamily: "Georgia, serif",
                                    cursor: selected.length > 0 ? "pointer" : "not-allowed", marginBottom: "10px",
                                }}>
                                    Confirm order {selected.length > 0 ? `(${selected.length})` : ""}
                                </button>

                                <p style={{ fontSize: "11px", color: "#a0a0a0", textAlign: "center", margin: "12px 0 0" }}>
                                    After confirmation venues will contact you within 24 hours
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
