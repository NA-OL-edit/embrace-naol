import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/AnimationWrappers';
import {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getImageUrl,
} from '@/lib/pocketbase';

// ── Industry-standard option sets ────────────────────────────
const SHAPES   = ['Round','Princess','Cushion','Oval','Emerald','Pear','Marquise','Radiant','Asscher','Heart','Baguette','Trillion','Other'];
const CLARITIES = ['FL','IF','VVS1','VVS2','VS1','VS2','SI1','SI2','I1','I2','I3'];
const COLORS    = ['D','E','F','G','H','I','J','K','L','M','N-Z','Fancy'];
const CUTS      = ['Excellent','Very Good','Good','Fair','Poor'];
const GRADES    = ['Excellent','Very Good','Good','Fair','Poor']; // symmetry & polish

// ── Types ─────────────────────────────────────────────────────
type Product = {
  id: string;
  collectionId: string;
  product_id: string;
  description: string;
  main_diamond_shape: string;
  main_diamond_weight: number;
  main_diamond_clarity: string;
  main_diamond_color: string;
  cut: string;
  symmetry: string;
  polish: string;
  secondary_diamond_weight: number;
  secondary_diamond_clarity: string;
  secondary_diamond_color: string;
  metal_type: string;
  metal_purity: string;
  metal_color: string;
  metal_weight: number;
  replacement_value: number;
  certification: string;
  image: string;
};

const blank = {
  product_id: '', description: '',
  main_diamond_shape: '', main_diamond_weight: '', main_diamond_clarity: '',
  main_diamond_color: '', cut: '', symmetry: '', polish: '',
  secondary_diamond_weight: '', secondary_diamond_clarity: '', secondary_diamond_color: '',
  metal_type: '', metal_purity: '', metal_color: '', metal_weight: '',
  replacement_value: '', certification: '',
};

type ViewMode = 'default' | 'add' | 'edit-search' | 'edit-form';

// ── Shared label style ────────────────────────────────────────
const lbl = "block text-[11px] uppercase tracking-[0.12em] font-semibold mb-1" +
            " text-[#888780]"; // gray

// ── Shared input style ────────────────────────────────────────
const inp = "w-full border border-[#d3d1c7] bg-[#f1efe8] text-[#2c2c2a] px-3 py-2 text-[12px] rounded-lg" +
            " outline-none focus:border-[#534AB7] transition-colors disabled:opacity-50" +
            " placeholder:text-[#b4b2a9]";

// ── Section header ────────────────────────────────────────────
const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="col-span-full flex items-center gap-3 mt-4 first:mt-0">
    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#534AB7]">{children}</span>
    <div className="flex-1 h-px bg-[#d3d1c7]" />
  </div>
);

// ── Select helper ─────────────────────────────────────────────
const Sel = ({
  label, name, value, options, disabled, onChange,
}: {
  label: string; name: string; value: string;
  options: string[]; disabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) => (
  <div>
    <label className={lbl}>{label}</label>
    <select name={name} value={value} onChange={onChange} disabled={disabled}
      className={inp + " cursor-pointer"}>
      <option value="">— Select —</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// ── Text / number input helper ────────────────────────────────
const Field = ({
  label, name, value, type = 'text', placeholder = '', disabled, onChange,
}: {
  label: string; name: string; value: string;
  type?: string; placeholder?: string; disabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div>
    <label className={lbl}>{label}</label>
    <input type={type} name={name} value={value} placeholder={placeholder}
      disabled={disabled} onChange={onChange} className={inp} />
  </div>
);

// ═══════════════════════════════════════════════════════════════
export default function AdminProductManager({ onRefresh }: { onRefresh?: () => void }) {
  const [mode, setMode]             = useState<ViewMode>('default');
  const [products, setProducts]     = useState<Product[]>([]);
  const [search, setSearch]         = useState('');
  const [form, setForm]             = useState(blank);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [imageFile, setImageFile]   = useState<File | null>(null);
  const [preview, setPreview]       = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── load products ───────────────────────────────────────────
  const loadProducts = async () => {
    setListLoading(true);
    try {
      const data = await getProducts();
      setProducts(data as unknown as Product[]);
    } catch { /* logged in lib */ }
    finally { setListLoading(false); }
  };
  useEffect(() => { void loadProducts(); }, []);

  // ── file → preview ─────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const buildFD = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v as string));
    if (imageFile) fd.append('image', imageFile);
    return fd;
  };

  const resetAll = () => {
    setMode('default'); setForm(blank); setEditingId(null);
    setEditingProd(null); setImageFile(null); setPreview(null); setSearch('');
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── ADD ─────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addProduct(buildFD());
      toast.success('Product added successfully!');
      resetAll();
      void loadProducts();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add product.');
    } finally { setLoading(false); }
  };

  // ── UPDATE ──────────────────────────────────────────────────
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setLoading(true);
    try {
      await updateProduct(editingId, buildFD());
      toast.success('Changes saved!');
      setMode('edit-search');
      setEditingId(null); setEditingProd(null); setForm(blank);
      setImageFile(null); setPreview(null);
      void loadProducts();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save changes.');
    } finally { setLoading(false); }
  };

  // ── DELETE ──────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this product?')) return;
    setLoading(true);
    try {
      await deleteProduct(id);
      toast.success('Product deleted.');
      await loadProducts();
      if (onRefresh) onRefresh();
      setMode('edit-search');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete.');
    } finally { setLoading(false); }
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id); setEditingProd(p);
    setForm({
      product_id: p.product_id ?? '', description: p.description ?? '',
      main_diamond_shape: p.main_diamond_shape ?? '',
      main_diamond_weight: String(p.main_diamond_weight ?? ''),
      main_diamond_clarity: p.main_diamond_clarity ?? '',
      main_diamond_color: p.main_diamond_color ?? '',
      cut: p.cut ?? '', symmetry: p.symmetry ?? '', polish: p.polish ?? '',
      secondary_diamond_weight: String(p.secondary_diamond_weight ?? ''),
      secondary_diamond_clarity: p.secondary_diamond_clarity ?? '',
      secondary_diamond_color: p.secondary_diamond_color ?? '',
      metal_type: p.metal_type ?? '', metal_purity: p.metal_purity ?? '',
      metal_color: p.metal_color ?? '',
      metal_weight: String(p.metal_weight ?? ''),
      replacement_value: String(p.replacement_value ?? ''),
      certification: p.certification ?? '',
    });
    setImageFile(null); setPreview(null);
    setMode('edit-form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── filtered list ────────────────────────────────────────────
  const filtered = products.filter(p =>
    [p.product_id, p.description, p.main_diamond_shape, p.certification]
      .join(' ').toLowerCase().includes(search.toLowerCase())
  );

  // ── shared form fields layout ────────────────────────────────
  const renderForm = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* ── Product Identity ── */}
      <SectionHeader>Product Identity</SectionHeader>
      <Field label="Product ID" name="product_id" value={form.product_id}
        placeholder="e.g. RG-001" disabled={loading} onChange={handleChange} />
      <div className="col-span-full">
        <label className={lbl}>Description</label>
        <textarea name="description" value={form.description} disabled={loading}
          onChange={handleChange} rows={2}
          className={inp + " resize-none"}
          placeholder="e.g. Luxury solitaire diamond engagement ring" />
      </div>

      {/* ── Main Diamond Specs ── */}
      <SectionHeader>Main Diamond Specs</SectionHeader>
      <Sel label="Shape" name="main_diamond_shape"
        value={form.main_diamond_shape} options={SHAPES}
        disabled={loading} onChange={handleChange} />
      <Field label="Weight (ct)" name="main_diamond_weight"
        value={form.main_diamond_weight} type="number"
        placeholder="e.g. 1.05" disabled={loading} onChange={handleChange} />
      <Sel label="Clarity" name="main_diamond_clarity"
        value={form.main_diamond_clarity} options={CLARITIES}
        disabled={loading} onChange={handleChange} />
      <Sel label="Color" name="main_diamond_color"
        value={form.main_diamond_color} options={COLORS}
        disabled={loading} onChange={handleChange} />
      <Sel label="Cut" name="cut" value={form.cut}
        options={CUTS} disabled={loading} onChange={handleChange} />
      <Sel label="Symmetry" name="symmetry" value={form.symmetry}
        options={GRADES} disabled={loading} onChange={handleChange} />
      <Sel label="Polish" name="polish" value={form.polish}
        options={GRADES} disabled={loading} onChange={handleChange} />

      {/* ── Secondary Diamond Specs ── */}
      <SectionHeader>Secondary Diamond Specs</SectionHeader>
      <Field label="Weight (ct)" name="secondary_diamond_weight"
        value={form.secondary_diamond_weight} type="number"
        placeholder="e.g. 0.30" disabled={loading} onChange={handleChange} />
      <Sel label="Clarity" name="secondary_diamond_clarity"
        value={form.secondary_diamond_clarity} options={CLARITIES}
        disabled={loading} onChange={handleChange} />
      <Sel label="Color" name="secondary_diamond_color"
        value={form.secondary_diamond_color} options={COLORS}
        disabled={loading} onChange={handleChange} />

      {/* ── Metal & Certification ── */}
      <SectionHeader>Metal &amp; Certification</SectionHeader>
      <Field label="Metal Type" name="metal_type" value={form.metal_type}
        placeholder="e.g. Gold" disabled={loading} onChange={handleChange} />
      <Field label="Metal Purity" name="metal_purity" value={form.metal_purity}
        placeholder="e.g. 18K" disabled={loading} onChange={handleChange} />
      <Field label="Metal Color" name="metal_color" value={form.metal_color}
        placeholder="e.g. Yellow" disabled={loading} onChange={handleChange} />
      <Field label="Metal Weight (g)" name="metal_weight"
        value={form.metal_weight} type="number"
        placeholder="e.g. 5.2" disabled={loading} onChange={handleChange} />
      <Field label="Replacement Value ($)" name="replacement_value"
        value={form.replacement_value} type="number"
        placeholder="e.g. 4500" disabled={loading} onChange={handleChange} />
      <Field label="Certification" name="certification"
        value={form.certification}
        placeholder="e.g. GIA 1234567" disabled={loading} onChange={handleChange} />

      {/* ── Image ── */}
      <div className="col-span-full">
        <label className={lbl}>Product Image</label>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <input ref={fileRef} type="file" accept="image/*" disabled={loading}
              onChange={handleFileChange}
              className={inp + " cursor-pointer file:mr-3 file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-1 file:text-[10px] file:uppercase file:tracking-widest file:cursor-pointer"} />
          </div>
          {/* ── Preview ── */}
          {preview && (
            <div className="w-20 h-20 flex-shrink-0 border border-primary/40 overflow-hidden">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
          {!preview && editingProd?.image && (
            <div className="w-20 h-20 flex-shrink-0 border border-border overflow-hidden">
              <img src={getImageUrl(editingProd.collectionId, editingProd.id, editingProd.image)}
                alt="Current" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Glow card ────────────────────────────────────────────────
  const glowCard = "transition-all duration-300 hover:border-[#534AB7]";

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8">

      {/* ── DEFAULT ───────────────────────────────────────────── */}
      {mode === 'default' && (
        <FadeUp>
          <div className="flex flex-col items-center justify-center pt-20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl mx-auto">
              <button onClick={() => setMode('add')}
                className={`flex flex-col items-center justify-center gap-3 border border-[#d3d1c7] bg-[#f1efe8] p-8 min-h-[160px] rounded-[2rem] group ${glowCard}`}>
                <span className="text-3xl text-[#534AB7] group-hover:scale-125 transition-transform duration-500">✦</span>
                <div className="space-y-1">
                  <span className="block text-[15px] font-display font-medium uppercase tracking-[0.2em] text-[#2c2c2a] group-hover:text-[#534AB7] transition-colors">
                    Add New
                  </span>
                  <span className="block text-[10px] text-[#888780] font-light leading-relaxed">Create a new diamond listing</span>
                </div>
              </button>
              <button onClick={() => { setMode('edit-search'); setSearch(''); }}
                className={`flex flex-col items-center justify-center gap-3 border border-[#d3d1c7] bg-white p-8 min-h-[160px] rounded-[2rem] group ${glowCard}`}>
                <span className="text-3xl text-[#888780] group-hover:text-[#534AB7] group-hover:scale-125 transition-transform duration-500">✎</span>
                <div className="space-y-1">
                  <span className="block text-[15px] font-display font-medium uppercase tracking-[0.2em] text-[#2c2c2a] group-hover:text-[#534AB7] transition-colors">
                    Edit Existing
                  </span>
                  <span className="block text-[10px] text-[#888780] font-light leading-relaxed">Search &amp; modify diamonds</span>
                </div>
              </button>
            </div>
          </div>
        </FadeUp>
      )}

      {/* ── ADD ───────────────────────────────────────────────── */}
      {mode === 'add' && (
        <FadeUp>
          <div className="border border-[#d3d1c7] bg-white rounded-xl p-6 shadow-sm">
            <button onClick={resetAll} disabled={loading}
              className="mb-4 text-[11px] uppercase tracking-widest font-semibold text-[#534AB7] border border-[#534AB7]/30 px-3 py-1 rounded-lg hover:bg-[#534AB7]/10 transition-colors">
              ← Back to Menu
            </button>
            <h2 className="text-[18px] font-bold text-[#2c2c2a] mb-6">
              Add New Diamond
            </h2>
            <form onSubmit={handleAdd}>
              {renderForm()}
              <div className="mt-6 pt-6 border-t border-[#d3d1c7]">
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#534AB7] text-white py-2.5 rounded-lg text-[13px] font-bold uppercase tracking-widest hover:bg-[#3C3489] transition-all disabled:opacity-60">
                  {loading
                    ? <><SpinIcon /> Saving...</>
                    : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </FadeUp>
      )}

      {/* ── SEARCH ────────────────────────────────────────────── */}
      {mode === 'edit-search' && (
        <FadeUp>
          <div className="border border-[#d3d1c7] bg-white rounded-xl p-6 shadow-sm">
            <button onClick={resetAll} disabled={loading}
              className="mb-4 text-[11px] uppercase tracking-widest font-semibold text-[#534AB7] border border-[#534AB7]/30 px-3 py-1 rounded-lg hover:bg-[#534AB7]/10 transition-colors">
              ← Back to Menu
            </button>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4 border-b border-[#d3d1c7] pb-6">
              <h2 className="text-[18px] font-bold text-[#2c2c2a]">Find Diamond</h2>
              <input type="text" placeholder="Search ID, description, shape..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full md:w-80 border border-[#d3d1c7] bg-[#f1efe8] px-4 py-2 text-[12px] rounded-lg text-[#2c2c2a] outline-none focus:border-[#534AB7] transition-colors placeholder:text-[#b4b2a9]" />
            </div>

            {listLoading ? (
              <div className="flex items-center gap-2 text-[13px] text-[#534AB7]">
                <SpinIcon /> Loading diamonds...
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-[13px] text-[#888780] py-16 border border-dashed border-[#d3d1c7] rounded-xl">
                No diamonds found.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(product => (
                  <button key={product.id} type="button" onClick={() => startEdit(product)}
                    className={`text-left border border-[#d3d1c7] bg-white p-4 flex flex-col gap-2 group transition-all rounded-xl ${glowCard}`}>
                    {product.image && (
                      <div className="aspect-square w-full overflow-hidden border border-[#d3d1c7]/50 mb-2 rounded-lg">
                        <img
                          src={getImageUrl(product.collectionId, product.id, product.image)}
                          alt={product.product_id}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <p className="font-mono text-[10px] text-[#534AB7] uppercase tracking-widest font-semibold">
                      {product.product_id || '—'}
                    </p>
                    <p className="text-[13px] text-[#2c2c2a] font-medium line-clamp-2">
                      {product.description || '—'}
                    </p>
                    <p className="font-mono text-[10px] text-[#888780]">
                      {product.main_diamond_shape} | {product.main_diamond_weight}ct | {product.main_diamond_clarity}
                    </p>
                    <span className="mt-auto w-full text-center border border-[#d3d1c7] py-2 text-[10px] uppercase font-bold tracking-widest group-hover:border-[#534AB7] group-hover:text-[#534AB7] transition-colors rounded-lg">
                      Select to Edit
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </FadeUp>
      )}

      {/* ── EDIT FORM ─────────────────────────────────────────── */}
      {mode === 'edit-form' && (
        <FadeUp>
          <div className="border border-[#d3d1c7] bg-white rounded-xl p-6 shadow-sm">
            <button onClick={() => { setMode('edit-search'); }} disabled={loading}
              className="mb-4 text-[11px] uppercase tracking-widest font-semibold text-[#534AB7] border border-[#534AB7]/30 px-3 py-1 rounded-lg hover:bg-[#534AB7]/10 transition-colors">
              ← Back to Search
            </button>
            <h2 className="text-[18px] font-bold text-[#2c2c2a] mb-6">Edit Diamond</h2>
            <form onSubmit={handleEdit}>
              {renderForm()}
              <div className="mt-6 pt-6 border-t border-[#d3d1c7] flex flex-col sm:flex-row gap-4">
                <button type="submit" disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#534AB7] text-white py-2.5 rounded-lg text-[13px] font-bold uppercase tracking-widest hover:bg-[#3C3489] transition-all disabled:opacity-60 order-1 sm:order-2">
                  {loading ? <><SpinIcon /> Saving...</> : 'Save Edit'}
                </button>
                <button type="button" disabled={loading}
                  onClick={() => handleDelete(editingId!)}
                  className="flex-1 border border-red-200 bg-red-50 text-red-600 py-2.5 rounded-lg text-[13px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-60 order-2 sm:order-1">
                  {loading ? 'Processing...' : '⚠ Delete Diamond'}
                </button>
              </div>
            </form>
          </div>
        </FadeUp>
      )}
    </div>
  );
}

// ── Inline spinner ────────────────────────────────────────────
function SpinIcon() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4A8 8 0 014 12z" />
    </svg>
  );
}
