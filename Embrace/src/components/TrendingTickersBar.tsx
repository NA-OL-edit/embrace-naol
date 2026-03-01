import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

type TickerItem = {
  name: string;
  symbol: string;
  price: number;
  unit: string;
  changePct: number;
};

const UNAVAILABLE_TICKERS: TickerItem[] = [
  { name: "Gold", symbol: "XAU", price: Number.NaN, unit: "/oz", changePct: Number.NaN },
  { name: "Silver", symbol: "XAG", price: Number.NaN, unit: "/oz", changePct: Number.NaN },
  { name: "Diamond", symbol: "1ct Index", price: Number.NaN, unit: "", changePct: Number.NaN },
  { name: "Platinum", symbol: "Platinum", price: Number.NaN, unit: "/oz", changePct: Number.NaN },
];

const MARQUEE_SPEED_SECONDS = 20;
const API_TIMEOUT_MS = 8000;
const REFRESH_INTERVAL_MS = 5 * 60_000;
type FetchStatus = "LIVE" | "API_DOWN";

function formatPrice(value: number) {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

async function fetchMineralTickers(): Promise<{ tickers: TickerItem[]; status: FetchStatus }> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const fetchSymbol = async (symbol: "XAU" | "XAG" | "XPT") => {
      return fetch(`/api/price?symbol=${symbol}`, {
        method: "GET",
        signal: controller.signal,
      });
    };

    const [goldRes, silverRes, platinumRes] = await Promise.allSettled([
      fetchSymbol("XAU"),
      fetchSymbol("XAG"),
      fetchSymbol("XPT"),
    ]);

    const parsePrice = async (result: PromiseSettledResult<Response>) => {
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
      parsePrice(goldRes),
      parsePrice(silverRes),
      parsePrice(platinumRes),
    ]);
    const hasAllLive = goldData.live && silverData.live && platinumData.live;

    if (!hasAllLive) {
      return { tickers: UNAVAILABLE_TICKERS, status: "API_DOWN" };
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
          // No diamond upstream feed is configured in this secure backend flow.
          name: "Diamond",
          symbol: "1ct Index",
          price: Number.NaN,
          unit: "",
          changePct: Number.NaN,
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
      if (status === "LIVE") {
        setTickers(next);
      } else {
        setTickers(next ?? UNAVAILABLE_TICKERS);
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
