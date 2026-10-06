import { useEffect, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplets,
  FlaskConical,
  Info,
  Layers,
  Loader2,
  Sparkles,
  Syringe,
} from "lucide-react";
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

const CATEGORY_PILL: Record<PeptideCategory, string> = {
  Emagrecimento: "border-amber-300 bg-amber-50 text-amber-800",
  Cognição: "border-violet-300 bg-violet-50 text-violet-800",
  Performance: "border-sky-300 bg-sky-50 text-sky-800",
  Recuperação: "border-emerald-300 bg-emerald-50 text-emerald-800",
  Longevidade: "border-cyan-300 bg-cyan-50 text-cyan-900",
  Imunidade: "border-teal-300 bg-teal-50 text-teal-800",
  Estética: "border-pink-300 bg-pink-50 text-pink-800",
};

const TAB_META: Record<string, { icon: ComponentType<{ className?: string }>; bubble: string }> = {
  about: { icon: Info, bubble: "bg-sky-100 text-sky-700" },
  mechanism: { icon: FlaskConical, bubble: "bg-violet-100 text-violet-700" },
  benefits: { icon: Sparkles, bubble: "bg-emerald-100 text-emerald-700" },
  timeline: { icon: Clock, bubble: "bg-amber-100 text-amber-700" },
  dose: { icon: Syringe, bubble: "bg-rose-100 text-rose-700" },
  reconstitute: { icon: Droplets, bubble: "bg-cyan-100 text-cyan-800" },
  effects: { icon: AlertTriangle, bubble: "bg-orange-100 text-orange-800" },
  stacks: { icon: Layers, bubble: "bg-indigo-100 text-indigo-700" },
  research: { icon: BookOpen, bubble: "bg-slate-200 text-slate-700" },
};

const PROSE_TABS = new Set(["about", "mechanism", "benefits", "research"]);

function asProse(items: string[]): string {
  return items.join(" ").replace(/\s+/g, " ").trim();
}

function stackBadge(item: string): { label: string; className: string } | null {
  if (/nunca|n[aã]o juntar|n[aã]o usar/i.test(item)) {
    return { label: "Evitar", className: "bg-rose-100 text-rose-800" };
  }
  if (/monitorar/i.test(item)) {
    return { label: "Monitorar", className: "bg-amber-100 text-amber-800" };
  }
  if (/sin[eé]rgic/i.test(item)) {
    return { label: "Sinérgico", className: "bg-emerald-100 text-emerald-800" };
  }
  if (/compat[ií]vel/i.test(item)) {
    return { label: "Compatível", className: "bg-sky-100 text-sky-800" };
  }
  return null;
}

function SheetBody({ tab }: { tab: SheetTab }) {
  if (PROSE_TABS.has(tab.id)) {
    return (
      <div className="space-y-4">
        {tab.blocks.map((block) => (
          <div key={block.title}>
            {block.title !== tab.label ? (
              <h4 className="text-sm font-semibold text-foreground">{block.title}</h4>
            ) : null}
            <p className={`${block.title !== tab.label ? "mt-1.5" : ""} text-sm leading-6 text-foreground`}>
              {asProse(block.items)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (tab.id === "timeline") {
    const items = tab.blocks.flatMap((block) => block.items);
    return (
      <ol className="space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
            <p className="text-sm leading-6 text-foreground">{item}</p>
          </li>
        ))}
      </ol>
    );
  }

  if (tab.id === "effects") {
    const items = tab.blocks.flatMap((block) => block.items);
    return (
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-3 rounded-xl bg-white px-3 py-2.5">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
            <p className="text-sm leading-6 text-foreground">{item}</p>
          </li>
        ))}
      </ul>
    );
  }

  if (tab.id === "stacks") {
    const items = tab.blocks.flatMap((block) => block.items);
    return (
      <ul className="space-y-2">
        {items.map((item) => {
          const badge = stackBadge(item);
          return (
            <li key={item} className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-white px-3 py-2.5">
              <p className="min-w-0 flex-1 text-sm leading-6 text-foreground">{item}</p>
              {badge ? (
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                  {badge.label}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      {tab.blocks.map((block, blockIndex) => (
        <section key={`${block.title}-${blockIndex}`}>
          {block.title !== tab.label ? (
            <h4 className="text-sm font-semibold text-foreground">{block.title}</h4>
          ) : null}
          <ol className={`${block.title !== tab.label ? "mt-2" : ""} space-y-2`}>
            {block.items.map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-foreground">{item}</p>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

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
  const meta = TAB_META[active?.id ?? ""] ?? TAB_META.about;
  const Icon = meta.icon;

  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para Peptídeos
        </button>
        {sheet ? (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className={`font-medium ${CATEGORY_PILL[category].split(" ").find((token) => token.startsWith("text-")) ?? ""}`}>
              {category}
            </span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{sheet.name}</span>
          </>
        ) : null}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Abrindo a ficha…
        </p>
      ) : error || !sheet ? (
        <p className="py-16 text-sm text-muted-foreground">{error || "Ficha indisponível."}</p>
      ) : (
        <>
          <p className={`mt-5 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${CATEGORY_PILL[category]}`}>
            {category}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{sheet.name}</h2>
          {sheet.tagline ? <p className="mt-2 text-base text-muted-foreground">{sheet.tagline}</p> : null}
          {sheet.aliases ? (
            <p className="mt-2 text-sm text-muted-foreground">Também conhecido como: {sheet.aliases}</p>
          ) : null}

          {sheet.stats.length > 0 ? (
            <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-4">
              {sheet.stats.map((stat) => (
                <div key={stat.id}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
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

          {sheet.tabs.length > 0 && active ? (
            <>
              <div className="mt-6 flex gap-1 overflow-x-auto border-b border-border pb-3">
                {sheet.tabs.map((tab) => {
                  const selected = tab.id === active.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTabId(tab.id)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                        selected
                          ? "bg-sky-800 font-semibold text-white"
                          : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-slate-50 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.bubble}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-base font-semibold text-foreground">{active.label} {sheet.name}</h3>
                </div>
                <div className="mt-4">
                  <SheetBody tab={active} />
                </div>
              </div>
            </>
          ) : null}

          <p className="mt-6 text-xs text-muted-foreground">{sheet.disclaimer}</p>
        </>
      )}
    </div>
  );
}
