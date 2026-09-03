import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, ChevronDown, ChevronUp, ImageOff, Loader2, Package, Plus, Trash2, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateOnlyBR } from "@/lib/utils";
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
  expenseMissing?: boolean;
  inventoryMissing?: boolean;
  expenseStatus?: string | null;
  totalAmount: number;
  items: PurchaseItem[];
  orderedAt?: string | null;
  completedAt?: string | null;
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

function parseMoneyDraft(raw: string): number | null {
  const n = Number(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function parseQtyDraft(raw: string): number | null {
  const n = Math.floor(Number(String(raw).trim().replace(",", ".")));
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function CartItemRow({
  item,
  image,
  onCommit,
  onRemove,
}: {
  item: PurchaseItem;
  image?: string | null;
  onCommit: (patch: { quantity?: number; costPrice?: number }) => void;
  onRemove: () => void;
}) {
  const [qtyDraft, setQtyDraft] = useState(String(item.quantity));
  const [costDraft, setCostDraft] = useState(String(item.costPrice));
  const focused = useRef<"qty" | "cost" | null>(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    if (focused.current !== "qty") setQtyDraft(String(item.quantity));
  }, [item.quantity]);

  useEffect(() => {
    if (focused.current !== "cost") setCostDraft(String(item.costPrice));
  }, [item.costPrice]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (focused.current === "qty") {
        const next = parseQtyDraft(qtyDraft);
        if (next != null && next !== item.quantity) onCommitRef.current({ quantity: next });
      }
      if (focused.current === "cost") {
        const next = parseMoneyDraft(costDraft);
        if (next != null && next !== item.costPrice) onCommitRef.current({ costPrice: next });
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [qtyDraft, costDraft, item.quantity, item.costPrice]);

  const commitQty = () => {
    const next = parseQtyDraft(qtyDraft);
    if (next == null) {
      setQtyDraft(String(item.quantity));
      return;
    }
    if (next !== item.quantity) onCommit({ quantity: next });
  };

  const commitCost = () => {
    const next = parseMoneyDraft(costDraft);
    if (next == null) {
      setCostDraft(String(item.costPrice));
      return;
    }
    if (next !== item.costPrice) onCommit({ costPrice: next });
  };

  const lineTotal = (() => {
    const qty = parseQtyDraft(qtyDraft) ?? item.quantity;
    const cost = parseMoneyDraft(costDraft) ?? item.costPrice;
    return Math.round((qty * cost + Number.EPSILON) * 100) / 100;
  })();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm border rounded-lg px-3 py-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ProductThumb src={image} alt={item.productName} />
        <span className="min-w-0 truncate font-medium">{item.productName}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          Qtd
          <input
            type="text"
            inputMode="numeric"
            className="w-16 h-9 px-2 rounded border text-sm text-foreground"
            value={qtyDraft}
            onFocus={() => { focused.current = "qty"; }}
            onChange={(e) => setQtyDraft(e.target.value)}
            onBlur={() => { focused.current = null; commitQty(); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          Custo
          <input
            type="text"
            inputMode="decimal"
            className="w-24 h-9 px-2 rounded border text-sm text-foreground"
            value={costDraft}
            onFocus={() => { focused.current = "cost"; }}
            onChange={(e) => setCostDraft(e.target.value)}
            onBlur={() => { focused.current = null; commitCost(); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          />
        </label>
        <span className="w-28 text-right font-semibold">{formatCurrency(lineTotal)}</span>
        <button type="button" className="text-rose-600 p-1" onClick={onRemove} aria-label="Remover item">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function PurchaseSteps({ status }: { status: string }) {
  const current = status === "completed" ? 4 : status === "ordered" ? 2 : 1;
  const steps = [
    { n: 1, label: "Montar compra" },
    { n: 2, label: "Travar pedido" },
    { n: 3, label: "Entrada no estoque" },
  ];
  return (
    <ol className="grid grid-cols-3 gap-2 text-[11px] sm:text-xs">
      {steps.map((step) => {
        const done = current > step.n;
        const active = current === step.n;
        return (
          <li
            key={step.n}
            className={`rounded-lg border px-2 py-1.5 text-center ${
              done ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : active ? "border-amber-300 bg-amber-50 text-amber-950 font-semibold"
                  : "border-border bg-white text-muted-foreground"
            }`}
          >
            {step.n}. {step.label}
          </li>
        );
      })}
    </ol>
  );
}

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
  const patchSeqByItem = useRef<Record<string, number>>({});
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const activePurchase = purchases.find((p) => p.id === activePurchaseId) || null;
  const selectedProduct = catalog.find((p) => p.id === selectedProductId) || null;

  const filteredCatalog = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const active = catalog.filter((p) => p.isActive !== false);
    const list = q ? active.filter((p) => p.name.toLowerCase().includes(q)) : active;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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
      const purData = await purRes.json().catch(() => ({})) as {
        purchases?: Purchase[];
        repaired?: number;
        inventoryRepaired?: number;
      };
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
      if (Number(purData.inventoryRepaired || 0) > 0) {
        toast.success("A mercadoria da compra entrou no estoque certo e já aparece nas movimentações.");
      } else if (Number(purData.repaired || 0) > 0) {
        toast.success("Despesa da compra concluída foi gerada e já entra como paga.");
      }
      onCompletedRef.current?.();
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
    const seq = (patchSeqByItem.current[item.id] = (patchSeqByItem.current[item.id] || 0) + 1);
    const res = await fetch(`${BASE}/api/admin/supplier-purchases/${activePurchase.id}/items/${item.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({})) as { purchase?: Purchase; message?: string };
    if (patchSeqByItem.current[item.id] !== seq) return;
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
        toast.error(data.message || "Erro ao travar o pedido.");
        return;
      }
      replacePurchase(data.purchase);
      toast.success("Pedido travado. Agora escolha o estoque e dê entrada.");
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
        toast.error(data.message || "Erro ao dar entrada no estoque.");
        return;
      }
      replacePurchase(data.purchase);
      toast.success(`Entrada feita no estoque ${data.inventoryPoolLabel || inventoryPool}. Despesa lançada como paga.`);
      onCompleted?.();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Comprar mercadoria do fornecedor</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aqui entra estoque e já lança a despesa como <span className="font-medium text-foreground">paga</span>. Não use o formulário de extravio/reenvio para isso.
          </p>
        </div>
      </div>

      <PurchaseSteps status={activePurchase?.status || purchases.find((p) => p.status === "ordered")?.status || purchases.find((p) => p.status === "draft")?.status || (purchases.some((p) => p.status === "completed") ? "completed" : "draft")} />

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
            placeholder="Cadastrar fornecedor"
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
        <div className="rounded-xl border border-border bg-slate-50/60 p-4 space-y-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            1. Montar compra · {activePurchase.supplierName || "Fornecedor"}
          </p>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Adicionar produto</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="h-10 px-3 rounded-lg border border-border bg-white text-sm sm:col-span-2"
              />
              <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-white text-sm" placeholder="Qtd" />
              <input
                type="text"
                inputMode="decimal"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="h-10 px-3 rounded-lg border border-border bg-white text-sm"
                placeholder={selectedProduct ? `Custo (${formatCurrency(Number(selectedProduct.costPrice || 0))})` : "Custo unitário"}
              />
            </div>
            {filteredCatalog.length > 0 ? (
              <div className="max-h-80 overflow-auto divide-y border rounded-lg bg-slate-50">
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
                    className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 flex items-center gap-3 bg-white"
                  >
                    <ProductThumb src={product.image} alt={product.name} />
                    <span className="flex-1 min-w-0 truncate">{product.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">custo {formatCurrency(Number(product.costPrice || 0))}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-1">
                {productSearch.trim() ? "Nenhum produto com esse nome." : "Nenhum produto no catálogo."}
              </p>
            )}
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm font-semibold">Itens no carrinho</p>
            {activePurchase.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum produto no carrinho.</p>
            ) : (
              <div className="space-y-3">
                {activePurchase.items.map((item) => {
                  const catalogProduct = catalog.find((p) => p.id === item.productId);
                  return (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      image={catalogProduct?.image}
                      onCommit={(patch) => void patchItem(item, patch)}
                      onRemove={() => void removeItem(item.id)}
                    />
                  );
                })}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                  <span className="text-sm font-semibold">Total {formatCurrency(activePurchase.totalAmount)}</span>
                  <Button type="button" disabled={busy === `finalize-${activePurchase.id}`} onClick={() => void finalize(activePurchase.id)}>
                    {busy === `finalize-${activePurchase.id}` ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Travar pedido
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recibos das compras</p>
        {loading && purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Carregando...</p>
        ) : purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma compra ainda. Escolha o fornecedor e clique em Nova compra.</p>
        ) : (
          purchases.map((purchase) => {
            const expanded = Boolean(expandedIds[purchase.id]);
            const paid = purchase.status === "completed" && !purchase.expenseMissing;
            return (
              <div key={purchase.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{purchase.supplierName || "Fornecedor"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {purchase.items.length} item(ns) · {formatCurrency(purchase.totalAmount)}
                      {purchase.completedAt ? ` · ${formatDateOnlyBR(purchase.completedAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {purchase.status === "draft" && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700">Montando</span>
                    )}
                    {purchase.status === "ordered" && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-900">Aguardando estoque</span>
                    )}
                    {paid && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800">Paga</span>
                    )}
                    {purchase.inventoryPoolLabel && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-sky-200 bg-sky-50 text-sky-800 inline-flex items-center gap-1">
                        <Warehouse className="w-3 h-3" />
                        {purchase.inventoryPoolLabel}
                      </span>
                    )}
                    {purchase.status === "draft" && (
                      <Button type="button" size="sm" variant="outline" onClick={() => setActivePurchaseId(purchase.id)}>
                        Continuar
                      </Button>
                    )}
                  </div>
                </div>

                {purchase.status === "ordered" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 space-y-2">
                    <p className="text-xs font-medium text-amber-950">3. Onde essa mercadoria entra? A despesa é lançada paga nesse clique.</p>
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
                        Dar entrada no estoque
                      </Button>
                    </div>
                    {!isPrimary && (
                      <p className="text-xs text-amber-800">Só o admin primário dá entrada no estoque.</p>
                    )}
                  </div>
                )}

                {purchase.status === "completed" && (
                  <div className={`rounded-lg border px-3 py-2 text-xs ${
                    purchase.inventoryMissing || purchase.expenseMissing
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900"
                  }`}>
                    {purchase.inventoryMissing
                      ? "A despesa está lançada, mas o estoque ainda não entrou. Atualize a página — o sistema tenta dar a entrada no pool certo."
                      : purchase.expenseMissing
                        ? "Estoque já entrou, mas a despesa não foi gravada. Atualize a página — o sistema tenta gerar o lançamento pago."
                        : `Despesa paga · ${formatCurrency(purchase.totalAmount)} · entrou no estoque ${purchase.inventoryPoolLabel || "escolhido"}.`}
                  </div>
                )}

                <button
                  type="button"
                  className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => setExpandedIds((c) => ({ ...c, [purchase.id]: !expanded }))}
                >
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {expanded ? "Ocultar itens" : "Ver itens"}
                </button>
                {expanded && (
                  <div className="space-y-2">
                    {purchase.items.map((item) => {
                      const catalogProduct = catalog.find((p) => p.id === item.productId);
                      return (
                        <div key={item.id} className="flex items-center gap-3 text-sm border rounded-lg px-3 py-2 bg-slate-50">
                          <ProductThumb src={catalogProduct?.image} alt={item.productName} />
                          <span className="flex-1 min-w-0 truncate">{item.productName}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{item.quantity} × {formatCurrency(item.costPrice)}</span>
                          <span className="text-sm font-semibold whitespace-nowrap">{formatCurrency(item.lineTotal)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
