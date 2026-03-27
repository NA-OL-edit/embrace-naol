import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { pb, getProducts, addProduct, updateProduct, deleteProduct, createLog } from "@/lib/pocketbase";
import type { RecordModel } from "pocketbase";

const mapCatalogData = (data: any) => {
  const parseNum = (val: any) => {
    if (val === null || val === undefined || val === "") return "";
    if (typeof val === "number") return val;
    return parseFloat(val.toString().replace(/[^0-9.-]+/g, "")) || "";
  };
  return {
    id: data.id || "",
    product_id: data.productId || data.product_id || "",
    name: data.name || "",
    shape: data.shape || "",
    color: data.color || "",
    clarity: data.clarity || "",
    carat: data.carat || "",
    description: data.description || "",
    main_diamond_shape: data.mainDiamondShape || data.main_diamond_shape || "",
    main_diamond_weight: parseNum(data.mainDiamondWeight || data.main_diamond_weight),
    main_diamond_clarity: data.mainDiamondClarity || data.main_diamond_clarity || "",
    main_diamond_color: data.mainDiamondColor || data.main_diamond_color || "",
    cut: data.cut || "",
    symmetry: data.symmetry || "",
    polish: data.polish || "",
    secondary_diamond_weight: parseNum(data.secondaryDiamondWeight || data.secondary_diamond_weight),
    secondary_diamond_clarity: data.secondaryDiamondClarity || data.secondary_diamond_clarity || "",
    secondary_diamond_color: data.secondaryDiamondColor || data.secondary_diamond_color || "",
    metal_type: data.metalType || data.metal_type || "",
    metal_purity: data.metalPurity || data.metal_purity || "",
    metal_color: data.metalColor || data.metal_color || "",
    metal_weight: parseNum(data.metalWeight || data.metal_weight),
    replacement_value: parseNum(data.replacementValue || data.replacement_value),
    certification: data.certification || "",
    image: data.image || "",
  };
};

type ProductForm = ReturnType<typeof mapCatalogData>;
const emptyForm = (): ProductForm => mapCatalogData({});

export default function Diamonds() {
  const [products, setProducts] = useState<RecordModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const navigate = useNavigate();

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const fetchDiamonds = async () => {
    setLoading(true);
    try {
      const items = await getProducts();
      setProducts(items);
    } catch (err: any) {
      showToast("Error loading data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pb.authStore.isValid) { navigate("/admin/login"); return; }
    fetchDiamonds();
  }, [navigate]);

  const openNew = () => { setForm(emptyForm()); setImageFile(null); setModalOpen(true); };
  const openEdit = (raw: RecordModel) => { setForm(mapCatalogData(raw)); setImageFile(null); setModalOpen(true); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      const fields = [
        "name", "shape", "color", "clarity", "carat", "product_id", "description",
        "main_diamond_shape", "main_diamond_weight", "main_diamond_clarity", "main_diamond_color",
        "cut", "symmetry", "polish", "replacement_value",
        "secondary_diamond_weight", "secondary_diamond_clarity", "secondary_diamond_color",
        "metal_type", "metal_purity", "metal_color", "metal_weight", "certification",
      ] as const;
      fields.forEach((k) => fd.append(k, String((form as any)[k] ?? "")));
      if (imageFile) fd.append("image", imageFile);

      if (form.id) {
        await updateProduct(form.id, fd);
        await createLog("Updated diamond", form.name || form.product_id || form.id);
      } else {
        await addProduct(fd);
        await createLog("Added diamond", form.name || form.product_id);
      }
      showToast("Diamond saved");
      setModalOpen(false);
      fetchDiamonds();
    } catch (err: any) {
      showToast("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this diamond?")) return;
    try {
      const p = products.find(prod => prod.id === id);
      const targetName = p ? (p.name || p.product_id || id) : id;
      await deleteProduct(id);
      await createLog("Deleted diamond", targetName);
      showToast("Deleted");
      fetchDiamonds();
    } catch (err: any) {
      showToast("Error: " + err.message);
    }
  };

  const f = (key: keyof ProductForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div>
      <p style={s.desc}>Full diamond listing — each entry links to its detail, certification, and images.</p>
      <div style={s.card}>
        <div style={s.cardHead}>
          <div style={s.cardTitle}>Diamond listings ({loading ? "…" : products.length})</div>
          <button style={s.btnPrimary} onClick={openNew}>+ Add diamond</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                {["ID", "Name / Shape", "Weight", "Clarity", "Color", "Cut", "Metal", "Cert", "Img", "Actions"].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} style={s.tdCenter}>Loading…</td></tr>}
              {!loading && products.length === 0 && <tr><td colSpan={10} style={s.tdCenter}>No products found.</td></tr>}
              {products.map((rawP) => {
                const p = mapCatalogData(rawP);
                const imgUrl = p.image ? pb.getFileUrl(rawP, p.image, { thumb: "50x50" }) : "";
                return (
                  <tr key={p.id}>
                    <td style={{ ...s.td, fontFamily: "monospace", fontSize: 11, color: "#888780" }}>{p.product_id}</td>
                    <td style={s.td}><div style={{ fontWeight: 500 }}>{p.name || p.shape || "—"}</div></td>
                    <td style={s.td}>{p.main_diamond_weight || "—"}</td>
                    <td style={s.td}>{p.main_diamond_clarity || "—"}</td>
                    <td style={s.td}>{p.main_diamond_color || "—"}</td>
                    <td style={s.td}>{p.cut || "—"}</td>
                    <td style={s.td}>{p.metal_type || "—"}</td>
                    <td style={s.td}>{p.certification || "—"}</td>
                    <td style={s.td}>
                      {imgUrl ? (
                        <img src={imgUrl} style={{ width: 30, height: 30, borderRadius: 4, objectFit: "cover", cursor: "pointer" }}
                          onClick={() => window.open(pb.getFileUrl(rawP, p.image))} />
                      ) : "—"}
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button style={s.btnSm} onClick={() => openEdit(rawP)}>Edit</button>
                        <button style={{ ...s.btnSm, color: "#e24b4a", borderColor: "rgba(226,75,74,.3)" }} onClick={() => handleDelete(p.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={s.modalWrap} onClick={() => setModalOpen(false)}>
          <form style={s.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <div style={s.modalHead}>
              <div style={s.modalTitle}>{form.id ? "Edit diamond" : "Add diamond"}</div>
              <button type="button" style={s.modalClose} onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div style={s.modalBody}>
              <FG label="Product Name"><input style={s.input} value={form.name} onChange={f("name")} required /></FG>
              <TwoCol>
                <FG label="SKU"><input style={s.input} value={form.product_id} onChange={f("product_id")} /></FG>
                <FG label="Master Shape"><input style={s.input} value={form.shape} onChange={f("shape")} /></FG>
              </TwoCol>
              <TwoCol>
                <FG label="Master Color"><input style={s.input} value={form.color} onChange={f("color")} /></FG>
                <FG label="Master Clarity"><input style={s.input} value={form.clarity} onChange={f("clarity")} /></FG>
              </TwoCol>
              <TwoCol>
                <FG label="Master Carat"><input style={s.input} value={form.carat} onChange={f("carat")} /></FG>
                <FG label="Certification"><input style={s.input} value={form.certification} onChange={f("certification")} /></FG>
              </TwoCol>
              <SecTitle>Main Diamond</SecTitle>
              <TwoCol>
                <FG label="Weight"><input style={s.input} type="number" step="0.01" value={form.main_diamond_weight} onChange={f("main_diamond_weight")} /></FG>
                <FG label="Shape"><input style={s.input} value={form.main_diamond_shape} onChange={f("main_diamond_shape")} /></FG>
              </TwoCol>
              <TwoCol>
                <FG label="Color"><input style={s.input} value={form.main_diamond_color} onChange={f("main_diamond_color")} /></FG>
                <FG label="Clarity"><input style={s.input} value={form.main_diamond_clarity} onChange={f("main_diamond_clarity")} /></FG>
              </TwoCol>
              <TwoCol>
                <FG label="Cut"><input style={s.input} value={form.cut} onChange={f("cut")} /></FG>
                <FG label="Symmetry"><input style={s.input} value={form.symmetry} onChange={f("symmetry")} /></FG>
              </TwoCol>
              <TwoCol>
                <FG label="Polish"><input style={s.input} value={form.polish} onChange={f("polish")} /></FG>
                <FG label="Replacement Value"><input style={s.input} type="number" step="0.01" value={form.replacement_value} onChange={f("replacement_value")} /></FG>
              </TwoCol>
              <SecTitle>Secondary Diamond</SecTitle>
              <TwoCol>
                <FG label="Weight"><input style={s.input} type="number" step="0.01" value={form.secondary_diamond_weight} onChange={f("secondary_diamond_weight")} /></FG>
                <FG label="Color"><input style={s.input} value={form.secondary_diamond_color} onChange={f("secondary_diamond_color")} /></FG>
              </TwoCol>
              <FG label="Clarity"><input style={s.input} value={form.secondary_diamond_clarity} onChange={f("secondary_diamond_clarity")} /></FG>
              <SecTitle>Metal</SecTitle>
              <TwoCol>
                <FG label="Type"><input style={s.input} value={form.metal_type} onChange={f("metal_type")} /></FG>
                <FG label="Purity"><input style={s.input} value={form.metal_purity} onChange={f("metal_purity")} /></FG>
              </TwoCol>
              <TwoCol>
                <FG label="Color"><input style={s.input} value={form.metal_color} onChange={f("metal_color")} /></FG>
                <FG label="Weight"><input style={s.input} type="number" step="0.01" value={form.metal_weight} onChange={f("metal_weight")} /></FG>
              </TwoCol>
              <FG label="Description"><textarea style={{ ...s.input, resize: "vertical" }} rows={2} value={form.description} onChange={f("description")} /></FG>
              <FG label="Image"><input type="file" accept="image/*" style={s.input} onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} /></FG>
            </div>
            <div style={s.modalFoot}>
              <button type="button" style={s.btn} onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" style={s.btnPrimary} disabled={saving}>{saving ? "Saving…" : "Save diamond"}</button>
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
const TwoCol = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 0 }}>{children}</div>
);
const SecTitle = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 12, fontWeight: "bold", margin: "20px 0 10px", color: "#f8f7f2", borderBottom: "1px solid rgba(211, 209, 199, 0.15)", paddingBottom: 6, fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}</p>
);

const s: Record<string, React.CSSProperties> = {
  desc: { fontSize: 13, color: "#888780", marginBottom: 16, fontFamily: "system-ui, sans-serif", letterSpacing: "0.02em" },
  card: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(211, 209, 199, 0.1)", borderRadius: 16, overflow: "hidden", marginBottom: 16, backdropFilter: "blur(8px)" },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(211, 209, 199, 0.1)" },
  cardTitle: { fontSize: 14, fontWeight: 500, fontFamily: "system-ui, sans-serif", color: "#f8f7f2" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 11, color: "#888780", fontWeight: 400, padding: "10px 18px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(211, 209, 199, 0.1)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" },
  td: { padding: "12px 18px", fontSize: 13, borderBottom: "1px solid rgba(211, 209, 199, 0.05)", color: "#b4b2a9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "system-ui, sans-serif", maxWidth: 160 },
  tdCenter: { textAlign: "center", padding: "24px 18px", fontSize: 13, color: "#888780", fontFamily: "system-ui, sans-serif" },
  btn: { padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", border: "1px solid rgba(211, 209, 199, 0.2)", background: "rgba(255,255,255,0.05)", color: "#b4b2a9", fontFamily: "system-ui, sans-serif", transition: "all 0.2s" },
  btnPrimary: { padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", background: "#534AB7", color: "#fff", border: "none", fontFamily: "system-ui, sans-serif", boxShadow: "0 4px 12px rgba(83, 74, 183, 0.3)" },
  btnSm: { padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", border: "1px solid rgba(211, 209, 199, 0.15)", background: "rgba(255,255,255,0.03)", color: "#b4b2a9", fontFamily: "system-ui, sans-serif" },
  input: { width: "100%", padding: "9px 12px", border: "1px solid rgba(211, 209, 199, 0.15)", borderRadius: 8, fontSize: 13, background: "rgba(255,255,255,0.05)", color: "#fff", outline: "none", boxSizing: "border-box", fontFamily: "system-ui, sans-serif" },
  modalWrap: { position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "hsl(18, 30%, 12%)", border: "1px solid rgba(211, 209, 199, 0.15)", borderRadius: 20, width: "90%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "0 32px 64px rgba(0,0,0,0.6)" },
  modalHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid rgba(211, 209, 199, 0.1)" },
  modalTitle: { fontSize: 18, fontWeight: 500, fontFamily: "system-ui, sans-serif", color: "#f8f7f2" },
  modalClose: { background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#888780", lineHeight: 1 },
  modalBody: { padding: 24, overflowY: "auto", flex: 1 },
  modalFoot: { display: "flex", justifyContent: "flex-end", gap: 12, padding: "18px 24px", borderTop: "1px solid rgba(211, 209, 199, 0.1)", background: "rgba(0,0,0,0.2)" },
  toast: { position: "fixed", bottom: 24, right: 24, background: "#534AB7", color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 13, zIndex: 999, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" },
};
