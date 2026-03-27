import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { pb, getAuditLogs } from "@/lib/pocketbase";
import type { RecordModel } from "pocketbase";

export default function AuditLog() {
  const [logs, setLogs] = useState<RecordModel[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!pb.authStore.isValid) { navigate("/admin/login"); return; }
    getAuditLogs(50)
      .then((res) => setLogs(res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div>
      <p style={s.desc}>Full history of all admin actions — who changed what and when.</p>
      <div style={s.card}>
        <div style={s.cardHead}><div style={s.cardTitle}>Audit log ({loading ? "…" : logs.length})</div></div>
        {loading && <div style={s.empty}>Loading…</div>}
        {!loading && logs.length === 0 && <div style={s.empty}>No logs found.</div>}
        {logs.map((l) => (
          <div key={l.id} style={s.row}>
            <div style={s.dot} />
            <div style={s.time}>{l.created?.substring(0, 16).replace("T", " ")}</div>
            <div style={s.text}><b>{l.admin_email}</b> {l.action} target <b>{l.target}</b></div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  desc: { fontSize: 13, color: "#888780", marginBottom: 16, fontFamily: "system-ui, sans-serif" },
  card: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(211, 209, 199, 0.1)", borderRadius: 16, overflow: "hidden", backdropFilter: "blur(8px)" },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(211, 209, 199, 0.1)" },
  cardTitle: { fontSize: 14, fontWeight: 500, fontFamily: "system-ui, sans-serif", color: "#f8f7f2" },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderBottom: "1px solid rgba(211, 209, 199, 0.05)", fontSize: 13, fontFamily: "system-ui, sans-serif" },
  dot: { width: 7, height: 7, borderRadius: "50%", background: "#534AB7", flexShrink: 0, boxShadow: "0 0 8px rgba(83, 74, 183, 0.5)" },
  time: { fontSize: 11, color: "#888780", minWidth: 130, letterSpacing: "0.02em" },
  text: { color: "#b4b2a9" },
  empty: { padding: "24px 18px", fontSize: 13, color: "#888780", fontFamily: "system-ui, sans-serif" },
};
