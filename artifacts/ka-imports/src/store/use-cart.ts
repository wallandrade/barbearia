import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@workspace/api-client-react";

type BulkDiscountTier = {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
  label?: string | null;
};

type ProductVariantGroup = {
  name: string;
  options: string[];
};

type SelectedVariant = {
  groupName: string;
  option: string;
};

type ProductAvailability = Product & {
  isSoldOut?: boolean;
  isActive?: boolean;
  stock?: number | null;
};

export function isProductUnavailable(product: Product): boolean {
  const candidate = product as ProductAvailability;
  if (candidate.isActive === false) return true;
  if (candidate.isSoldOut === true) return true;
  return false;
}

type CartItemExtended = CartItem & {
  image?: string;
  baseUnitPrice: number;
  regularPrice: number;
  bulkDiscountEnabled?: boolean;
  bulkDiscountTiers?: BulkDiscountTier[];
  selectedVariants?: SelectedVariant[];
  variantLabel?: string;
  isBump?: boolean;
  bumpForProductId?: string;
  bumpOfferId?: string;
  bumpProductId?: string;
};

function parseVariantGroups(raw: unknown): ProductVariantGroup[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((group) => {
      const item = group as Record<string, unknown>;
      const name = String(item.name ?? "").trim();
      const options = Array.isArray(item.options)
        ? item.options.map((option) => String(option ?? "").trim()).filter(Boolean)
        : [];

      if (!name || options.length === 0) return null;
      return { name, options };
    })
    .filter((group): group is ProductVariantGroup => Boolean(group));
}

function normalizeSelectedVariants(
  groups: ProductVariantGroup[],
  raw: Array<{ groupName?: string; option?: string }> | undefined,
): SelectedVariant[] {
  if (!Array.isArray(raw) || groups.length === 0) return [];

  return groups
    .map((group) => {
      const picked = raw.find((item) => String(item.groupName || "").trim() === group.name);
      const option = String(picked?.option || "").trim();
      if (!option || !group.options.includes(option)) return null;
      return { groupName: group.name, option };
    })
    .filter((item): item is SelectedVariant => Boolean(item));
}

function buildVariantLabel(selectedVariants: SelectedVariant[]): string {
  return selectedVariants.map((item) => `${item.groupName}: ${item.option}`).join(" / ");
}

function getBaseUnitPrice(product: Product): number {
  const bulkEnabled = (product as Product & { bulkDiscountEnabled?: boolean }).bulkDiscountEnabled === true;
  if (bulkEnabled) {
    const tiers = parseBulkDiscountTiers((product as Product & { bulkDiscountTiers?: unknown }).bulkDiscountTiers);
    const oneBoxTier = tiers.find((tier) => tier.minQty <= 1 && (tier.maxQty == null || tier.maxQty >= 1));
    if (oneBoxTier) return oneBoxTier.unitPrice;
  }
  const promoActive = product.promoPrice != null && product.promoPrice < product.price;
  return promoActive ? product.promoPrice! : product.price;
}

function parseBulkDiscountTiers(raw: unknown): BulkDiscountTier[] {
  if (!Array.isArray(raw)) return [];

  const normalized = raw
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

  return normalized.sort((a, b) => a.minQty - b.minQty);
}

function getTierUnitPrice(baseUnitPrice: number, quantity: number, tiers: BulkDiscountTier[]): number {
  if (tiers.length === 0) return baseUnitPrice;
  const match = tiers.find((tier) => quantity >= tier.minQty && (tier.maxQty == null || quantity <= tier.maxQty));
  return match?.unitPrice ?? baseUnitPrice;
}

interface CartState {
  items: CartItemExtended[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  addItem: (
    product: Product,
    options?: { quantity?: number; unitPrice?: number; selectedVariants?: Array<{ groupName?: string; option?: string }> },
  ) => void;
  addBumpItem: (
    bumpOfferId: string,
    anchorProductId: string,
    product: { id: string; name: string; price: number; image?: string },
    bumpedPrice: number,
    bumpedQty: number
  ) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getCardSubtotal: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      setIsOpen: (isOpen) => set({ isOpen }),

      addBumpItem: (bumpOfferId, anchorProductId, product, bumpedPrice, bumpedQty) => {
        const cartId = `bump_${bumpOfferId}`;
        set((state) => {
          const exists = state.items.some((i) => i.id === cartId);
          if (exists) {
            return {
              items: state.items.map((i) =>
                i.id === cartId
                  ? { ...i, price: bumpedPrice, regularPrice: product.price, quantity: bumpedQty, bumpForProductId: anchorProductId, bumpProductId: product.id, image: product.image, name: product.name }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                id: cartId,
                name: product.name,
                price: bumpedPrice,
                baseUnitPrice: product.price,
                regularPrice: product.price,
                quantity: bumpedQty,
                image: product.image,
                isBump: true,
                bumpForProductId: anchorProductId,
                bumpOfferId,
                bumpProductId: product.id,
              } as CartItemExtended,
            ],
          };
        });
      },

      addItem: (product, options) => {
        set((state) => {
          if (isProductUnavailable(product)) {
            return state;
          }

          const addQuantity = Math.max(1, Number(options?.quantity ?? 1) || 1);
          const variantGroups = parseVariantGroups((product as Product & { variantGroups?: unknown }).variantGroups);
          const selectedVariants = normalizeSelectedVariants(variantGroups, options?.selectedVariants);
          if (variantGroups.length > 0 && selectedVariants.length !== variantGroups.length) {
            return state;
          }
          const variantLabel = buildVariantLabel(selectedVariants);
          const displayName = variantLabel ? `${product.name} - ${variantLabel}` : product.name;
          const bulkDiscountEnabled = (product as Product & { bulkDiscountEnabled?: boolean }).bulkDiscountEnabled === true;
          const bulkDiscountTiers = bulkDiscountEnabled
            ? parseBulkDiscountTiers((product as Product & { bulkDiscountTiers?: unknown }).bulkDiscountTiers)
            : [];
          const baseUnitPrice = getBaseUnitPrice(product);

          const existingItem = state.items.find((item) => item.id === product.id);
          const regularPrice = product.price;

          if (existingItem) {
            const nextQuantity = existingItem.quantity + addQuantity;
            const tiersForPrice = bulkDiscountEnabled ? (existingItem.bulkDiscountTiers ?? bulkDiscountTiers) : [];
            const nextPrice = options?.unitPrice ?? getTierUnitPrice(baseUnitPrice, nextQuantity, tiersForPrice);
            return {
              items: state.items.map((item) =>
                item.id === product.id
                  ? {
                    ...item,
                    name: displayName,
                    quantity: nextQuantity,
                    price: nextPrice,
                    baseUnitPrice,
                    bulkDiscountEnabled,
                    bulkDiscountTiers: tiersForPrice,
                    selectedVariants,
                    variantLabel: variantLabel || undefined,
                  }
                  : item
              ),
              isOpen: true,
            };
          }

          const initialPrice = options?.unitPrice ?? getTierUnitPrice(baseUnitPrice, addQuantity, bulkDiscountTiers);

          return {
            items: [
              ...state.items,
              {
                id: product.id,
                name: displayName,
                price: initialPrice,
                baseUnitPrice,
                regularPrice,
                quantity: addQuantity,
                image: product.image,
                bulkDiscountEnabled,
                bulkDiscountTiers,
                selectedVariants,
                variantLabel: variantLabel || undefined,
              } as CartItemExtended,
            ],
            isOpen: true,
          };
        });
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter(
            (item) =>
              item.id !== itemId &&
              item.bumpForProductId !== itemId
          ),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? {
                ...item,
                quantity: Math.max(1, quantity),
                price: item.isBump === true
                  ? Number(item.price)
                  : (item.bulkDiscountEnabled === true)
                    ? getTierUnitPrice(Number(item.baseUnitPrice ?? item.price), Math.max(1, quantity), item.bulkDiscountTiers ?? [])
                    : Number(item.baseUnitPrice ?? item.price),
              }
              : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getCardSubtotal: () => {
        return get().items.reduce(
          (total, item) => total + (item.regularPrice ?? item.price) * item.quantity,
          0
        );
      },
    }),
    {
      name: "ka-imports-cart",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
