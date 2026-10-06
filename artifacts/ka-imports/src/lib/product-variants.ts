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

export type OrderVariantChoice = {
  groupName: string;
  option: string;
  image: string | null;
};

/** Nome usado ao copiar o pedido: opções escolhidas, ou o nome do produto se não houve variante. */
export function orderCopyItemName(product: { name?: string | null; selectedVariants?: unknown }): string {
  const fallback = String(product.name || "Produto").trim() || "Produto";
  const choices = readOrderVariantChoices(product.selectedVariants);
  if (choices.length === 0) return fallback;
  const groups: string[] = [];
  const byName = new Map<string, string[]>();
  for (const choice of choices) {
    const current = byName.get(choice.groupName);
    if (!current) {
      byName.set(choice.groupName, [choice.option]);
      groups.push(choice.groupName);
      continue;
    }
    current.push(choice.option);
  }
  const label = groups.map((groupName) => (byName.get(groupName) ?? []).join(", ")).filter(Boolean).join(" / ");
  return label || fallback;
}

export function readOrderVariantChoices(raw: unknown): OrderVariantChoice[] {
  if (!Array.isArray(raw)) return [];
  const choices: OrderVariantChoice[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const value = item as Record<string, unknown>;
    const groupName = String(value.groupName ?? "").trim();
    const option = String(value.option ?? "").trim();
    if (!groupName || !option) continue;
    choices.push({ groupName, option, image: variantImageUrl(value.image) });
  }
  return choices;
}

/** Nome do catálogo mais o rótulo das opções. Não repete se o rótulo já está no nome. */
export function orderLineNameWithVariants(baseName: string, selectedVariants: SelectedVariant[]): string {
  const base = baseName.trim() || "Produto";
  const label = buildVariantLabel(selectedVariants);
  if (!label || base.includes(label)) return base;
  return `${base} - ${label}`;
}

/** Marca ou tira uma opção, respeitando o máximo do grupo. */
export function toggleVariantOption(
  groups: VariantGroup[],
  selected: SelectedVariant[],
  groupName: string,
  optionLabel: string,
): SelectedVariant[] {
  const group = groups.find((item) => item.name === groupName);
  if (!group) return selected;
  const option = group.options.find((item) => item.label === optionLabel);
  if (!option) return selected;
  const max = group.maxSelect > 0 ? group.maxSelect : 1;
  const current = selected.filter((item) => item.groupName === group.name);
  const others = selected.filter((item) => item.groupName !== group.name);
  const already = current.some((item) => item.option === option.label);
  let nextLabels: string[];
  if (already) {
    nextLabels = current.filter((item) => item.option !== option.label).map((item) => item.option);
  } else if (max <= 1) {
    nextLabels = [option.label];
  } else if (current.length >= max) {
    return selected;
  } else {
    nextLabels = [...current.map((item) => item.option), option.label];
  }
  const picked = nextLabels.map((label) => {
    const match = group.options.find((item) => item.label === label);
    return { groupName: group.name, option: label, image: match?.image ?? null };
  });
  return [...others, ...picked];
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
