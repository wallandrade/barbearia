import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { isPromoStillActive } from "@/lib/promo-ends-at";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ProductOption = {
  id: string;
  name: string;
  price: number;
  image: string | null;
  promoPrice: number | null;
  promoEndsAt: string | null;
  promoUntilStock: boolean;
  promoStockLeft: number | null;
};

function currentSellingPrice(product: ProductOption): { amount: number; promo: boolean } {
  const promo = product.promoPrice;
  const promoOn = product.promoUntilStock
    ? (product.promoStockLeft ?? 0) > 0 && promo != null && promo > 0 && promo < product.price
    : isPromoStillActive(promo, product.price, product.promoEndsAt, Date.now());
  if (promoOn && promo != null) return { amount: promo, promo: true };
  return { amount: product.price, promo: false };
}

function ProductPrice({ product }: { product: ProductOption }) {
  const selling = currentSellingPrice(product);
  if (!selling.promo) {
    return <span className="text-xs text-muted-foreground">{formatCurrency(selling.amount)}</span>;
  }
  return (
    <span className="text-xs text-muted-foreground">
      <span className="line-through">{formatCurrency(product.price)}</span>
      {" "}
      <span className="font-semibold text-primary">{formatCurrency(selling.amount)}</span>
    </span>
  );
}

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

type ReservationSituation = "active" | "awaiting_payment" | "paid" | "cancelled" | "expired" | "released";

type CampaignReservation = {
  id: string;
  name: string;
  productName: string;
  flashPrice: number;
  orderNumber: number | null;
  situation: ReservationSituation;
  minutesLeft: number | null;
};

type Campaign = {
  id: string;
  name: string;
  isActive: boolean;
  slotLimit: number;
  chance: number;
  repeatAfterHours: number;
  startHour: number | null;
  endHour: number | null;
  items: CampaignItem[];
  seenCount: number;
  activeCount: number;
  usedCount: number;
  reservations?: CampaignReservation[];
};

function reservationLabel(row: CampaignReservation): string {
  if (row.situation === "active") return `Aguardando finalizar · faltam ${row.minutesLeft ?? 1} min`;
  if (row.situation === "awaiting_payment") return "Aguardando pagamento";
  if (row.situation === "paid") return "Pago";
  if (row.situation === "cancelled") return "Pedido cancelado";
  if (row.situation === "expired") return "Perdeu a hora";
  return "Tirou do carrinho";
}

type DraftItem = { productId: string; flashPrice: string };

function adminHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || "";
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

function foldProductName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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
  const [repeatAfterHours, setRepeatAfterHours] = useState("0");
  const [startHour, setStartHour] = useState("");
  const [endHour, setEndHour] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [productId, setProductId] = useState("");
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [flashPrice, setFlashPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [forceFirstVisit, setForceFirstVisit] = useState(false);
  const [forceSaving, setForceSaving] = useState(false);
  const [openVisitorIds, setOpenVisitorIds] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const [campaignRes, productRes, settingsRes] = await Promise.all([
      fetch(`${BASE}/api/admin/flash-campaigns`, { headers: adminHeaders() }),
      fetch(`${BASE}/api/admin/products`, { headers: adminHeaders() }),
      fetch(`${BASE}/api/admin/settings`, { headers: adminHeaders() }),
    ]);
    if (campaignRes.status === 401 || productRes.status === 401 || settingsRes.status === 401) {
      onUnauthorized();
      return;
    }
    const settings = await settingsRes.json().catch(() => ({})) as { flash_force_first_visit?: string };
    setForceFirstVisit(String(settings.flash_force_first_visit || "") === "1");
    const campaignData = await campaignRes.json() as { campaigns?: Campaign[] };
    const productData = await productRes.json() as {
      products?: Array<{
        id: string;
        name: string;
        price: number;
        image?: string | null;
        promoPrice?: number | null;
        promoEndsAt?: string | null;
        promoUntilStock?: boolean;
        promoStockLeft?: number | null;
      }>;
    };
    setCampaigns(campaignData.campaigns || []);
    setProducts((productData.products || []).map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.image || null,
      promoPrice: product.promoPrice == null ? null : Number(product.promoPrice),
      promoEndsAt: product.promoEndsAt ?? null,
      promoUntilStock: product.promoUntilStock === true,
      promoStockLeft: product.promoStockLeft == null ? null : Number(product.promoStockLeft),
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
    setRepeatAfterHours("0");
    setStartHour("");
    setEndHour("");
    setItems([]);
    setProductId("");
    setProductMenuOpen(false);
    setProductQuery("");
    setFlashPrice("");
  }

  function edit(campaign: Campaign) {
    setEditingId(campaign.id);
    setName(campaign.name);
    setIsActive(campaign.isActive);
    setSlotLimit(String(campaign.slotLimit));
    setChance(String(campaign.chance));
    setRepeatAfterHours(String(campaign.repeatAfterHours ?? 0));
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
    const ceiling = currentSellingPrice(product).amount;
    if (!Number.isFinite(price) || price <= 0 || price >= ceiling) {
      toast.error(currentSellingPrice(product).promo
        ? "O preço relâmpago tem de ser maior que zero e menor que o preço da promoção."
        : "O preço relâmpago tem de ser maior que zero e menor que o preço do cadastro.");
      return;
    }
    setItems((current) => [...current, { productId: product.id, flashPrice: price.toFixed(2) }]);
    setFlashPrice("");
  }

  async function toggleForceFirstVisit() {
    const next = !forceFirstVisit;
    setForceSaving(true);
    try {
      const response = await fetch(`${BASE}/api/admin/settings/flash_force_first_visit`, {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify({ value: next ? "1" : "0" }),
      });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      if (!response.ok) {
        toast.error("Não foi possível salvar o interruptor.");
        return;
      }
      setForceFirstVisit(next);
    } catch {
      toast.error("Não foi possível salvar o interruptor.");
    } finally {
      setForceSaving(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        name,
        isActive,
        slotLimit: Number(slotLimit),
        chance: Number(chance),
        repeatAfterHours: Number(repeatAfterHours),
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
  const visibleProducts = useMemo(() => {
    const query = foldProductName(productQuery.trim());
    if (!query) return products;
    return products.filter((product) => foldProductName(product.name).includes(query));
  }, [productQuery, products]);

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
          <label className="text-sm font-medium sm:col-span-2">
            Repetir depois de (horas)
            <input value={repeatAfterHours} onChange={(event) => setRepeatAfterHours(event.target.value)} inputMode="numeric" className="mt-1 h-10 w-full rounded-lg border border-border px-3" />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">0: quem viu não vê de novo nesta campanha. 24 libera 24 horas depois que o modal apareceu. O máximo é 2160.</span>
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
                {selectedProduct ? (
                  <span className="flex min-w-0 items-center gap-2 truncate text-sm">
                    <span className="truncate">{selectedProduct.name}</span>
                    <ProductPrice product={selectedProduct} />
                  </span>
                ) : "Produto"}
              </span>
            </button>
            {productMenuOpen ? (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-white shadow-lg">
                <div className="border-b border-border p-2">
                  <input
                    autoFocus
                    value={productQuery}
                    onChange={(event) => setProductQuery(event.target.value)}
                    placeholder="Digite o nome do produto"
                    className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                  />
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {visibleProducts.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground">Nenhum produto com esse nome.</p>
                  ) : visibleProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setProductId(product.id);
                        setProductQuery("");
                        setProductMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/60"
                    >
                      <ProductThumb src={product.image} alt={product.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{product.name}</span>
                        <ProductPrice product={product} />
                      </span>
                    </button>
                  ))}
                </div>
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-4">
        <div>
          <h2 className="font-bold">Mostrar na primeira visita</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ligado: ignora chance, horário, vaga e repetição. Cada cliente vê as campanhas ligadas uma vez, na primeira entrada.
          </p>
        </div>
        <button
          type="button"
          disabled={forceSaving}
          onClick={() => void toggleForceFirstVisit()}
          className={`h-10 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-60 ${forceFirstVisit ? "bg-emerald-600" : "bg-neutral-400"}`}
        >
          {forceSaving ? "Salvando..." : forceFirstVisit ? "Ligado" : "Desligado"}
        </button>
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
                  {campaign.isActive ? "Ligada" : "Desligada"} · {campaign.slotLimit} vagas · {campaign.chance}% · {campaign.repeatAfterHours > 0 ? `repete em ${campaign.repeatAfterHours}h` : "não repete"} · {hourLabel(campaign.startHour, "do início do dia")} até {hourLabel(campaign.endHour, "o fim do dia")}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => edit(campaign)} className="text-sm font-semibold text-primary">Editar</button>
                <button type="button" onClick={() => void remove(campaign.id)} className="text-sm font-semibold text-destructive">Apagar</button>
              </div>
            </div>
            <p className="mt-2 text-sm">
              {campaign.seenCount} viram a oferta · {campaign.activeCount} reservadas agora · {campaign.usedCount} viraram pedido
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
            {(campaign.reservations || []).length > 0 ? (
              <div className="mt-3 border-t border-border pt-2">
                <button
                  type="button"
                  aria-expanded={openVisitorIds[campaign.id] === true}
                  onClick={() => setOpenVisitorIds((current) => ({ ...current, [campaign.id]: !current[campaign.id] }))}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
                >
                  {openVisitorIds[campaign.id] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {openVisitorIds[campaign.id]
                    ? "Ocultar visitantes"
                    : `Ver visitantes (${(campaign.reservations || []).length})`}
                </button>
                {openVisitorIds[campaign.id] ? (
                  <ul className="mt-1 max-h-96 divide-y divide-border overflow-y-auto text-sm">
                    {(campaign.reservations || []).map((row) => (
                      <li key={row.id} className="flex items-center gap-3 py-2">
                        <span className="w-28 shrink-0 truncate font-medium" title={row.name}>{row.name}</span>
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">{row.productName}</span>
                        <span className="shrink-0 font-semibold text-[#ff6a00]">{formatCurrency(row.flashPrice)}</span>
                        {row.orderNumber != null ? <span className="shrink-0 text-muted-foreground">#{row.orderNumber}</span> : null}
                        <span className="w-44 shrink-0 text-right text-xs text-muted-foreground">{reservationLabel(row)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
