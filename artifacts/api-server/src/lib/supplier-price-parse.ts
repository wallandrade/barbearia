import { identifySupplierProduct, type ProductIdentity } from "./supplier-price-match";

export const SUPPLIER_PRICE_USER_AGENT = "YuryImportsSupplierPriceBot/1.0 (+https://www.yury-imports.com)";
export const SUPPLIER_PRICE_TIMEOUT_MS = 20_000;

export type QuantityTier = { min: number; max: number | null; amount: number };

export type ParsedSupplierOffer = {
  ok: true;
  name: string;
  url: string | null;
  sku: string | null;
  priceUsd: number | null;
  localPrice: number | null;
  localCurrency: string | null;
  tiers: QuantityTier[];
  inStock: boolean;
  stockQty: number | null;
  image: string | null;
};

export type SupplierParseResult = ParsedSupplierOffer | { ok: false; error: string };

export type SupplierParserType =
  | "woocommerce_store"
  | "bypharmacon_catalog"
  | "json_ld"
  | "atacadobrasil_html"
  | "unsupported";

type WooProduct = {
  name?: string;
  permalink?: string;
  sku?: string;
  slug?: string;
  is_in_stock?: boolean;
  description?: string;
  short_description?: string;
  prices?: {
    price?: string | number;
    currency_minor_unit?: number;
    currency_code?: string;
    currency_prefix?: string;
    currency_symbol?: string;
  };
  images?: Array<{ src?: string }>;
};

function decode(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cloudflareBlockReason(status: number, body: string): string | null {
  const low = body.slice(0, 8000).toLowerCase();
  const title = body.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || "";
  const challenge = low.includes("just a moment")
    || low.includes("cf-browser-verification")
    || low.includes("cdn-cgi/challenge")
    || low.includes("cf-mitigated")
    || low.includes("attention required");
  if (challenge) return `desafio Cloudflare/captcha${title ? ` (${decode(title)})` : ""}`;
  if ((status === 403 || status === 429 || status === 503) && (low.includes("cloudflare") || low.includes("captcha"))) {
    return `bloqueio HTTP ${status}${title ? ` (${decode(title)})` : ""}`;
  }
  return null;
}

function brlAmount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const text = raw.replace(/[^\d,.]/g, "");
  if (!text) return null;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function firstBrl(text: string): number | null {
  const match = text.match(/R\$\s*([\d.]+,\d{2}|\d+(?:\.\d+)?)/);
  return match ? brlAmount(match[1]) : null;
}

export function wooPrice(prices: WooProduct["prices"]): { amount: number | null; currency: string | null } {
  if (!prices) return { amount: null, currency: null };
  const raw = prices.price;
  if (raw == null || raw === "" || raw === "0" || raw === 0) {
    return { amount: null, currency: prices.currency_code || null };
  }
  const minor = Number(prices.currency_minor_unit ?? 2);
  const amount = Number(raw) / 10 ** (Number.isFinite(minor) ? minor : 2);
  return { amount: Number.isFinite(amount) ? amount : null, currency: prices.currency_code || null };
}

function packIsFour(text: string): boolean | null {
  const folded = text.toLowerCase().replace(/\s+/g, " ");
  if (/\b(4|04|quatro)\s*(x\s*)?(frascos?|vials?|ampolas?|ampollas?|unidades?)\b|\b4x\s*15|\b04\s*vial|\bkit\s*(com\s*)?4\b|apresenta[cç][aã]o:\s*4\s*ampolas/.test(folded)) {
    return true;
  }
  if (/\b(1|01|uma?)\s*(frasco|vial|ampola|ampolla|unidade)\b|apresenta[cç][aã]o:\s*1\s*ampola/.test(folded)) {
    return false;
  }
  return null;
}

export function parseWooCommerceStore(body: string, target?: { url?: string | null; sku?: string | null }): SupplierParseResult {
  let items: WooProduct[];
  try {
    const parsed = JSON.parse(body) as unknown;
    items = Array.isArray(parsed) ? parsed as WooProduct[] : [];
  } catch {
    return { ok: false, error: "Resposta WooCommerce não é JSON." };
  }
  const slug = String(target?.url || "").split("/").filter(Boolean).pop()?.toLowerCase() || "";
  const sku = String(target?.sku || "").trim().toLowerCase();
  const ranked = items.filter((item) => {
    const itemSku = String(item.sku || "").trim().toLowerCase();
    const permalink = String(item.permalink || "").toLowerCase();
    if (sku && itemSku === sku) return true;
    if (slug && (permalink.includes(`/${slug}`) || String(item.slug || "").toLowerCase() === slug)) return true;
    return !sku && !slug;
  });
  const pool = ranked.length ? ranked : [];
  if (!pool.length) return { ok: false, error: "Produto não encontrado na Store API." };
  const inStock = pool.filter((item) => item.is_in_stock);
  const four = (inStock.length ? inStock : pool).find((item) => {
    const text = `${item.name || ""} ${item.short_description || ""} ${item.description || ""}`;
    return packIsFour(decode(text)) !== false;
  }) || (inStock[0] || pool[0]);
  if (!four) return { ok: false, error: "Produto não encontrado na Store API." };
  const money = wooPrice(four.prices);
  if (money.currency && money.currency !== "USD" && money.amount != null) {
    return { ok: false, error: `Moeda ${money.currency} não é USD.` };
  }
  return {
    ok: true,
    name: decode(String(four.name || "")),
    url: four.permalink || target?.url || null,
    sku: four.sku || null,
    priceUsd: money.amount,
    localPrice: null,
    localCurrency: null,
    tiers: [],
    inStock: Boolean(four.is_in_stock),
    stockQty: null,
    image: four.images?.[0]?.src || null,
  };
}

export function parseBypharmaconCatalog(body: string, target?: { url?: string | null; sku?: string | null }): SupplierParseResult {
  let products: Array<Record<string, unknown>>;
  try {
    const parsed = JSON.parse(body) as { products?: Array<Record<string, unknown>> };
    products = parsed.products || [];
  } catch {
    return { ok: false, error: "Catálogo ByPharmacon não é JSON." };
  }
  const sku = String(target?.sku || "").trim();
  const handle = String(target?.url || "").split("/").filter(Boolean).pop()?.toLowerCase() || "";
  const hit = products.find((product) => {
    if (sku && String(product.sku || "") === sku) return true;
    return handle && String(product.handle || "").toLowerCase() === handle;
  });
  if (!hit) return { ok: false, error: "Produto não encontrado no catálogo." };
  const retail = hit.priceRetail == null ? null : Number(hit.priceRetail);
  const tiers = Array.isArray(hit.priceTiersUSD)
    ? (hit.priceTiersUSD as Array<Record<string, unknown>>).map((tier) => ({
      min: Number(tier.min_quantity ?? tier.min ?? 1),
      max: tier.max_quantity == null && tier.max == null ? null : Number(tier.max_quantity ?? tier.max),
      amount: Number(tier.amount),
    })).filter((tier) => Number.isFinite(tier.amount))
    : [];
  const images = Array.isArray(hit.images) ? hit.images : [];
  return {
    ok: true,
    name: String(hit.name || ""),
    url: hit.handle ? `https://bypharmacon.com/produtos/${hit.handle}` : target?.url || null,
    sku: hit.sku == null ? null : String(hit.sku),
    priceUsd: Number.isFinite(retail) ? retail : (tiers[0]?.amount ?? null),
    localPrice: null,
    localCurrency: null,
    tiers,
    inStock: Boolean(hit.inStock),
    stockQty: hit.stock == null ? null : Number(hit.stock),
    image: typeof images[0] === "string" ? images[0] : null,
  };
}

function readJsonLdProduct(html: string): Record<string, unknown> | null {
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of blocks) {
    const raw = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "").trim();
    try {
      const data = JSON.parse(raw) as unknown;
      const list = Array.isArray(data) ? data : [data];
      for (const item of list) {
        if (item && typeof item === "object" && (item as { "@type"?: string })["@type"] === "Product") {
          return item as Record<string, unknown>;
        }
      }
    } catch {
      // próximo bloco
    }
  }
  return null;
}

export function parseJsonLdProduct(html: string, pageUrl: string | null): SupplierParseResult {
  const block = cloudflareBlockReason(200, html);
  if (block) return { ok: false, error: block };
  const product = readJsonLdProduct(html);
  if (!product) return { ok: false, error: "JSON-LD do produto não encontrado." };
  const offer = (product.offers && typeof product.offers === "object" ? product.offers : {}) as Record<string, unknown>;
  const price = offer.price == null ? null : Number(offer.price);
  const currency = String(offer.priceCurrency || "USD");
  if (currency !== "USD") return { ok: false, error: `Moeda ${currency} não é USD.` };
  const text = decode(html);
  const images = Array.isArray(product.image) ? product.image : product.image ? [product.image] : [];
  const availability = String(offer.availability || "");
  const inStock = availability.endsWith("InStock") || /em estoque|en stock/i.test(text);
  return {
    ok: true,
    name: String(product.name || ""),
    url: pageUrl,
    sku: product.sku == null ? null : String(product.sku),
    priceUsd: Number.isFinite(price) ? price : null,
    localPrice: firstBrl(text),
    localCurrency: firstBrl(text) == null ? null : "BRL",
    tiers: [],
    inStock,
    stockQty: null,
    image: typeof images[0] === "string" ? images[0] : null,
  };
}

export function atacadoBrasilUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (!parsed.hostname.endsWith("atacadobrasilpy.com")) return true;
    return !parsed.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

export function parseAtacadoBrasilHtml(html: string, pageUrl: string | null): SupplierParseResult {
  if (pageUrl && !atacadoBrasilUrlAllowed(pageUrl)) {
    return { ok: false, error: "URL da Atacado Brasil não pode usar /api/." };
  }
  const block = cloudflareBlockReason(200, html);
  if (block) return { ok: false, error: block };
  const embedded = html.match(/\\?"id\\?":(\d+),\\?"p\\?":\[([0-9.,]+)\],\\?"q\\?":(\d+),\\?"n\\?":\\?"(.*?)\\?"/);
  const tiersRaw = embedded ? embedded[2].split(",").map(Number) : [];
  const stockQty = embedded ? Number(embedded[3]) : null;
  const name = embedded ? decode(embedded[4]) : (html.match(/property=["']og:title["'][^>]*content=["']([^"']+)/i)?.[1] || "");
  const image = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)/i)?.[1] || null;
  const text = decode(html);
  const sku = text.match(/SKU\s*(\d+)/i)?.[1] || null;
  const retail = tiersRaw[0] ?? brlAmount(text.match(/Varejo\s+U\$\s*([\d.,]+)/i)?.[1]?.replace(".", "").replace(",", "."));
  const local = firstBrl(text);
  const tiers = tiersRaw.length >= 4
    ? [
      { min: 1, max: 4, amount: tiersRaw[0] },
      { min: 5, max: 9, amount: tiersRaw[1] },
      { min: 10, max: 49, amount: tiersRaw[2] },
      { min: 50, max: null, amount: tiersRaw[3] },
    ]
    : [];
  if (retail == null || !Number.isFinite(retail)) return { ok: false, error: "Preço não encontrado no HTML." };
  return {
    ok: true,
    name: decode(name),
    url: pageUrl,
    sku,
    priceUsd: retail,
    localPrice: local,
    localCurrency: local == null ? null : "BRL",
    tiers,
    inStock: /em estoque/i.test(text) || (stockQty != null && stockQty > 0),
    stockQty,
    image,
  };
}

export function parseSupplierPage(input: {
  parserType: string;
  body: string;
  status: number;
  url?: string | null;
  sku?: string | null;
}): SupplierParseResult {
  const blocked = cloudflareBlockReason(input.status, input.body);
  if (blocked) return { ok: false, error: blocked };
  if (input.status < 200 || input.status >= 300) return { ok: false, error: `HTTP ${input.status}` };
  if (input.parserType === "woocommerce_store") return parseWooCommerceStore(input.body, { url: input.url, sku: input.sku });
  if (input.parserType === "bypharmacon_catalog") return parseBypharmaconCatalog(input.body, { url: input.url, sku: input.sku });
  if (input.parserType === "json_ld") return parseJsonLdProduct(input.body, input.url || null);
  if (input.parserType === "atacadobrasil_html") return parseAtacadoBrasilHtml(input.body, input.url || null);
  return { ok: false, error: "Parser não suportado." };
}

export type CatalogRow = {
  rawName: string;
  url: string | null;
  sku: string | null;
  priceUsd: number | null;
  localPrice: number | null;
  localCurrency: string | null;
  image: string | null;
  inStock: boolean;
  stockQty: number | null;
  identity: ProductIdentity | null;
  exclusionReason: string | null;
};

function rowFromIdentity(input: {
  name: string;
  extra?: string | null;
  category?: string | null;
  url: string | null;
  sku: string | null;
  priceUsd: number | null;
  localPrice: number | null;
  localCurrency: string | null;
  image: string | null;
  inStock: boolean;
  stockQty: number | null;
}): CatalogRow | null {
  const identity = identifySupplierProduct(input.name, input.extra, input.category);
  if (!identity.ok && identity.reason !== "anabolizante") return null;
  return {
    rawName: input.name.slice(0, 255),
    url: input.url,
    sku: input.sku,
    priceUsd: input.priceUsd,
    localPrice: input.localPrice,
    localCurrency: input.localCurrency,
    image: input.image,
    inStock: input.inStock,
    stockQty: input.stockQty,
    identity: identity.ok ? identity.identity : null,
    exclusionReason: identity.ok ? null : identity.detail,
  };
}

export function readCatalogItems(parserType: string, body: string, pageUrl: string | null): CatalogRow[] {
  if (parserType === "woocommerce_store") {
    let items: WooProduct[] = [];
    try {
      const parsed = JSON.parse(body) as unknown;
      items = Array.isArray(parsed) ? parsed as WooProduct[] : [];
    } catch {
      return [];
    }
    return items.flatMap((item) => {
      const categories = Array.isArray((item as WooProduct & { categories?: Array<{ name?: string }> }).categories)
        ? (item as WooProduct & { categories?: Array<{ name?: string }> }).categories!.map((category) => category.name || "").join(" ")
        : "";
      const money = wooPrice(item.prices);
      const found = rowFromIdentity({
        name: decode(String(item.name || "")),
        extra: decode(`${item.short_description || ""} ${item.description || ""}`),
        category: categories,
        url: item.permalink || null,
        sku: item.sku || null,
        priceUsd: money.currency && money.currency !== "USD" ? null : money.amount,
        localPrice: null,
        localCurrency: null,
        image: item.images?.[0]?.src || null,
        inStock: Boolean(item.is_in_stock),
        stockQty: null,
      });
      return found ? [found] : [];
    });
  }
  if (parserType === "bypharmacon_catalog") {
    let products: Array<Record<string, unknown>> = [];
    try {
      products = (JSON.parse(body) as { products?: Array<Record<string, unknown>> }).products || [];
    } catch {
      return [];
    }
    return products.flatMap((product) => {
      const handle = String(product.handle || "");
      const found = rowFromIdentity({
        name: String(product.name || ""),
        extra: `${product.brand || ""} ${product.description || ""} ${product.group || ""}`,
        category: String(product.group || product.category || ""),
        url: handle ? `https://bypharmacon.com/produtos/${handle}` : null,
        sku: product.sku == null ? null : String(product.sku),
        priceUsd: product.priceRetail == null ? null : Number(product.priceRetail),
        localPrice: null,
        localCurrency: null,
        image: Array.isArray(product.images) && typeof product.images[0] === "string" ? product.images[0] : null,
        inStock: Boolean(product.inStock),
        stockQty: product.stock == null ? null : Number(product.stock),
      });
      return found ? [found] : [];
    });
  }
  if (parserType === "json_ld" || parserType === "atacadobrasil_html") {
    const parsed = parserType === "json_ld" ? parseJsonLdProduct(body, pageUrl) : parseAtacadoBrasilHtml(body, pageUrl);
    if (!parsed.ok) {
      const blocked = identifySupplierProduct(body.slice(0, 500));
      if (!blocked.ok && blocked.reason === "anabolizante") {
        return [{
          rawName: "bloqueado",
          url: pageUrl,
          sku: null,
          priceUsd: null,
          localPrice: null,
          localCurrency: null,
          image: null,
          inStock: false,
          stockQty: null,
          identity: null,
          exclusionReason: blocked.detail,
        }];
      }
      return [];
    }
    const found = rowFromIdentity({
      name: parsed.name,
      extra: body.replace(/<[^>]+>/g, " ").slice(0, 2000),
      url: parsed.url,
      sku: parsed.sku,
      priceUsd: parsed.priceUsd,
      localPrice: parsed.localPrice,
      localCurrency: parsed.localCurrency,
      image: parsed.image,
      inStock: parsed.inStock,
      stockQty: parsed.stockQty,
    });
    return found ? [found] : [];
  }
  return [];
}

export function sitemapProductUrls(xml: string, hostname: string): string[] {
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1].trim());
  const found: string[] = [];
  for (const url of urls) {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.endsWith(hostname.replace(/^www\./, "")) && parsed.hostname !== hostname) continue;
      if (parsed.pathname.startsWith("/api/")) continue;
      if (!/\/produto\/|\/p\/|\/product\//.test(parsed.pathname)) continue;
      found.push(parsed.toString());
    } catch {
      // ignora
    }
    if (found.length >= 12) break;
  }
  return found;
}
