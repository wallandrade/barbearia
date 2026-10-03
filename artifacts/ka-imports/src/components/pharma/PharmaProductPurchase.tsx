import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import type { Product } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { isProductUnavailable, useCart } from "@/store/use-cart";
import { usePharmaAddedNotice } from "@/components/pharma/PharmaAddedNotice";
import { parseBulkTiers, pharmaOffPercent, pharmaSalePrice, tierForQuantity } from "@/lib/pharma-catalog-query";
import { toast } from "sonner";

type SelectedVariant = { groupName?: string; option?: string };

const FALLBACK = "https://placehold.co/200x200/f3f4f6/9ca3af?text=+";

export function PharmaProductPurchase({
  product,
  sellerSlug,
  image,
  selectedVariants,
  variantError,
  hasRequiredVariants,
}: {
  product: Product;
  sellerSlug?: string;
  image?: string | null;
  selectedVariants: SelectedVariant[];
  variantError: string | null;
  hasRequiredVariants: boolean;
}) {
  const { addItem, setIsOpen } = useCart();
  const showNotice = usePharmaAddedNotice((state) => state.show);
  const [, setLocation] = useLocation();
  const [quantity, setQuantity] = useState(1);
  const isSoldOut = isProductUnavailable(product);
  const bulkEnabled = Boolean((product as { bulkDiscountEnabled?: boolean }).bulkDiscountEnabled);
  const tiers = useMemo(
    () => parseBulkTiers((product as { bulkDiscountTiers?: unknown }).bulkDiscountTiers),
    [product],
  );
  const hasTiers = bulkEnabled && tiers.length > 0;
  const listPrice = Number(product.price) || 0;
  const oneBox = tierForQuantity(1, tiers)?.unitPrice ?? pharmaSalePrice(product as never);
  const unitPrice = hasTiers ? (tierForQuantity(quantity, tiers)?.unitPrice ?? oneBox) : pharmaSalePrice(product as never);
  const total = unitPrice * quantity;
  const photo = image || product.image || FALLBACK;
  const selectedCard = quantity >= 4 ? 4 : quantity;

  const wholesaleHint = useMemo(() => {
    if (!hasTiers) return null;
    const current = tierForQuantity(quantity, tiers)?.unitPrice ?? oneBox;
    const next = [1, 2, 3, 4]
      .filter((qty) => qty > quantity)
      .map((qty) => ({ qty, price: tierForQuantity(qty, tiers)?.unitPrice ?? current }))
      .find((item) => item.price < current - 0.001);
    if (!next || !(oneBox > 0)) return null;
    const percent = Math.max(1, Math.round((1 - next.price / oneBox) * 100));
    return { more: next.qty - quantity, price: next.price, percent };
  }, [hasTiers, quantity, tiers, oneBox]);

  function guard(): boolean {
    if (isSoldOut) {
      toast.error("Este produto está esgotado e não pode ser adicionado.");
      return false;
    }
    if (!hasRequiredVariants) {
      toast.error(variantError || "Selecione as variantes para continuar.");
      return false;
    }
    return true;
  }

  function add(closeDrawer: boolean) {
    if (!guard()) return;
    addItem(product, { quantity, unitPrice, selectedVariants });
    if (closeDrawer) setIsOpen(false);
    showNotice({ name: product.name, image: photo, addedQty: quantity });
  }

  function buyNow() {
    if (!guard()) return;
    addItem(product, { quantity, unitPrice, selectedVariants });
    setIsOpen(false);
    setLocation(sellerSlug ? `/${encodeURIComponent(sellerSlug)}/checkout` : "/checkout");
  }

  const circles = (count: number) => (
    <div className="flex -space-x-2">
      {Array.from({ length: count }).map((_, index) => (
        <img key={index} src={photo} alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover" />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {isSoldOut && <p className="text-sm font-semibold text-[var(--pharma-off)]">Produto esgotado no momento.</p>}
      {hasTiers ? (
        <>
          <h2 className="text-lg font-bold">Tabela de preços</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[1, 2, 3, 4].map((qty) => {
              const price = tierForQuantity(qty, tiers)?.unitPrice ?? oneBox;
              const cheaper = price < oneBox - 0.001;
              const percent = cheaper ? pharmaOffPercent(oneBox, price) : null;
              const selected = selectedCard === qty;
              return (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setQuantity(qty)}
                  className={`rounded-2xl border p-3 text-left ${selected ? "border-[var(--pharma-green)] bg-[var(--pharma-green-soft)]" : "border-neutral-200 bg-white"}`}
                >
                  {circles(qty)}
                  <p className="mt-2 text-sm font-semibold">{qty >= 4 ? "4cx+" : `${qty}cx`}</p>
                  <p className="text-sm font-bold text-[var(--pharma-green-ink)]">{formatCurrency(price)}</p>
                  {cheaper && percent != null && (
                    <p className="text-xs">
                      <span className="text-neutral-400 line-through">{formatCurrency(oneBox)}</span>
                      <span className="ml-1 text-[var(--pharma-off)]">-{percent}%</span>
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        circles(Math.min(4, quantity))
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center rounded-full border border-neutral-200 bg-white">
          <button type="button" className="h-10 w-10" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Diminuir">−</button>
          <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
          <button type="button" className="h-10 w-10" onClick={() => setQuantity((value) => Math.min(99, value + 1))} aria-label="Aumentar">+</button>
        </div>
        <div className="text-right">
          {!hasTiers && pharmaSalePrice(product as never) < listPrice && (
            <p className="text-xs text-neutral-400 line-through">{formatCurrency(listPrice * quantity)}</p>
          )}
          <p className="text-lg font-bold text-[var(--pharma-green-ink)]">{formatCurrency(total)}</p>
        </div>
      </div>

      {wholesaleHint && (
        <p className="text-sm text-neutral-600">
          Adicione mais {wholesaleHint.more} un. para garantir preço de atacado ({formatCurrency(wholesaleHint.price)}) e economize {wholesaleHint.percent}% vs varejo.
        </p>
      )}

      {hasTiers ? (
        <button
          type="button"
          disabled={isSoldOut}
          onClick={() => add(false)}
          className="h-12 w-full rounded-xl bg-[var(--pharma-green)] text-sm font-semibold text-white disabled:opacity-50"
        >
          Adicionar ao carrinho
        </button>
      ) : (
        <div className="grid gap-2">
          <button
            type="button"
            disabled={isSoldOut}
            onClick={() => add(true)}
            className="h-12 w-full rounded-xl border border-neutral-300 bg-white text-sm font-semibold disabled:opacity-50"
          >
            Adicionar ao carrinho
          </button>
          <button
            type="button"
            disabled={isSoldOut}
            onClick={buyNow}
            className="h-12 w-full rounded-xl bg-[var(--pharma-green)] text-sm font-semibold text-white disabled:opacity-50"
          >
            Comprar agora
          </button>
        </div>
      )}
    </div>
  );
}
