const ALLOWED_SYMBOLS = new Set(["XAU", "XAG", "XPT"]);
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 100;

const globalStore = globalThis;
if (!globalStore.__priceRateLimitStore) {
    globalStore.__priceRateLimitStore = new Map();
}
const rateLimitStore = globalStore.__priceRateLimitStore;

function setSecurityHeaders(res) {
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
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
    const key = `price:${ip}`;
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

export default async function handler(req, res) {
    setSecurityHeaders(res);

    const forwardedProto = req.headers["x-forwarded-proto"];
    if (process.env.NODE_ENV === "production" && typeof forwardedProto === "string" && forwardedProto !== "https") {
        return res.status(403).json({ error: "Service unavailable." });
    }

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    if (req.method !== "GET") {
        res.setHeader("Allow", "GET, OPTIONS");
        return res.status(405).json({ error: "Service unavailable." });
    }

    if (!checkRateLimit(req, res)) {
        return res.status(429).json({ error: "Service unavailable." });
    }

    const symbolRaw = req.query?.symbol;
    const symbol = typeof symbolRaw === "string" ? symbolRaw.trim().toUpperCase() : "";
    if (!ALLOWED_SYMBOLS.has(symbol)) {
        return res.status(400).json({ error: "Invalid symbol." });
    }

    const apiKey = process.env.MINERAL_API_KEY || process.env.GOLD_API_KEY || process.env.METALS_API_KEY;
    if (!apiKey) {
        console.error("[API] Missing provider API key environment variable.");
        return res.status(503).json({ error: "Service unavailable." });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(`https://www.goldapi.io/api/${symbol}/USD`, {
            method: "GET",
            headers: {
                "x-access-token": apiKey,
                "Content-Type": "application/json",
            },
            signal: controller.signal,
        });

        if (!response.ok) {
            const upstreamBody = await response.text();
            console.error("[API] Upstream request failed", {
                status: response.status,
                statusText: response.statusText,
                symbol,
                body: upstreamBody.slice(0, 400),
            });
            return res.status(503).json({ error: "Service unavailable." });
        }

        const data = await response.json();
        const price = Number(data?.price);
        const chp = Number(data?.chp);
        if (!Number.isFinite(price) || !Number.isFinite(chp)) {
            console.error("[API] Upstream payload missing numeric fields", { symbol, payload: data });
            return res.status(503).json({ error: "Service unavailable." });
        }

        res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
        return res.status(200).json({
            symbol,
            price,
            chp,
            currency: "USD",
        });
    } catch (error) {
        console.error("[API] Internal provider fetch failure", { symbol, error });
        return res.status(503).json({ error: "Service unavailable." });
    } finally {
        clearTimeout(timeoutId);
    }
}
