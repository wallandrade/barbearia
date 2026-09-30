export type VariantOption = {
  label: string;
  image: string | null;
};

export type VariantGroup = {
  name: string;
  options: VariantOption[];
  /** Quantas opções o cliente pode marcar. 1 = escolha única. */
  maxSelect: number;
  /** swap: uma foto. fixed: foto do produto. all: junta as fotos marcadas. */
  imageMode: VariantImageMode;
};

export type VariantImageMode = "swap" | "fixed" | "all";

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

export function readImageMode(mode: unknown, swapImage?: unknown): VariantImageMode {
  if (mode === "fixed" || mode === "all" || mode === "swap") return mode;
  if (swapImage === false || swapImage === 0 || swapImage === "0" || swapImage === "false") return "fixed";
  return "swap";
}

export function readMaxSelect(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(99, Math.trunc(value));
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
      const maxSelect = Math.min(readMaxSelect(item?.maxSelect), options.length);
      return { name, options, maxSelect, imageMode: readImageMode(item?.imageMode, item?.swapImage) };
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
      maxSelect: readMaxSelect(item.maxSelect),
      imageMode: readImageMode(item.imageMode, item.swapImage),
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
    const max = group.maxSelect > 0 ? group.maxSelect : 1;
    const seen = new Set<string>();
    for (const item of raw) {
      if (String(item.groupName || "").trim() !== group.name) continue;
      const optionLabel = String(item.option || "").trim();
      if (!optionLabel || seen.has(optionLabel)) continue;
      const option = group.options.find((current) => current.label === optionLabel);
      if (!option) continue;
      if (seen.size >= max) break;
      seen.add(optionLabel);
      selected.push({ groupName: group.name, option: option.label, image: option.image });
    }
  }
  return selected;
}

export function variantSelectionError(
  groups: VariantGroup[],
  raw: Array<{ groupName?: string; option?: string }> | undefined,
): string | null {
  if (groups.length === 0) return null;
  for (const group of groups) {
    const max = group.maxSelect > 0 ? group.maxSelect : 1;
    const labels = new Set<string>();
    for (const item of raw ?? []) {
      if (String(item.groupName || "").trim() !== group.name) continue;
      const label = String(item.option || "").trim();
      if (group.options.some((option) => option.label === label)) labels.add(label);
    }
    if (labels.size !== max) {
      return max === 1
        ? `Selecione uma opção em ${group.name}.`
        : `Selecione ${max} opções em ${group.name}.`;
    }
  }
  return null;
}

export function buildVariantLabel(selectedVariants: SelectedVariant[]): string {
  const order: string[] = [];
  const byName = new Map<string, string[]>();
  for (const item of selectedVariants) {
    const current = byName.get(item.groupName);
    if (!current) {
      byName.set(item.groupName, [item.option]);
      order.push(item.groupName);
      continue;
    }
    current.push(item.option);
  }
  return order.map((groupName) => `${groupName}: ${(byName.get(groupName) ?? []).join(", ")}`).join(" / ");
}

export function variantImageFromSelection(
  groups: VariantGroup[],
  selectedVariants: SelectedVariant[],
): string | null {
  for (const item of selectedVariants) {
    const group = groups.find((current) => current.name === item.groupName);
    if (!group || group.imageMode !== "swap") continue;
    if (item.image) return item.image;
  }
  return null;
}

export function variantGalleryImages(
  groups: VariantGroup[],
  selectedVariants: SelectedVariant[],
): string[] {
  const images: string[] = [];
  for (const item of selectedVariants) {
    const group = groups.find((current) => current.name === item.groupName);
    if (!group || group.imageMode !== "all" || !item.image) continue;
    images.push(item.image);
  }
  return images;
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
