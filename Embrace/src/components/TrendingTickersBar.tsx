import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { env, hasMineralApiConfig } from "@/lib/env";

type TickerItem = {
  name: string;
  symbol: string;
  price: number;
  unit: string;
  changePct: number;
};

const IS_PRODUCTION = import.meta.env.PROD;
const ENABLE_DEV_MOCKS = import.meta.env.DEV && import.meta.env.VITE_ENABLE_PRICE_MOCKS === "true";

const MOCK_TICKERS: TickerItem[] = [
  { name: "Gold", symbol: "XAU", price: 2035.4, unit: "/oz", changePct: 0.82 },
  { name: "Silver", symbol: "XAG", price: 24.91, unit: "/oz", changePct: -0.37 },
  { name: "Diamond", symbol: "1ct Index", price: 5140, unit: "", changePct: 1.15 },
  { name: "Platinum", symbol: "Platinum", price: 951.2, unit: "/oz", changePct: -0.21 },
];

const MARQUEE_SPEED_SECONDS = 20;
const API_TIMEOUT_MS = 8000;
const REFRESH_INTERVAL_MS = 5 * 60_000;
const LAST_LIVE_TICKERS_KEY = "embrace:last-live-tickers";
type FetchStatus = "LIVE" | "MOCK_NO_ENV" | "MOCK_API_ERROR";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

async function fetchMineralTickers(): Promise<{ tickers: TickerItem[]; status: FetchStatus }> {
  if (!hasMineralApiConfig()) {
    return { tickers: ENABLE_DEV_MOCKS ? MOCK_TICKERS : [], status: "MOCK_NO_ENV" };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    // We no longer send headers since the backend securely injects its own.
    const [goldRes, silverRes, platinumRes] = await Promise.allSettled([
      fetch(`${env.mineralApiBaseUrl}?symbol=XAU`, { method: "GET", signal: controller.signal }),
      fetch(`${env.mineralApiBaseUrl}?symbol=XAG`, { method: "GET", signal: controller.signal }),
      fetch(`${env.mineralApiBaseUrl}?symbol=XPT`, { method: "GET", signal: controller.signal }),
    ]);

    const parsePrice = async (result: PromiseSettledResult<Response>, mock: TickerItem) => {
      if (result.status !== "fulfilled" || !result.value.ok) {
        return { price: ENABLE_DEV_MOCKS ? mock.price : NaN, chp: ENABLE_DEV_MOCKS ? mock.changePct : NaN, live: false };
      }
      try {
        const data = await result.value.json();
        if (IS_PRODUCTION) {
          console.info("[Ticker] Production API payload", { symbol: data?.symbol, price: data?.price, chp: data?.chp });
        }
        return {
          price: Number(data?.price) || (ENABLE_DEV_MOCKS ? mock.price : NaN),
          chp: Number(data?.chp) || (ENABLE_DEV_MOCKS ? mock.changePct : NaN),
          live: Number.isFinite(Number(data?.price)) && Number.isFinite(Number(data?.chp)),
        };
      } catch {
        return { price: ENABLE_DEV_MOCKS ? mock.price : NaN, chp: ENABLE_DEV_MOCKS ? mock.changePct : NaN, live: false };
      }
    };

    const [goldData, silverData, platinumData] = await Promise.all([
      parsePrice(goldRes, MOCK_TICKERS[0]),
      parsePrice(silverRes, MOCK_TICKERS[1]),
      parsePrice(platinumRes, MOCK_TICKERS[3]),
    ]);
    const hasAnyLive = goldData.live || silverData.live || platinumData.live;
    const hasAllLive = goldData.live && silverData.live && platinumData.live;
    const hasLive = ENABLE_DEV_MOCKS ? hasAnyLive : hasAllLive;

    if (!hasLive) {
      return { tickers: [], status: "MOCK_API_ERROR" };
    }

    return {
      status: "LIVE",
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
          // Diamond index remains static because GoldAPI does not provide a diamond benchmark feed.
          name: "Diamond",
          symbol: "1ct Index",
          price: MOCK_TICKERS[2].price,
          unit: "",
          changePct: MOCK_TICKERS[2].changePct,
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
    return { tickers: ENABLE_DEV_MOCKS ? MOCK_TICKERS : [], status: "MOCK_API_ERROR" };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getLastLiveTickers() {
  try {
    const raw = window.localStorage.getItem(LAST_LIVE_TICKERS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { tickers?: TickerItem[] };
    if (!Array.isArray(parsed?.tickers) || parsed.tickers.length !== MOCK_TICKERS.length) return null;
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
  const [tickers, setTickers] = useState<TickerItem[]>(() => getLastLiveTickers() ?? (ENABLE_DEV_MOCKS ? MOCK_TICKERS : []));
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("MOCK_NO_ENV");
  const [sequenceWidth, setSequenceWidth] = useState(0);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const { tickers: next, status } = await fetchMineralTickers();
      if (!isMounted) return;
      if (status === "LIVE") {
        setTickers(next);
        saveLastLiveTickers(next);
      } else {
        const lastLive = getLastLiveTickers();
        setTickers(lastLive ?? next ?? []);
        console.warn(`[Ticker] Using mock data: ${status}`);
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
            {fetchStatus === "LIVE" ? "LIVE" : fetchStatus === "MOCK_NO_ENV" ? "MOCK:ENV" : "MOCK:API"}
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
  const isUp = item.changePct >= 0;
  const arrow = isUp ? "\u25B2" : "\u25BC";
  const changeClass = isUp ? "text-emerald-400" : "text-red-400";

  return (
    <div className="flex items-center gap-2 border-r border-zinc-800 px-4 text-xs">
      <span className="font-semibold tracking-wide">{item.name} ({item.symbol})</span>
      <span>{formatPrice(item.price)}{item.unit}</span>
      <span className={`font-semibold ${changeClass}`}>
        {arrow} {Math.abs(item.changePct).toFixed(2)}%
      </span>
    </div>
  );
}
