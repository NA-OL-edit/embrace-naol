export default async function handler(req, res) {
    // Allow cross-origin requests for localhost development
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
    );

    // Handle OPTIONS request for CORS preflight
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    const { symbol } = req.query;

    if (!symbol || typeof symbol !== "string") {
        return res.status(400).json({ error: "Missing or invalid symbol parameter." });
    }

    const apiKey =
        process.env.MINERAL_API_KEY ||
        process.env.GOLD_API_KEY ||
        process.env.VITE_MINERAL_API_KEY ||
        process.env.VITE_METALS_API_KEY ||
        process.env.VITE_GOLD_API_KEY;

    if (!apiKey) {
        console.error("[Backend] Missing GoldAPI Key in environment variables.");
        return res.status(500).json({ error: "Server configuration error: Missing API Key." });
    }

    try {
        const url = `https://www.goldapi.io/api/${symbol}/USD`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "x-access-token": apiKey,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error(`[Backend] GoldAPI request failed: ${response.status} ${response.statusText} - ${errorData}`);
            return res.status(response.status).json({ error: "Upstream API error" });
        }

        const data = await response.json();

        // Cache the response at the edge for 5 minutes (300 seconds)
        // Serve stale data for up to an additional hour while revalidating in the background.
        res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
        return res.status(200).json(data);
    } catch (error) {
        console.error("[Backend] Internal fetch error:", error);
        return res.status(500).json({ error: "Internal server error connecting to upstream API." });
    }
}
