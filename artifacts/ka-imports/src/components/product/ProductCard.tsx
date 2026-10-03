import { ArrowRight, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Product } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { parseVariantGroups } from "@/lib/product-variants";
import { isProductUnavailable, useCart } from "@/store/use-cart";
import { pharmaOffPercent, pharmaSalePrice } from "@/lib/pharma-catalog-query";
import { usePharmaAddedNotice } from "@/components/pharma/PharmaAddedNotice";

interface ProductCardProps {
  product: Product;
  sellerSlug?: string;
  priority?: boolean;
  salesRank?: 1 | 2 | 3;
  layout?: "default" | "pharma";
}

type BulkDiscountTier = {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
};

function parseBulkDiscountTiers(raw: unknown): BulkDiscountTier[] {
  if (!Array.isArray(raw)) return [];

  const tiers = raw
    .map((tier) => {
      const item = tier as Record<string, unknown>;
      const minQty = Number(item.minQty);
      const maxQtyRaw = item.maxQty;
      const maxQty = maxQtyRaw == null ? null : Number(maxQtyRaw);
      const unitPrice = Number(item.unitPrice);

      if (!Number.isFinite(minQty) || minQty < 1) return null;
      if (maxQty !== null && (!Number.isFinite(maxQty) || maxQty < minQty)) return null;
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;

      return { minQty, maxQty, unitPrice };
    })
    .filter((tier): tier is BulkDiscountTier => Boolean(tier));

  return tiers.sort((a, b) => a.minQty - b.minQty);
}

function getTierForQuantity(quantity: number, tiers: BulkDiscountTier[]): BulkDiscountTier | null {
  return tiers.find((tier) => quantity >= tier.minQty && (tier.maxQty == null || quantity <= tier.maxQty)) ?? null;
}

function hasVariantGroups(product: Product): boolean {
  const raw = (product as Product & { variantGroups?: unknown }).variantGroups;
  return parseVariantGroups(raw).length > 0;
}

export function ProductCard({ product, sellerSlug, priority = false, salesRank, layout = "default" }: ProductCardProps) {
  const hasPromo = product.promoPrice != null && product.promoPrice < product.price;
  const isSoldOut = isProductUnavailable(product);
  const isLaunch = (product as Product & { isLaunch?: boolean }).isLaunch === true;
  const bulkDiscountEnabled = (product as Product & { bulkDiscountEnabled?: boolean }).bulkDiscountEnabled === true;
  const bulkDiscountTiers = parseBulkDiscountTiers((product as Product & { bulkDiscountTiers?: unknown }).bulkDiscountTiers);
  const oneBoxTier = getTierForQuantity(1, bulkDiscountTiers);
  const hasBulkDiscount = bulkDiscountEnabled && bulkDiscountTiers.length > 0;
  const displayUnitPrice = hasBulkDiscount && oneBoxTier
    ? oneBoxTier.unitPrice
    : (hasPromo ? product.promoPrice! : product.price);
  const stockQtyRaw = (product as Product & { stockQty?: unknown }).stockQty;
  const visibleStockQty = typeof stockQtyRaw === "number" && Number.isFinite(stockQtyRaw)
    ? Math.max(0, Math.trunc(stockQtyRaw))
    : null;
  const href = sellerSlug ? `/${sellerSlug}/produto/${product.id}` : `/produto/${product.id}`;
  const { addItem, setIsOpen } = useCart();
  const showAdded = usePharmaAddedNotice((state) => state.show);
  const [, setLocation] = useLocation();
  const requiresVariantSelection = hasVariantGroups(product);
  const pharmaSale = pharmaSalePrice(product as never);
  const pharmaOff = pharmaOffPercent(product.price, pharmaSale);
  const brand = String((product as Product & { brand?: string | null }).brand || "").trim();

  function handlePharmaAdd(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (isSoldOut) return;
    if (requiresVariantSelection) {
      setLocation(href);
      return;
    }
    addItem(product);
    showAdded({ name: product.name, image: product.image, addedQty: 1 });
  }

  if (layout === "pharma") {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="relative aspect-square bg-white">
          {product.image ? (
            <img src={product.image} alt={product.name} loading={priority ? "eager" : "lazy"} className="h-full w-full object-contain p-3" />
          ) : (
            <div className="h-full w-full bg-neutral-100" />
          )}
          {pharmaOff != null && (
            <span className="absolute left-2 top-2 rounded-full bg-[var(--pharma-off)] px-2 py-1 text-[11px] font-bold text-white">
              Até {pharmaOff}% OFF
            </span>
          )}
          <button
            type="button"
            aria-label={isSoldOut ? "Produto esgotado" : "Adicionar ao carrinho"}
            disabled={isSoldOut}
            onClick={handlePharmaAdd}
            className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--pharma-green)] text-white disabled:bg-neutral-300"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 flex-col p-3">
          {brand ? <p className="text-xs text-neutral-400">{brand}</p> : null}
          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-neutral-900">{product.name}</h3>
          <div className="mt-2">
            {pharmaOff != null && (
              <>
                <p className="text-[10px] font-semibold tracking-wide text-neutral-400">A PARTIR DE</p>
                <p className="text-xs text-neutral-400 line-through">{formatCurrency(product.price)}</p>
              </>
            )}
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[var(--pharma-green-ink)]">{formatCurrency(pharmaSale)}</span>
              <span className="rounded-full bg-[var(--pharma-green-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--pharma-green-ink)]">PIX</span>
            </div>
          </div>
          <Link href={href} className="mt-auto inline-flex h-10 w-full items-center justify-center rounded-xl bg-[var(--pharma-green)] text-sm font-semibold text-white">
            Ver
          </Link>
        </div>
      </div>
    );
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (isSoldOut) return;
    if (requiresVariantSelection) {
      setLocation(href);
      return;
    }
    addItem(product);
    setIsOpen(true);
  }

  return (
    <div className="group flex flex-col w-full h-full bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-muted/30 flex-shrink-0">
        <img
          src={product.image || "https://placehold.co/400x400/1a2b4a/ffffff?text=KA+Imports"}
          alt={product.name}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1 z-10">
          {hasPromo && (
            <div className="bg-destructive text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              OFERTA
            </div>
          )}
          {salesRank ? (
            <div className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              {`TOP ${salesRank}`}
            </div>
          ) : null}
        </div>
        {isSoldOut ? (
          <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            ESGOTADO
          </div>
        ) : isLaunch ? (
          <div className="absolute top-3 right-3 bg-amber-700 text-amber-50 text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            LANCAMENTO
          </div>
        ) : null}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="mb-1 text-xs font-semibold text-secondary tracking-wider uppercase">
          {product.category}
        </div>
        {hasBulkDiscount && (
          <div className="mb-2 inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-2.5 py-1">
            Desconto progressivo
          </div>
        )}
        <h3 className="font-bold text-foreground text-base mb-1 line-clamp-2 leading-tight">
          {product.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {product.description}
        </p>

        <div className="mt-auto">
          <div className="flex flex-col mb-3">
            {!hasBulkDiscount && hasPromo ? (
              <>
                <span className="text-xs text-muted-foreground line-through decoration-destructive/50">
                  {formatCurrency(product.price)}
                </span>
                <span className="font-bold text-xl text-primary">
                  {formatCurrency(displayUnitPrice)}
                </span>
              </>
            ) : (
              <span className="font-bold text-xl text-primary">
                {formatCurrency(displayUnitPrice)}
              </span>
            )}
            {visibleStockQty != null && (
              <span className="text-xs font-semibold text-foreground mt-1">{visibleStockQty} em estoque</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              asChild
              className="w-full rounded-xl text-sm"
            >
              <Link href={href}>
                Ver produto
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl text-sm"
              onClick={handleAddToCart}
              disabled={isSoldOut}
            >
              <ShoppingCart className="w-4 h-4 mr-1.5" />
              {isSoldOut ? "Produto esgotado" : requiresVariantSelection ? "Escolher variantes" : "Adicionar ao carrinho"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
