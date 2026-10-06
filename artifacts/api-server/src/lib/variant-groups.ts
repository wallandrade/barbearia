export type ProductVariantOption = {
  label: string;
  image: string | null;
};

export type ProductVariantGroup = {
  name: string;
  options: ProductVariantOption[];
  /** Quantas opções o cliente pode marcar neste grupo. 1 = escolha única. */
  maxSelect: number;
  /** swap: uma foto. fixed: foto do produto. all: a página junta as fotos; o pedido fica com a do produto. */
  imageMode: VariantImageMode;
};

export type VariantImageMode = "swap" | "fixed" | "all";

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
      const maxSelect = Math.min(readMaxSelect(item?.maxSelect), options.length);
      return { name, options, maxSelect, imageMode: readImageMode(item?.imageMode, item?.swapImage) };
    })
    .filter((group): group is ProductVariantGroup => Boolean(group));
}

export function acceptSelectedVariants(
  groups: ProductVariantGroup[],
  raw: SelectedVariantRef[],
): { ok: true; selected: SelectedVariantRef[] } | { ok: false; message: string } {
  if (groups.length === 0) return { ok: true, selected: raw };

  const selected: SelectedVariantRef[] = [];
  for (const group of groups) {
    const max = group.maxSelect > 0 ? group.maxSelect : 1;
    const seen = new Set<string>();
    for (const item of raw) {
      if (String(item.groupName || "").trim() !== group.name) continue;
      const optionLabel = String(item.option || "").trim();
      if (!optionLabel || seen.has(optionLabel)) continue;
      if (!group.options.some((option) => option.label === optionLabel)) continue;
      seen.add(optionLabel);
    }
    if (seen.size !== max) {
      return {
        ok: false,
        message: max === 1
          ? `Selecione uma opção em ${group.name}.`
          : `Selecione ${max} opções em ${group.name}.`,
      };
    }
    for (const optionLabel of seen) {
      selected.push({ groupName: group.name, option: optionLabel });
    }
  }
  return { ok: true, selected };
}

export type SelectedVariantSnapshot = {
  groupName: string;
  option: string;
  image: string | null;
};

/** Foto de cada opção escolhida, para o resumo do pedido. A foto da linha continua em resolveLineImage. */
export function snapshotSelectedVariants(
  groups: ProductVariantGroup[],
  selected: Array<SelectedVariantRef & { image?: unknown }>,
): SelectedVariantSnapshot[] {
  const snapshots: SelectedVariantSnapshot[] = [];
  for (const picked of selected) {
    const groupName = String(picked.groupName || "").trim();
    const optionLabel = String(picked.option || "").trim();
    if (!groupName || !optionLabel) continue;
    const stored = variantImageUrl(picked.image);
    const group = groups.find((item) => item.name === groupName);
    const option = group?.options.find((item) => item.label === optionLabel);
    snapshots.push({
      groupName,
      option: optionLabel,
      image: stored || option?.image || null,
    });
  }
  return snapshots;
}

export function buildVariantLabel(variants: SelectedVariantRef[]): string {
  const order: string[] = [];
  const byName = new Map<string, string[]>();
  for (const item of variants) {
    const groupName = String(item.groupName || "").trim();
    const option = String(item.option || "").trim();
    if (!groupName || !option) continue;
    const current = byName.get(groupName);
    if (!current) {
      byName.set(groupName, [option]);
      order.push(groupName);
      continue;
    }
    current.push(option);
  }
  return order.map((groupName) => `${groupName}: ${(byName.get(groupName) ?? []).join(", ")}`).join(" / ");
}

export type OrderEditLineVariants =
  | { ok: true; name: string; image: string | null; selectedVariants: SelectedVariantSnapshot[] }
  | { ok: false; message: string };

function readStoredLineImage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || value.startsWith("data:")) return null;
  return value;
}

function readSentVariantRefs(raw: unknown): Array<SelectedVariantRef & { image?: unknown }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const value = item as Record<string, unknown>;
      const groupName = String(value?.groupName ?? "").trim();
      const option = String(value?.option ?? "").trim();
      if (!groupName || !option) return null;
      return { groupName, option, image: value?.image };
    })
    .filter((item): item is SelectedVariantRef & { image?: unknown } => Boolean(item));
}

/** Edição do pedido: mesma regra do checkout. Sem o máximo, recusa. Sem catálogo, mantém o que já estava gravado. */
export function resolveOrderEditLineVariants(input: {
  hasCatalog: boolean;
  catalogGroupsRaw: unknown;
  catalogName?: string | null;
  catalogImage?: string | null;
  sentName: string;
  sentImage?: unknown;
  sentVariants: unknown;
}): OrderEditLineVariants {
  const sent = readSentVariantRefs(input.sentVariants);
  const groups = input.hasCatalog ? parseVariantGroups(input.catalogGroupsRaw) : [];
  if (input.hasCatalog && groups.length > 0) {
    const accepted = acceptSelectedVariants(groups, sent);
    if (!accepted.ok) return accepted;
    const snapshots = snapshotSelectedVariants(groups, accepted.selected);
    const label = buildVariantLabel(accepted.selected);
    const rawName = String(input.catalogName || input.sentName || "Produto").trim() || "Produto";
    const name = label && !rawName.includes(label) ? `${rawName} - ${label}` : rawName;
    return {
      ok: true,
      name,
      image: resolveLineImage(input.catalogImage, input.catalogGroupsRaw, accepted.selected),
      selectedVariants: snapshots,
    };
  }
  if (input.hasCatalog) {
    const rawName = String(input.catalogName || input.sentName || "Produto").trim() || "Produto";
    return {
      ok: true,
      name: rawName,
      image: resolveLineImage(input.catalogImage, null, []),
      selectedVariants: [],
    };
  }
  return {
    ok: true,
    name: String(input.sentName || "Produto").trim() || "Produto",
    image: readStoredLineImage(input.sentImage),
    selectedVariants: snapshotSelectedVariants([], sent),
  };
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
    if (!group || group.imageMode !== "swap") continue;
    const option = group.options.find((item) => item.label === optionLabel);
    if (option?.image) return option.image;
  }
  const fallback = String(productImage || "").trim();
  return fallback || null;
}
