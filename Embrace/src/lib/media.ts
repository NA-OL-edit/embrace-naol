import { fetcher } from "./api";

export type MediaImage = {
  id: string;
  title: string;
  alt: string;
  description: string;
  category: string;
  tags: string[];
  sortOrder: number;
  width: number;
  height: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  variants: {
    thumb: string;
    medium: string;
    large: string;
  };
};

export type MediaListResponse = {
  items: MediaImage[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  updatedAt: string | null;
  stats: {
    total: number;
    active: number;
    inactive: number;
    updatedAt: string | null;
  };
};

export type MediaListParams = {
  page?: number;
  limit?: number;
  category?: string;
  q?: string;
  includeInactive?: boolean;
};

export type MediaBatchUpsertInput = {
  id?: string;
  title: string;
  alt?: string;
  description?: string;
  category: string;
  tags?: string[];
  sortOrder?: number;
  width?: number;
  height?: number;
  status?: "active" | "inactive";
  variants?: {
    thumb?: string;
    medium?: string;
    large?: string;
  };
  src?: string;
  url?: string;
};

export type MediaBatchUpsertResponse = {
  message: string;
  created: number;
  updated: number;
  total: number;
  updatedAt: string;
};

type MediaCatalogFile = {
  version: number;
  updatedAt: string | null;
  images: MediaImage[];
};

function buildQuery(params: MediaListParams = {}) {
  const search = new URLSearchParams();
  if (typeof params.page === "number") search.set("page", String(params.page));
  if (typeof params.limit === "number") search.set("limit", String(params.limit));
  if (params.category) search.set("category", params.category);
  if (params.q) search.set("q", params.q);
  if (params.includeInactive) search.set("includeInactive", "true");

  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function listMedia(params: MediaListParams = {}) {
  try {
    return await fetcher<MediaListResponse>(`/media${buildQuery(params)}`);
  } catch {
    const staticResponse = await fetch("/media-library.json");
    if (!staticResponse.ok) throw new Error("Media catalog is unavailable.");

    const catalog = (await staticResponse.json()) as MediaCatalogFile;
    const includeInactive = !!params.includeInactive;
    const normalizedCategory = params.category?.trim().toLowerCase() || "";
    const normalizedQuery = params.q?.trim().toLowerCase() || "";
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 24));

    let items = Array.isArray(catalog.images) ? catalog.images : [];
    if (!includeInactive) {
      items = items.filter((item) => item.status !== "inactive");
    }

    if (normalizedCategory) {
      items = items.filter((item) => item.category.toLowerCase() === normalizedCategory);
    }

    if (normalizedQuery) {
      items = items.filter((item) =>
        [item.title, item.description, item.category, ...(item.tags || [])]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      );
    }

    const total = items.length;
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);
    const active = (catalog.images || []).filter((item) => item.status !== "inactive").length;

    return {
      items: paged,
      total,
      page,
      limit,
      hasMore: start + limit < total,
      updatedAt: catalog.updatedAt || null,
      stats: {
        total: (catalog.images || []).length,
        active,
        inactive: (catalog.images || []).length - active,
        updatedAt: catalog.updatedAt || null,
      },
    };
  }
}

export async function bulkUpsertMedia(images: MediaBatchUpsertInput[], adminToken: string) {
  return fetcher<MediaBatchUpsertResponse>("/media", {
    method: "POST",
    headers: {
      "x-admin-token": adminToken,
    },
    body: JSON.stringify({ images }),
  });
}
