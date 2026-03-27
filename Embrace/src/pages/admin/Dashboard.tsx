import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { pb, getProductsPage, getCategoriesCount, getLogsCount } from "@/lib/pocketbase";

interface Product {
  id: string;
  product_id?: string;
  productId?: string;
  name?: string;
  shape?: string;
  main_diamond_shape?: string;
  mainDiamondShape?: string;
  certification?: string;
}

export default function Dashboard() {
  const [diamonds, setDiamonds] = useState(0);
  const [categories, setCategories] = useState(0);
  const [logs, setLogs] = useState(0);
  const [recent, setRecent] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!pb.authStore.isValid) { navigate("/admin/login"); return; }

    const load = async () => {
      try {
        const [prodPage, catCount, logCount] = await Promise.all([
          getProductsPage(1, 5),
          getCategoriesCount(),
          getLogsCount(),
        ]);
        setDiamonds(prodPage.totalItems);
        setCategories(catCount);
        setLogs(logCount);
        setRecent(prodPage.items as Product[]);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const pid = (p: Product) => p.product_id || p.productId || "";
  const pshape = (p: Product) => p.shape || p.main_diamond_shape || p.mainDiamondShape || "—";

  return (
    <div>
      {/* Stat cards */}
      <div style={styles.statGrid}>
        <StatCard label="Diamonds" value={loading ? "…" : diamonds} badge="Live" badgeType="green" />
        <StatCard label="Categories" value={loading ? "…" : categories} badge="Active" badgeType="green" />
        <StatCard label="Audit logs" value={loading ? "…" : logs} badge="Total" badgeType="blue" />
        <StatCard label="Connection" value="Online" badge="PocketBase" badgeType="green" />
      </div>

      {/* Recent diamonds */}
      <div style={styles.card}>
        <div style={styles.cardHead}>
          <div style={styles.cardTitle}>Recent diamonds</div>
          <button style={styles.btnPrimary} onClick={() => navigate("/admin/diamonds")}>View all</button>
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 110 }}>ID</th>
              <th style={styles.th}>Name</th>
              <th style={{ ...styles.th, width: 150 }}>Shape</th>
              <th style={{ ...styles.th, width: 120 }}>Certification</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} style={styles.tdCenter}>Loading…</td></tr>}
            {!loading && recent.length === 0 && <tr><td colSpan={4} style={styles.tdCenter}>No recent diamonds.</td></tr>}
            {recent.map((p) => (
              <tr key={p.id}>
                <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 11, color: "#888780" }}>{pid(p)}</td>
                <td style={{ ...styles.td, fontWeight: 500 }}>{p.name || "—"}</td>
                <td style={styles.td}>{pshape(p)}</td>
                <td style={styles.td}>{p.certification || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick actions */}
      <div style={styles.card}>
        <div style={styles.cardHead}><div style={styles.cardTitle}>Quick actions</div></div>
        <div style={{ padding: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={styles.btnPrimary} onClick={() => navigate("/admin/categories")}>+ Add category</button>
          <button style={styles.btn} onClick={() => navigate("/admin/diamonds")}>+ Add diamond</button>
          <button style={styles.btn} onClick={() => navigate("/admin/media")}>Media library</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, badge, badgeType }: {
  label: string; value: number | string; badge: string; badgeType: "green" | "blue";
}) {
  return (
    <div style={styles.stat}>
      <div style={styles.statL}>{label}</div>
      <div style={{ ...styles.statV, ...(label === "Connection" ? { color: "#2db464", fontSize: 16 } : {}) }}>{value}</div>
      <span style={{ ...styles.badge, ...(badgeType === "green" ? styles.badgeG : styles.badgeB) }}>{badge}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 16 },
  stat: { background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)", borderRadius: 12, padding: 16, border: "1px solid rgba(211, 209, 199, 0.1)" },
  statL: { fontSize: 11, color: "#888780", marginBottom: 6, fontFamily: "system-ui, sans-serif", letterSpacing: "0.05em", textTransform: "uppercase" },
  statV: { fontSize: 24, fontWeight: 500, fontFamily: "system-ui, sans-serif", color: "#f8f7f2" },
  badge: { display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, marginTop: 4, fontWeight: 500 },
  badgeG: { background: "rgba(45, 180, 100, 0.15)", color: "#4ade80" },
  badgeB: { background: "rgba(83, 74, 183, 0.15)", color: "#818cf8" },
  card: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(211, 209, 199, 0.1)", borderRadius: 16, overflow: "hidden", marginBottom: 16, backdropFilter: "blur(8px)" },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(211, 209, 199, 0.1)" },
  cardTitle: { fontSize: 14, fontWeight: 500, fontFamily: "system-ui, sans-serif", color: "#f8f7f2" },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  th: { textAlign: "left", fontSize: 11, color: "#888780", fontWeight: 400, padding: "10px 18px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(211, 209, 199, 0.1)", textTransform: "uppercase", letterSpacing: "0.05em" },
  td: { padding: "12px 18px", fontSize: 13, borderBottom: "1px solid rgba(211, 209, 199, 0.05)", color: "#b4b2a9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "system-ui, sans-serif" },
  tdCenter: { textAlign: "center", padding: "24px 18px", fontSize: 13, color: "#888780", fontFamily: "system-ui, sans-serif" },
  btn: { padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", border: "1px solid rgba(211, 209, 199, 0.2)", background: "rgba(255,255,255,0.05)", color: "#b4b2a9", fontFamily: "system-ui, sans-serif", transition: "all 0.2s" },
  btnPrimary: { padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", background: "#534AB7", color: "#fff", border: "none", fontFamily: "system-ui, sans-serif", boxShadow: "0 4px 12px rgba(83, 74, 183, 0.3)" },
};
