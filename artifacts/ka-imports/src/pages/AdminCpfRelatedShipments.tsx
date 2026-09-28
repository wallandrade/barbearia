import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import {
  fetchRelatedShipments,
  relatedShipmentDateLabel,
  relatedShipmentStatusLabel,
  type RelatedShipmentRow,
  type RelatedShipmentsResponse,
} from "@/lib/related-shipments-client";

function productThumbSrc(
  product: RelatedShipmentRow["products"][number],
  productImageById?: Record<string, string>,
): string {
  const fromShipment = String(product.image || "").trim();
  if (fromShipment) return fromShipment;
  const productId = String(product.productId || "").trim();
  return productId ? String(productImageById?.[productId] || "").trim() : "";
}

function ProductLine({
  row,
  productImageById,
  onPreviewImage,
}: {
  row: RelatedShipmentRow;
  productImageById?: Record<string, string>;
  onPreviewImage?: (src: string, name: string) => void;
}) {
  if (!row.products.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {row.products.map((product, index) => {
        const imageSrc = productThumbSrc(product, productImageById);
        return (
          <div
            key={`${product.productId || product.productName}-${index}`}
            className="flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-white pr-2"
          >
            <button
              type="button"
              className={`h-8 w-8 shrink-0 overflow-hidden rounded-l-lg bg-white ${imageSrc ? "cursor-zoom-in" : "cursor-default"}`}
              onClick={() => {
                if (!imageSrc || !onPreviewImage) return;
                onPreviewImage(imageSrc, product.productName);
              }}
              aria-label={imageSrc ? `Ver foto de ${product.productName}` : product.productName}
            >
              {imageSrc ? (
                <img src={imageSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[9px] leading-none text-slate-400">foto</span>
              )}
            </button>
            <span className="block max-w-[180px] truncate py-0.5 text-[11px] font-medium text-foreground">
              {product.quantity}× {product.productName}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function RelatedShipmentLines({
  rows,
  productImageById,
  onPreviewImage,
}: {
  rows: RelatedShipmentRow[];
  productImageById?: Record<string, string>;
  onPreviewImage?: (src: string, name: string) => void;
}) {
  if (!rows.length) {
    return <p className="text-xs text-muted-foreground">Nenhum outro pedido pago deste CPF.</p>;
  }
  return (
    <ul className="space-y-2">
      {rows.map((row, index) => (
        <li key={`${row.orderId}-${index}`} className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
          <p className="text-xs font-semibold text-foreground">
            #{row.orderNumber ?? row.orderId}
            {relatedShipmentDateLabel(row.shippedAt) ? ` · ${relatedShipmentDateLabel(row.shippedAt)}` : ""}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {row.barcode || "sem rastreio"}
            {" · "}
            {relatedShipmentStatusLabel(row)}
            {row.accountName ? ` · ${row.accountName}` : ""}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {row.sameProduct && (
              <span className="inline-flex px-1.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-semibold border border-red-200">
                mesmo produto
              </span>
            )}
            {row.isReshipRelated && (
              <span className="inline-flex px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                reenvio
              </span>
            )}
          </div>
          <ProductLine row={row} productImageById={productImageById} onPreviewImage={onPreviewImage} />
        </li>
      ))}
    </ul>
  );
}

export function CpfRelatedShipmentsBlock({
  orderId,
  getAuthHeaders,
  productImageById,
  onPreviewImage,
}: {
  orderId: string;
  getAuthHeaders: () => HeadersInit;
  productImageById?: Record<string, string>;
  onPreviewImage?: (src: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RelatedShipmentsResponse | null>(null);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (!next || data || loading) return;
    setLoading(true);
    setError(null);
    void fetchRelatedShipments(orderId, getAuthHeaders())
      .then((result) => setData(result))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Falha ao buscar envios deste CPF.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="mt-1">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:underline"
        onClick={toggle}
      >
        <ChevronDown className={`w-3.5 h-3.5 transition ${open ? "rotate-180" : ""}`} />
        Últimos envios deste CPF
      </button>
      {open && (
        <div className="mt-1.5 max-w-md">
          {loading && (
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Buscando…
            </p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          {data && (
            <RelatedShipmentLines
              rows={data.shipments}
              productImageById={productImageById}
              onPreviewImage={onPreviewImage}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function CpfQuoteWarningModal({
  orderNumber,
  clientName,
  result,
  onBack,
  onContinue,
  productImageById,
  onPreviewImage,
}: {
  orderNumber: string;
  clientName: string;
  result: RelatedShipmentsResponse;
  onBack: () => void;
  onContinue: () => void;
  productImageById?: Record<string, string>;
  onPreviewImage?: (src: string, name: string) => void;
}) {
  const sameProduct = result.warningLevel === "same_product";
  return (
    <div className="fixed inset-0 z-[130] bg-black/45 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-white shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-bold text-foreground">Atenção antes de cotar</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pedido #{orderNumber} · {clientName}
          </p>
          <p className={`mt-2 text-sm font-semibold ${sameProduct ? "text-red-700" : "text-amber-700"}`}>
            {sameProduct
              ? "Este CPF já recebeu o mesmo produto recentemente"
              : "Este CPF já teve envio EnvioEcom recente"}
          </p>
        </div>
        <div className="px-5 py-3 max-h-72 overflow-y-auto">
          <RelatedShipmentLines
            rows={result.shipments}
            productImageById={productImageById}
            onPreviewImage={onPreviewImage}
          />
        </div>
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
            onClick={onBack}
          >
            Voltar
          </button>
          <button
            type="button"
            className={`px-3 py-2 rounded-lg text-sm font-semibold text-white ${sameProduct ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}
            onClick={onContinue}
          >
            Continuar cotação
          </button>
        </div>
      </div>
    </div>
  );
}
