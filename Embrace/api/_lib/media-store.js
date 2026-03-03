import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DEFAULT_LIBRARY = {
  version: 1,
  updatedAt: null,
  images: [],
};

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);
const DEFAULT_LIBRARY_PATH = path.join(process.cwd(), "data", "media-library.json");

function resolveLibraryPath() {
  const customPath = process.env.MEDIA_LIBRARY_PATH?.trim();
  if (!customPath) return DEFAULT_LIBRARY_PATH;
  return path.isAbsolute(customPath) ? customPath : path.join(process.cwd(), customPath);
}

const libraryPath = resolveLibraryPath();

function normalizeString(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const unique = new Set();
  for (const tag of tags) {
    const normalized = normalizeString(tag).toLowerCase();
    if (normalized) unique.add(normalized);
  }
  return Array.from(unique);
}

function isValidImageUrl(url) {
  if (typeof url !== "string") return false;
  const value = url.trim();
  if (!value) return false;

  if (value.startsWith("/")) {
    const ext = path.extname(value.split("?")[0].toLowerCase());
    return IMAGE_EXTENSIONS.has(ext);
  }

  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const ext = path.extname(parsed.pathname.toLowerCase());
    return IMAGE_EXTENSIONS.has(ext);
  } catch {
    return false;
  }
}

function normalizeVariants(rawVariants) {
  const variants = {
    thumb: normalizeString(rawVariants?.thumb),
    medium: normalizeString(rawVariants?.medium),
    large: normalizeString(rawVariants?.large),
  };

  const fallback = normalizeString(rawVariants?.url || rawVariants?.src);
  if (!variants.thumb) variants.thumb = fallback;
  if (!variants.medium) variants.medium = variants.thumb || fallback;
  if (!variants.large) variants.large = variants.medium || variants.thumb || fallback;

  if (!isValidImageUrl(variants.large)) {
    throw new Error("Each image requires a valid URL in variants.large, variants.medium, variants.thumb, src, or url.");
  }

  if (!isValidImageUrl(variants.thumb)) variants.thumb = variants.large;
  if (!isValidImageUrl(variants.medium)) variants.medium = variants.large;

  return variants;
}

function normalizeMediaInput(input, nowIso) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Each media item must be an object.");
  }

  const title = normalizeString(input.title);
  const category = normalizeString(input.category || input.cat);
  const description = normalizeString(input.description || input.desc);

  if (!title) throw new Error("Image title is required.");
  if (!category) throw new Error("Image category is required.");

  const variants = normalizeVariants({
    ...input.variants,
    src: input.src,
    url: input.url,
  });

  return {
    id: normalizeString(input.id) || randomUUID(),
    title,
    alt: normalizeString(input.alt) || title,
    description,
    category,
    tags: normalizeTags(input.tags),
    sortOrder: normalizeNumber(input.sortOrder, 0),
    width: normalizeNumber(input.width, 0),
    height: normalizeNumber(input.height, 0),
    variants,
    status: normalizeString(input.status || "active").toLowerCase() === "inactive" ? "inactive" : "active",
    createdAt: normalizeString(input.createdAt) || nowIso,
    updatedAt: nowIso,
  };
}

async function ensureLibraryFile() {
  await fs.mkdir(path.dirname(libraryPath), { recursive: true });
  try {
    await fs.access(libraryPath);
  } catch {
    await fs.writeFile(libraryPath, JSON.stringify(DEFAULT_LIBRARY, null, 2), "utf8");
  }
}

async function readLibrary() {
  await ensureLibraryFile();
  const raw = await fs.readFile(libraryPath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid library file.");
    if (!Array.isArray(parsed.images)) parsed.images = [];
    return {
      version: Number(parsed.version) || 1,
      updatedAt: normalizeString(parsed.updatedAt) || null,
      images: parsed.images,
    };
  } catch {
    return structuredClone(DEFAULT_LIBRARY);
  }
}

async function writeLibrary(library) {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    images: library.images,
  };

  await fs.writeFile(libraryPath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function sortImages(images) {
  return [...images].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return String(b.updatedAt).localeCompare(String(a.updatedAt));
  });
}

export async function listMedia({ page = 1, limit = 24, category = "", query = "", includeInactive = false } = {}) {
  const library = await readLibrary();
  const normalizedCategory = normalizeString(category).toLowerCase();
  const normalizedQuery = normalizeString(query).toLowerCase();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 24));

  let items = library.images.filter((item) => includeInactive || item.status !== "inactive");

  if (normalizedCategory) {
    items = items.filter((item) => normalizeString(item.category).toLowerCase() === normalizedCategory);
  }

  if (normalizedQuery) {
    items = items.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        item.category,
        ...(Array.isArray(item.tags) ? item.tags : []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }

  const sorted = sortImages(items);
  const total = sorted.length;
  const start = (safePage - 1) * safeLimit;
  const paged = sorted.slice(start, start + safeLimit);

  return {
    items: paged,
    total,
    page: safePage,
    limit: safeLimit,
    hasMore: start + safeLimit < total,
    updatedAt: library.updatedAt,
  };
}

export async function upsertMediaBatch(images) {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error("images must be a non-empty array.");
  }

  const nowIso = new Date().toISOString();
  const library = await readLibrary();
  const existingById = new Map(library.images.map((item) => [String(item.id), item]));
  const existingByLargeUrl = new Map(
    library.images.map((item) => [normalizeString(item?.variants?.large), item]).filter(([url]) => url),
  );

  let created = 0;
  let updated = 0;

  for (const rawInput of images) {
    const normalized = normalizeMediaInput(rawInput, nowIso);
    const byId = existingById.get(normalized.id);
    const byUrl = existingByLargeUrl.get(normalized.variants.large);
    const existing = byId || byUrl;

    if (existing) {
      Object.assign(existing, {
        ...normalized,
        id: existing.id || normalized.id,
        createdAt: existing.createdAt || normalized.createdAt,
      });
      existing.updatedAt = nowIso;
      updated += 1;
      existingById.set(String(existing.id), existing);
      existingByLargeUrl.set(normalized.variants.large, existing);
    } else {
      library.images.push(normalized);
      existingById.set(String(normalized.id), normalized);
      existingByLargeUrl.set(normalized.variants.large, normalized);
      created += 1;
    }
  }

  library.images = sortImages(library.images);
  const written = await writeLibrary(library);

  return {
    created,
    updated,
    total: written.images.length,
    updatedAt: written.updatedAt,
  };
}

export async function getMediaCatalogStats() {
  const library = await readLibrary();
  const active = library.images.filter((item) => item.status !== "inactive").length;
  const inactive = library.images.length - active;
  return {
    total: library.images.length,
    active,
    inactive,
    updatedAt: library.updatedAt,
    storageMode: "filesystem",
    libraryPath,
  };
}

