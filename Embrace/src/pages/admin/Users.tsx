import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { pb, getAdminUsers } from "@/lib/pocketbase";

interface User { id: string; email: string; created: string; }

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!pb.authStore.isValid) { navigate("/admin/login"); return; }
    getAdminUsers()
      .then((items) => {
        const normalized = (items as any[]).map((user) => ({
          id: String(user?.id || ""),
          email: String(user?.email || ""),
          created: String(user?.created || ""),
        }));
        setUsers(normalized.filter((user) => user.id && user.email));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div>
      <p style={s.desc}>View admin accounts.</p>
      <div style={s.card}>
        <div style={s.cardHead}><div style={s.cardTitle}>Admin users</div></div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Email</th>
              <th style={{ ...s.th, width: 150 }}>Created</th>
              <th style={{ ...s.th, width: 120 }}>Role</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3} style={s.tdCenter}>Loading…</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={3} style={s.tdCenter}>No users found.</td></tr>}
            {users.map((u) => (
              <tr key={u.id}>
                <td style={s.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={s.avatar}>{u.email.charAt(0).toUpperCase()}</div>
                    <span style={{ fontWeight: 500 }}>{u.email}</span>
                  </div>
                </td>
                <td style={s.td}>{u.created?.substring(0, 10)}</td>
                <td style={s.td}><span style={s.roleAdmin}>Admin</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  desc: { fontSize: 13, color: "#888780", marginBottom: 16, fontFamily: "system-ui, sans-serif" },
  card: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(211, 209, 199, 0.1)", borderRadius: 16, overflow: "hidden", backdropFilter: "blur(8px)" },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(211, 209, 199, 0.1)" },
  cardTitle: { fontSize: 14, fontWeight: 500, fontFamily: "system-ui, sans-serif", color: "#f8f7f2" },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  th: { textAlign: "left", fontSize: 11, color: "#888780", fontWeight: 400, padding: "10px 18px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(211, 209, 199, 0.1)", textTransform: "uppercase" },
  td: { padding: "12px 18px", fontSize: 13, borderBottom: "1px solid rgba(211, 209, 199, 0.05)", color: "#b4b2a9", fontFamily: "system-ui, sans-serif" },
  tdCenter: { textAlign: "center", padding: "24px 18px", fontSize: 13, color: "#888780", fontFamily: "system-ui, sans-serif" },
  avatar: { width: 30, height: 30, borderRadius: "50%", background: "rgba(83, 74, 183, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: "#c5a059", flexShrink: 0, border: "1px solid rgba(83, 74, 183, 0.3)" },
  roleAdmin: { padding: "2px 8px", borderRadius: 10, fontSize: 10, background: "rgba(239, 68, 68, 0.15)", color: "#f87171", fontWeight: 500 },
};
