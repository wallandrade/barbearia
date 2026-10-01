import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { useGetProducts } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { PromoCountdown } from "@/components/product/PromoCountdown";
import { isPromoStillActive } from "@/lib/promo-ends-at";
import { normalizeSelectedVariants, parseVariantGroups, variantGalleryImages, variantImageFromSelection, variantSelectionError } from "@/lib/product-variants";
import { isProductUnavailable, useCart } from "@/store/use-cart";
import { fetchAndCacheSellerWhatsApp, formatCurrency, setSellerContext } from "@/lib/utils";
import { ArrowLeft, Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

type BulkDiscountTier = {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
  label?: string | null;
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
      const label = item.label == null ? null : String(item.label);

      if (!Number.isFinite(minQty) || minQty < 1) return null;
      if (maxQty !== null && (!Number.isFinite(maxQty) || maxQty < minQty)) return null;
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;

      return { minQty, maxQty, unitPrice, label };
    })
    .filter((tier): tier is BulkDiscountTier => Boolean(tier));

  return tiers.sort((a, b) => a.minQty - b.minQty);
}

function tierForQuantity(quantity: number, tiers: BulkDiscountTier[]): BulkDiscountTier | null {
  return tiers.find((tier) => quantity >= tier.minQty && (tier.maxQty == null || quantity <= tier.maxQty)) ?? null;
}

const PRODUCT_IMAGE_FALLBACK = "https://placehold.co/800x800/1a2b4a/ffffff?text=KA+Imports";

export default function ProductDetail() {
  const [, paramsSeller] = useRoute("/:seller/produto/:id");
  const [, paramsGlobal] = useRoute("/produto/:id");
  const { addItem } = useCart();

  const productId = paramsSeller?.id ?? paramsGlobal?.id ?? "";
  const sellerSlug = paramsSeller?.seller?.toLowerCase();

  if (sellerSlug) {
    setSellerContext(sellerSlug);
  }

  useEffect(() => {
    if (!sellerSlug) return;
    fetchAndCacheSellerWhatsApp(sellerSlug);
  }, [sellerSlug]);

  const { data, isLoading, isError } = useGetProducts();

  const product = useMemo(
    () => data?.products?.find((p) => p.id === productId) ?? null,
    [data?.products, productId],
  );

  const promoEndsAt = (product as { promoEndsAt?: string | null } | null)?.promoEndsAt ?? null;
  const promoUntilStock = (product as { promoUntilStock?: boolean } | null)?.promoUntilStock === true;
  const promoStockLeftRaw = (product as { promoStockLeft?: number | null } | null)?.promoStockLeft;
  const promoStockLeft = promoStockLeftRaw == null ? null : Number(promoStockLeftRaw);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!promoEndsAt) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [promoEndsAt]);
  const hasPromo = product ? isPromoStillActive(product.promoPrice, product.price, promoEndsAt, nowMs) : false;
  const isBulkDiscountEnabled = Boolean((product as { bulkDiscountEnabled?: boolean } | null)?.bulkDiscountEnabled);
  const bulkDiscountTiers = useMemo(
    () => parseBulkDiscountTiers((product as { bulkDiscountTiers?: unknown } | null)?.bulkDiscountTiers),
    [product],
  );
  const oneBoxTier = useMemo(
    () => tierForQuantity(1, bulkDiscountTiers),
    [bulkDiscountTiers],
  );
  const progressiveUnitPrice = oneBoxTier?.unitPrice ?? null;
  const shouldUseProgressiveUnitPrice = isBulkDiscountEnabled && progressiveUnitPrice != null;
  const displayUnitPrice = product
    ? (shouldUseProgressiveUnitPrice
      ? progressiveUnitPrice!
      : (hasPromo ? product.promoPrice! : product.price))
    : 0;
  const visibleStockQty = (() => {
    const raw = (product as { stockQty?: unknown } | null)?.stockQty;
    if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
    return Math.max(0, Math.trunc(raw));
  })();

  const progressiveOptions = useMemo(() => {
    if (!product || !isBulkDiscountEnabled || bulkDiscountTiers.length === 0) return [];
    const basePrice = displayUnitPrice;

    return [1, 2, 3, 4].map((quantity) => {
      const tier = tierForQuantity(quantity, bulkDiscountTiers);
      const unitPrice = tier?.unitPrice ?? basePrice;
      const quantityLabel = quantity >= 4 ? "4cx+" : `${quantity}cx`;
      return {
        quantity,
        quantityLabel,
        unitPrice,
        totalPrice: unitPrice * quantity,
      };
    });
  }, [product, bulkDiscountTiers, displayUnitPrice, isBulkDiscountEnabled]);
  const variantGroups = useMemo(
    () => parseVariantGroups((product as { variantGroups?: unknown } | null)?.variantGroups),
    [product],
  );
  const [selectedVariantMap, setSelectedVariantMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setSelectedVariantMap({});
  }, [product?.id]);

  const selectedVariantRaw = useMemo(
    () => variantGroups.flatMap((group) =>
      (selectedVariantMap[group.name] ?? []).map((option) => ({ groupName: group.name, option })),
    ),
    [variantGroups, selectedVariantMap],
  );
  const selectedVariants = useMemo(
    () => normalizeSelectedVariants(variantGroups, selectedVariantRaw),
    [variantGroups, selectedVariantRaw],
  );
  const variantError = variantSelectionError(variantGroups, selectedVariantRaw);
  const selectedVariantImage = variantImageFromSelection(variantGroups, selectedVariants);
  const galleryImages = variantGalleryImages(variantGroups, selectedVariants);

  const hasRequiredVariants = variantError == null;
  const isSoldOut = product ? isProductUnavailable(product) : false;
  const backHref = sellerSlug ? `/${sellerSlug}` : "/";

  return (
    <AppLayout>
      <section className="py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <Button variant="ghost" className="mb-6 px-0 hover:bg-transparent">
          <Link href={backHref} className="flex items-center">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar para produtos
          </Link>
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="font-semibold text-destructive">Erro ao carregar produto.</p>
          </div>
        ) : !product ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="font-semibold text-foreground">Produto não encontrado.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="rounded-3xl border border-border/60 overflow-hidden bg-muted/20 shadow-sm aspect-square">
              {galleryImages.length > 0 ? (
                <div className={`grid h-full w-full auto-rows-fr ${galleryImages.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {galleryImages.map((src, index) => (
                    <img
                      key={`${src}-${index}`}
                      src={src}
                      alt=""
                      className={`h-full w-full object-cover ${galleryImages.length > 1 && galleryImages.length % 2 === 1 && index === galleryImages.length - 1 ? "col-span-2" : ""}`}
                    />
                  ))}
                </div>
              ) : (
                <img
                  src={selectedVariantImage || product.image || PRODUCT_IMAGE_FALLBACK}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-secondary">{product.category}</p>
                <h1 className="text-3xl font-bold text-foreground mt-2 leading-tight">{product.name}</h1>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                {shouldUseProgressiveUnitPrice ? (
                  <span className="text-3xl font-bold text-primary">{formatCurrency(displayUnitPrice)}</span>
                ) : hasPromo ? (
                  <div className="flex items-end gap-3">
                    <span className="text-lg text-muted-foreground line-through">{formatCurrency(product.price)}</span>
                    <span className="text-3xl font-bold text-primary">{formatCurrency(product.promoPrice!)}</span>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-primary">{formatCurrency(displayUnitPrice)}</span>
                )}
                {hasPromo && !promoUntilStock && promoEndsAt && <PromoCountdown endsAt={promoEndsAt} />}
                {hasPromo && promoUntilStock && promoStockLeft != null && (
                  <p className="mt-3 text-sm font-semibold text-primary">Restam {Math.max(0, Math.trunc(promoStockLeft))} nesta promoção</p>
                )}
                {visibleStockQty != null && (
                  <p className="mt-2 text-sm font-semibold text-foreground">{visibleStockQty} em estoque</p>
                )}
                {isSoldOut && (
                  <p className="mt-2 text-sm font-semibold text-destructive">Produto esgotado no momento.</p>
                )}
              </div>

              {variantGroups.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Escolha as variantes</p>
                  {variantGroups.map((group) => {
                    const picked = selectedVariantMap[group.name] ?? [];
                    const max = group.maxSelect > 0 ? group.maxSelect : 1;
                    return (
                    <div key={group.name}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group.name}</label>
                        {max > 1 && (
                          <span className="text-xs font-medium text-muted-foreground">{picked.length} de {max}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.options.map((option) => {
                          const selected = picked.includes(option.label);
                          const blocked = !selected && max > 1 && picked.length >= max;
                          return (
                            <button
                              key={option.label}
                              type="button"
                              disabled={blocked}
                              onClick={() => setSelectedVariantMap((prev) => {
                                const current = prev[group.name] ?? [];
                                if (current.includes(option.label)) {
                                  return { ...prev, [group.name]: current.filter((label) => label !== option.label) };
                                }
                                if (max <= 1) return { ...prev, [group.name]: [option.label] };
                                if (current.length >= max) return prev;
                                return { ...prev, [group.name]: [...current, option.label] };
                              })}
                              className={`flex items-center gap-2 rounded-xl border-2 px-2 py-1.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${selected ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40"}`}
                            >
                              <span className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                                <img
                                  src={option.image || product.image || PRODUCT_IMAGE_FALLBACK}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </span>
                              <span className="font-medium pr-1">{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              {progressiveOptions.length > 0 ? (
                <div className="space-y-3">
                  {progressiveOptions.map((option) => (
                    <div key={option.quantity} className="rounded-2xl border border-border bg-card p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {Array.from({ length: option.quantity }).map((_, index) => (
                              <div key={`${option.quantityLabel}-${index}`} className="w-8 h-8 rounded-full border border-white shadow-sm overflow-hidden bg-muted">
                                <img
                                  src={selectedVariantImage || product.image || PRODUCT_IMAGE_FALLBACK}
                                  alt={`${product.name} ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-primary text-sm font-semibold">
                            {option.quantityLabel}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">{formatCurrency(option.unitPrice)} cada</p>
                          <p className="font-bold text-primary">Total {formatCurrency(option.totalPrice)}</p>
                        </div>
                      </div>

                      <Button
                        size="lg"
                        className="w-full text-base"
                        disabled={isSoldOut || !hasRequiredVariants}
                        onClick={() => {
                          if (isSoldOut) {
                            toast.error("Este produto está esgotado e não pode ser adicionado.");
                            return;
                          }
                          if (!hasRequiredVariants) {
                            toast.error(variantError || "Selecione as variantes para continuar.");
                            return;
                          }
                          addItem(product, {
                            quantity: option.quantity,
                            unitPrice: option.unitPrice,
                            selectedVariants,
                          });
                          toast.success(`${option.quantityLabel} adicionado ao carrinho!`);
                        }}
                      >
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        {isSoldOut ? "Produto esgotado" : `Adicionar ${option.quantityLabel}`}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full text-base"
                  disabled={isSoldOut || !hasRequiredVariants}
                  onClick={() => {
                    if (isSoldOut) {
                      toast.error("Este produto está esgotado e não pode ser adicionado.");
                      return;
                    }
                    if (!hasRequiredVariants) {
                      toast.error(variantError || "Selecione as variantes para continuar.");
                      return;
                    }
                    addItem(product, { selectedVariants });
                    toast.success("Produto adicionado ao carrinho!");
                  }}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {isSoldOut ? "Produto esgotado" : "Adicionar ao carrinho"}
                </Button>
              )}

              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description || "Sem descrição para este produto."}
              </p>
            </div>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
