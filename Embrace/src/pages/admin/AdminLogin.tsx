import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "@/lib/pocketbase";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const pocketBaseUrl =
    (import.meta as any).env?.VITE_POCKETBASE_URL || (import.meta as any).env?.VITE_PB_URL || "";
  const staticMode =
    String((import.meta as any).env?.VITE_STATIC_CATALOG || "").toLowerCase() === "true" || !pocketBaseUrl;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (staticMode) {
      setError("Live Editing is Disabled. Connect PocketBase and set VITE_POCKETBASE_URL to enable Admin editing.");
      return;
    }
    setLoading(true);
    try {
      await adminLogin(email, password);
      navigate("/admin");
    } catch (err: any) {
      setError(err?.response?.message || err?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.bg}>
      <div style={styles.box}>
        <h2 style={styles.title}>Admin Login</h2>
        {staticMode && (
          <div style={styles.notice}>
            Live Editing is Disabled. This build runs on a local static catalog until the database is connected.
          </div>
        )}
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={styles.group}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
              autoFocus
              disabled={staticMode}
            />
          </div>
          <div style={styles.group}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
              disabled={staticMode}
            />
          </div>
          <button type="submit" style={styles.btn} disabled={loading || staticMode}>
            {staticMode ? "Live Editing Disabled" : loading ? "Signing in…" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bg: { 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    width: "100%", 
    height: "100vh", 
    background: "var(--gradient-dark)", 
    backgroundAttachment: "fixed",
    backgroundImage: "radial-gradient(140% 80% at 12% 8%, hsl(24 34% 20% / 0.55), transparent 58%), radial-gradient(120% 74% at 88% 18%, hsl(18 30% 16% / 0.52), transparent 62%), linear-gradient(132deg, hsl(18 30% 12%), hsl(21 38% 14%) 45%, hsl(15 29% 9%) 100%), repeating-linear-gradient(112deg, hsl(35 24% 26% / 0.065) 0px, hsl(35 24% 26% / 0.065) 2px, transparent 2px, transparent 16px)"
  },
  box: { 
    background: "rgba(19, 34, 16, 0.45)", 
    backdropFilter: "blur(24px)", 
    padding: 30, 
    borderRadius: 16, 
    border: "1px solid rgba(211, 209, 199, 0.2)", 
    width: 340, 
    boxShadow: "0 24px 64px rgba(0,0,0,0.5)" 
  },
  title: { fontSize: 18, fontWeight: 500, marginBottom: 20, color: "#f8f7f2", fontFamily: "system-ui, sans-serif" },
  notice: {
    color: "#f6e27a",
    marginBottom: 12,
    fontSize: 12,
    fontFamily: "system-ui, sans-serif",
    lineHeight: 1.4,
    border: "1px solid rgba(246, 226, 122, 0.35)",
    background: "rgba(246, 226, 122, 0.08)",
    padding: "10px 12px",
    borderRadius: 10,
  },
  error: { color: "#ff6b6b", marginBottom: 15, fontSize: 13, fontFamily: "system-ui, sans-serif" },
  group: { marginBottom: 16 },
  label: { display: "block", fontSize: 11, color: "#b4b2a9", marginBottom: 5, fontWeight: 500, fontFamily: "system-ui, sans-serif", letterSpacing: "0.05em" },
  input: { 
    width: "100%", 
    padding: "9px 12px", 
    border: "1px solid rgba(211, 209, 199, 0.15)", 
    borderRadius: 8, 
    fontSize: 13, 
    background: "rgba(255,255,255,0.05)", 
    color: "#fff", 
    outline: "none", 
    boxSizing: "border-box" 
  },
  btn: { 
    width: "100%", 
    marginTop: 10, 
    padding: "10px 12px", 
    background: "#534AB7", 
    color: "#fff", 
    border: "none", 
    borderRadius: 8, 
    fontSize: 13, 
    fontWeight: 500,
    cursor: "pointer", 
    fontFamily: "system-ui, sans-serif",
    boxShadow: "0 4px 12px rgba(83, 74, 183, 0.3)" 
  },
};
