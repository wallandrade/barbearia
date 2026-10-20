import { useCallback, useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ProductOption = { id: string; name: string; price: number; image: string | null };

function ProductThumb({ src, alt }: { src?: string | null; alt: string }) {
  const url = String(src || "").trim();
  if (url) {
    return <img src={url} alt={alt} className="h-10 w-10 shrink-0 rounded-md border border-border bg-white object-cover" />;
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
      <ImageOff className="h-4 w-4 text-muted-foreground/60" />
    </div>
  );
}

type CampaignItem = {
  id: string;
  productId: string;
  productName: string;
  catalogPrice: number | null;
  flashPrice: number;
};

type Campaign = {
  id: string;
  name: string;
  isActive: boolean;
  slotLimit: number;
  chance: number;
  startHour: number | null;
  endHour: number | null;
  items: CampaignItem[];
  seenCount: number;
  activeCount: number;
  usedCount: number;
};

type DraftItem = { productId: string; flashPrice: string };

function adminHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || "";
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

function hourLabel(hour: number | null, empty: string): string {
  if (hour == null) return empty;
  return `${String(hour).padStart(2, "0")}h`;
}

export function FlashCampaignsPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [slotLimit, setSlotLimit] = useState("5");
  const [chance, setChance] = useState("25");
  const [startHour, setStartHour] = useState("");
  const [endHour, setEndHour] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [productId, setProductId] = useState("");
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [flashPrice, setFlashPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [campaignRes, productRes] = await Promise.all([
      fetch(`${BASE}/api/admin/flash-campaigns`, { headers: adminHeaders() }),
      fetch(`${BASE}/api/admin/products`, { headers: adminHeaders() }),
    ]);
    if (campaignRes.status === 401 || productRes.status === 401) {
      onUnauthorized();
      return;
    }
    const campaignData = await campaignRes.json() as { campaigns?: Campaign[] };
    const productData = await productRes.json() as { products?: Array<{ id: string; name: string; price: number; image?: string | null }> };
    setCampaigns(campaignData.campaigns || []);
    setProducts((productData.products || []).map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.image || null,
    })));
  }, [onUnauthorized]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setIsActive(false);
    setSlotLimit("5");
    setChance("25");
    setStartHour("");
    setEndHour("");
    setItems([]);
    setProductId("");
    setProductMenuOpen(false);
    setFlashPrice("");
  }

  function edit(campaign: Campaign) {
    setEditingId(campaign.id);
    setName(campaign.name);
    setIsActive(campaign.isActive);
    setSlotLimit(String(campaign.slotLimit));
    setChance(String(campaign.chance));
    setStartHour(campaign.startHour == null ? "" : String(campaign.startHour));
    setEndHour(campaign.endHour == null ? "" : String(campaign.endHour));
    setItems(campaign.items.map((item) => ({ productId: item.productId, flashPrice: String(item.flashPrice) })));
  }

  function addItem() {
    const product = products.find((item) => item.id === productId);
    const price = Number(flashPrice.replace(",", "."));
    if (!product) {
      toast.error("Escolha o produto.");
      return;
    }
    if (items.some((item) => item.productId === product.id)) {
      toast.error("Cada produto entra uma vez.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0 || price >= product.price) {
      toast.error("O preço relâmpago tem de ser maior que zero e menor que o preço do cadastro.");
      return;
    }
    setItems((current) => [...current, { productId: product.id, flashPrice: price.toFixed(2) }]);
    setFlashPrice("");
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        name,
        isActive,
        slotLimit: Number(slotLimit),
        chance: Number(chance),
        startHour: startHour === "" ? null : Number(startHour),
        endHour: endHour === "" ? null : Number(endHour),
        items: items.map((item) => ({ productId: item.productId, flashPrice: Number(item.flashPrice) })),
      };
      const response = await fetch(
        editingId ? `${BASE}/api/admin/flash-campaigns/${editingId}` : `${BASE}/api/admin/flash-campaigns`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: adminHeaders(),
          body: JSON.stringify(body),
        },
      );
      const data = await response.json().catch(() => ({})) as { message?: string };
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      if (!response.ok) {
        toast.error(data.message || "Não foi possível salvar a campanha.");
        return;
      }
      toast.success(editingId ? "Campanha atualizada." : "Campanha criada.");
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const response = await fetch(`${BASE}/api/admin/flash-campaigns/${id}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    if (response.status === 401) {
      onUnauthorized();
      return;
    }
    if (!response.ok) {
      toast.error("Não foi possível apagar a campanha.");
      return;
    }
    if (editingId === id) resetForm();
    await load();
  }

  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  const selectedProduct = products.find((product) => product.id === productId);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-white p-4">
        <h2 className="text-lg font-bold">{editingId ? "Editar promoção" : "Nova promoção relâmpago"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">A oferta é por pessoa, com vaga limitada. O preço do catálogo e o cupom ficam de fora.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Nome
            <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border px-3" />
          </label>
          <label className="flex items-end gap-2 text-sm font-medium">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Ligada
          </label>
          <label className="text-sm font-medium">
            Vagas ao mesmo tempo
            <input value={slotLimit} onChange={(event) => setSlotLimit(event.target.value)} inputMode="numeric" className="mt-1 h-10 w-full rounded-lg border border-border px-3" />
          </label>
          <label className="text-sm font-medium">
            Chance de aparecer (%)
            <input value={chance} onChange={(event) => setChance(event.target.value)} inputMode="numeric" className="mt-1 h-10 w-full rounded-lg border border-border px-3" />
          </label>
          <label className="text-sm font-medium">
            Hora inicial
            <select value={startHour} onChange={(event) => setStartHour(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border px-3">
              <option value="">Sem limite</option>
              {hours.map((hour) => <option key={hour} value={hour}>{hourLabel(hour, "")}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            Hora final
            <select value={endHour} onChange={(event) => setEndHour(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border px-3">
              <option value="">Sem limite</option>
              {hours.map((hour) => <option key={hour} value={hour}>{hourLabel(hour, "")}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="relative min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setProductMenuOpen((open) => !open)}
              className="flex h-14 w-full items-center gap-3 rounded-lg border border-border bg-white px-3 text-left"
            >
              {selectedProduct ? <ProductThumb src={selectedProduct.image} alt={selectedProduct.name} /> : null}
              <span className="min-w-0 flex-1 truncate text-sm">
                {selectedProduct ? `${selectedProduct.name} · ${formatCurrency(selectedProduct.price)}` : "Produto"}
              </span>
            </button>
            {productMenuOpen ? (
              <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setProductId(product.id);
                      setProductMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/60"
                  >
                    <ProductThumb src={product.image} alt={product.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{product.name}</span>
                      <span className="text-xs text-muted-foreground">{formatCurrency(product.price)}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <input value={flashPrice} onChange={(event) => setFlashPrice(event.target.value)} placeholder="Preço relâmpago" className="h-14 w-full rounded-lg border border-border px-3 sm:w-40" />
          <button type="button" onClick={addItem} className="h-14 rounded-lg border border-border px-4 text-sm font-semibold">Adicionar</button>
        </div>
        {items.length > 0 && (
          <ul className="mt-3 space-y-2">
            {items.map((item) => {
              const product = products.find((candidate) => candidate.id === item.productId);
              return (
                <li key={item.productId} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-3">
                    <ProductThumb src={product?.image} alt={product?.name || item.productId} />
                    <span className="truncate">{product?.name || item.productId} · {formatCurrency(Number(item.flashPrice))}</span>
                  </span>
                  <button type="button" className="text-destructive" onClick={() => setItems((current) => current.filter((row) => row.productId !== item.productId))}>Tirar</button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 flex gap-2">
          <button type="button" disabled={saving} onClick={() => void save()} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Salvando..." : "Salvar"}
          </button>
          {editingId ? (
            <button type="button" onClick={resetForm} className="h-10 rounded-lg border border-border px-4 text-sm font-semibold">Cancelar</button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma campanha ainda.</p>
        ) : campaigns.map((campaign) => (
          <article key={campaign.id} className="rounded-xl border border-border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">{campaign.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {campaign.isActive ? "Ligada" : "Desligada"} · {campaign.slotLimit} vagas · {campaign.chance}% · {hourLabel(campaign.startHour, "do início do dia")} até {hourLabel(campaign.endHour, "o fim do dia")}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => edit(campaign)} className="text-sm font-semibold text-primary">Editar</button>
                <button type="button" onClick={() => void remove(campaign.id)} className="text-sm font-semibold text-destructive">Apagar</button>
              </div>
            </div>
            <p className="mt-2 text-sm">
              {campaign.seenCount} viram · {campaign.activeCount} reservas ativas · {campaign.usedCount} viraram pedido
            </p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {campaign.items.map((item) => {
                const product = products.find((candidate) => candidate.id === item.productId);
                return (
                  <li key={item.id} className="flex items-center gap-3">
                    <ProductThumb src={product?.image} alt={item.productName} />
                    <span>{item.productName} · {formatCurrency(item.flashPrice)}</span>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
