import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { pb, getProducts } from "@/lib/pocketbase";
import type { RecordModel } from "pocketbase";

export default function Media() {
  const [items, setItems] = useState<RecordModel[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!pb.authStore.isValid) { navigate("/admin/login"); return; }
    getProducts()
      .then((all) => setItems(all.filter((p) => p.image)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div>
      <p style={s.desc}>View images and certification documents attached to products.</p>
      <div style={s.card}>
        <div style={s.cardHead}>
          <div style={s.cardTitle}>Media library ({loading ? "…" : items.length})</div>
        </div>
        {loading && <div style={s.empty}>Loading…</div>}
        {!loading && items.length === 0 && <div style={s.empty}>No media uploaded.</div>}
        <div style={s.grid}>
          {items.map((item) => {
            const thumb = pb.getFileUrl(item, item.image, { thumb: "200x200" });
            const full = pb.getFileUrl(item, item.image);
            return (
              <div key={item.id} style={s.mediaItem} onClick={() => window.open(full)}>
                <img src={thumb} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  desc: { fontSize: 13, color: "#888780", marginBottom: 16, fontFamily: "system-ui, sans-serif" },
  card: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(211, 209, 199, 0.1)", borderRadius: 16, overflow: "hidden", backdropFilter: "blur(8px)" },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(211, 209, 199, 0.1)" },
  cardTitle: { fontSize: 14, fontWeight: 500, fontFamily: "system-ui, sans-serif", color: "#f8f7f2" },
  empty: { padding: "24px 18px", fontSize: 13, color: "#888780", fontFamily: "system-ui, sans-serif" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12, padding: 18 },
  mediaItem: { aspectRatio: "1", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(211, 209, 199, 0.1)", overflow: "hidden", cursor: "pointer", transition: "transform 0.2s, border-color 0.2s" },
};
