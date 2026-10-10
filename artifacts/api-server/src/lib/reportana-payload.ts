import { postPaymentInsuranceNotice } from "./checkout-insurance";

export type ReportanaOrderSource = {
  id: string;
  orderNumber: number | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientDocument?: string | null;
  addressCep?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  products: unknown;
  subtotal: string | number;
  shippingCost: string | number;
  discountAmount?: string | number | null;
  total: string | number;
  status: string;
  paymentMethod?: string | null;
  cardInstallments?: number | null;
  pixCode?: string | null;
  trackingCode?: string | null;
  envioecomBarcode?: string | null;
  superfreteTracking?: string | null;
  includeInsurance?: boolean | null;
  insurancePlan?: string | null;
  insuranceAmount?: string | number | null;
  createdAt: Date | string;
};

export type ReportanaPackageSource = {
  envioecomBarcode?: string | null;
  superfreteTracking?: string | null;
};

export type ReportanaAddress = {
  name: string;
  first_name: string;
  last_name: string;
  company: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  province_code: string;
  country: string;
  country_code: string;
  zip: string;
};

const PROVINCE_NAMES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export function toReportanaPhone(raw: string | null | undefined): string {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  digits = digits.replace(/^0+/, "");
  if (!digits) return "";
  return `+55${digits}`;
}

export function splitPersonName(full: string): { first: string; last: string } {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0]!, last: "" };
  return { first: parts[0]!, last: parts.slice(1).join(" ") };
}

export function formatReportanaDateTime(value: Date | string | null | undefined): string {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(safe);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || "00";
  let hour = pick("hour");
  if (hour === "24") hour = "00";
  return `${pick("year")}-${pick("month")}-${pick("day")} ${hour}:${pick("minute")}`;
}

export function reportanaPaymentStatus(status: string | null | undefined): "PAID" | "PENDING" | "NOT_PAID" {
  const value = String(status || "").trim().toLowerCase();
  if (value === "paid" || value === "completed") return "PAID";
  if (value === "cancelled" || value === "canceled" || value === "cancelado") return "NOT_PAID";
  return "PENDING";
}

export function reportanaPaymentMethod(method: string | null | undefined): "PIX" | "CREDIT_CARD" | "DEPOSIT" | "OTHER" {
  const value = String(method || "").trim().toLowerCase();
  if (value === "pix" || value === "whatsapp_pix") return "PIX";
  if (value.includes("card") || value === "credit_card") return "CREDIT_CARD";
  if (value.includes("deposit") || value.includes("deposito") || value.includes("depósito")) return "DEPOSIT";
  return "OTHER";
}

export function moneyAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function digitsOnly(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

function provinceName(code: string): string {
  const upper = code.trim().toUpperCase();
  return PROVINCE_NAMES[upper] || upper;
}

export function isCustomerTrackingCode(raw: string | null | undefined): boolean {
  const code = String(raw || "").trim();
  if (!code) return false;
  return !/^EC/i.test(code);
}

export function collectTrackingNumbers(
  order: Pick<ReportanaOrderSource, "trackingCode" | "envioecomBarcode" | "superfreteTracking">,
  packages: ReportanaPackageSource[],
): string {
  const codes: string[] = [];
  const push = (raw: string | null | undefined) => {
    const code = String(raw || "").trim();
    if (!isCustomerTrackingCode(code)) return;
    if (!codes.includes(code)) codes.push(code);
  };
  push(order.envioecomBarcode);
  push(order.trackingCode);
  push(order.superfreteTracking);
  for (const pkg of packages) {
    push(pkg.envioecomBarcode);
    push(pkg.superfreteTracking);
  }
  return codes.join(",");
}

function readProducts(raw: unknown): Array<Record<string, unknown>> {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

function variantTitle(item: Record<string, unknown>): string {
  const explicit = String(item.variantLabel ?? item.variant_title ?? "").trim();
  if (explicit) return explicit;
  const selected = item.selectedVariants;
  if (!Array.isArray(selected)) return "";
  return selected
    .map((entry) => {
      const row = entry as Record<string, unknown>;
      const option = String(row.option ?? "").trim();
      return option;
    })
    .filter(Boolean)
    .join(" / ");
}

function httpUrl(raw: unknown): string {
  const value = String(raw || "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  return "";
}

export function buildReportanaAddress(
  order: ReportanaOrderSource,
  phone: string,
  company = "",
): ReportanaAddress {
  const { first, last } = splitPersonName(order.clientName);
  const street = String(order.addressStreet || "").trim();
  const number = String(order.addressNumber || "").trim();
  const complement = String(order.addressComplement || "").trim();
  const address1 = [street, number, complement].filter(Boolean).join(", ");
  const provinceCode = String(order.addressState || "").trim().toUpperCase();
  return {
    name: String(order.clientName || "").trim(),
    first_name: first,
    last_name: last,
    company,
    phone,
    address1,
    address2: String(order.addressNeighborhood || "").trim(),
    city: String(order.addressCity || "").trim(),
    province: provinceName(provinceCode),
    province_code: provinceCode,
    country: "Brazil",
    country_code: "BR",
    zip: digitsOnly(order.addressCep),
  };
}

export function buildReportanaOrderPayload(
  order: ReportanaOrderSource,
  packages: ReportanaPackageSource[],
  storefrontOrigin: string,
): Record<string, unknown> {
  const phone = toReportanaPhone(order.clientPhone);
  const insuranceNotice = postPaymentInsuranceNotice({
    includeInsurance: order.includeInsurance,
    insurancePlan: order.insurancePlan,
    insuranceAmount: order.insuranceAmount,
  });
  const address = buildReportanaAddress(order, phone, insuranceNotice);
  const origin = storefrontOrigin.replace(/\/$/, "");
  const tracking = collectTrackingNumbers(order, packages);
  const lineItems = readProducts(order.products).map((item) => {
    const id = String(item.id || "").trim();
    const title = String(item.name || item.title || "").trim();
    const variant = variantTitle(item);
    const image = httpUrl(item.image || item.image_url);
    const row: Record<string, unknown> = {
      title,
      quantity: Math.max(0, Number(item.quantity) || 0),
      price: moneyAmount(item.price),
    };
    if (variant) row.variant_title = variant;
    if (image) row.image_url = image;
    if (id && origin) row.path = `${origin}/produto/${encodeURIComponent(id)}`;
    return row;
  });

  const installments = Number(order.cardInstallments);
  const payload: Record<string, unknown> = {
    reference_id: order.id,
    number: order.orderNumber != null ? String(order.orderNumber) : order.id,
    customer_name: String(order.clientName || "").trim(),
    customer_phone: phone,
    customer_email: String(order.clientEmail || "").trim(),
    billing_address: address,
    shipping_address: address,
    line_items: lineItems,
    currency: "BRL",
    total_price: moneyAmount(order.total),
    subtotal_price: moneyAmount(order.subtotal),
    delivery_price: moneyAmount(order.shippingCost),
    discount_price: moneyAmount(order.discountAmount),
    payment_status: reportanaPaymentStatus(order.status),
    payment_method: reportanaPaymentMethod(order.paymentMethod),
    original_created_at: formatReportanaDateTime(order.createdAt),
  };

  const document = digitsOnly(order.clientDocument);
  if (document) payload.customer_document = document;
  if (Number.isFinite(installments) && installments > 0) payload.installments = installments;
  const pix = String(order.pixCode || "").trim();
  if (pix) payload.billet_line = pix;
  if (tracking) payload.tracking_numbers = tracking;
  if (origin) payload.status_url = `${origin}/minha-conta/pedidos`;
  return payload;
}

export type ReportanaDraftSource = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  addressCep?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  products: unknown;
  subtotal: string | number;
  total: string | number;
  createdAt: Date | string;
  completedAt?: Date | string | null;
};

export function buildReportanaAbandonedCheckoutPayload(
  draft: ReportanaDraftSource,
  storefrontOrigin: string,
): Record<string, unknown> {
  const phone = toReportanaPhone(draft.clientPhone);
  const address = buildReportanaAddress(
    {
      ...draft,
      orderNumber: null,
      clientDocument: null,
      products: draft.products,
      subtotal: draft.subtotal,
      shippingCost: 0,
      total: draft.total,
      status: "pending",
      createdAt: draft.createdAt,
    },
    phone,
  );
  const origin = storefrontOrigin.replace(/\/$/, "");
  const lineItems = readProducts(draft.products).map((item) => {
    const id = String(item.id || "").trim();
    const title = String(item.name || item.title || "").trim();
    const variant = variantTitle(item);
    const image = httpUrl(item.image || item.image_url);
    const row: Record<string, unknown> = {
      title,
      quantity: Math.max(0, Number(item.quantity) || 0),
      price: moneyAmount(item.price),
    };
    if (variant) row.variant_title = variant;
    if (image) row.image_url = image;
    if (id && origin) row.path = `${origin}/produto/${encodeURIComponent(id)}`;
    return row;
  });

  const payload: Record<string, unknown> = {
    reference_id: draft.id,
    reason_type: null,
    number: draft.id,
    customer_name: String(draft.clientName || "").trim(),
    customer_email: String(draft.clientEmail || "").trim(),
    customer_phone: phone,
    billing_address: address,
    shipping_address: address,
    line_items: lineItems,
    currency: "BRL",
    total_price: moneyAmount(draft.total),
    subtotal_price: moneyAmount(draft.subtotal),
    checkout_url: `${origin}/checkout?draft=${encodeURIComponent(draft.id)}`,
    original_created_at: formatReportanaDateTime(draft.createdAt),
  };
  if (draft.completedAt) payload.completed_at = formatReportanaDateTime(draft.completedAt);
  return payload;
}
