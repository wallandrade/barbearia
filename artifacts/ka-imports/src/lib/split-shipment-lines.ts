export type SplitPoolKind = "loja" | "motoboy" | "minas";

export type SplitShipmentDraftItem = {
  productId: string;
  productName: string;
  quantity: number;
  variantGroup?: string;
  variantOption?: string;
  image?: string | null;
};

export type SplitDraftLine = {
  key: string;
  productId: string;
  productName: string;
  quantity: number;
  variantGroup?: string;
  variantOption?: string;
  image?: string | null;
};

type VariantChoice = { groupName: string; option: string; image: string | null };

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  const text = raw.trim();
  if (!text) return [];
  try {
    const value = JSON.parse(text) as unknown;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function imageUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value.startsWith("https://") && !value.startsWith("http://")) return null;
  return value;
}

export function readSplitVariantChoices(raw: unknown): VariantChoice[] {
  const choices: VariantChoice[] = [];
  const seen = new Set<string>();
  for (const row of unwrapArray(raw)) {
    if (!row || typeof row !== "object") continue;
    const value = row as { groupName?: unknown; option?: unknown; image?: unknown };
    const groupName = String(value.groupName ?? "").trim();
    const option = String(value.option ?? "").trim();
    if (!groupName || !option) continue;
    const dedupe = `${groupName.toLowerCase()}|${option.toLowerCase()}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    choices.push({ groupName, option, image: imageUrl(value.image) });
  }
  return choices;
}

export function splitLineKey(item: {
  productId?: string | null;
  productName?: string | null;
  variantGroup?: string | null;
  variantOption?: string | null;
}): string {
  const productId = String(item.productId || "").trim();
  const productName = String(item.productName || "").trim();
  const base = productId ? `id:${productId}` : `name:${productName.toLowerCase()}`;
  const option = String(item.variantOption || "").trim();
  if (!option) return base;
  const group = String(item.variantGroup || "").trim().toLowerCase();
  return `${base}|var:${group}|${option.toLowerCase()}`;
}

/** 2+ opções marcadas: uma linha por opção. Sem isso, a linha do produto. */
export function expandProductsForSplit(
  products: Array<{ id?: string; name?: string; quantity?: number; selectedVariants?: unknown }>,
): SplitDraftLine[] {
  const grouped = new Map<string, SplitDraftLine>();
  for (const product of products) {
    const quantity = Number(product.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const productId = String(product.id || "").trim();
    const productName = String(product.name || "Produto").trim() || "Produto";
    const choices = readSplitVariantChoices(product.selectedVariants);
    const units: SplitDraftLine[] = choices.length >= 2
      ? choices.map((choice) => ({
          key: "",
          productId,
          productName: choice.option,
          quantity,
          variantGroup: choice.groupName,
          variantOption: choice.option,
          image: choice.image,
        }))
      : [{ key: "", productId, productName, quantity }];
    for (const unit of units) {
      const key = splitLineKey(unit);
      const prev = grouped.get(key);
      grouped.set(key, {
        key,
        productId: prev?.productId || unit.productId,
        productName: prev?.productName || unit.productName,
        quantity: (prev?.quantity || 0) + unit.quantity,
        variantGroup: prev?.variantGroup || unit.variantGroup,
        variantOption: prev?.variantOption || unit.variantOption,
        image: prev?.image || unit.image || null,
      });
    }
  }
  return [...grouped.values()];
}

export function orderCanSplitShipment(
  products: Array<{ quantity?: number; selectedVariants?: unknown }>,
): boolean {
  if (products.length >= 2) return true;
  const total = products.reduce((sum, product) => sum + (Number(product.quantity) || 0), 0);
  if (total >= 2) return true;
  return products.some((product) => readSplitVariantChoices(product.selectedVariants).length >= 2);
}
