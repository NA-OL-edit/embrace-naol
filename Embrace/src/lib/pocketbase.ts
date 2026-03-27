import PocketBase from 'pocketbase';

// In dev, Vite proxies /api → localhost:8090.
// In production set VITE_PB_URL to your remote PocketBase URL.
const PB_URL = import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090';
export const pb = new PocketBase(PB_URL);

export default pb;

// ── Auth ─────────────────────────────────────────────────────────────────────
export const adminLogin = async (email: string, password: string) => {
  const authData = await pb.collection('_superusers').authWithPassword(email, password);
  return authData;
};

export const adminLogout = () => pb.authStore.clear();

// ── Products (Diamonds) ───────────────────────────────────────────────────────
export const getProducts = async () =>
  pb.collection('products').getFullList({ sort: '-created' });

export const getProductsPage = async (page = 1, perPage = 5) =>
  pb.collection('products').getList(page, perPage, { sort: '-created' });

export const addProduct = async (formData: FormData) =>
  pb.collection('products').create(formData);

export const updateProduct = async (id: string, formData: FormData) =>
  pb.collection('products').update(id, formData);

export const deleteProduct = async (id: string) =>
  pb.collection('products').delete(id);

// ── Categories ────────────────────────────────────────────────────────────────
export const getCategories = async () =>
  pb.collection('categories').getFullList({ sort: '-created' });

export const getCategoriesCount = async () =>
  (await pb.collection('categories').getList(1, 1)).totalItems;

export const addCategory = async (formData: FormData) =>
  pb.collection('categories').create(formData);

export const updateCategory = async (id: string, formData: FormData) =>
  pb.collection('categories').update(id, formData);

export const deleteCategory = async (id: string) =>
  pb.collection('categories').delete(id);

// ── Users (_superusers) ───────────────────────────────────────────────────────
export const getAdminUsers = async () =>
  pb.collection('_superusers').getFullList({ sort: '-created' });

// ── Audit logs ────────────────────────────────────────────────────────────────
export const getAuditLogs = async (perPage = 50) =>
  pb.collection('logs').getList(1, perPage, { sort: '-created' });

export const getLogsCount = async () =>
  (await pb.collection('logs').getList(1, 1)).totalItems;

export const createLog = async (action: string, target: string) => {
  const adminEmail = (pb.authStore.record as any)?.email || 'System';
  return pb.collection('logs').create({
    admin_email: adminEmail,
    action,
    target
  });
};

// ── Settings ──────────────────────────────────────────────────────────────────
export const getSettings = async () =>
  pb.collection('settings').getFullList({ sort: 'key' });

export const updateSetting = async (id: string, value: string) =>
  pb.collection('settings').update(id, { value });

// ── Public Helpers ───────────────────────────────────────────────────────────
export const getLatestProducts = async (limit = 3) =>
  pb.collection('products').getList(1, limit, { sort: '-created' });

export const addInquiry = async (data: { name: string; email: string; subject: string; message: string }) =>
  pb.collection('inquiries').create({ ...data, status: 'new' });

export const getSettingsMap = async () => {
  const settings = await pb.collection('settings').getFullList();
  const map: Record<string, string> = {};
  settings.forEach((s) => {
    map[s.key] = s.value;
  });
  return map;
};

// ── Image URL helper ──────────────────────────────────────────────────────────
export const getImageUrl = (collection: string, recordId: string, fileName: string, thumb?: string) => {
  if (!fileName) return '';
  const url = pb.getFileUrl({ collectionId: collection, id: recordId } as any, fileName);
  return thumb ? `${url}?thumb=${thumb}` : url;
};
