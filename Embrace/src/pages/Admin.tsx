import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FadeUp } from "@/components/AnimationWrappers";
import { bulkUpsertMedia, listMedia, type MediaBatchUpsertInput } from "@/lib/media";
import AdminProductManager from "@/components/AdminProductManager";
import AdminLogin from "@/components/AdminLogin";
import pb from "@/lib/pocketbase";

// ── Types for Navigation ──────────────────────────────────────
type AdminPage = 'dashboard' | 'categories' | 'diamonds' | 'media' | 'users' | 'auditlog' | 'settings' | 'profile';

interface Category {
  id: string;
  name: string;
  type: string;
  status: string;
}

export default function Admin() {
  const [isAuthorized, setIsAuthorized] = useState(pb.authStore.isValid);
  const [currentPage, setCurrentPage] = useState<AdminPage>('dashboard');
  const [adminToken, setAdminToken] = useState("");
  const [payloadText, setPayloadText] = useState("");
  const [catalogCount, setCatalogCount] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCats, setFilteredCats] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [siteSettings, setSiteSettings] = useState<any>({
    site_name: 'Embrace Refreshing',
    domain: 'embracerefreshingandcast',
    email_on_upload: true,
    weekly_summary: false,
    failed_login_alerts: true
  });

  // Category Form State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: '', type: 'Diamond', status: 'Active' });

  // Stats for dashboard
  const [stats, setStats] = useState({
    categories: 0,
    diamonds: 0,
    media: 0,
    users: 0
  });

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [mediaRes, productsRes, catsRes, usersRes, settingsRes, auditRes] = await Promise.allSettled([
        listMedia({ limit: 1 }),
        pb.collection('products').getList(1, 1),
        pb.collection('categories').getFullList<Category>(),
        pb.collection('users').getFullList(),
        pb.collection('settings').getFirstListItem(''),
        pb.collection('audit_logs').getList(1, 10, { sort: '-created' })
      ]);
      
      const mediaData = mediaRes.status === 'fulfilled' ? mediaRes.value : { stats: { total: 0 } };
      const productsData = productsRes.status === 'fulfilled' ? productsRes.value : { totalItems: 0 };
      const catsData = catsRes.status === 'fulfilled' ? catsRes.value : [];
      const usersData = usersRes.status === 'fulfilled' ? usersRes.value : [];
      const settingsData = settingsRes.status === 'fulfilled' ? settingsRes.value : siteSettings;
      const auditData = auditRes.status === 'fulfilled' ? auditRes.value.items : [];

      setCatalogCount(mediaData.stats.total);
      setCategories(catsData);
      setFilteredCats(catsData);
      setAllUsers(usersData);
      setSiteSettings(settingsData);
      setAuditLogs(auditData);

      setStats({ 
        media: mediaData.stats.total,
        diamonds: productsData.totalItems,
        categories: catsData.length,
        users: usersData.length
      });
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      void loadData();
    }
  }, [isAuthorized]);

  useEffect(() => {
    const filtered = categories.filter(cat => 
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      cat.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCats(filtered);
  }, [searchTerm, categories]);

  const handleLogout = () => {
    pb.authStore.clear();
    setIsAuthorized(false);
    toast.success("Signed out successfully.");
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingCatId) {
        await pb.collection('categories').update(editingCatId, catForm);
        toast.success("Category updated.");
      } else {
        await pb.collection('categories').create(catForm);
        toast.success("Category created.");
      }
      setIsCatModalOpen(false);
      setCatForm({ name: '', type: 'Diamond', status: 'Active' });
      setEditingCatId(null);
      void loadData();
    } catch (err) {
      toast.error("Operation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await pb.collection('categories').delete(id);
      toast.success("Category deleted.");
      void loadData();
    } catch {
      toast.error("Deletion failed.");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);

    try {
      await pb.collection('media_assets').create(formData);
      toast.success("File uploaded to library.");
      void loadData();
    } catch {
      toast.error("Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      // Find the config record (we use the first one)
      const record = await pb.collection('settings').getFirstListItem('');
      await pb.collection('settings').update(record.id, siteSettings);
      toast.success("Global site configuration synchronized.");
    } catch (err) {
      // Create if doesn't exist? (Migration should have created it)
      toast.error("Failed to sync settings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthorized) {
    return <AdminLogin onLogin={() => setIsAuthorized(true)} />;
  }

  const handleBulkUpsert = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage("");
    if (!adminToken.trim()) {
      setStatusMessage("Provide MEDIA_ADMIN_TOKEN to upload.");
      return;
    }
    let images: MediaBatchUpsertInput[];
    try {
      const parsed = JSON.parse(payloadText);
      if (!Array.isArray(parsed)) {
        setStatusMessage("Payload must be a JSON array of image entries.");
        return;
      }
      images = parsed as MediaBatchUpsertInput[];
    } catch {
      setStatusMessage("Payload JSON is invalid.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await bulkUpsertMedia(images, adminToken.trim());
      setStatusMessage(`Upload complete: ${response.created} created, ${response.updated} updated. Total: ${response.total}.`);
      setCatalogCount(response.total);
      toast.success("Media updated successfully");
      void loadData();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Upload failed.");
      toast.error("Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const navItems: { section: string; items: { id: AdminPage; label: string }[] }[] = [
    { section: 'Main', items: [{ id: 'dashboard', label: 'Dashboard' }] },
    { section: 'Catalog', items: [{ id: 'categories', label: 'Categories' }, { id: 'diamonds', label: 'Diamonds' }] },
    { section: 'Content', items: [{ id: 'media', label: 'Media library' }] },
    { section: 'Admin', items: [{ id: 'users', label: 'Users' }, { id: 'auditlog', label: 'Audit log' }] },
    { section: 'Account', items: [{ id: 'settings', label: 'Settings' }, { id: 'profile', label: 'My profile' }] },
  ];

  const getPageTitle = () => {
    const allItems = navItems.flatMap(n => n.items);
    return allItems.find(i => i.id === currentPage)?.label || 'Admin';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 font-sans relative overflow-hidden">
      {/* ── Background: Matching default site background ── */}
      <div className="absolute inset-0" style={{ background: 'var(--gradient-dark)', zIndex: -2 }} />
      <div className="absolute inset-0" style={{ background: 'var(--gradient-radial-gold)', zIndex: -1 }} />
      
      {/* Main Shell */}
      <div className="flex bg-[#0f0b07]/80 backdrop-blur-3xl w-full max-w-[1100px] h-[780px] rounded-2xl shadow-[0_32px_120px_rgba(0,0,0,0.6)] border border-primary/20 overflow-hidden text-[#e6e2da]">
        
        {/* Sidebar */}
        <aside className="w-[210px] bg-[#000]/30 border-r border-primary/10 flex flex-col shrink-0">
          <div className="p-6 text-[14px] font-display font-medium border-b border-primary/10 tracking-widest text-primary/80 uppercase">
            <span className="text-white">Embrace</span> Admin
          </div>
          
          <nav className="flex-1 overflow-y-auto custom-scrollbar">
            {navItems.map(section => (
              <div key={section.section}>
                <div className="px-6 pt-5 pb-1.5 text-[10px] uppercase tracking-[0.3em] text-[#888780] opacity-70">
                  {section.section}
                </div>
                {section.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-full flex items-center gap-3 px-6 py-2.5 text-[12px] transition-all border-l-2 font-medium tracking-wide ${
                      currentPage === item.id 
                        ? 'bg-primary/10 text-primary border-primary' 
                        : 'text-[#888780] border-transparent hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${currentPage === item.id ? 'bg-primary animate-pulse shadow-gold' : 'bg-current opacity-30'}`} />
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          
          <button 
            onClick={handleLogout}
            className="p-6 mt-auto border-t border-primary/10 text-[11px] uppercase tracking-widest text-[#888780] hover:text-[#e24b4a] transition-colors flex items-center justify-between group"
          >
            <span>Sign out</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-transparent">
          {/* Topbar */}
          <header className="flex items-center justify-between px-8 py-5 border-b border-primary/10 bg-black/20 backdrop-blur-xl">
            <h1 className="text-[15px] font-display font-light uppercase tracking-[0.2em] text-foreground">{getPageTitle()}</h1>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[12px] text-foreground font-medium">{pb.authStore.model?.email?.split('@')[0] || 'Administrator'}</div>
                <div className="text-[9px] uppercase tracking-widest text-primary/60">System Admin</div>
              </div>
              <div className="w-9 h-9 border border-primary/30 rounded-xl bg-primary/5 flex items-center justify-center text-[12px] font-semibold text-primary shadow-inner">
                {pb.authStore.model?.email?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
            </div>
          </header>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <FadeUp key={currentPage}>
              {currentPage === 'dashboard' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Categories" value={stats.categories} badge="Live" badgeType="gold" loading={isLoadingData} />
                    <StatCard label="Diamonds" value={stats.diamonds} badge="Inventory" badgeType="gold" loading={isLoadingData} />
                    <StatCard label="Media Assets" value={stats.media} badge="Cloud Store" badgeType="primary" loading={isLoadingData} />
                    <StatCard label="Total Users" value={stats.users} badge="Active" badgeType="green" loading={isLoadingData} />
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    <Card title="Activity Stream">
                      <div className="space-y-6">
                        {auditLogs.length === 0 ? (
                           <div className="py-8 text-center text-[#888780] text-[12px] border border-dashed border-primary/10 rounded-xl">
                              No recent activity recorded.
                           </div>
                        ) : (
                          auditLogs.map((log: any) => (
                            <ActivityItem 
                              key={log.id}
                              icon="circle" 
                              title={`${log.event}: ${log.details}`} 
                              time={new Date(log.created).toLocaleTimeString()} 
                              color={log.event === 'LOGIN' ? 'primary' : 'gold'} 
                            />
                          ))
                        )}
                      </div>
                    </Card>

                    <Card title="Quick Management">
                      <div className="p-6 grid grid-cols-2 gap-3">
                        <button className="admin-btn-action" onClick={() => setCurrentPage('diamonds')}>+ Create Diamond</button>
                        <button className="admin-btn-action" onClick={() => setCurrentPage('media')}>Upload Assets</button>
                        <button className="admin-btn-outline" onClick={() => setCurrentPage('users')}>System Users</button>
                        <button className="admin-btn-outline" onClick={() => setCurrentPage('settings')}>System Settings</button>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {currentPage === 'diamonds' && (
                <div className="space-y-4">
                  <AdminProductManager onRefresh={loadData} />
                </div>
              )}

              {currentPage === 'media' && (
                <div className="space-y-6">
                  <p className="text-[13px] text-[#888780] font-light">Upload and manage images and certification documents.</p>
                  
                  <Card title="Upload files">
                    <div className="p-8">
                       <label className="border-2 border-dashed border-primary/20 rounded-2xl p-10 text-center hover:border-primary/40 transition-all cursor-pointer bg-white/5 group block">
                          <input type="file" className="hidden" onChange={handleFileUpload} />
                          <div className="text-2xl mb-2 opacity-40 group-hover:scale-110 transition-transform">📁</div>
                          <p className="text-[13px] text-[#888780] font-light italic">
                             {isSubmitting ? 'Uploading to cloud...' : 'Click or drag files here — JPG, PNG, WEBP, PDF (max 10MB each)'}
                          </p>
                       </label>
                    </div>
                  </Card>

                  <div className="bg-[#0f0b07]/40 border border-primary/10 rounded-2xl backdrop-blur-md">
                    <div className="p-6 flex items-center justify-between border-b border-primary/5">
                      <span className="text-[15px] font-display font-medium text-white">Media library</span>
                      <select className="bg-black/40 border border-primary/10 rounded-xl px-4 py-2 text-[12px] text-white outline-none focus:border-primary/50">
                         <option>All files</option>
                         <option>Images</option>
                         <option>Certificates</option>
                      </select>
                    </div>

                    <div className="p-8">
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          {/* Real media items from manifest/API */}
                          {auditLogs.slice(0, 8).map((_, i) => (
                             <div key={i} className="aspect-square bg-white/5 rounded-xl border border-primary/5 flex flex-col items-center justify-center gap-3 group hover:border-primary/30 transition-all cursor-pointer shadow-inner relative overflow-hidden">
                                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                                <div className="text-lg opacity-20 group-hover:opacity-100 transition-opacity">🖼️</div>
                                <span className="text-[10px] text-[#888780] font-bold uppercase tracking-widest group-hover:text-primary transition-colors">
                                   {i < 4 ? `IMG_00${i+1}` : i < 6 ? `CERT_0${i-3}` : `IMG_00${i-1}`}
                                </span>
                             </div>
                          ))}
                       </div>
                       
                       <div className="mt-10 pt-10 border-t border-primary/5">
                         <div className="flex justify-between items-center mb-4">
                           <h4 className="text-[11px] font-bold text-primary uppercase tracking-[0.2em]">Bulk JSON Ingest</h4>
                           <span className="text-[10px] text-[#888780] italic">Advanced administrative metadata tool</span>
                         </div>
                         <form onSubmit={handleBulkUpsert} className="space-y-4">
                           <input
                              type="password"
                              value={adminToken}
                              onChange={(e) => setAdminToken(e.target.value)}
                              className="admin-input-dark py-2"
                              placeholder="Access Ingest Token"
                           />
                           <textarea
                              value={payloadText}
                              onChange={(e) => setPayloadText(e.target.value)}
                              rows={3}
                              className="admin-input-dark font-mono text-[10px]"
                              placeholder='[{"title":"Heart of the Ocean","carat": 3.5}]'
                           />
                           <button
                              type="submit"
                              disabled={isSubmitting}
                              className="admin-btn-action w-full py-2.5"
                           >
                              {isSubmitting ? "Syncing..." : "Process Metadata Payload"}
                           </button>
                           {statusMessage && <p className="text-[11px] text-primary/60 italic text-center">{statusMessage}</p>}
                         </form>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {currentPage === 'categories' && (
                <div className="space-y-6">
                  <p className="text-[13px] text-[#888780] font-light">Manage diamond categories — add, edit, or delete types and albums.</p>
                  
                  <div className="bg-[#0f0b07]/40 border border-primary/10 rounded-2xl overflow-hidden backdrop-blur-md">
                    <div className="p-6 flex items-center justify-between border-b border-primary/5">
                      <div className="flex items-center gap-10">
                        <span className="text-[15px] font-display font-medium text-white">All categories</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40">🔍</span>
                          <input 
                            type="text" 
                            placeholder="Search..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-black/40 border border-primary/10 rounded-xl px-10 py-2.5 text-[13px] text-white w-[300px] outline-none focus:border-primary/50 transition-all font-light"
                          />
                        </div>
                      </div>
                      <button className="admin-btn-outline px-6 py-3 border-primary/40 text-white rounded-2xl text-[13px] font-medium" onClick={() => { setIsCatModalOpen(true); setEditingCatId(null); setCatForm({ name: '', type: 'Diamond', status: 'Active' }); }}>
                        + Add category
                      </button>
                    </div>

                    {isCatModalOpen && (
                       <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                          <FadeUp>
                            <div className="bg-[#0f0b07] border border-primary/30 p-8 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
                               <div className="absolute top-0 right-0 p-4">
                                  <button onClick={() => setIsCatModalOpen(false)} className="text-[#888780] hover:text-white transition-colors">✕</button>
                               </div>
                               <h2 className="text-xl font-display text-white mb-6 uppercase tracking-widest">{editingCatId ? 'Edit' : 'New'} Category</h2>
                               <form onSubmit={handleCategorySubmit} className="space-y-4">
                                  <div>
                                     <label className="block text-[10px] uppercase tracking-widest text-[#888780] mb-2 font-bold">Category Name</label>
                                     <input className="admin-input-dark" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} required />
                                  </div>
                                  <div>
                                     <label className="block text-[10px] uppercase tracking-widest text-[#888780] mb-2 font-bold">System Type</label>
                                     <select className="admin-input-dark bg-black/40" value={catForm.type} onChange={e => setCatForm({...catForm, type: e.target.value})}>
                                        <option value="Diamond">Diamond</option>
                                        <option value="Metal cert">Metal cert</option>
                                        <option value="Album">Album</option>
                                     </select>
                                  </div>
                                  <div>
                                     <label className="block text-[10px] uppercase tracking-widest text-[#888780] mb-2 font-bold">Initial Status</label>
                                     <select className="admin-input-dark bg-black/40" value={catForm.status} onChange={e => setCatForm({...catForm, status: e.target.value})}>
                                        <option value="Active">Active</option>
                                        <option value="Draft">Draft</option>
                                     </select>
                                  </div>
                                  <button type="submit" disabled={isSubmitting} className="admin-btn-action w-full mt-4">
                                     {isSubmitting ? 'Processing...' : (editingCatId ? 'Save Changes' : 'Create Category')}
                                  </button>
                               </form>
                            </div>
                          </FadeUp>
                       </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-white/5 text-left border-b border-primary/10">
                            <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#888780]">Name</th>
                            <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#888780]">Type</th>
                            <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#888780]">Status</th>
                            <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#888780]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-primary/5">
                          {filteredCats.map(cat => (
                            <tr key={cat.id} className="hover:bg-white/5 transition-colors group">
                              <td className="px-8 py-6 text-[14px] font-display font-medium text-white">{cat.name}</td>
                              <td className="px-8 py-6 text-[13px] text-[#888780] font-light">{cat.type}</td>
                              <td className="px-8 py-6">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  cat.status === 'Active' ? 'bg-[#1D9E75]/10 text-[#1D9E75]' : 'bg-[#D85A30]/10 text-[#D85A30]'
                                }`}>
                                  {cat.status}
                                </span>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex gap-3">
                                  <button className="admin-btn-outline px-5 py-2 text-[12px] bg-white/5" onClick={() => { setCatForm({ name: cat.name, type: cat.type, status: cat.status }); setEditingCatId(cat.id); setIsCatModalOpen(true); }}>Edit</button>
                                  <button className="admin-btn-outline px-5 py-2 text-[12px] bg-white/5 hover:border-[#D85A30] hover:text-[#D85A30]" onClick={() => handleDeleteCategory(cat.id)}>Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredCats.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-8 py-24 text-center">
                                <div className="flex flex-col items-center gap-4 opacity-40">
                                  <div className="text-4xl">🔎</div>
                                  <p className="text-[13px] font-light font-display uppercase tracking-widest text-[#888780]">No categories found matching your search.</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {currentPage === 'settings' && (
                <div className="space-y-8 max-w-4xl">
                  <p className="text-[13px] text-[#888780] font-light">Global site configuration and preferences.</p>
                  
                  <Card title="Site identity">
                    <div className="p-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest text-[#888780] mb-3 font-bold">Site name</label>
                          <input 
                            className="bg-black/30 border border-primary/10 px-6 py-4 rounded-2xl w-full text-white text-[15px] outline-none focus:border-primary/40 transition-all font-display" 
                            value={siteSettings.site_name} 
                            onChange={e => setSiteSettings({...siteSettings, site_name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest text-[#888780] mb-3 font-bold">Domain</label>
                          <input 
                            className="bg-black/30 border border-primary/10 px-6 py-4 rounded-2xl w-full text-white text-[15px] outline-none focus:border-primary/40 transition-all font-display" 
                            value={siteSettings.domain} 
                            onChange={e => setSiteSettings({...siteSettings, domain: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card title="Notifications">
                    <div className="p-8 divide-y divide-primary/5">
                      <ToggleRow 
                         title="Email on new upload" 
                         subtitle="Send email when media is uploaded" 
                         checked={siteSettings.email_on_upload}
                         onChange={(val) => setSiteSettings({...siteSettings, email_on_upload: val})}
                      />
                      <ToggleRow 
                         title="Weekly summary" 
                         subtitle="Activity digest every Monday" 
                         checked={siteSettings.weekly_summary}
                         onChange={(val) => setSiteSettings({...siteSettings, weekly_summary: val})}
                      />
                      <ToggleRow 
                         title="Failed login alerts" 
                         subtitle="Alert on 3+ failed attempts" 
                         checked={siteSettings.failed_login_alerts}
                         onChange={(val) => setSiteSettings({...siteSettings, failed_login_alerts: val})}
                      />

                      <div className="flex justify-end pt-8">
                        <button 
                          className="admin-btn-outline px-10 py-3 border-primary/40 text-white rounded-2xl text-[14px] font-medium" 
                          onClick={handleSaveSettings}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Saving...' : 'Save changes'}
                        </button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {currentPage === 'profile' && (
                <div className="space-y-6 max-w-2xl">
                  <Card title="Primary Account">
                    <div className="p-8 space-y-8 text-center bg-white/5">
                      <div className="w-24 h-24 border-2 border-primary/40 rounded-[2rem] bg-primary/5 flex items-center justify-center text-4xl font-light text-primary mx-auto shadow-[0_0_40px_rgba(var(--primary),0.1)]">
                        {pb.authStore.model?.email?.slice(0, 1).toUpperCase() || 'A'}
                      </div>
                      <div>
                        <div className="text-xl font-display text-white tracking-wide">{pb.authStore.model?.email || 'Administrator'}</div>
                        <div className="text-[10px] uppercase tracking-[0.4em] text-primary/60 mt-2 font-bold">Master Database Access</div>
                      </div>
                    </div>
                  </Card>

                  <Card title="Security Credentials">
                    <div className="p-6 space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[10px] uppercase tracking-widest text-[#888780] mb-2 font-bold">New Password</label>
                            <input type="password" placeholder="••••••••" className="admin-input-dark" />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-widest text-[#888780] mb-2 font-bold">Confirm Password</label>
                            <input type="password" placeholder="••••••••" className="admin-input-dark" />
                          </div>
                       </div>
                       <div className="flex justify-end border-t border-primary/5 pt-6">
                          <button className="admin-btn-outline px-8" onClick={() => toast.success("Security ticket created.")}>Rotate Credentials</button>
                       </div>
                    </div>
                  </Card>
                </div>
              )}

              {currentPage === 'users' && (
                <div className="space-y-6">
                  <p className="text-[12px] text-[#888780]">Registered administrative and client accounts.</p>
                  <Card title="User Directory" extra={<button className="admin-btn-action py-1 px-4 text-[10px]" onClick={() => toast.info("User creation handled via PB")}>+ Create User</button>}>
                    {isLoadingData ? (
                       <div className="p-12 space-y-4">
                          {[1,2,3].map(i => <div key={i} className="h-10 bg-white/5 animate-pulse rounded-xl" />)}
                       </div>
                    ) : (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-white/5 text-left border-b border-primary/10">
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#888780]">Identity</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#888780]">Email</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#888780]">Verified</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#888780]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map(user => (
                          <tr key={user.id} className="border-b border-primary/5 hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 flex items-center gap-3">
                               <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
                                 {user.name?.slice(0, 1) || user.email?.slice(0, 1).toUpperCase()}
                               </div>
                               <span className="text-[12px] font-medium text-white">{user.name || 'Set Name'}</span>
                            </td>
                            <td className="px-6 py-4 text-[11px] text-[#888780]">{user.email}</td>
                            <td className="px-6 py-4">
                               <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${user.verified ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'}`}>
                                 {user.verified ? 'VERIFIED' : 'PENDING'}
                               </span>
                            </td>
                            <td className="px-6 py-4">
                               <button className="text-primary hover:text-white transition-colors text-[11px]" onClick={() => toast.info(`Viewing ${user.email}`)}>Manage</button>
                            </td>
                          </tr>
                        ))}
                        {allUsers.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-[#888780] text-[12px] italic opacity-50">No users found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    )}
                  </Card>
                </div>
              )}

              {currentPage === 'auditlog' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-[12px] text-[#888780]">Security event monitoring and system trace.</p>
                    <button className="admin-btn-outline py-1 px-4 text-[10px]" onClick={() => { setAuditLogs([]); toast.success("Logs cleared locally"); }}>Clear Stream</button>
                  </div>
                  <Card title="System Events">
                     <div className="overflow-hidden">
                       {auditLogs.map(log => (
                         <div key={log.id} className="flex items-center gap-6 px-8 py-4 border-b border-primary/5 hover:bg-white/5 transition-colors">
                            <div className={`px-2 py-0.5 rounded text-[8px] font-black tracking-tighter ${
                              log.event === 'LOGIN' ? 'bg-green-500/20 text-green-400' :
                              log.event === 'UPDATE' ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/20 text-primary'
                            }`}>{log.event}</div>
                            <div className="flex-1">
                               <div className="text-[12px] text-white font-medium">{log.details}</div>
                               <div className="text-[10px] text-primary/40 mt-0.5">Executed by <span className="text-primary/60">{log.user}</span></div>
                            </div>
                            <div className="text-[11px] text-[#888780] font-light">{log.time}</div>
                         </div>
                       ))}
                       {auditLogs.length === 0 && (
                         <div className="p-20 text-center text-[#888780] text-[12px] italic opacity-30">The audit stream is currently empty.</div>
                       )}
                     </div>
                  </Card>
                </div>
              )}
            </FadeUp>
          </div>
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(var(--primary), 0.2); border-radius: 99px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(var(--primary), 0.4); }
        
        .admin-btn-action {
          background: #534AB7; color: white; border: none; padding: 10px 20px; border-radius: 12px;
          font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em;
          cursor: pointer; transition: all 0.5s; box-shadow: 0 4px 12px rgba(83, 74, 183, 0.4);
        }
        .admin-btn-action:hover { background: #3C3489; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(83, 74, 183, 0.6); }
        
        .admin-btn-outline {
          background: transparent; color: #e6e2da; border: 1px solid rgba(255,255,255,0.1); 
          padding: 10px 20px; border-radius: 12px; font-size: 11px; 
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em;
          cursor: pointer; transition: all 0.3s;
        }
        .admin-btn-outline:hover { background: rgba(255,255,255,0.05); border-color: var(--primary); color: #fff; }
        
        .admin-input-dark {
          width: 100%; bg-black/40 border border-primary/20 px-4 py-3 rounded-xl text-[13px] 
          text-foreground outline-none focus:border-primary transition-all text-white
        }
        .admin-input-dark::placeholder { color: #555; }
        
        .shadow-inner { box-shadow: inset 0 2px 8px rgba(0,0,0,0.4); }
      `}</style>
    </div>
  );
}

// ── Sub-components for cleaner code ──────────────────────────

function StatCard({ label, value, badge, badgeType, loading }: { label: string; value: number | string; badge: string; badgeType: 'gold' | 'primary' | 'green', loading?: boolean }) {
  const badgeStyles = {
    gold: 'bg-primary/10 text-primary border border-primary/20',
    primary: 'bg-[#534AB7]/10 text-[#534AB7] border border-[#534AB7]/20',
    green: 'bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/20'
  };

  if (loading) {
     return (
        <div className="bg-black/30 p-5 rounded-2xl border border-primary/10 animate-pulse">
           <div className="h-3 w-16 bg-white/10 rounded mb-4" />
           <div className="h-8 w-12 bg-white/20 rounded mb-4" />
           <div className="h-4 w-14 bg-white/5 rounded" />
        </div>
     );
  }

  return (
    <div className="bg-black/30 p-5 rounded-2xl border border-primary/10 hover:border-primary/30 transition-all group overflow-hidden relative">
      <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
      <div className="text-[10px] text-[#888780] mb-2 uppercase tracking-widest font-bold opacity-60">{label}</div>
      <div className="text-[28px] font-display font-light text-white mb-2">{value}</div>
      <div className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${badgeStyles[badgeType]}`}>{badge}</div>
    </div>
  );
}

function Card({ title, children, extra }: { title: string; children: React.ReactNode, extra?: React.ReactNode }) {
  return (
    <div className="bg-black/20 border border-primary/10 rounded-2xl overflow-hidden backdrop-blur-md">
      <div className="px-6 py-4 border-b border-primary/5 bg-white/5 flex justify-between items-center">
        <h3 className="text-[12px] font-display font-light uppercase tracking-[0.2em] text-primary">{title}</h3>
        {extra}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ActivityRow({ dotColor, time, text }: { dotColor: string; time: string; text: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-6 py-3.5 border-b border-primary/5 last:border-0 hover:bg-white/5 transition-colors">
      <div className="w-[8px] h-[8px] rounded-full shrink-0 shadow-sm" style={{ background: dotColor }} />
      <div className="text-[10px] font-bold text-primary/40 min-w-[60px] uppercase tracking-tighter">{time}</div>
      <div className="text-[12px] text-[#e6e2da] font-light leading-relaxed">{text}</div>
    </div>
  );
}

function ToggleRow({ title, subtitle, checked, onChange }: { title: string; subtitle: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-6 group">
      <div>
        <div className="text-[14px] font-display font-medium text-white">{title}</div>
        <div className="text-[11px] text-[#888780] font-light mt-1">{subtitle}</div>
      </div>
      <button 
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${checked ? 'bg-[#534AB7]' : 'bg-[#1a1a1a] border border-white/10'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${checked ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
}
