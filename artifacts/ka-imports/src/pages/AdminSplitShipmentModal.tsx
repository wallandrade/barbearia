import { useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SplitPoolKind = "loja" | "motoboy" | "minas";

export type SplitShipmentItem = {
  productId: string;
  productName: string;
  quantity: number;
};

export type SplitShipmentPackage = {
  id?: string;
  inventoryPool: SplitPoolKind;
  inventoryPoolLabel?: string;
  items: SplitShipmentItem[];
  enviado?: boolean | null;
  envioecomShipmentId?: string | null;
  envioecomBarcode?: string | null;
  envioecomStatus?: string | null;
  envioecomLabelUrl?: string | null;
  envioecomAccountId?: string | null;
};

const POOLS: Array<{ id: SplitPoolKind; label: string }> = [
  { id: "minas", label: "Minas" },
  { id: "motoboy", label: "Motoboy" },
  { id: "loja", label: "Foz Guaçu" },
];

function poolLabel(pool: SplitPoolKind): string {
  return POOLS.find((row) => row.id === pool)?.label || pool;
}

type Line = {
  key: string;
  productId: string;
  productName: string;
  quantity: number;
  qty: Record<SplitPoolKind, number>;
};

function emptyQty(): Record<SplitPoolKind, number> {
  return { loja: 0, motoboy: 0, minas: 0 };
}

export function AdminSplitShipmentModal({
  orderRef,
  clientName,
  products,
  packages,
  saving,
  onClose,
  onSave,
  onClear,
}: {
  orderRef: string;
  clientName: string;
  products: Array<{ id?: string; name?: string; quantity?: number }>;
  packages: SplitShipmentPackage[];
  saving: boolean;
  onClose: () => void;
  onSave: (packages: Array<{ inventoryPool: SplitPoolKind; items: SplitShipmentItem[] }>) => void;
  onClear: () => void;
}) {
  const initialLines = useMemo<Line[]>(() => {
    const grouped = new Map<string, Line>();
    for (const product of products) {
      const quantity = Number(product.quantity || 0);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      const productId = String(product.id || "").trim();
      const productName = String(product.name || "Produto").trim() || "Produto";
      const key = productId ? `id:${productId}` : `name:${productName.toLowerCase()}`;
      const prev = grouped.get(key);
      grouped.set(key, {
        key,
        productId: prev?.productId || productId,
        productName: prev?.productName || productName,
        quantity: (prev?.quantity || 0) + quantity,
        qty: emptyQty(),
      });
    }
    const lines = [...grouped.values()];
    for (const pack of packages) {
      const pool = pack.inventoryPool;
      if (pool !== "loja" && pool !== "motoboy" && pool !== "minas") continue;
      for (const item of pack.items || []) {
        const productId = String(item.productId || "").trim();
        const productName = String(item.productName || "Produto").trim() || "Produto";
        const key = productId ? `id:${productId}` : `name:${productName.toLowerCase()}`;
        const line = lines.find((row) => row.key === key);
        if (!line) continue;
        line.qty[pool] += Number(item.quantity || 0);
      }
    }
    if (packages.length < 2) {
      for (const line of lines) {
        if (line.qty.minas + line.qty.motoboy + line.qty.loja === 0) {
          line.qty.minas = line.quantity;
        }
      }
    }
    return lines;
  }, [products, packages]);

  const [lines, setLines] = useState<Line[]>(initialLines);
  const [error, setError] = useState<string | null>(null);

  const setQty = (key: string, pool: SplitPoolKind, raw: string) => {
    const n = Math.max(0, Math.floor(Number(raw || 0)));
    setLines((prev) => prev.map((line) => {
      if (line.key !== key) return line;
      const qty = { ...line.qty, [pool]: Number.isFinite(n) ? n : 0 };
      return { ...line, qty };
    }));
    setError(null);
  };

  const submit = () => {
    for (const line of lines) {
      const sum = line.qty.minas + line.qty.motoboy + line.qty.loja;
      if (sum !== line.quantity) {
        setError(`${line.productName}: some ${line.quantity} un nos estoques (agora ${sum}).`);
        return;
      }
    }
    const built = POOLS.map((pool) => ({
      inventoryPool: pool.id,
      items: lines
        .filter((line) => line.qty[pool.id] > 0)
        .map((line) => ({
          productId: line.productId,
          productName: line.productName,
          quantity: line.qty[pool.id],
        })),
    })).filter((pack) => pack.items.length > 0);
    if (built.length < 2) {
      setError("Escolha pelo menos 2 estoques (ex.: Minas e Motoboy).");
      return;
    }
    onSave(built);
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/45 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-white shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground">Dividir envio EnvioEcom</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Pedido #{orderRef} · {clientName}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Cada estoque gera uma etiqueta (CEP de origem da API EnvioEcom daquela origem).
            </p>
          </div>
          <button type="button" className="p-1.5 rounded-lg hover:bg-muted" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-2">Produto</th>
                <th className="pb-2 pr-2 w-12">Qtd</th>
                {POOLS.map((pool) => (
                  <th key={pool.id} className="pb-2 pr-2 w-24">{pool.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const sum = line.qty.minas + line.qty.motoboy + line.qty.loja;
                const ok = sum === line.quantity;
                return (
                  <tr key={line.key} className="border-t border-border/70">
                    <td className="py-2 pr-2 font-medium">{line.productName}</td>
                    <td className={`py-2 pr-2 ${ok ? "text-muted-foreground" : "text-red-600 font-semibold"}`}>{line.quantity}</td>
                    {POOLS.map((pool) => (
                      <td key={pool.id} className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          max={line.quantity}
                          className="w-20 h-8 rounded-md border border-border px-2 text-sm"
                          value={line.qty[pool.id]}
                          onChange={(event) => setQty(line.key, pool.id, event.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-border flex flex-wrap gap-2 justify-end">
          {packages.length >= 2 && (
            <Button variant="outline" disabled={saving} onClick={onClear}>
              Desfazer divisão
            </Button>
          )}
          <Button variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button>
          <Button disabled={saving} onClick={submit} className="bg-teal-700 hover:bg-teal-800 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Salvando..." : "Salvar divisão"}
          </Button>
        </div>
        <p className="px-5 pb-4 text-[11px] text-muted-foreground">
          Depois: em cada pacote escolha a API EnvioEcom do CEP de origem ({poolLabel("minas")} / {poolLabel("motoboy")}) e gere a etiqueta.
        </p>
      </div>
    </div>
  );
}
