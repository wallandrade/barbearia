export type DoseUnit = "mg" | "ui";
export type PackForm = "frasco" | "caneta" | "comprimido";

export type ProductIdentity = {
  brandKey: string;
  brandLabel: string;
  doseValue: number;
  doseUnit: DoseUnit;
  packQty: number;
  packForm: PackForm;
  fingerprint: string;
  displayName: string;
  confidence: number;
};

export type IdentityResult =
  | { ok: true; identity: ProductIdentity }
  | { ok: false; reason: "anabolizante" | "incompleto"; detail: string };

const ANABOLIC_TERMS: Array<[RegExp, string]> = [
  [/\btestosteron\w*/, "testosterona"],
  [/\btrembolon\w*/, "trembolona"],
  [/\btrenbolon\w*/, "trembolona"],
  [/\bnandrolon\w*/, "nandrolona"],
  [/\bdeca\b/, "deca"],
  [/\bboldenon\w*/, "boldenona"],
  [/\bstanozolol\b/, "stanozolol"],
  [/\bwinstrol\b/, "winstrol"],
  [/\boxandrolon\w*/, "oxandrolona"],
  [/\bboximetolon\w*/, "oximetolona"],
  [/\bhemogenin\b/, "hemogenin"],
  [/\bmetandrostenolon\w*/, "metandrostenolona"],
  [/\bmetandienon\w*/, "metandrostenolona"],
  [/\bdianabol\b/, "dianabol"],
  [/\bmasteron\b/, "masteron"],
  [/\bdrostanolon\w*/, "drostanolona"],
  [/\bprimobolan\b/, "primobolan"],
  [/\bmetenolon\w*/, "primobolan"],
  [/\bdurateston\b/, "durateston"],
  [/\bsustanon\b/, "durateston"],
  [/\bsarms?\b/, "SARM"],
  [/\bostarina\b/, "SARM"],
  [/\bligandrol\b/, "SARM"],
  [/\bcardarina\b/, "SARM"],
  [/\bandarina\b/, "SARM"],
  [/\bibutamora\b/, "SARM"],
  [/\b(rad[\s-]?140|mk[\s-]?677|mk677|lgd[\s-]?4033|yk[\s-]?11)\b/, "SARM"],
];

export function foldSupplierName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&amp;/g, " ")
    .replace(/[^a-z0-9./+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function anabolicExclusion(name: string, category?: string | null): string | null {
  const text = foldSupplierName(`${name} ${category || ""}`);
  if (/\banabol/.test(text) || /\besteroid/.test(text)) return "Categoria de anabolizante ou esteroide.";
  for (const [pattern, label] of ANABOLIC_TERMS) {
    if (pattern.test(text)) return `Anabolizante ou esteroide: ${label}.`;
  }
  return null;
}

function brandOf(text: string): { key: string; label: string } | null {
  if (/\btirzec\b/.test(text)) return { key: "tirzec", label: "Tirzec" };
  const tg = /(?:^|\s)t\.?\s*g\.?(?:\s|$)/.test(text)
    || /tirzepatid[ae]\s+t\.?\s*g/.test(text)
    || (/\bindufar\b/.test(text) && (/tirzepatid/.test(text) || /(?:^|\s)t\.?\s*g\.?(?:\s|$)/.test(text) || /\btg\b/.test(text)));
  if (tg || (/\bindufar\b/.test(text) && /\b15\s*mg\b/.test(text))) return { key: "tg", label: "TG" };
  if (/\bretatrutid[ae]\b/.test(text)) return { key: "retatrutida", label: "Retatrutida" };
  if (/\bsemaglutid[ae]\b/.test(text)) return { key: "semaglutida", label: "Semaglutida" };
  if (/\bbotox\b/.test(text) || /toxina botulin/.test(text)) return { key: "botox", label: "Botox" };
  return null;
}

function doseOf(text: string): { value: number; unit: DoseUnit } | null {
  const mg = text.match(/(\d+(?:[.,]\d+)?)\s*mg\b/);
  if (mg) return { value: Number(mg[1].replace(",", ".")), unit: "mg" };
  const ui = text.match(/(\d+(?:[.,]\d+)?)\s*(?:ui|u\.i\.)\b/);
  if (ui) return { value: Number(ui[1].replace(",", ".")), unit: "ui" };
  return null;
}

function packOf(text: string): { qty: number; form: PackForm } | null {
  const matches = [...text.matchAll(/\b(\d+)\s*(frascos?|ampolas?|ampollas?|viales?|vials?|canetas?|comprimidos?|capsulas?)\b/g)];
  if (!matches.length) return null;
  const parsed = matches.map((match) => {
    const word = match[2];
    const form: PackForm = /caneta/.test(word) ? "caneta" : /comprimido|capsula/.test(word) ? "comprimido" : "frasco";
    return { qty: Number(match[1]), form };
  });
  const qty = new Set(parsed.map((item) => item.qty));
  const form = new Set(parsed.map((item) => item.form));
  if (qty.size !== 1 || form.size !== 1) return null;
  return parsed[0];
}

const FORM_LABEL: Record<PackForm, [string, string]> = {
  frasco: ["frasco", "frascos"],
  caneta: ["caneta", "canetas"],
  comprimido: ["comprimido", "comprimidos"],
};

export function identifySupplierProduct(name: string, extra?: string | null, category?: string | null): IdentityResult {
  const blocked = anabolicExclusion(name, category) || anabolicExclusion(extra || "", category);
  if (blocked) return { ok: false, reason: "anabolizante", detail: blocked };
  const text = foldSupplierName(`${name} ${extra || ""}`);
  const brand = brandOf(text);
  const dose = doseOf(text);
  const pack = packOf(text);
  if (!brand || !dose || !pack || !Number.isFinite(dose.value) || pack.qty < 1) {
    return { ok: false, reason: "incompleto", detail: "Falta marca, dose ou quantidade da embalagem." };
  }
  const formLabel = pack.qty === 1 ? FORM_LABEL[pack.form][0] : FORM_LABEL[pack.form][1];
  const doseLabel = Number.isInteger(dose.value) ? String(dose.value) : String(dose.value);
  const fingerprint = `${brand.key}|${dose.value}|${dose.unit}|${pack.qty}|${pack.form}`;
  return {
    ok: true,
    identity: {
      brandKey: brand.key,
      brandLabel: brand.label,
      doseValue: dose.value,
      doseUnit: dose.unit,
      packQty: pack.qty,
      packForm: pack.form,
      fingerprint,
      displayName: `${brand.label} ${doseLabel} ${dose.unit} ${pack.qty} ${formLabel}`,
      confidence: 0.92,
    },
  };
}

export type DealOffer = {
  siteId: string;
  siteName: string;
  url: string | null;
  priceUsd: number | null;
  localPrice: number | null;
  localCurrency: string | null;
  inStock: boolean;
  image: string | null;
  collectedAt: string | null;
  packQty: number;
  source: "auto" | "manual";
  rawName: string;
};

export type DealGroup = {
  fingerprint: string;
  displayName: string;
  confidence: number;
  status: "auto" | "confirmed" | "rejected";
  pinned: boolean;
  offers: DealOffer[];
};

export type DealCard = {
  fingerprint: string;
  name: string;
  image: string | null;
  badge: "auto" | "confirmado";
  cheapestStore: string | null;
  priceUsd: number | null;
  localPrice: number | null;
  localCurrency: string | null;
  storeCount: number;
  gapUsd: number | null;
  nextGapUsd: number | null;
  tieWith: string | null;
  tied: boolean;
  collectedAt: string | null;
  url: string | null;
  offers: Array<DealOffer & { position: number | null; label: "ok" | "fora_de_estoque" }>;
};

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function selectCheapestDeals(groups: DealGroup[], input: { seed: string; limit?: number }): DealCard[] {
  const limit = input.limit ?? 10;
  const ready = groups
    .filter((group) => group.status !== "rejected")
    .map((group) => toCard(group))
    .filter((card): card is DealCard => card != null && card.storeCount >= 2);
  const pinned = ready.filter((card) => groups.find((group) => group.fingerprint === card.fingerprint)?.pinned);
  const rest = ready.filter((card) => !pinned.includes(card));
  pinned.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  rest.sort((a, b) => hashSeed(`${input.seed}:${a.fingerprint}`) - hashSeed(`${input.seed}:${b.fingerprint}`) || a.name.localeCompare(b.name, "pt-BR"));
  return [...pinned, ...rest].slice(0, limit);
}

function toCard(group: DealGroup): DealCard | null {
  const ranked = rankPackage(group.offers);
  const inStock = ranked.filter((offer) => offer.label === "ok" && offer.priceUsd != null);
  const inStockSites = new Set(inStock.map((offer) => offer.siteId));
  if (inStockSites.size < 2) return null;
  const cheapest = inStock[0];
  const second = inStock[1];
  if (!cheapest || cheapest.priceUsd == null || !second || second.priceUsd == null) return null;
  const cheapestPrice = cheapest.priceUsd;
  const tied = Math.abs(second.priceUsd - cheapestPrice) < 0.009;
  const nextDifferent = inStock.find((offer) => offer.priceUsd != null && Math.abs(offer.priceUsd - cheapestPrice) >= 0.009);
  return {
    fingerprint: group.fingerprint,
    name: group.displayName,
    image: cheapest.image || group.offers.find((offer) => offer.image)?.image || null,
    badge: group.status === "confirmed" || group.offers.some((offer) => offer.source === "manual") ? "confirmado" : "auto",
    cheapestStore: cheapest.siteName,
    priceUsd: cheapestPrice,
    localPrice: cheapest.localPrice,
    localCurrency: cheapest.localCurrency,
    storeCount: new Set(ranked.map((offer) => offer.siteId)).size,
    gapUsd: tied ? 0 : Number((second.priceUsd - cheapestPrice).toFixed(2)),
    nextGapUsd: nextDifferent?.priceUsd != null ? Number((nextDifferent.priceUsd - cheapestPrice).toFixed(2)) : null,
    tieWith: tied ? second.siteName : null,
    tied,
    collectedAt: cheapest.collectedAt,
    url: cheapest.url,
    offers: ranked,
  };
}

function rankPackage(offers: DealOffer[]): DealCard["offers"] {
  const rows = offers.map((offer) => ({ ...offer, position: null as number | null, label: (offer.inStock && offer.priceUsd != null ? "ok" : "fora_de_estoque") as "ok" | "fora_de_estoque" }));
  rows.sort((a, b) => {
    const bucketA = a.label === "ok" ? 0 : 1;
    const bucketB = b.label === "ok" ? 0 : 1;
    if (bucketA !== bucketB) return bucketA - bucketB;
    return (a.priceUsd ?? Number.POSITIVE_INFINITY) - (b.priceUsd ?? Number.POSITIVE_INFINITY) || a.siteName.localeCompare(b.siteName, "pt-BR");
  });
  let index = 0;
  let lastPrice: number | null = null;
  let lastPosition = 0;
  for (const row of rows) {
    if (row.label !== "ok" || row.priceUsd == null) continue;
    index += 1;
    if (lastPrice != null && Math.abs(row.priceUsd - lastPrice) < 0.009) {
      row.position = lastPosition;
      continue;
    }
    row.position = index;
    lastPosition = index;
    lastPrice = row.priceUsd;
  }
  return rows;
}

export type StoredCatalogItem = {
  siteId: string;
  siteName: string;
  url: string | null;
  sku: string | null;
  rawName: string;
  image: string | null;
  priceUsd: number | null;
  localPrice: number | null;
  localCurrency: string | null;
  inStock: boolean;
  fingerprint: string | null;
  exclusionReason: string | null;
  collectedAt: string | null;
};

export type StoredManualMap = {
  siteId: string;
  siteName: string;
  url: string | null;
  sku: string | null;
  displayName: string;
  image: string | null;
  priceUsd: number | null;
  localPrice: number | null;
  localCurrency: string | null;
  inStock: boolean;
  collectedAt: string | null;
  active: boolean;
};

export type StoredGroup = {
  fingerprint: string;
  displayName: string;
  confidence: number;
  status: "auto" | "confirmed" | "rejected";
  pinned: boolean;
  mergedInto: string | null;
};

/** Vínculo manual ganha do casamento automático. Anabolizante já vem sem fingerprint. */
export function groupCatalogOffers(input: {
  items: StoredCatalogItem[];
  maps: StoredManualMap[];
  saved: StoredGroup[];
}): DealGroup[] {
  const savedById = new Map(input.saved.map((group) => [group.fingerprint, group]));
  const offers = new Map<string, DealOffer[]>();
  const names = new Map<string, string>();
  const confidence = new Map<string, number>();

  const push = (fingerprint: string, displayName: string, offer: DealOffer, score: number) => {
    const list = offers.get(fingerprint) || [];
    if (list.some((item) => item.siteId === offer.siteId && item.url === offer.url)) return;
    list.push(offer);
    offers.set(fingerprint, list);
    if (!names.has(fingerprint)) names.set(fingerprint, displayName);
    confidence.set(fingerprint, Math.max(confidence.get(fingerprint) || 0, score));
  };

  for (const item of input.items) {
    if (!item.fingerprint || item.exclusionReason) continue;
    const saved = savedById.get(item.fingerprint);
    push(item.fingerprint, saved?.displayName || item.rawName, {
      siteId: item.siteId,
      siteName: item.siteName,
      url: item.url,
      priceUsd: item.priceUsd,
      localPrice: item.localPrice,
      localCurrency: item.localCurrency,
      inStock: item.inStock,
      image: item.image,
      collectedAt: item.collectedAt,
      packQty: Number(item.fingerprint.split("|")[3]) || 1,
      source: "auto",
      rawName: item.rawName,
    }, saved?.confidence || 0.92);
  }

  for (const map of input.maps) {
    if (!map.active) continue;
    const identity = identifySupplierProduct(map.displayName);
    if (!identity.ok) continue;
    const same = input.items.find((item) => item.siteId === map.siteId && ((map.url && item.url === map.url) || (map.sku && item.sku === map.sku)));
    push(identity.identity.fingerprint, identity.identity.displayName, {
      siteId: map.siteId,
      siteName: map.siteName,
      url: map.url || same?.url || null,
      priceUsd: same?.priceUsd ?? map.priceUsd,
      localPrice: same?.localPrice ?? map.localPrice,
      localCurrency: same?.localCurrency ?? map.localCurrency,
      inStock: same ? same.inStock : map.inStock,
      image: map.image || same?.image || null,
      collectedAt: same?.collectedAt || map.collectedAt,
      packQty: identity.identity.packQty,
      source: "manual",
      rawName: map.displayName,
    }, 1);
  }

  for (const [fingerprint, list] of [...offers.entries()]) {
    const saved = savedById.get(fingerprint);
    const target = saved?.mergedInto;
    if (!target || target === fingerprint) continue;
    const merged = offers.get(target) || [];
    offers.set(target, [...merged, ...list]);
    offers.delete(fingerprint);
    if (!names.has(target)) names.set(target, savedById.get(target)?.displayName || names.get(fingerprint) || target);
  }

  return [...offers.entries()].map(([fingerprint, list]) => {
    const saved = savedById.get(fingerprint);
    const manual = list.some((offer) => offer.source === "manual");
    return {
      fingerprint,
      displayName: saved?.displayName || names.get(fingerprint) || fingerprint,
      confidence: manual ? 1 : (saved?.confidence || confidence.get(fingerprint) || 0.92),
      status: saved?.status === "rejected" ? "rejected" : (manual || saved?.status === "confirmed" ? "confirmed" : "auto"),
      pinned: Boolean(saved?.pinned),
      offers: list,
    };
  });
}
