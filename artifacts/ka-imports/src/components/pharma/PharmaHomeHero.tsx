import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import type { Product } from "@workspace/api-client-react";
import { foldCatalogLabel } from "@/lib/catalog-sort";
import { pharmaSalePrice, pharmaSearchString, type PharmaCatalogProduct } from "@/lib/pharma-catalog-query";
import { formatCurrency } from "@/lib/utils";

/** Categorias que nunca entram na vitrine do topo (regra da loja: nada de anabolizante). */
const BLOCKED_CATEGORY_FOLDS = new Set(["ergogenicos", "ergogenico", "anabolizantes", "anabolizante", "esteroides", "hormonios"]);
/** Fora do tema da farmácia: não vira card do topo (continua no catálogo). */
const OFF_THEME_CATEGORY_FOLDS = new Set(["eletronica", "eletronicos"]);
/** Nomes de anabolizantes/esteroides. Uma categoria com qualquer um deles fica fora dos cards. */
const BLOCKED_NAME =
  /(testost|oxandr|nandrol|durateston|decanoato|\bdeca\b|stanozol|winstrol|trembol|boldenon|masteron|anaboli|esteroid|ergog|hemogenin|oxitolan|oximetol|primobol|dianabol|metandros|propionato|cipionato|enantato|sustanon|turinabol|halotest|clostebol|drostanol|mesterol|ostarin|ligandrol|landerlan)/i;

const TIRZEPATIDA_FOLD = "tirzepatida";
/** Ordem preferida dos cards menores; o 1º disponível vira o card largo. */
const CARD_PREFERENCE = ["retatrutide", "retatrutida", "peptideo", "botox", "estetica", "agua"];
const MAX_CARDS = 5;

type Slot = {
  category: string;
  image: string;
  imageAlt: string;
  fromPrice: number | null;
};

function isBlockedProduct(product: PharmaCatalogProduct & { image?: string | null }): boolean {
  return BLOCKED_NAME.test(String(product.name || "")) || BLOCKED_CATEGORY_FOLDS.has(foldCatalogLabel(product.category));
}

function usableImage(product: { image?: string | null }): string {
  const src = String(product.image || "").trim();
  return /^https?:\/\//i.test(src) ? src : "";
}

function buildSlot(category: string, products: Array<PharmaCatalogProduct & { image?: string | null }>, now: number): Slot | null {
  const available = products.filter((product) => product.isSoldOut !== true);
  const pool = available.length > 0 ? available : products;
  const withImage = pool
    .filter((product) => usableImage(product))
    .sort((a, b) => Number(b.soldQty || 0) - Number(a.soldQty || 0));
  const cover = withImage[0];
  if (!cover) return null;
  const prices = pool.map((product) => pharmaSalePrice(product, now)).filter((price) => Number.isFinite(price) && price > 0);
  return {
    category,
    image: usableImage(cover),
    imageAlt: String(cover.name || category),
    fromPrice: prices.length > 0 ? Math.min(...prices) : null,
  };
}

export function buildPharmaHeroData(rows: Array<PharmaCatalogProduct & { image?: string | null }>, now = Date.now()) {
  const groups = new Map<string, Array<PharmaCatalogProduct & { image?: string | null }>>();
  const tainted = new Set<string>();
  for (const product of rows) {
    const category = String(product.category || "").trim();
    if (!category) continue;
    if (isBlockedProduct(product)) tainted.add(category);
    const list = groups.get(category) ?? [];
    list.push(product);
    groups.set(category, list);
  }

  const allowed = (category: string) => {
    const fold = foldCatalogLabel(category);
    return !tainted.has(category) && !BLOCKED_CATEGORY_FOLDS.has(fold) && !OFF_THEME_CATEGORY_FOLDS.has(fold);
  };

  let hero: Slot | null = null;
  for (const [category, list] of groups) {
    if (foldCatalogLabel(category) === TIRZEPATIDA_FOLD && allowed(category)) {
      hero = buildSlot(category, list, now);
      break;
    }
  }

  const ordered = Array.from(groups.keys())
    .filter((category) => foldCatalogLabel(category) !== TIRZEPATIDA_FOLD && allowed(category))
    .sort((a, b) => {
      const rank = (value: string) => {
        const index = CARD_PREFERENCE.indexOf(foldCatalogLabel(value));
        return index === -1 ? CARD_PREFERENCE.length : index;
      };
      return rank(a) - rank(b) || (groups.get(b)?.length ?? 0) - (groups.get(a)?.length ?? 0);
    });

  const cards: Slot[] = [];
  for (const category of ordered) {
    const slot = buildSlot(category, groups.get(category) ?? [], now);
    if (slot) cards.push(slot);
    if (cards.length >= MAX_CARDS) break;
  }
  // Grade de 2 colunas: card largo + número par de cards pequenos.
  if (cards.length > 1 && (cards.length - 1) % 2 === 1) cards.pop();
  return { hero, cards };
}

function FromPrice({ value, size }: { value: number | null; size: "lg" | "md" | "sm" }) {
  if (value == null) return null;
  const priceClass =
    size === "lg"
      ? "text-[28px] leading-none sm:text-4xl"
      : size === "md"
        ? "text-xl leading-none"
        : "text-base leading-none";
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">A partir de</p>
      <p className={`mt-1 font-bold tracking-tight text-neutral-950 ${priceClass}`}>{formatCurrency(value)}</p>
    </div>
  );
}

function ProductShot({ src, alt, className, imgClassName, floating }: { src: string; alt: string; className: string; imgClassName: string; floating?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative inline-flex">
        {floating ? (
          <span
            aria-hidden="true"
            className="pharma-float-shadow absolute -bottom-2 left-1/2 h-3 w-4/5 rounded-[50%] bg-neutral-900/15 blur-md"
          />
        ) : null}
        <img
          src={src}
          alt={alt}
          loading={floating ? "eager" : "lazy"}
          decoding="async"
          className={`relative w-auto object-contain mix-blend-multiply ${imgClassName} ${floating ? "pharma-float" : ""}`}
        />
      </div>
    </div>
  );
}

const cardBase =
  "group relative block overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.12)] transition-shadow hover:shadow-[0_1px_2px_rgba(16,24,40,0.06),0_12px_28px_-12px_rgba(16,24,40,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pharma-green)] focus-visible:ring-offset-2";

export function PharmaHomeHeroSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl" aria-hidden="true">
      <div className="h-[208px] animate-pulse rounded-3xl bg-white sm:h-[280px]" />
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className="col-span-2 h-[112px] animate-pulse rounded-3xl bg-white lg:h-[140px]" />
        <div className="h-[140px] animate-pulse rounded-3xl bg-white" />
        <div className="h-[140px] animate-pulse rounded-3xl bg-white" />
      </div>
    </div>
  );
}

export function PharmaHomeHero({ products, isLoading }: { products: Product[]; isLoading: boolean }) {
  const [location] = useLocation();
  const path = location.split("?")[0] || "/";
  const { hero, cards } = useMemo(
    () => buildPharmaHeroData(products as unknown as Array<PharmaCatalogProduct & { image?: string | null }>),
    [products],
  );

  if (isLoading && products.length === 0) {
    return (
      <section className="bg-[#f6f7f9] px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
        <PharmaHomeHeroSkeleton />
      </section>
    );
  }
  if (!hero && cards.length === 0) return null;

  const hrefFor = (categoria: string) => {
    const qs = pharmaSearchString({ q: "", categoria, marca: "", promo: false, ordem: "relevancia", vitrine: "", pagina: 1 });
    return `${path}?${qs}`;
  };
  const [wide, ...small] = cards;

  return (
    <section className="bg-[#f6f7f9] px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6" aria-label="Destaques da loja">
      <div className="mx-auto w-full max-w-7xl">
        {hero ? (
          <Link
            href={hrefFor(hero.category)}
            className={`${cardBase} bg-gradient-to-br from-white via-white to-[var(--pharma-green-soft)]`}
            aria-label={`Ver ofertas de ${hero.category}`}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_44%] items-center gap-2 p-5 sm:grid-cols-[minmax(0,1fr)_45%] sm:p-8 lg:px-12">
              <div className="min-w-0">
                <span className="inline-flex items-center rounded-full border border-[var(--pharma-green)]/30 bg-[var(--pharma-green-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--pharma-green-ink)]">
                  Destaque
                </span>
                <h2 className="mt-3 text-[26px] font-bold leading-[1.05] tracking-tight text-neutral-950 sm:text-4xl lg:text-5xl">
                  {hero.category}
                  <span className="block text-neutral-500">mais vendida</span>
                </h2>
                <div className="mt-4">
                  <FromPrice value={hero.fromPrice} size="lg" />
                </div>
                <span className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--pharma-green)] px-4 text-sm font-semibold text-white transition-colors group-hover:bg-[var(--pharma-green-strong)]">
                  Ver ofertas
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <ProductShot
                src={hero.image}
                alt={hero.imageAlt}
                floating
                className="py-2"
                imgClassName="max-h-[180px] max-w-full sm:max-h-[240px] lg:max-h-[300px]"
              />
            </div>
          </Link>
        ) : null}

        {cards.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-6">
            {wide ? (
              <Link href={hrefFor(wide.category)} className={`${cardBase} col-span-2 min-h-[112px]`} aria-label={`Ver ${wide.category}`}>
                <div className="grid h-full grid-cols-[minmax(0,1fr)_38%] items-center gap-2 p-4 lg:p-5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--pharma-green-ink)]">Linha</p>
                    <h3 className="mt-0.5 truncate text-lg font-bold tracking-tight text-neutral-950">{wide.category}</h3>
                    <div className="mt-2">
                      <FromPrice value={wide.fromPrice} size="md" />
                    </div>
                  </div>
                  <ProductShot src={wide.image} alt={wide.imageAlt} className="h-[96px] lg:h-[108px]" imgClassName="max-h-[96px] max-w-full lg:max-h-[108px]" />
                </div>
              </Link>
            ) : null}
            {small.map((card) => (
              <Link key={card.category} href={hrefFor(card.category)} className={`${cardBase} min-h-[140px]`} aria-label={`Ver ${card.category}`}>
                <div className="flex h-full flex-col p-3.5">
                  <ProductShot src={card.image} alt={card.imageAlt} className="h-[72px] w-full lg:h-[80px]" imgClassName="max-h-[72px] max-w-full lg:max-h-[80px]" />
                  <h3 className="mt-2 truncate text-[15px] font-bold tracking-tight text-neutral-950">{card.category}</h3>
                  <div className="mt-1">
                    <FromPrice value={card.fromPrice} size="sm" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
