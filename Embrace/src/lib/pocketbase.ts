import PocketBase from 'pocketbase';

// Backend URL
// For Vite, environment variables should be prefixed with VITE_. In production, VITE_PB_URL will take over.
const PB_URL = import.meta.env.VITE_PB_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8090' : '');
if (import.meta.env.PROD && !PB_URL) {
  throw new Error("Missing VITE_PB_URL for PocketBase. Set it in your hosting environment variables.");
}
const pb = new PocketBase(PB_URL);

export default pb;
export { pb };

// ── Auth (PocketBase v0.36+ syntax) ──────────────────────────
export const adminLogin = async (email: string, password: string) => {
  try {
    // In this specific version (v0.36.7), admins are Superusers managed via '_superusers'
    const authData = await pb.collection('_superusers').authWithPassword(email, password);
    
    // Log login event
    try {
      await pb.collection('audit_logs').create({
        event: 'LOGIN',
        user: email,
        details: 'Successful session start'
      });
    } catch {}

    return authData;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const createAuditLog = async (event: string, details: string) => {
  try {
    const user = pb.authStore.model?.email || 'system';
    await pb.collection('audit_logs').create({ event, user, details });
  } catch (e) {
    console.warn('Failed to create audit log', e);
  }
};

// ── CREATE ────────────────────────────────────────────────────
export const addProduct = async (formData: FormData) => {
  try {
    const record = await pb.collection('products').create(formData);
    void createAuditLog('CREATE', `Diamond catalog: ${formData.get('product_id') || record.id} added`);
    return record;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

// ── READ ──────────────────────────────────────────────────────
export const getProducts = async () => {
  try {
    const records = await pb.collection('products').getFullList({
      sort: '-created',
    });
    return records;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// ── UPDATE ────────────────────────────────────────────────────
export const updateProduct = async (id: string, formData: FormData) => {
  try {
    const record = await pb.collection('products').update(id, formData);
    void createAuditLog('UPDATE', `Diamond catalog: ${formData.get('product_id') || id} updated`);
    return record;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

// ── DELETE ────────────────────────────────────────────────────
export const deleteProduct = async (id: string) => {
  try {
    await pb.collection('products').delete(id);
    void createAuditLog('DELETE', `Diamond product ${id} removed`);
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// ── Image URL helper ──────────────────────────────────────────
export const getImageUrl = (collectionId: string, recordId: string, fileName: string, thumb?: string) => {
  // PocketBase expects the full record (id + collectionId) for file URL generation.
  const record = { collectionId, id: recordId } as any;
  if ((pb as any).files?.getUrl) {
    return (pb as any).files.getUrl(record, fileName, thumb ? { thumb } : undefined);
  }
  return pb.getFileUrl(record, fileName, thumb ? { thumb } : undefined);
};

export const adminLogout = () => {
  try {
    pb.authStore.clear();
  } catch (e) {
    console.warn("Logout failed:", e);
  }
};

export const createLog = async (event: string, target: string) => createAuditLog(event, target);

export const getProductsPage = async (page: number, perPage: number) => {
  return pb.collection('products').getList(page, perPage, { sort: '-created' });
};

export const getLatestProducts = async (limit: number) => {
  return getProductsPage(1, limit);
};

export const getCategories = async () => {
  return pb.collection('categories').getFullList({ sort: 'name' });
};

export const addCategory = async (data: FormData) => {
  return pb.collection('categories').create(data);
};

export const updateCategory = async (id: string, data: FormData) => {
  return pb.collection('categories').update(id, data);
};

export const deleteCategory = async (id: string) => {
  return pb.collection('categories').delete(id);
};

export const getSettings = async () => {
  return pb.collection('settings').getFullList({ sort: 'key' });
};

export const updateSetting = async (id: string, value: string) => {
  return pb.collection('settings').update(id, { value });
};

export const getSettingsMap = async () => {
  const items = await getSettings();
  const map: Record<string, string> = {};
  for (const item of items as any[]) {
    const key = String(item?.key || "").trim();
    if (!key) continue;
    map[key] = String(item?.value ?? "");
  }
  return map;
};

export const addInquiry = async (data: Record<string, any>) => {
  return pb.collection('inquiries').create(data);
};

export const getAdminUsers = async () => {
  return pb.collection('_superusers').getFullList({ sort: '-created' });
};

export const getAuditLogs = async (limit: number) => {
  return pb.collection('audit_logs').getList(1, limit, { sort: '-created' });
};

export const getCategoriesCount = async () => {
  const res = await pb.collection('categories').getList(1, 1);
  return res.totalItems;
};

export const getLogsCount = async () => {
  const res = await pb.collection('audit_logs').getList(1, 1);
  return res.totalItems;
};
