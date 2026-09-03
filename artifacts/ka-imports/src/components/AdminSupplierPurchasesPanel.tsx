import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, ImageOff, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

type CatalogProduct = { id: string; name: string; costPrice?: number | null; image?: string | null; isActive?: boolean };

type PurchaseItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  lineTotal: number;
};

type Purchase = {
  id: string;
  supplierId: string;
  supplierName: string | null;
  status: string;
  statusLabel: string;
  inventoryPool: string | null;
  inventoryPoolLabel: string | null;
  expenseId: string | null;
  totalAmount: number;
  items: PurchaseItem[];
};

type Supplier = { id: string; name: string };

function ProductThumb({ src, alt }: { src?: string | null; alt: string }) {
  const url = String(src || "").trim();
  if (url) {
    return <img src={url} alt={alt} className="w-10 h-10 rounded-md object-cover flex-shrink-0 border border-border bg-white" />;
  }
  return (
    <div className="w-10 h-10 rounded-md bg-muted flex-shrink-0 border border-border flex items-center justify-center">
      <ImageOff className="w-4 h-4 text-muted-foreground/60" />
    </div>
  );
}

type Props = {
  isPrimary: boolean;
  onCompleted?: () => void;
};

export function AdminSupplierPurchasesPanel({ isPrimary, onCompleted }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [activePurchaseId, setActivePurchaseId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [completePool, setCompletePool] = useState<Record<string, string>>({});

  const activePurchase = purchases.find((p) => p.id === activePurchaseId) || null;
  const selectedProduct = catalog.find((p) => p.id === selectedProductId) || null;

  const filteredCatalog = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const list = catalog.filter((p) => p.isActive !== false);
    if (!q) return list.slice(0, 8);
    return list.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 12);
  }, [catalog, productSearch]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [supRes, purRes, prodRes] = await Promise.all([
        fetch(`${BASE}/api/admin/suppliers`, { headers: authHeaders() }),
        fetch(`${BASE}/api/admin/supplier-purchases`, { headers: authHeaders() }),
        fetch(`${BASE}/api/admin/products`, { headers: authHeaders() }),
      ]);
      let prodData = await prodRes.json().catch(() => ({})) as { products?: CatalogProduct[] };
      if (!prodRes.ok) {
        const publicRes = await fetch(`${BASE}/api/products`);
        prodData = await publicRes.json().catch(() => ({})) as { products?: CatalogProduct[] };
      }
      const supData = await supRes.json().catch(() => ({})) as { suppliers?: Supplier[] };
      const purData = await purRes.json().catch(() => ({})) as { purchases?: Purchase[] };
      const nextSuppliers = Array.isArray(supData.suppliers) ? supData.suppliers : [];
      const nextPurchases = Array.isArray(purData.purchases) ? purData.purchases : [];
      setSuppliers(nextSuppliers);
      setPurchases(nextPurchases);
      setCatalog(Array.isArray(prodData.products) ? prodData.products : []);
      setSupplierId((current) => current || nextSuppliers[0]?.id || "");
      setActivePurchaseId((current) => {
        if (current && nextPurchases.some((p) => p.id === current)) return current;
        const draft = nextPurchases.find((p) => p.status === "draft");
        return draft?.id ?? current;
      });
    } catch {
      toast.error("Erro ao carregar compras com fornecedor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const replacePurchase = (purchase: Purchase) => {
    setPurchases((prev) => {
      const exists = prev.some((p) => p.id === purchase.id);
      return exists ? prev.map((p) => (p.id === purchase.id ? purchase : p)) : [purchase, ...prev];
    });
    setActivePurchaseId(purchase.id);
  };

  const createSupplier = async () => {
    const name = newSupplierName.trim();
    if (name.length < 2) {
      toast.error("Informe o nome do fornecedor.");
      return;
    }
    setCreatingSupplier(true);
    try {
      const res = await fetch(`${BASE}/api/admin/suppliers`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({})) as { id?: string; name?: string; message?: string };
      if (!res.ok || !data.id) {
        toast.error(data.message || "Erro ao cadastrar fornecedor.");
        return;
      }
      setSuppliers((prev) => [{ id: data.id!, name: data.name || name }, ...prev]);
      setSupplierId(data.id);
      setNewSupplierName("");
      toast.success("Fornecedor cadastrado.");
    } finally {
      setCreatingSupplier(false);
    }
  };

  const startPurchase = async () => {
    if (!supplierId) {
      toast.error("Escolha o fornecedor.");
      return;
    }
    setBusy("start");
    try {
      const res = await fetch(`${BASE}/api/admin/supplier-purchases`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ supplierId }),
      });
      const data = await res.json().catch(() => ({})) as { purchase?: Purchase; message?: string };
      if (!res.ok || !data.purchase) {
        toast.error(data.message || "Erro ao abrir compra.");
        return;
      }
      replacePurchase(data.purchase);
      toast.success("Carrinho aberto. Adicione os produtos.");
    } finally {
      setBusy(null);
    }
  };

  const addItem = async (product: CatalogProduct) => {
    if (!activePurchase || activePurchase.status !== "draft") {
      toast.error("Abra um rascunho de compra primeiro.");
      return;
    }
    const quantity = Math.max(1, Math.floor(Number(qty) || 1));
    const costPrice = cost.trim() === ""
      ? Number(product.costPrice || 0)
      : Number(String(cost).replace(",", "."));
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      toast.error("Informe o custo do item.");
      return;
    }
    setBusy("add");
    try {
      const res = await fetch(`${BASE}/api/admin/supplier-purchases/${activePurchase.id}/items`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ productId: product.id, quantity, costPrice }),
      });
      const data = await res.json().catch(() => ({})) as { purchase?: Purchase; message?: string };
      if (!res.ok || !data.purchase) {
        toast.error(data.message || "Erro ao adicionar produto.");
        return;
      }
      replacePurchase(data.purchase);
      setProductSearch("");
      setSelectedProductId("");
      setQty("1");
      setCost("");
    } finally {
      setBusy(null);
    }
  };

  const patchItem = async (item: PurchaseItem, patch: { quantity?: number; costPrice?: number }) => {
    if (!activePurchase) return;
    const res = await fetch(`${BASE}/api/admin/supplier-purchases/${activePurchase.id}/items/${item.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({})) as { purchase?: Purchase; message?: string };
    if (!res.ok || !data.purchase) {
      toast.error(data.message || "Erro ao atualizar item.");
      return;
    }
    replacePurchase(data.purchase);
  };

  const removeItem = async (itemId: string) => {
    if (!activePurchase) return;
    const res = await fetch(`${BASE}/api/admin/supplier-purchases/${activePurchase.id}/items/${itemId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({})) as { purchase?: Purchase; message?: string };
    if (!res.ok || !data.purchase) {
      toast.error(data.message || "Erro ao remover item.");
      return;
    }
    replacePurchase(data.purchase);
  };

  const finalize = async (purchaseId: string) => {
    setBusy(`finalize-${purchaseId}`);
    try {
      const res = await fetch(`${BASE}/api/admin/supplier-purchases/${purchaseId}/finalize`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({})) as { purchase?: Purchase; message?: string };
      if (!res.ok || !data.purchase) {
        toast.error(data.message || "Erro ao finalizar pedido.");
        return;
      }
      replacePurchase(data.purchase);
      toast.success("Pedido finalizado. Agora conclua a compra e escolha o estoque.");
    } finally {
      setBusy(null);
    }
  };

  const complete = async (purchaseId: string) => {
    const inventoryPool = completePool[purchaseId] || "";
    if (!inventoryPool) {
      toast.error("Escolha o estoque de destino.");
      return;
    }
    setBusy(`complete-${purchaseId}`);
    try {
      const res = await fetch(`${BASE}/api/admin/supplier-purchases/${purchaseId}/complete`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ inventoryPool }),
      });
      const data = await res.json().catch(() => ({})) as { purchase?: Purchase; message?: string; inventoryPoolLabel?: string };
      if (!res.ok || !data.purchase) {
        toast.error(data.message || "Erro ao concluir compra.");
        return;
      }
      replacePurchase(data.purchase);
      toast.success(`Compra concluída. Entrou no estoque ${data.inventoryPoolLabel || inventoryPool}.`);
      onCompleted?.();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Compra com fornecedor</p>
        <p className="text-xs text-muted-foreground">
          Monte o carrinho com custo de cada item, finalize o pedido e depois conclua escolhendo o estoque (Foz Guaçu, Motoboy ou Minas).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-white text-sm">
          <option value="">Escolha o fornecedor</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
            placeholder="Novo fornecedor"
            className="h-10 flex-1 px-3 rounded-lg border border-border bg-white text-sm"
          />
          <Button type="button" variant="outline" className="h-10" disabled={creatingSupplier} onClick={() => void createSupplier()}>
            {creatingSupplier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
        <Button type="button" className="h-10" disabled={busy === "start" || !supplierId} onClick={() => void startPurchase()}>
          {busy === "start" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Nova compra
        </Button>
      </div>

      {activePurchase?.status === "draft" && (
        <div className="rounded-xl border border-border bg-white p-3 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Carrinho · {activePurchase.supplierName || "Fornecedor"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="h-10 px-3 rounded-lg border border-border bg-white text-sm md:col-span-2"
            />
            <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-white text-sm" placeholder="Qtd" />
            <input
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-white text-sm"
              placeholder={selectedProduct ? `Custo (${formatCurrency(Number(selectedProduct.costPrice || 0))})` : "Custo unitário"}
            />
          </div>
          {filteredCatalog.length > 0 && (
            <div className="max-h-56 overflow-auto divide-y border rounded-lg">
              {filteredCatalog.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  disabled={busy === "add"}
                  onClick={() => {
                    setSelectedProductId(product.id);
                    if (!cost) setCost(String(Number(product.costPrice || 0)));
                    void addItem(product);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 flex items-center gap-3"
                >
                  <ProductThumb src={product.image} alt={product.name} />
                  <span className="flex-1 min-w-0 truncate">{product.name}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">custo {formatCurrency(Number(product.costPrice || 0))}</span>
                </button>
              ))}
            </div>
          )}

          {activePurchase.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto no carrinho.</p>
          ) : (
            <div className="space-y-2">
              {activePurchase.items.map((item) => {
                const catalogProduct = catalog.find((p) => p.id === item.productId);
                return (
                <div key={item.id} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2">
                  <ProductThumb src={catalogProduct?.image} alt={item.productName} />
                  <span className="flex-1 min-w-0 truncate font-medium">{item.productName}</span>
                  <input
                    type="number"
                    min="1"
                    className="w-16 h-8 px-2 rounded border text-sm"
                    value={item.quantity}
                    onChange={(e) => void patchItem(item, { quantity: Number(e.target.value) })}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-24 h-8 px-2 rounded border text-sm"
                    value={item.costPrice}
                    onChange={(e) => void patchItem(item, { costPrice: Number(e.target.value) })}
                  />
                  <span className="w-24 text-right font-semibold">{formatCurrency(item.lineTotal)}</span>
                  <button type="button" className="text-rose-600" onClick={() => void removeItem(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                );
              })}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-semibold">Total {formatCurrency(activePurchase.totalAmount)}</span>
                <Button type="button" disabled={busy === `finalize-${activePurchase.id}`} onClick={() => void finalize(activePurchase.id)}>
                  {busy === `finalize-${activePurchase.id}` ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Finalizar pedido
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Compras</p>
        {loading && purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Carregando...</p>
        ) : purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma compra ainda.</p>
        ) : (
          purchases.map((purchase) => (
            <div key={purchase.id} className="rounded-xl border bg-white p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{purchase.supplierName || "Fornecedor"}</p>
                  <p className="text-xs text-muted-foreground">
                    {purchase.statusLabel} · {purchase.items.length} item(ns) · {formatCurrency(purchase.totalAmount)}
                    {purchase.inventoryPoolLabel ? ` · ${purchase.inventoryPoolLabel}` : ""}
                  </p>
                </div>
                {purchase.status === "draft" && (
                  <Button type="button" size="sm" variant="outline" onClick={() => setActivePurchaseId(purchase.id)}>
                    Continuar
                  </Button>
                )}
              </div>
              {purchase.status === "ordered" && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={completePool[purchase.id] || ""}
                    onChange={(e) => setCompletePool((c) => ({ ...c, [purchase.id]: e.target.value }))}
                    className="h-10 px-3 rounded-lg border border-border bg-white text-sm flex-1"
                  >
                    <option value="">Estoque de destino</option>
                    <option value="loja">Foz Guaçu</option>
                    <option value="motoboy">Motoboy</option>
                    <option value="minas">Minas</option>
                  </select>
                  <Button
                    type="button"
                    className="h-10"
                    disabled={!isPrimary || busy === `complete-${purchase.id}`}
                    onClick={() => void complete(purchase.id)}
                  >
                    {busy === `complete-${purchase.id}` ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Concluir compra
                  </Button>
                </div>
              )}
              {!isPrimary && purchase.status === "ordered" && (
                <p className="text-xs text-amber-800">Só o admin primário conclui e dá entrada no estoque.</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
