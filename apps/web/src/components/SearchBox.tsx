// Global search box for the nav. Hits /api/search with a 300ms debounce
// and renders a floating dark dropdown that links to each venue's page.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { apiUrl } from "@/lib/api";

type SearchHit = {
  id: string;
  name: string;
  category: string; // server enum: RESTAURANTS, MASTER_CLASSES, ...
};

// Convert the Prisma enum to the URL slug used by the $category route.
function categoryToSlug(category: string): string {
  return category.toLowerCase().replace(/_/g, "-");
}

export default function SearchBox() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounced fetch — wait 300ms after the last keystroke before hitting the API.
  // Empty query short-circuits and clears the dropdown.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(apiUrl(`/api/search?q=${encodeURIComponent(q)}`), { signal: ctrl.signal })
        .then(r => r.json())
        .then((data: SearchHit[]) => {
          if (Array.isArray(data)) {
            setResults(data);
            setOpen(true);
          }
        })
        .catch(() => { /* ignore aborted/network errors */ })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  // Close the dropdown when clicking outside the search wrapper.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handlePick = (hit: SearchHit) => {
    setOpen(false);
    setQuery("");
    navigate(`/${categoryToSlug(hit.category)}/${hit.id}`);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        placeholder="Search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        style={{
          border: "1px solid #d4a0a4", borderRadius: "20px",
          padding: "6px 32px 6px 14px", fontSize: "12px",
          fontFamily: "Georgia, serif", background: "transparent",
          outline: "none", color: "#2c2c2c", width: "180px",
        }}
      />
      <span style={{
        position: "absolute", right: "10px", top: "50%",
        transform: "translateY(-50%)", fontSize: "12px", color: "#a0a0a0",
        pointerEvents: "none",
      }}>
        ⌕
      </span>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
          minWidth: "260px",
          background: "rgba(0,0,0,0.82)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "12px",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
          zIndex: 1000,
          overflow: "hidden",
          maxHeight: "320px", overflowY: "auto",
        }}>
          {loading && (
            <div style={{
              padding: "12px 16px", fontSize: "12px",
              color: "rgba(255,255,255,0.6)", fontFamily: "Georgia, serif",
            }}>
              Searching…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div style={{
              padding: "12px 16px", fontSize: "12px",
              color: "rgba(255,255,255,0.6)", fontFamily: "Georgia, serif",
            }}>
              No matches
            </div>
          )}
          {!loading && results.map(hit => (
            <button
              key={hit.id}
              type="button"
              onClick={() => handlePick(hit)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: "transparent", border: "none", cursor: "pointer",
                padding: "10px 16px",
                fontFamily: "Georgia, serif",
                color: "white",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontSize: "13px" }}>{hit.name}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", marginTop: "2px" }}>
                {hit.category.replace(/_/g, " ").toLowerCase()}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
