import { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@workspace/api-client-react";
import { PharmaHomeShelves } from "@/components/pharma/PharmaHomeShelves";
import {
  PHARMA_PAGE_SIZE,
  applyPharmaVitrine,
  brandsInCategory,
  buildPharmaHomeShelves,
  filterPharmaProducts,
  isPharmaHomeQuery,
  isPharmaPromo,
  parsePharmaCatalogQuery,
  pharmaHomeHasShelves,
  pharmaPageSlice,
  pharmaSearchString,
  type PharmaCatalogProduct,
  type PharmaCatalogQuery,
  type PharmaOrder,
} from "@/lib/pharma-catalog-query";

const ORDER_OPTIONS: Array<{ id: PharmaOrder; label: string }> = [
  { id: "relevancia", label: "Relevância" },
  { id: "menor", label: "Menor Preço" },
  { id: "maior", label: "Maior Preço" },
  { id: "nome", label: "Nome (A-Z)" },
];

type Draft = Pick<PharmaCatalogQuery, "categoria" | "marca" | "promo">;

export function PharmaCatalog({
  products,
  isLoading,
  isError,
  sellerSlug,
}: {
  products: Product[];
  isLoading: boolean;
  isError: boolean;
  sellerSlug?: string;
}) {
  const searchString = useSearch();
  const [location, setLocation] = useLocation();
  const query = parsePharmaCatalogQuery(searchString);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ categoria: "", marca: "", promo: false });
  const [brandSearch, setBrandSearch] = useState("");

  const now = Date.now();
  const rows = products as unknown as PharmaCatalogProduct[];
  const filtered = useMemo(
    () => applyPharmaVitrine(filterPharmaProducts(rows, query, now), query.vitrine, query.ordem, now),
    [products, query.q, query.categoria, query.marca, query.promo, query.vitrine, query.ordem, now],
  );
  const homeShelves = useMemo(() => buildPharmaHomeShelves(rows), [products]);
  const showHome = isPharmaHomeQuery(query) && pharmaHomeHasShelves(homeShelves);
  const page = pharmaPageSlice(filtered, query.pagina);
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const product of rows) {
      const category = String(product.category || "").trim();
      if (!category || seen.has(category)) continue;
      seen.add(category);
      list.push(category);
    }
    return list;
  }, [products]);

  const promoCount = useMemo(() => {
    return filterPharmaProducts(rows, { q: query.q, categoria: draft.categoria, marca: draft.marca, promo: false }, now)
      .filter((product) => isPharmaPromo(product, now)).length;
  }, [products, query.q, draft.categoria, draft.marca, now]);

  const draftCount = useMemo(() => {
    return filterPharmaProducts(rows, { q: query.q, ...draft }, now).length;
  }, [products, query.q, draft, now]);

  const brandOptions = useMemo(() => {
    const needle = brandSearch.trim().toLocaleLowerCase("pt-BR");
    return brandsInCategory(rows, draft.categoria).filter((brand) => !needle || brand.toLocaleLowerCase("pt-BR").includes(needle));
  }, [products, draft.categoria, brandSearch]);

  const activeFilterCount = Number(Boolean(query.categoria)) + Number(Boolean(query.marca)) + Number(query.promo);
  const orderLabel = ORDER_OPTIONS.find((option) => option.id === query.ordem)?.label ?? "Relevância";

  function write(next: PharmaCatalogQuery) {
    const path = location.split("?")[0] || "/";
    const qs = pharmaSearchString(next);
    setLocation(qs ? `${path}?${qs}` : path);
  }

  function openFilters() {
    setDraft({ categoria: query.categoria, marca: query.marca, promo: query.promo });
    setBrandSearch("");
    setFiltersOpen(true);
  }

  const chips: Array<{ key: string; label: string; clear: Partial<PharmaCatalogQuery> }> = [];
  if (query.q) chips.push({ key: "q", label: query.q, clear: { q: "" } });
  if (query.categoria) chips.push({ key: "categoria", label: query.categoria, clear: { categoria: "" } });
  if (query.marca) chips.push({ key: "marca", label: query.marca, clear: { marca: "" } });
  if (query.promo) chips.push({ key: "promo", label: "Promoções", clear: { promo: false } });
  if (query.vitrine === "vendidos") chips.push({ key: "vitrine", label: "Mais vendidos", clear: { vitrine: "" } });
  if (query.vitrine === "lancamentos") chips.push({ key: "vitrine", label: "Novidades", clear: { vitrine: "" } });

  if (showHome) {
    return (
      <PharmaHomeShelves
        shelves={homeShelves}
        sellerSlug={sellerSlug}
        onCategory={(categoria) => write({ ...query, categoria, vitrine: "", pagina: 1 })}
        onBestsellers={() => write({ ...query, vitrine: "vendidos", pagina: 1 })}
        onLaunches={() => write({ ...query, vitrine: "lancamentos", pagina: 1 })}
      />
    );
  }

  const vitrineTitle = query.vitrine === "vendidos" ? "Mais vendidos" : query.vitrine === "lancamentos" ? "Novidades" : "";

  return (
    <section className="min-h-[60vh] flex-1 bg-[#f6f7f9] px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={openFilters} className="inline-flex h-11 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-[var(--pharma-green)]" />
            Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          <div className="relative min-w-[10.5rem]">
            <button type="button" onClick={() => setSortOpen((open) => !open)} className="inline-flex h-11 w-full items-center justify-between gap-3 rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold">
              {orderLabel}
              <ChevronDown className="h-4 w-4 text-neutral-500" />
            </button>
            {sortOpen && (
              <div className="absolute left-0 z-30 mt-2 w-52 overflow-hidden rounded-xl bg-neutral-700 py-1 text-white shadow-xl">
                {ORDER_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm"
                    onClick={() => {
                      write({ ...query, ordem: option.id, pagina: 1 });
                      setSortOpen(false);
                    }}
                  >
                    {option.label}
                    {query.ordem === option.id && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm text-neutral-700"
                onClick={() => write({ ...query, ...chip.clear, pagina: 1 })}
              >
                {chip.label}
                <X className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        )}

        {vitrineTitle ? <h1 className="mt-4 text-2xl font-bold text-neutral-950">{vitrineTitle}</h1> : null}

        <div className="mt-3 rounded-full bg-white px-4 py-2.5 text-sm text-neutral-500">
          {page.start}-{page.end} de {filtered.length}
        </div>

        {isLoading ? (
          <p className="py-16 text-center text-neutral-500">Carregando produtos...</p>
        ) : isError ? (
          <p className="py-16 text-center text-red-600">Não foi possível carregar os produtos.</p>
        ) : page.slice.length === 0 ? (
          <p className="py-16 text-center text-neutral-500">Nenhum produto encontrado.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 lg:grid-cols-4">
            {page.slice.map((product, index) => (
              <ProductCard key={product.id} product={product as unknown as Product} sellerSlug={sellerSlug} priority={index < 4} layout="pharma" />
            ))}
          </div>
        )}

        {filtered.length > PHARMA_PAGE_SIZE && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page.page <= 1}
              className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
              onClick={() => write({ ...query, pagina: page.page - 1 })}
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page.end >= filtered.length}
              className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
              onClick={() => write({ ...query, pagina: page.page + 1 })}
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-lg font-bold">Filtros</h2>
            <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Fechar filtros"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
            <label className="flex items-center justify-between gap-3">
              <span className="font-semibold">Apenas Promoções ({promoCount})</span>
              <input type="checkbox" checked={draft.promo} onChange={(event) => setDraft((current) => ({ ...current, promo: event.target.checked }))} />
            </label>
            <div>
              <p className="mb-2 text-sm font-semibold text-neutral-500">Categorias</p>
              <div className="space-y-1">
                {categories.map((category) => {
                  const selected = draft.categoria === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${selected ? "bg-[var(--pharma-green-soft)] font-semibold text-[var(--pharma-green-ink)]" : "text-neutral-800"}`}
                      onClick={() => setDraft((current) => ({ ...current, categoria: selected ? "" : category, marca: "" }))}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-neutral-500">Marcas</p>
              <input
                value={brandSearch}
                onChange={(event) => setBrandSearch(event.target.value)}
                placeholder="Buscar marca"
                className="mb-3 h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none"
              />
              <div className="flex flex-wrap gap-2">
                {brandOptions.map((brand) => {
                  const selected = draft.marca.toLocaleLowerCase("pt-BR") === brand.toLocaleLowerCase("pt-BR");
                  return (
                    <button
                      key={brand}
                      type="button"
                      className={`rounded-full px-3 py-1 text-sm ${selected ? "bg-[var(--pharma-green)] text-white" : "bg-neutral-100 text-neutral-700"}`}
                      onClick={() => setDraft((current) => ({ ...current, marca: selected ? "" : brand }))}
                    >
                      {brand}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex gap-2 border-t px-4 py-3">
            <button
              type="button"
              className="h-11 flex-1 rounded-xl border border-neutral-200 text-sm font-semibold"
              onClick={() => setDraft({ categoria: "", marca: "", promo: false })}
            >
              Limpar
            </button>
            <button
              type="button"
              className="h-11 flex-[2] rounded-xl bg-[var(--pharma-green)] text-sm font-semibold text-white"
              onClick={() => {
                write({ ...query, ...draft, vitrine: "", pagina: 1 });
                setFiltersOpen(false);
              }}
            >
              Ver {draftCount} produtos
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
