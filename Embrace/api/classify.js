const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const globalStore = globalThis;
if (!globalStore.__classifyRateLimitStore) {
  globalStore.__classifyRateLimitStore = new Map();
}
const rateLimitStore = globalStore.__classifyRateLimitStore;

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
  const key = `classify:${ip}`;
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

function inferMimeTypeFromUrl(url) {
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".avif")) return "image/avif";
  return "image/jpeg";
}

async function fetchAsInlineData(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image URL: ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || inferMimeTypeFromUrl(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  return {
    mimeType: contentType.split(";")[0].trim(),
    data: Buffer.from(arrayBuffer).toString("base64"),
  };
}

function extractJsonBlock(text) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) return fencedMatch[1].trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text.trim();
}

function normalizeCategory(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "casting") return "Casting";
  if (normalized === "refining") return "Refining";
  if (normalized === "custom") return "Custom";
  return "Custom";
}

function coerceOutput(raw) {
  return {
    category: normalizeCategory(raw?.category),
    title: String(raw?.title || "Untitled Piece").trim(),
    description: String(raw?.description || "Luxury portfolio piece.").trim(),
  };
}

async function classifyWithGemini({ model, inlineData }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY or GOOGLE_API_KEY.");
  }

  const prompt = [
    "Analyze this jewelry image for a luxury portfolio.",
    'Return ONLY valid JSON with keys: "category", "title", "description".',
    'Valid category values: "Casting", "Refining", "Custom".',
    "Title: 2-5 words, premium style.",
    "Description: exactly one sentence, under 20 words.",
  ].join(" ");

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${body.slice(0, 300)}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("\n") || "";
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = JSON.parse(extractJsonBlock(text));
  return coerceOutput(parsed);
}

export default async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!checkRateLimit(req, res)) {
    return res.status(429).json({ error: "Rate limit exceeded." });
  }

  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized. Provide x-admin-token." });
  }

  const body = parseBody(req);
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : DEFAULT_MODEL;

  try {
    let inlineData;
    if (typeof body.imageBase64 === "string" && body.imageBase64.trim()) {
      inlineData = {
        mimeType: typeof body.mimeType === "string" && body.mimeType.trim() ? body.mimeType.trim() : "image/jpeg",
        data: body.imageBase64.trim(),
      };
    } else if (typeof body.imageUrl === "string" && body.imageUrl.trim()) {
      inlineData = await fetchAsInlineData(body.imageUrl.trim());
    } else {
      return res.status(400).json({ error: "Provide imageBase64 (+ mimeType) or imageUrl." });
    }

    const classified = await classifyWithGemini({ model, inlineData });
    return res.status(200).json(classified);
  } catch (error) {
    console.error("[Classify API] Classification failed", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Classification failed." });
  }
}
