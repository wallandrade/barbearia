export type VariantOption = {
  label: string;
  image: string | null;
};

export type VariantGroup = {
  name: string;
  options: VariantOption[];
};

export type SelectedVariant = {
  groupName: string;
  option: string;
  image?: string | null;
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

function parseStoredOption(raw: unknown): VariantOption | null {
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

export function parseVariantGroups(raw: unknown): VariantGroup[] {
  const parsed = unwrapVariantRaw(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((group) => {
      const item = group as Record<string, unknown>;
      const name = String(item?.name ?? "").trim();
      const optionsRaw = Array.isArray(item?.options) ? item.options : [];
      const options: VariantOption[] = [];
      for (const optionRaw of optionsRaw) {
        const option = parseStoredOption(optionRaw);
        if (!option) continue;
        if (options.some((current) => current.label === option.label)) continue;
        options.push(option);
      }
      if (!name || options.length === 0) return null;
      return { name, options };
    })
    .filter((group): group is VariantGroup => Boolean(group));
}

function readEditorOption(raw: unknown): VariantOption | null {
  if (typeof raw === "string") return { label: raw, image: null };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const label = String(item.label ?? item.name ?? item.option ?? "");
  return { label, image: variantImageUrl(item.image) };
}

/** Mantém grupo e opção ainda vazios para o admin conseguir preencher. */
export function readEditorVariantGroups(raw: unknown): VariantGroup[] {
  const parsed = unwrapVariantRaw(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed.map((group) => {
    const item = (group && typeof group === "object" ? group : {}) as Record<string, unknown>;
    const name = String(item.name ?? "");
    const optionsRaw = Array.isArray(item.options) ? item.options : [];
    const options = optionsRaw
      .map((option) => readEditorOption(option))
      .filter((option): option is VariantOption => Boolean(option));
    return {
      name,
      options: options.length > 0 ? options : [{ label: "", image: null }],
    };
  });
}

export function normalizeSelectedVariants(
  groups: VariantGroup[],
  raw: Array<{ groupName?: string; option?: string }> | undefined,
): SelectedVariant[] {
  if (!Array.isArray(raw) || groups.length === 0) return [];

  const selected: SelectedVariant[] = [];
  for (const group of groups) {
    const picked = raw.find((item) => String(item.groupName || "").trim() === group.name);
    const optionLabel = String(picked?.option || "").trim();
    const option = group.options.find((item) => item.label === optionLabel);
    if (!option) continue;
    selected.push({ groupName: group.name, option: option.label, image: option.image });
  }
  return selected;
}

export function buildVariantLabel(selectedVariants: SelectedVariant[]): string {
  return selectedVariants.map((item) => `${item.groupName}: ${item.option}`).join(" / ");
}

export function variantImageFromSelection(selectedVariants: SelectedVariant[]): string | null {
  return selectedVariants.find((item) => item.image)?.image ?? null;
}

export function cartLineKey(productId: string, selectedVariants: SelectedVariant[]): string {
  if (selectedVariants.length === 0) return productId;
  const signature = selectedVariants
    .map((item) => `${encodeURIComponent(item.groupName)}=${encodeURIComponent(item.option)}`)
    .join("&");
  return `${productId}::${signature}`;
}

export function cartLineId(item: { id: string; lineKey?: string | null }): string {
  const lineKey = String(item.lineKey || "").trim();
  return lineKey || item.id;
}
