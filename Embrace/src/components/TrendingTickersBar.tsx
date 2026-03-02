import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

type TickerItem = {
  name: string;
  symbol: string;
  price: number;
  unit: string;
  changePct: number;
};

const API_ROUTE = "/api/price";
const MINERAL_API_BASE_URL = ((import.meta.env.VITE_MINERAL_API_BASE_URL as string | undefined)?.trim() || "https://www.goldapi.io/api").replace(/\/+$/, "");
const MINERAL_API_KEY = (import.meta.env.VITE_MINERAL_API_KEY as string | undefined)?.trim();
const PUBLIC_METALS_API_BASE_URL = "https://api.gold-api.com/price";
const DIAMOND_INDEX_API_URL = "https://data.openfacet.net/index.json";
const DIAMOND_FALLBACK = { price: Number.NaN, changePct: Number.NaN };

const UNAVAILABLE_TICKERS: TickerItem[] = [
  { name: "Gold", symbol: "XAU", price: Number.NaN, unit: "/oz", changePct: Number.NaN },
  { name: "Silver", symbol: "XAG", price: Number.NaN, unit: "/oz", changePct: Number.NaN },
  { name: "Diamond", symbol: "DCX", price: Number.NaN, unit: "", changePct: Number.NaN },
  { name: "Platinum", symbol: "Platinum", price: Number.NaN, unit: "/oz", changePct: Number.NaN },
];

const MARQUEE_SPEED_SECONDS = 20;
const API_TIMEOUT_MS = 8000;
const REFRESH_INTERVAL_MS = 5 * 60_000;
const LAST_LIVE_TICKERS_KEY = "embrace:last-live-tickers";
type FetchStatus = "LIVE" | "API_DOWN";

function formatPrice(value: number) {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function parseNumeric(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return parsed;
  }
  return Number.NaN;
}

function deriveChangePctFromPrevious(currentPrice: number, previousPrice: number) {
  if (!Number.isFinite(currentPrice) || !Number.isFinite(previousPrice) || previousPrice === 0) {
    return Number.NaN;
  }
  return ((currentPrice - previousPrice) / previousPrice) * 100;
}

function fillMissingChangePct(current: TickerItem[], previous: TickerItem[] | null) {
  if (!previous || previous.length === 0) return current;
  const previousBySymbol = new Map(previous.map((item) => [item.symbol, item]));

  return current.map((item) => {
    if (Number.isFinite(item.changePct)) return item;
    const prior = previousBySymbol.get(item.symbol);
    if (!prior) return item;
    const derived = deriveChangePctFromPrevious(item.price, prior.price);
    return Number.isFinite(derived) ? { ...item, changePct: derived } : item;
  });
}

async function fetchMetalViaBackend(symbol: "XAU" | "XAG" | "XPT", signal: AbortSignal) {
  try {
    const response = await fetch(`${API_ROUTE}?symbol=${symbol}`, {
      method: "GET",
      signal,
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) return { price: NaN, chp: NaN, live: false };
    const data = await response.json();
    const price = Number(data?.price);
    const chp = Number(data?.chp);
    return {
      price,
      chp,
      live: Number.isFinite(price) && Number.isFinite(chp),
    };
  } catch {
    return { price: NaN, chp: NaN, live: false };
  }
}

async function fetchMetalsViaBackend(signal: AbortSignal) {
  const [goldData, silverData, platinumData] = await Promise.all([
    fetchMetalViaBackend("XAU", signal),
    fetchMetalViaBackend("XAG", signal),
    fetchMetalViaBackend("XPT", signal),
  ]);

  return { goldData, silverData, platinumData };
}

async function fetchMetalViaPublic(symbol: "XAU" | "XAG" | "XPT", signal: AbortSignal) {
  try {
    const response = await fetch(`${PUBLIC_METALS_API_BASE_URL}/${symbol}`, {
      method: "GET",
      signal,
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) return { price: NaN, chp: NaN, live: false };
    const data = await response.json();
    const price = Number(data?.price);
    return {
      price,
      chp: Number.NaN,
      live: Number.isFinite(price),
    };
  } catch {
    return { price: NaN, chp: NaN, live: false };
  }
}

async function fetchMetalsViaPublic(signal: AbortSignal) {
  const [goldData, silverData, platinumData] = await Promise.all([
    fetchMetalViaPublic("XAU", signal),
    fetchMetalViaPublic("XAG", signal),
    fetchMetalViaPublic("XPT", signal),
  ]);

  return { goldData, silverData, platinumData };
}

async function fetchMetalsDirect(signal: AbortSignal) {
  if (!MINERAL_API_KEY) {
    return {
      goldData: { price: NaN, chp: NaN, live: false },
      silverData: { price: NaN, chp: NaN, live: false },
      platinumData: { price: NaN, chp: NaN, live: false },
    };
  }

  const requestOptions: RequestInit = {
    method: "GET",
    signal,
    headers: {
      "x-access-token": MINERAL_API_KEY,
      "Content-Type": "application/json",
    },
  };

  const [goldRes, silverRes, platinumRes] = await Promise.allSettled([
    fetch(`${MINERAL_API_BASE_URL}/XAU/USD`, requestOptions),
    fetch(`${MINERAL_API_BASE_URL}/XAG/USD`, requestOptions),
    fetch(`${MINERAL_API_BASE_URL}/XPT/USD`, requestOptions),
  ]);

  const parseMetalPrice = async (result: PromiseSettledResult<Response>) => {
    if (result.status !== "fulfilled" || !result.value.ok) {
      return { price: NaN, chp: NaN, live: false };
    }
    try {
      const data = await result.value.json();
      const price = Number(data?.price);
      const chp = Number(data?.chp);
      return {
        price,
        chp,
        live: Number.isFinite(price) && Number.isFinite(chp),
      };
    } catch {
      return { price: NaN, chp: NaN, live: false };
    }
  };

  const [goldData, silverData, platinumData] = await Promise.all([
    parseMetalPrice(goldRes),
    parseMetalPrice(silverRes),
    parseMetalPrice(platinumRes),
  ]);

  return { goldData, silverData, platinumData };
}

async function fetchMineralTickers(): Promise<{ tickers: TickerItem[]; status: FetchStatus }> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const [backendMetals, diamondRes] = await Promise.all([
      fetchMetalsViaBackend(controller.signal),
      fetch(DIAMOND_INDEX_API_URL, { method: "GET", signal: controller.signal }),
    ]);

    const parseDiamondPrice = async (response: Response) => {
      if (!response.ok) {
        return { price: DIAMOND_FALLBACK.price, changePct: DIAMOND_FALLBACK.changePct, live: false };
      }

      try {
        const data = await response.json();
        const dcx = parseNumeric(data?.dcx);
        const trend = parseNumeric(data?.trend);

        if (Number.isFinite(dcx) && Number.isFinite(trend)) {
          return { price: dcx, changePct: trend, live: true };
        }

        return { price: DIAMOND_FALLBACK.price, changePct: DIAMOND_FALLBACK.changePct, live: false };
      } catch {
        return { price: DIAMOND_FALLBACK.price, changePct: DIAMOND_FALLBACK.changePct, live: false };
      }
    };

    const diamondData = await parseDiamondPrice(diamondRes);
    let { goldData, silverData, platinumData } = backendMetals;

    const backendHasAllMetals = goldData.live && silverData.live && platinumData.live;
    if (!backendHasAllMetals) {
      const publicMetals = await fetchMetalsViaPublic(controller.signal);
      if (publicMetals.goldData.live) goldData = publicMetals.goldData;
      if (publicMetals.silverData.live) silverData = publicMetals.silverData;
      if (publicMetals.platinumData.live) platinumData = publicMetals.platinumData;
    }

    const hasAllFromBackendOrPublic = goldData.live && silverData.live && platinumData.live;
    if (!hasAllFromBackendOrPublic) {
      const directMetals = await fetchMetalsDirect(controller.signal);
      if (directMetals.goldData.live) goldData = directMetals.goldData;
      if (directMetals.silverData.live) silverData = directMetals.silverData;
      if (directMetals.platinumData.live) platinumData = directMetals.platinumData;
    }

    const hasAllMetals = goldData.live && silverData.live && platinumData.live;
    return {
      status: hasAllMetals ? "LIVE" : "API_DOWN",
      tickers: [
        {
          name: "Gold",
          symbol: "XAU",
          price: goldData.price,
          unit: "/oz",
          changePct: goldData.chp,
        },
        {
          name: "Silver",
          symbol: "XAG",
          price: silverData.price,
          unit: "/oz",
          changePct: silverData.chp,
        },
        {
          name: "Diamond",
          symbol: "DCX",
          price: diamondData.price,
          unit: "",
          changePct: diamondData.changePct,
        },
        {
          name: "Platinum",
          symbol: "Platinum",
          price: platinumData.price,
          unit: "/oz",
          changePct: platinumData.chp,
        },
      ],
    };
  } catch {
    return { tickers: UNAVAILABLE_TICKERS, status: "API_DOWN" };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getLastLiveTickers() {
  try {
    const raw = window.localStorage.getItem(LAST_LIVE_TICKERS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { tickers?: TickerItem[] };
    if (!Array.isArray(parsed?.tickers) || parsed.tickers.length !== UNAVAILABLE_TICKERS.length) return null;
    return parsed.tickers;
  } catch {
    return null;
  }
}

function saveLastLiveTickers(tickers: TickerItem[]) {
  try {
    window.localStorage.setItem(LAST_LIVE_TICKERS_KEY, JSON.stringify({ tickers, updatedAt: Date.now() }));
  } catch {
    // No-op: storage can fail in private mode or restricted environments.
  }
}

export default function TrendingTickersBar() {
  const [tickers, setTickers] = useState<TickerItem[]>(UNAVAILABLE_TICKERS);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("API_DOWN");
  const [sequenceWidth, setSequenceWidth] = useState(0);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const { tickers: next, status } = await fetchMineralTickers();
      if (!isMounted) return;
      const previousLive = getLastLiveTickers();
      const normalized = fillMissingChangePct(next, previousLive);
      if (status === "LIVE") {
        setTickers(normalized);
        saveLastLiveTickers(normalized);
      } else {
        setTickers(previousLive ?? normalized ?? UNAVAILABLE_TICKERS);
        console.warn(`[Ticker] API failed: ${status}`);
      }
      setFetchStatus(status);
    };

    void load();
    const intervalId = window.setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (!measureRef.current) return;
      setSequenceWidth(measureRef.current.scrollWidth);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [tickers]);

  const baseItems = useMemo(() => tickers, [tickers]);
  const displayItems = useMemo(() => [...baseItems, ...baseItems, ...baseItems, ...baseItems], [baseItems]);

  return (
    <aside className="fixed bottom-0 left-0 w-full z-[9999] border-t border-zinc-800 bg-black text-white">
      <div className="flex h-11 items-center">
        <div className="flex h-full shrink-0 items-center gap-2 border-r border-zinc-800 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] sm:px-4 sm:text-xs">
          <motion.span
            aria-hidden
            className="h-2 w-2 rounded-full bg-red-500"
            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.15, 1] }}
            transition={{ duration: 1.25, repeat: Infinity, ease: "easeInOut" }}
          />
          LIVE MARKET
          <span className={`ml-1 text-[9px] ${fetchStatus === "LIVE" ? "text-emerald-400" : "text-zinc-400"}`}>
            {fetchStatus === "LIVE" ? "LIVE" : "API DOWN"}
          </span>
        </div>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div ref={measureRef} className="pointer-events-none absolute invisible flex whitespace-nowrap">
            {baseItems.map((item) => (
              <TickerCell key={`measure-${item.symbol}`} item={item} />
            ))}
          </div>

          <motion.div
            className="flex w-max whitespace-nowrap will-change-transform"
            animate={sequenceWidth > 0 ? { x: [0, -sequenceWidth] } : undefined}
            transition={sequenceWidth > 0 ? { duration: MARQUEE_SPEED_SECONDS, ease: "linear", repeat: Infinity } : undefined}
          >
            {displayItems.map((item, index) => (
              <TickerCell key={`${item.symbol}-${item.name}-${index}`} item={item} />
            ))}
          </motion.div>
        </div>
      </div>
    </aside>
  );
}

function TickerCell({ item }: { item: TickerItem }) {
  const hasChange = Number.isFinite(item.changePct);
  const isUp = hasChange && item.changePct >= 0;
  const arrow = hasChange ? (isUp ? "\u25B2" : "\u25BC") : "";
  const changeClass = hasChange ? (isUp ? "text-emerald-400" : "text-red-400") : "text-zinc-400";
  const changeText = hasChange ? `${Math.abs(item.changePct).toFixed(2)}%` : "--";

  return (
    <div className="flex items-center gap-2 border-r border-zinc-800 px-4 text-xs">
      <span className="font-semibold tracking-wide">{item.name} ({item.symbol})</span>
      <span>{formatPrice(item.price)}{item.unit}</span>
      <span className={`font-semibold ${changeClass}`}>
        {arrow} {changeText}
      </span>
    </div>
  );
}
