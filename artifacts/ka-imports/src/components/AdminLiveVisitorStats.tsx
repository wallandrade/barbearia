import { useEffect, useState } from "react";

type AdminLiveVisitorStatsProps = {
  enabled: boolean;
  baseUrl: string;
  authHeaders: () => HeadersInit;
};

export function AdminLiveVisitorStats({ enabled, baseUrl, authHeaders }: AdminLiveVisitorStatsProps) {
  const [liveStats, setLiveStats] = useState({ catalog: 0, checkout: 0 });

  useEffect(() => {
    if (!enabled) return;
    const fetchLive = () => {
      fetch(`${baseUrl}/api/admin/tracking/live`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.catalog === "number" && typeof data.checkout === "number") {
            setLiveStats(data);
          }
        })
        .catch(() => {});
    };
    fetchLive();
    const intv = window.setInterval(fetchLive, 5000);
    return () => window.clearInterval(intv);
  }, [enabled, baseUrl, authHeaders]);

  return (
    <>
      <div className="hidden sm:flex gap-3 mr-2 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg text-sm font-semibold text-orange-800">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          👁️ {liveStats.catalog} visitantes ao vivo catálogo
        </span>
        <span className="w-px h-5 bg-orange-200 mx-1"></span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          🛒 {liveStats.checkout} visitantes ao vivo checkout
        </span>
      </div>

      <div className="flex sm:hidden w-full gap-2 mb-2 bg-orange-50 border border-orange-200 p-2 rounded-lg text-xs font-semibold text-orange-800 justify-between items-center">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          👁️ {liveStats.catalog} no catálogo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          🛒 {liveStats.checkout} no checkout
        </span>
      </div>
    </>
  );
}
