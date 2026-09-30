export type ProductVariantOption = {
  label: string;
  image: string | null;
};

export type ProductVariantGroup = {
  name: string;
  options: ProductVariantOption[];
};

export type SelectedVariantRef = {
  groupName: string;
  option: string;
};

function unwrapVariantRaw(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const text = raw.trim();
  if (!text) return [];
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return [];
  }
}

export function variantImageUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value.startsWith("https://") && !value.startsWith("http://")) return null;
  return value;
}

function parseVariantOption(raw: unknown): ProductVariantOption | null {
  if (typeof raw === "string") {
    const label = raw.trim();
    return label ? { label, image: null } : null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const label = String(item.label ?? item.name ?? item.option ?? "").trim();
  if (!label) return null;
  return { label, image: variantImageUrl(item.image) };
}

export function parseVariantGroups(raw: unknown): ProductVariantGroup[] {
  const parsed = unwrapVariantRaw(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((group) => {
      const item = group as Record<string, unknown>;
      const name = String(item?.name ?? "").trim();
      const optionsRaw = Array.isArray(item?.options) ? item.options : [];
      const options: ProductVariantOption[] = [];
      for (const optionRaw of optionsRaw) {
        const option = parseVariantOption(optionRaw);
        if (!option) continue;
        if (options.some((current) => current.label === option.label)) continue;
        options.push(option);
      }
      if (!name || options.length === 0) return null;
      return { name, options };
    })
    .filter((group): group is ProductVariantGroup => Boolean(group));
}

export function resolveLineImage(
  productImage: string | null | undefined,
  variantGroupsRaw: unknown,
  selected: SelectedVariantRef[],
): string | null {
  const groups = parseVariantGroups(variantGroupsRaw);
  for (const picked of selected) {
    const groupName = String(picked.groupName || "").trim();
    const optionLabel = String(picked.option || "").trim();
    const group = groups.find((item) => item.name === groupName);
    const option = group?.options.find((item) => item.label === optionLabel);
    if (option?.image) return option.image;
  }
  const fallback = String(productImage || "").trim();
  return fallback || null;
}
