// ================================================================
// src/components/BookingModal.tsx
// ================================================================

import { useState, useEffect } from "react";


type Props = {
  venueName: string;
  averageCheck?: string;
  hours?: string;
  duration?: string;
  venueId?: string;
  onClose: () => void;
  onConfirm: (data: BookingData) => void;
};

export type BookingData = {
  date: string;
  startTime: string;
  endTime: string;
  guests: number;
  name: string;
  phone: string;
  email: string;
  comment: string;
};

const inputStyle = {
  width: "100%", border: "none",
  borderBottom: "1px solid #d4a0a4",
  padding: "10px 0", fontSize: "13px",
  fontFamily: "Georgia, serif", background: "transparent",
  outline: "none", color: "#2c2c2c",
};

const labelStyle = {
  fontSize: "10px", color: "#a0a0a0",
  textTransform: "uppercase" as const,
  letterSpacing: "1px", marginBottom: "4px",
  display: "block",
};

const selectStyle = {
  width: "100%", border: "none",
  borderBottom: "1px solid #d4a0a4",
  padding: "10px 0", fontSize: "13px",
  fontFamily: "Georgia, serif", background: "transparent",
  outline: "none", color: "#2c2c2c",
  cursor: "pointer",
  appearance: "none" as const,
};



// Минимальная дата — завтра
function getMinDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

// Генерируем временные слоты с шагом: :00, :10, :15, :20, :30, :45
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  const minutes = [0, 10, 15, 20, 30, 45];
  for (let h = 0; h < 24; h++) {
    for (const m of minutes) {
      const hStr = String(h).padStart(2, "0");
      const mStr = String(m).padStart(2, "0");
      slots.push(`${hStr}:${mStr}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function parseHours(hours?: string): { open: string; close: string } | null {
  if (!hours) return null;
  const match = hours.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  const pad = (t: string) => t.length === 4 ? "0" + t : t;
  return { open: pad(match[1]), close: pad(match[2]) };
}

function filterSlots(slots: string[], hours?: string): string[] {
  const parsed = parseHours(hours);
  if (!parsed) return slots;
  return slots.filter(t => t >= parsed.open && t <= parsed.close);
}

function parseDuration(duration?: string): number | null {
  if (!duration || duration === "flexible") return null;
  const match = duration.match(/([\d.]+)\s*hour/);
  if (!match) return null;
  return Math.round(parseFloat(match[1]) * 60);
}


export default function BookingModal({ venueName, averageCheck, hours, duration, venueId, onClose, onConfirm }: Props) {
  const [step, setStep] = useState(1);
  const [bookedSlots, setBookedSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [data, setData] = useState<BookingData>({
    date: "", startTime: "", endTime: "",
    guests: 1, name: "", phone: "", email: "", comment: "",
  });
  const [timeError, setTimeError] = useState("");

  useEffect(() => {
    if (!venueId || !data.date) return;
    fetch(`http://localhost:3000/api/bookings/slots?venueId=${venueId}&date=${data.date}`)
      .then(r => r.json())
      .then(setBookedSlots)
      .catch(() => { });
  }, [venueId, data.date]);

  // функция проверки — занят ли слот:
  function isSlotBooked(time: string): boolean {
    return bookedSlots.some(b => time >= b.startTime && time < b.endTime);
  }


  const update = (field: keyof BookingData, value: string | number) =>
    setData(prev => ({ ...prev, [field]: value }));

  const minDate = getMinDate();

  // Валидация времени
  const handleNext1 = () => {
    if (data.startTime && data.endTime) {
      const [sh, sm] = data.startTime.split(":").map(Number);
      const [eh, em] = data.endTime.split(":").map(Number);
      if (eh * 60 + em <= sh * 60 + sm) {
        setTimeError("End time must be after start time");
        return;
      }
    }
    setTimeError("");
    setStep(2);
  };

  const canNext1 = data.date && data.startTime && data.endTime && data.guests > 0 && !timeError;
  const canNext2 = data.name && data.phone;

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      }} />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%", zIndex: 201,
        transform: "translate(-50%, -50%)",
        background: "white", borderRadius: "16px",
        padding: "36px", width: "480px", maxWidth: "calc(100vw - 32px)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.15)",
        fontFamily: "Georgia, serif",
      }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 400, color: "#2c2c2c", margin: "0 0 4px" }}>
              Book this venue
            </h2>
            <p style={{ fontSize: "13px", color: "#a0a0a0", margin: 0 }}>{venueName}</p>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "20px", color: "#a0a0a0", lineHeight: 1, padding: "4px",
          }}>×</button>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px" }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: s <= step ? "#2c2c2c" : "#f0dde0",
                color: s <= step ? "white" : "#c4848a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", transition: "all 0.2s",
              }}>
                {s < step ? "✓" : s}
              </div>
              <span style={{ fontSize: "11px", color: s === step ? "#2c2c2c" : "#a0a0a0" }}>
                {s === 1 ? "Date & Time" : s === 2 ? "Your info" : "Confirm"}
              </span>
              {s < 3 && <div style={{ width: "24px", height: "1px", background: "#e8d4d6" }} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={labelStyle}>Date</label>
              <input
                type="date"
                min={minDate}
                value={data.date}
                onChange={e => update("date", e.target.value)}
                style={inputStyle}
              />
              <p style={{ fontSize: "11px", color: "#a0a0a0", margin: "4px 0 0" }}>
                Earliest available: tomorrow
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Start time</label>
                <select
                  value={data.startTime}
                  onChange={e => {
                    const startVal = e.target.value;
                    update("startTime", startVal);
                    setTimeError("");

                    // Автозаполнение end time по duration
                    const minDur = parseDuration(duration);
                    if (minDur && startVal) {
                      const [sh, sm] = startVal.split(":").map(Number);
                      const totalMin = sh * 60 + sm + minDur;
                      const eh = Math.floor(totalMin / 60) % 24;
                      const em = totalMin % 60;
                      const endVal = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
                      const slots = filterSlots(TIME_SLOTS, hours);
                      if (slots.includes(endVal)) {
                        update("endTime", endVal);
                      }
                    }
                  }}

                  style={selectStyle}
                >
                  <option value="">Select time</option>
                  {filterSlots(TIME_SLOTS, hours).map(t => (
                    <option key={t} value={t} disabled={isSlotBooked(t)}>
                      {isSlotBooked(t) ? `${t} (booked)` : t}
                    </option>
                  ))}

                </select>
              </div>
              <div>
                <label style={labelStyle}>End time</label>
                <select
                  value={data.endTime}

                  onChange={e => {
                    const endVal = e.target.value;
                    update("endTime", endVal);
                    setTimeError("");
                    if (data.startTime && endVal) {
                      const [sh, sm] = data.startTime.split(":").map(Number);
                      const [eh, em] = endVal.split(":").map(Number);
                      const diffMin = (eh * 60 + em) - (sh * 60 + sm);
                      if (diffMin <= 0) {
                        setTimeError("End time must be after start time");
                        return;
                      }
                      const minDur = parseDuration(duration);
                      if (minDur && diffMin < minDur) {
                        const hours_num = minDur / 60;
                        setTimeError(`Minimum duration is ${hours_num % 1 === 0 ? hours_num : hours_num.toFixed(1)} hours`);
                      }
                    }
                  }}


                  style={selectStyle}
                >
                  <option value="">Select time</option>
                  {filterSlots(TIME_SLOTS, hours).map(t => (
                    <option key={t} value={t} disabled={isSlotBooked(t)}>
                      {isSlotBooked(t) ? `${t} (booked)` : t}
                    </option>
                  ))}

                </select>
              </div>
            </div>

            {timeError && (
              <p style={{ fontSize: "12px", color: "#e05c5c", margin: "-8px 0 0" }}>{timeError}</p>
            )}

            <div>
              <label style={labelStyle}>Number of guests</label>
              <input
                type="number"
                min={1}
                value={data.guests || ""}
                placeholder="e.g. 20"
                onChange={e => {
                  const val = e.target.value;
                  update("guests", val === "" ? 0 : Math.max(1, Number(val)));
                }}
                onBlur={e => {
                  if (!e.target.value || Number(e.target.value) < 1) {
                    update("guests", 1);
                  }
                }}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={labelStyle}>Your name</label>
              <input value={data.name} onChange={e => update("name", e.target.value)}
                style={inputStyle} placeholder="Full name" />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input type="tel" value={data.phone} onChange={e => update("phone", e.target.value)}
                style={inputStyle} placeholder="+998 __ ___ __ __" />
            </div>
            <div>
              <label style={labelStyle}>Email (optional)</label>
              <input type="email" value={data.email} onChange={e => update("email", e.target.value)}
                style={inputStyle} placeholder="your@email.com" />
            </div>
            <div>
              <label style={labelStyle}>Comment (optional)</label>
              <textarea value={data.comment} onChange={e => update("comment", e.target.value)}
                placeholder="Any special requests..."
                style={{
                  ...inputStyle, borderBottom: "none",
                  border: "1px solid #d4a0a4", borderRadius: "6px",
                  padding: "10px 12px", resize: "none", height: "80px",
                }} />
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{
              background: "#f9f6f6", borderRadius: "10px", padding: "20px",
              display: "flex", flexDirection: "column", gap: "10px",
            }}>
              {[
                { label: "Venue", value: venueName },
                { label: "Date", value: data.date },
                { label: "Time", value: `${data.startTime} — ${data.endTime}` },
                { label: "Guests", value: `${data.guests} people` },
                { label: "Name", value: data.name },
                { label: "Phone", value: data.phone },
                ...(data.email ? [{ label: "Email", value: data.email }] : []),
                ...(data.comment ? [{ label: "Comment", value: data.comment }] : []),
                ...(averageCheck ? [{ label: "Average check", value: averageCheck }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                  <span style={{ fontSize: "12px", color: "#a0a0a0", flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontSize: "12px", color: "#2c2c2c", textAlign: "right" }}>{row.value}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "11px", color: "#a0a0a0", margin: 0, textAlign: "center" }}>
              After confirmation the venue will contact you within 24 hours
            </p>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px", marginTop: "28px" }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              flex: 1, background: "transparent", color: "#5a5a5a",
              border: "1px solid #e8d4d6", borderRadius: "30px",
              padding: "12px", fontSize: "13px",
              fontFamily: "Georgia, serif", cursor: "pointer",
            }}>
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={step === 1 ? handleNext1 : () => setStep(3)}
              disabled={step === 1 ? !canNext1 : !canNext2}
              style={{
                flex: 2,
                background: (step === 1 ? canNext1 : canNext2) ? "#2c2c2c" : "#d0d0d0",
                color: "white", border: "none", borderRadius: "30px",
                padding: "12px", fontSize: "13px",
                fontFamily: "Georgia, serif",
                cursor: (step === 1 ? canNext1 : canNext2) ? "pointer" : "not-allowed",
                transition: "background 0.2s",
              }}
            >
              Continue
            </button>
          ) : (
            <button onClick={() => onConfirm(data)} style={{
              flex: 2, background: "#2c2c2c", color: "white",
              border: "none", borderRadius: "30px",
              padding: "12px", fontSize: "13px",
              fontFamily: "Georgia, serif", cursor: "pointer",
            }}>
              Confirm booking
            </button>
          )}
        </div>
      </div>
    </>
  );
}
