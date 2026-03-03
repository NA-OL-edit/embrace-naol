function normalizeEnvValue(value: string | undefined) {
  if (!value) return undefined;
  return value.trim().replace(/^['"]|['"]$/g, "");
}

// In local development, you could mock this or let the Vite proxy handle it.
// In production, this simply points to the Vercel backend.
export const env = {
  mineralApiBaseUrl:
    normalizeEnvValue(import.meta.env.VITE_MINERAL_API_BASE_URL as string | undefined) ??
    "/api/price",
};

export function hasMineralApiConfig() {
  // Since we rely on our secure backend, the frontend is always "configured" to hit its own proxy.
  return true;
}
