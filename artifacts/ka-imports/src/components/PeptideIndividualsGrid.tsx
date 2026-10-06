import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import PeptideCardSheet from "@/components/PeptideCardSheet";
import {
  PEPTIDE_CARDS,
  PEPTIDE_CATEGORIES,
  filterPeptideCards,
  type PeptideCard,
  type PeptideCategory,
} from "@/lib/peptide-catalog";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const FALLBACK_LIBRARY: Array<{ slug: string; name: string }> = [
  { slug: "5-amino-1mq", name: "5-Amino-1MQ" },
  { slug: "adamax", name: "Adamax" },
  { slug: "aicar", name: "AICAR" },
  { slug: "aod-9604", name: "AOD-9604" },
  { slug: "ara-290", name: "Ara-290" },
  { slug: "bpc-157", name: "BPC-157" },
  { slug: "dsip", name: "DSIP" },
  { slug: "ghk-cu", name: "GHK-Cu" },
  { slug: "hgh-fragment-176-191", name: "HGH Fragment 176-191" },
  { slug: "slu-pp-332", name: "SLU-PP-332" },
  { slug: "tesamorelin", name: "Tesamorelin" },
  { slug: "mots-c", name: "MOTS-C" },
  { slug: "tirzepatida", name: "Tirzepatida" },
  { slug: "retatrutide", name: "Retatrutide" },
];

function foldName(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
}

const CATEGORY_CLASS: Record<PeptideCategory, string> = {
  Emagrecimento: "text-amber-700",
  Cognição: "text-violet-700",
  Performance: "text-sky-700",
  Recuperação: "text-emerald-700",
  Longevidade: "text-cyan-800",
  Imunidade: "text-teal-700",
  Estética: "text-pink-700",
};

export default function PeptideIndividualsGrid() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [library, setLibrary] = useState(FALLBACK_LIBRARY);
  const [open, setOpen] = useState<PeptideCard | null>(null);
  const cards = useMemo(() => filterPeptideCards(PEPTIDE_CARDS, query, category), [query, category]);
  const slugByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of library) map.set(foldName(item.name), item.slug);
    return map;
  }, [library]);

  useEffect(() => {
    fetch(`${BASE}/api/chat/status`)
      .then((res) => res.json())
      .then((data: { products?: unknown }) => {
        if (!Array.isArray(data?.products) || !data.products.length) return;
        const products = data.products.filter((item): item is { slug: string; name: string } => (
          !!item && typeof item === "object" && typeof (item as { slug?: unknown }).slug === "string" && typeof (item as { name?: unknown }).name === "string"
        ));
        if (products.length) setLibrary(products);
      })
      .catch(() => {
        /* a lista local cobre as 12 fichas */
      });
  }, []);

  if (open) {
    const slug = slugByName.get(foldName(open.name));
    if (slug) {
      return <PeptideCardSheet slug={slug} category={open.category} onBack={() => setOpen(null)} />;
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Peptídeos Individuais</h2>
          <p className="mt-1 text-sm text-muted-foreground">{cards.length} peptídeos</p>
        </div>
        <label className="block text-sm">
          <span className="sr-only">Categoria</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-foreground"
          >
            <option value="">Todas as categorias</option>
            {PEPTIDE_CATEGORIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="relative mt-4 block">
        <span className="sr-only">Buscar por nome do peptídeo</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome do peptídeo..."
          className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>

      {cards.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhum peptídeo com esse nome.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((item) => {
            const slug = slugByName.get(foldName(item.name));
            const body = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${CATEGORY_CLASS[item.category]}`}>
                    {item.category}
                  </p>
                  {slug ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
                </div>
                <h3 className="mt-2 text-base font-semibold text-foreground">{item.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
              </>
            );
            if (!slug) {
              return (
                <article key={item.name} className="rounded-2xl border border-border bg-white p-4">
                  {body}
                </article>
              );
            }
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => setOpen(item)}
                className="rounded-2xl border border-border bg-white p-4 text-left transition hover:border-primary"
              >
                {body}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
