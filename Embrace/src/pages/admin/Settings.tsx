import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { pb, getSettings, updateSetting, createLog } from "@/lib/pocketbase";
import type { RecordModel } from "pocketbase";

export default function Settings() {
  const [settings, setSettings] = useState<RecordModel[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const navigate = useNavigate();

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  useEffect(() => {
    if (!pb.authStore.isValid) { navigate("/admin/login"); return; }
    getSettings()
      .then((items) => {
        setSettings(items);
        const vals: Record<string, string> = {};
        items.forEach((s) => { vals[s.id] = s.value || ""; });
        setValues(vals);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [navigate]);

  const saveSetting = async (id: string) => {
    try {
      const s = settings.find((set) => set.id === id);
      await updateSetting(id, values[id] ?? "");
      await createLog("Updated setting", s?.key || id);
      showToast("Setting updated");
    } catch (e: any) { showToast(e.message); }
  };

  return (
    <div>
      <p style={s.desc}>Global site configuration and preferences.</p>
      <div style={s.group}>
        <div style={s.groupTitle}>Dynamic Settings</div>
        <div style={{ padding: 12 }}>
          {loading && <div style={s.empty}>Loading…</div>}
          {!loading && settings.length === 0 && <div style={s.empty}>No settings found.</div>}
          {settings.map((setting) => (
            <div key={setting.id} style={s.row}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>{setting.key}</label>
                <input
                  style={s.input}
                  value={values[setting.id] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [setting.id]: e.target.value }))}
                />
              </div>
              <button style={s.btnSm} onClick={() => saveSetting(setting.id)}>Update</button>
            </div>
          ))}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <button style={s.btnPrimary} onClick={() => showToast("Settings auto-saved")}>Auto-saved</button>
      </div>
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  desc: { fontSize: 13, color: "#888780", marginBottom: 16, fontFamily: "system-ui, sans-serif" },
  group: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(211, 209, 199, 0.1)", borderRadius: 16, marginBottom: 16, overflow: "hidden", backdropFilter: "blur(8px)" },
  groupTitle: { fontSize: 12, fontWeight: 500, padding: "12px 18px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(211, 209, 199, 0.1)", fontFamily: "system-ui, sans-serif", color: "#f8f7f2", textTransform: "uppercase", letterSpacing: "0.05em" },
  row: { display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 16, padding: "0 6px" },
  label: { display: "block", fontSize: 11, color: "#888780", marginBottom: 6, fontWeight: 500, fontFamily: "system-ui, sans-serif", textTransform: "uppercase" },
  input: { width: "100%", padding: "9px 12px", border: "1px solid rgba(211, 209, 199, 0.15)", borderRadius: 8, fontSize: 13, background: "rgba(255,255,255,0.05)", color: "#fff", outline: "none", boxSizing: "border-box", fontFamily: "system-ui, sans-serif" },
  empty: { fontSize: 13, color: "#888780", fontFamily: "system-ui, sans-serif" },
  btnSm: { padding: "8px 14px", borderRadius: 8, fontSize: 11, cursor: "pointer", border: "1px solid rgba(211, 209, 199, 0.2)", background: "rgba(255,255,255,0.05)", color: "#b4b2a9", whiteSpace: "nowrap", fontFamily: "system-ui, sans-serif" },
  btnPrimary: { padding: "8px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", background: "#534AB7", color: "#fff", border: "none", fontFamily: "system-ui, sans-serif", boxShadow: "0 4px 12px rgba(83, 74, 183, 0.3)" },
  toast: { position: "fixed", bottom: 24, right: 24, background: "#534AB7", color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 13, zIndex: 999, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" },
};
