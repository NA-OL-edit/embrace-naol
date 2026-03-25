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
    return authData;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// ── CREATE ────────────────────────────────────────────────────
export const addProduct = async (formData: FormData) => {
  try {
    const record = await pb.collection('products').create(formData);
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
