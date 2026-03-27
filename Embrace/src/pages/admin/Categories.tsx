import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { pb, getCategories, addCategory, updateCategory, deleteCategory, createLog } from "@/lib/pocketbase";
import type { RecordModel } from "pocketbase";

type CatForm = { id: string; name: string; type: string; status: string; description: string; image: string; };
const emptyForm = (): CatForm => ({ id: "", name: "", type: "Diamond", status: "active", description: "", image: "" });

export default function Categories() {
  const [cats, setCats] = useState<RecordModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CatForm>(emptyForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const navigate = useNavigate();

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const fetchCats = async () => {
    setLoading(true);
    try {
      const items = await getCategories();
      setCats(items);
    } catch (err: any) {
      showToast("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pb.authStore.isValid) { navigate("/admin/login"); return; }
    fetchCats();
  }, [navigate]);

  const openNew = () => { setForm(emptyForm()); setImageFile(null); setModalOpen(true); };
  const openEdit = (c: RecordModel) => {
    setForm({ id: c.id, name: c.name || "", type: c.type || "Diamond", status: c.status || "active", description: c.description || "", image: c.image || "" });
    setImageFile(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("description", form.description);
      fd.append("type", form.type);
      fd.append("status", form.status);
      if (imageFile) fd.append("image", imageFile);
      if (form.id) {
        await updateCategory(form.id, fd);
        await createLog("Updated category", form.name || form.id);
      } else {
        await addCategory(fd);
        await createLog("Added category", form.name);
      }
      showToast("Category saved");
      setModalOpen(false);
      fetchCats();
    } catch (err: any) {
      showToast("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      const c = cats.find(cat => cat.id === id);
      const targetName = c ? (c.name || id) : id;
      await deleteCategory(id);
      await createLog("Deleted category", targetName);
      showToast("Deleted");
      fetchCats();
    } catch (err: any) { showToast("Error: " + err.message); }
  };

  const f = (key: keyof CatForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div>
      <p style={s.desc}>Manage diamond categories — add, edit, or delete types and albums.</p>
      <div style={s.card}>
        <div style={s.cardHead}>
          <div style={s.cardTitle}>All categories ({loading ? "…" : cats.length})</div>
          <button style={s.btnPrimary} onClick={openNew}>+ Add category</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, width: 200 }}>Name</th>
                <th style={{ ...s.th, width: 120 }}>Type</th>
                <th style={{ ...s.th, width: 100 }}>Status</th>
                <th style={s.th}>Desc</th>
                <th style={{ ...s.th, width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={s.tdCenter}>Loading…</td></tr>}
              {!loading && cats.length === 0 && <tr><td colSpan={5} style={s.tdCenter}>No categories found.</td></tr>}
              {cats.map((c) => (
                <tr key={c.id}>
                  <td style={{ ...s.td, fontWeight: 500 }}>{c.name}</td>
                  <td style={s.td}>{c.type}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...(c.status === "active" ? s.badgeG : s.badgeY) }}>{c.status || "draft"}</span>
                  </td>
                  <td style={s.td}>{c.description}</td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button style={s.btnSm} onClick={() => openEdit(c)}>Edit</button>
                      <button style={{ ...s.btnSm, color: "#e24b4a", borderColor: "rgba(226,75,74,.3)" }} onClick={() => handleDelete(c.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div style={s.modalWrap} onClick={() => setModalOpen(false)}>
          <form style={s.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <div style={s.modalHead}>
              <div style={s.modalTitle}>{form.id ? "Edit Category" : "Add Category"}</div>
              <button type="button" style={s.modalClose} onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div style={s.modalBody}>
              <FG label="Type">
                <select style={s.input} value={form.type} onChange={f("type")}>
                  <option value="Diamond">Diamond</option>
                  <option value="Metal cert">Metal cert</option>
                  <option value="Album">Album</option>
                </select>
              </FG>
              <FG label="Name"><input style={s.input} value={form.name} onChange={f("name")} required /></FG>
              <FG label="Description"><textarea style={{ ...s.input, resize: "vertical" }} rows={2} value={form.description} onChange={f("description")} /></FG>
              <FG label="Status">
                <select style={s.input} value={form.status} onChange={f("status")}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
              </FG>
              {form.id && form.image && (
                <FG label="Current Image">
                  <img src={pb.getFileUrl({ collectionId: "categories", id: form.id } as any, form.image, { thumb: "100x100" })}
                    style={{ maxHeight: 80, borderRadius: 4, border: "1px solid #d3d1c7", marginBottom: 8, display: "block" }} />
                </FG>
              )}
              <FG label="Image"><input type="file" accept="image/*" style={s.input} onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} /></FG>
            </div>
            <div style={s.modalFoot}>
              <button type="button" style={s.btn} onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" style={s.btnPrimary} disabled={saving}>{saving ? "Saving…" : "Save category"}</button>
            </div>
          </form>
        </div>
      )}

      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );
}

const FG = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ display: "block", fontSize: 11, color: "#888780", marginBottom: 5, fontWeight: 500, fontFamily: "system-ui, sans-serif" }}>{label}</label>
    {children}
  </div>
);

const s: Record<string, React.CSSProperties> = {
  desc: { fontSize: 13, color: "#888780", marginBottom: 16, fontFamily: "system-ui, sans-serif", letterSpacing: "0.02em" },
  card: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(211, 209, 199, 0.1)", borderRadius: 16, overflow: "hidden", marginBottom: 16, backdropFilter: "blur(8px)" },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(211, 209, 199, 0.1)" },
  cardTitle: { fontSize: 14, fontWeight: 500, fontFamily: "system-ui, sans-serif", color: "#f8f7f2" },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  th: { textAlign: "left", fontSize: 11, color: "#888780", fontWeight: 400, padding: "10px 18px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(211, 209, 199, 0.1)", textTransform: "uppercase", letterSpacing: "0.05em" },
  td: { padding: "12px 18px", fontSize: 13, borderBottom: "1px solid rgba(211, 209, 199, 0.05)", color: "#b4b2a9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "system-ui, sans-serif" },
  tdCenter: { textAlign: "center", padding: "24px 18px", fontSize: 13, color: "#888780", fontFamily: "system-ui, sans-serif" },
  badge: { display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500 },
  badgeG: { background: "rgba(45, 180, 100, 0.15)", color: "#4ade80" },
  badgeY: { background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" },
  btn: { padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", border: "1px solid rgba(211, 209, 199, 0.2)", background: "rgba(255,255,255,0.05)", color: "#b4b2a9", fontFamily: "system-ui, sans-serif", transition: "all 0.2s" },
  btnPrimary: { padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", background: "#534AB7", color: "#fff", border: "none", fontFamily: "system-ui, sans-serif", boxShadow: "0 4px 12px rgba(83, 74, 183, 0.3)" },
  btnSm: { padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", border: "1px solid rgba(211, 209, 199, 0.15)", background: "rgba(255,255,255,0.03)", color: "#b4b2a9", fontFamily: "system-ui, sans-serif" },
  input: { width: "100%", padding: "9px 12px", border: "1px solid rgba(211, 209, 199, 0.15)", borderRadius: 8, fontSize: 13, background: "rgba(255,255,255,0.05)", color: "#fff", outline: "none", boxSizing: "border-box", fontFamily: "system-ui, sans-serif" },
  modalWrap: { position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "hsl(18, 30%, 12%)", border: "1px solid rgba(211, 209, 199, 0.15)", borderRadius: 20, width: 420, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "0 32px 64px rgba(0,0,0,0.6)" },
  modalHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid rgba(211, 209, 199, 0.1)" },
  modalTitle: { fontSize: 18, fontWeight: 500, fontFamily: "system-ui, sans-serif", color: "#f8f7f2" },
  modalClose: { background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#888780", lineHeight: 1 },
  modalBody: { padding: 24, overflowY: "auto", flex: 1 },
  modalFoot: { display: "flex", justifyContent: "flex-end", gap: 12, padding: "18px 24px", borderTop: "1px solid rgba(211, 209, 199, 0.1)", background: "rgba(0,0,0,0.2)" },
  toast: { position: "fixed", bottom: 24, right: 24, background: "#534AB7", color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 13, zIndex: 999, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" },
};
