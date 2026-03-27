import PocketBase from 'pocketbase';

// Backend URL
// For Vite, environment variables should be prefixed with VITE_. In production, VITE_PB_URL will take over.
const PB_URL = import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090'; 
const pb = new PocketBase(PB_URL);

export default pb;

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
export const getImageUrl = (collectionId: string, recordId: string, fileName: string) => {
  // CollectionId is often needed in newer PB versions for correct URL generation
  return pb.getFileUrl({ collectionId, id: recordId } as any, fileName);
};
