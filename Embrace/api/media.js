import { getMediaCatalogStats, listMedia, upsertMediaBatch } from "./_lib/media-store.js";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 120;

const globalStore = globalThis;
if (!globalStore.__mediaRateLimitStore) {
  globalStore.__mediaRateLimitStore = new Map();
}
const rateLimitStore = globalStore.__mediaRateLimitStore;

function setSecurityHeaders(res) {
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.length > 0) {
    return realIp;
  }
  return "unknown";
}

function checkRateLimit(req, res) {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `media:${ip}`;
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (existing.count >= RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return false;
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return true;
}

function parseBoolean(value) {
  return value === true || value === "true";
}

function parseInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

function extractAdminToken(req) {
  const headerToken = req.headers["x-admin-token"];
  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim();
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return "";
}

function isAdminAuthorized(req) {
  const expected = process.env.MEDIA_ADMIN_TOKEN?.trim();
  if (!expected) return false;
  const supplied = extractAdminToken(req);
  return supplied && supplied === expected;
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (typeof req.body === "object") return req.body;
  return {};
}

export default async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(204).end();
  }

  if (!checkRateLimit(req, res)) {
    return res.status(429).json({ error: "Rate limit exceeded." });
  }

  if (req.method === "GET") {
    try {
      const includeInactive = parseBoolean(req.query?.includeInactive) && isAdminAuthorized(req);
      const page = parseInteger(req.query?.page, 1);
      const limit = parseInteger(req.query?.limit, 24);
      const category = typeof req.query?.category === "string" ? req.query.category : "";
      const query = typeof req.query?.q === "string" ? req.query.q : "";

      const result = await listMedia({
        page,
        limit,
        category,
        query,
        includeInactive,
      });
      const stats = await getMediaCatalogStats();

      res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
      return res.status(200).json({
        ...result,
        stats: {
          total: stats.total,
          active: stats.active,
          inactive: stats.inactive,
          updatedAt: stats.updatedAt,
        },
      });
    } catch (error) {
      console.error("[Media API] Failed to list media", error);
      return res.status(500).json({ error: "Failed to list media." });
    }
  }

  if (req.method === "POST") {
    if (!isAdminAuthorized(req)) {
      return res.status(401).json({ error: "Unauthorized. Provide x-admin-token." });
    }

    const body = parseBody(req);
    const payload = Array.isArray(body) ? body : body.images;

    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({ error: "Request body must include a non-empty images array." });
    }

    try {
      const result = await upsertMediaBatch(payload);
      return res.status(200).json({
        message: "Media catalog updated.",
        ...result,
      });
    } catch (error) {
      console.error("[Media API] Failed to upsert media batch", error);
      return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid media payload." });
    }
  }

  res.setHeader("Allow", "GET, POST, OPTIONS");
  return res.status(405).json({ error: "Method not allowed." });
}

