import { useEffect, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import type { PeptideCategory } from "@/lib/peptide-catalog";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type SheetBlock = { title: string; items: string[] };
type SheetStat = { id: string; label: string; value: string; pill?: "amber" | "green" };
type SheetTab = { id: string; label: string; blocks: SheetBlock[] };
type Sheet = {
  name: string;
  tagline: string;
  aliases: string;
  stats: SheetStat[];
  tabs: SheetTab[];
  disclaimer: string;
};

const PILL_CLASS = {
  amber: "bg-amber-100 text-amber-800",
  green: "bg-emerald-100 text-emerald-800",
};

export default function PeptideCardSheet({
  slug,
  category,
  onBack,
}: {
  slug: string;
  category: PeptideCategory;
  onBack: () => void;
}) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [tabId, setTabId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setSheet(null);
    fetch(`${BASE}/api/chat/sheet/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({})) as Sheet & { message?: string };
        if (!res.ok) throw new Error(data.message || "Ficha indisponível.");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setSheet(data);
        setTabId(data.tabs[0]?.id ?? "");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Ficha indisponível.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const active = sheet?.tabs.find((tab) => tab.id === tabId) ?? sheet?.tabs[0];

  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para Peptídeos
      </button>

      {loading ? (
        <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Abrindo a ficha…
        </p>
      ) : error || !sheet ? (
        <p className="py-16 text-sm text-muted-foreground">{error || "Ficha indisponível."}</p>
      ) : (
        <>
          <p className="mt-4 text-xs text-muted-foreground">
            Peptídeos <span className="px-1">›</span> {category} <span className="px-1">›</span> {sheet.name}
          </p>
          <p className="mt-4 inline-flex rounded-full border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground">
            {category}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{sheet.name}</h2>
          {sheet.tagline ? <p className="mt-2 text-base text-muted-foreground">{sheet.tagline}</p> : null}
          {sheet.aliases ? (
            <p className="mt-2 text-sm text-muted-foreground">Também conhecido como: {sheet.aliases}</p>
          ) : null}

          {sheet.stats.length > 0 ? (
            <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-4">
              {sheet.stats.map((stat) => (
                <div key={stat.id}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {stat.pill ? (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${PILL_CLASS[stat.pill]}`}>
                        {stat.value}
                      </span>
                    ) : (
                      stat.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {sheet.tabs.length > 0 ? (
            <div className="mt-6 border-b border-border">
              <div className="flex gap-1 overflow-x-auto">
                {sheet.tabs.map((tab) => {
                  const selected = tab.id === (active?.id ?? "");
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTabId(tab.id)}
                      className={`shrink-0 border-b-2 px-3 py-2 text-sm ${
                        selected
                          ? "border-primary font-semibold text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-5 space-y-5">
            {active?.blocks.map((block) => (
              <section key={`${active.id}-${block.title}`}>
                {block.title !== active.label ? (
                  <h3 className="text-sm font-semibold text-foreground">{block.title}</h3>
                ) : null}
                <ul className={`${block.title !== active.label ? "mt-2" : ""} list-disc space-y-1.5 pl-5 text-sm text-foreground`}>
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">{sheet.disclaimer}</p>
        </>
      )}
    </div>
  );
}
