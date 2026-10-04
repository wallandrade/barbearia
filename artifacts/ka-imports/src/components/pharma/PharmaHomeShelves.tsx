import { ProductCard } from "@/components/product/ProductCard";
import type { PharmaCatalogProduct, PharmaHomeShelf, PharmaHomeShelves as Shelves } from "@/lib/pharma-catalog-query";
import type { Product } from "@workspace/api-client-react";

function ShelfGrid({
  products,
  sellerSlug,
  priorityOffset,
}: {
  products: PharmaCatalogProduct[];
  sellerSlug?: string;
  priorityOffset: number;
}) {
  return (
    <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product as unknown as Product}
          sellerSlug={sellerSlug}
          priority={priorityOffset + index < 4}
          layout="pharma"
        />
      ))}
    </div>
  );
}

function HeaderLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 shrink-0 items-center rounded-full bg-[var(--pharma-green)] px-4 text-sm font-semibold text-white"
    >
      {label}
    </button>
  );
}

function CategoryShelf({
  shelf,
  title,
  eyebrow,
  sellerSlug,
  priorityOffset,
  onOpen,
}: {
  shelf: PharmaHomeShelf;
  title: string;
  eyebrow?: string;
  sellerSlug?: string;
  priorityOffset: number;
  onOpen: () => void;
}) {
  if (shelf.products.length === 0) return null;
  return (
    <section>
      <div className="mb-4">
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{eyebrow}</p> : null}
        <h2 className="text-2xl font-bold tracking-tight text-neutral-950">{title}</h2>
      </div>
      <ShelfGrid products={shelf.products} sellerSlug={sellerSlug} priorityOffset={priorityOffset} />
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-11 items-center rounded-full bg-[var(--pharma-green)] px-6 text-sm font-semibold text-white"
        >
          Ver todos →
        </button>
      </div>
    </section>
  );
}

export function PharmaHomeShelves({
  shelves,
  sellerSlug,
  onCategory,
  onBestsellers,
  onLaunches,
}: {
  shelves: Shelves;
  sellerSlug?: string;
  onCategory: (categoria: string) => void;
  onBestsellers: () => void;
  onLaunches: () => void;
}) {
  return (
    <section className="min-h-[60vh] flex-1 bg-[#f6f7f9] px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12">
        <CategoryShelf
          shelf={shelves.tirzepatida}
          title={shelves.tirzepatida.label || "Tirzepatida"}
          sellerSlug={sellerSlug}
          priorityOffset={0}
          onOpen={() => onCategory(shelves.tirzepatida.label)}
        />

        {shelves.bestsellers.length > 0 && (
          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Destaques</p>
                <h2 className="text-2xl font-bold tracking-tight text-neutral-950">Mais vendidos</h2>
              </div>
              <HeaderLink label="Ver todos →" onClick={onBestsellers} />
            </div>
            <ShelfGrid products={shelves.bestsellers} sellerSlug={sellerSlug} priorityOffset={shelves.tirzepatida.products.length} />
          </section>
        )}

        {shelves.launches.length > 0 && (
          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Lançamentos</p>
                <h2 className="text-2xl font-bold tracking-tight text-neutral-950">Novidades</h2>
              </div>
              <HeaderLink label="Ver novidades →" onClick={onLaunches} />
            </div>
            <ShelfGrid products={shelves.launches} sellerSlug={sellerSlug} priorityOffset={99} />
          </section>
        )}

        <CategoryShelf
          shelf={shelves.peptide}
          eyebrow="Linha"
          title={shelves.peptide.label || "Peptídeo"}
          sellerSlug={sellerSlug}
          priorityOffset={99}
          onOpen={() => onCategory(shelves.peptide.label)}
        />
      </div>
    </section>
  );
}
