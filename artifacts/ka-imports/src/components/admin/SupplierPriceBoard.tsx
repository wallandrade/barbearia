import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Offer = {
  mapId: string;
  supplierName: string;
  url: string | null;
  unitsPerPack: number;
  priceUsd: number | null;
  pricePerUnitUsd: number | null;
  localPrice: number | null;
  localCurrency: string | null;
  tiers: Array<{ min: number; max: number | null; amount: number }> | null;
  inStock: boolean;
  stockQty: number | null;
  ok: boolean;
  error: string | null;
  collectedAt: string | null;
  position: number | null;
  label: "ok" | "fora_de_estoque" | "erro";
  swingWarning: boolean;
};

type ProductCard = { key: string; name: string; image: string | null; offers: Offer[] };
type Site = { id: string; name: string; parserType: string; active: boolean };
type MapRow = {
  id: string;
  displayName: string;
  supplierSiteId: string;
  externalUrl: string | null;
  externalSku: string | null;
  unitsPerPack: number;
  active: boolean;
  imageUrl: string | null;
};

function moneyUsd(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function moneyLocal(offer: Offer): string {
  if (offer.localPrice == null) return "";
  const prefix = offer.localCurrency === "BRL" ? "R$" : offer.localCurrency || "";
  return `${prefix} ${offer.localPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
}

function when(value: string | null): string {
  if (!value) return "sem coleta";
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function labelOf(offer: Offer): string {
  if (offer.label === "erro") return offer.error || "erro";
  if (offer.label === "fora_de_estoque") return "fora de estoque";
  if (offer.stockQty != null) return `${offer.stockQty} em estoque`;
  return "em estoque";
}

export function SupplierPriceBoard({ headers }: { headers: Record<string, string> }) {
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [maps, setMaps] = useState<MapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({ displayName: "", supplierSiteId: "", externalUrl: "", externalSku: "", unitsPerPack: "1", imageUrl: "" });
  const headersRef = useRef(headers);
  headersRef.current = headers;

  const load = useCallback(async () => {
    const headers = headersRef.current;
    setLoading(true);
    try {
      const [rankingRes, sitesRes, mapsRes] = await Promise.all([
        fetch(`${BASE}/api/admin/supplier-prices/ranking`, { headers }),
        fetch(`${BASE}/api/admin/supplier-prices/sites`, { headers }),
        fetch(`${BASE}/api/admin/supplier-prices/maps`, { headers }),
      ]);
      const ranking = await rankingRes.json() as { products?: ProductCard[] };
      const siteBody = await sitesRes.json() as { sites?: Site[] };
      const mapBody = await mapsRes.json() as { maps?: MapRow[] };
      setProducts(ranking.products || []);
      setSites(siteBody.sites || []);
      setMaps(mapBody.maps || []);
    } catch {
      toast.error("Não foi possível ler o ranking de fornecedores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function refreshNow() {
    setBusy(true);
    try {
      const res = await fetch(`${BASE}/api/admin/supplier-prices/collect`, { method: "POST", headers });
      const data = await res.json() as { message?: string; failed?: number };
      if (!res.ok) {
        toast.error(data.message || "A coleta não rodou.");
        return;
      }
      toast.success(data.failed ? `Coleta feita. ${data.failed} vínculo(s) com erro.` : "Preços atualizados.");
      await load();
    } catch {
      toast.error("A coleta não rodou.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMap() {
    setBusy(true);
    try {
      const res = await fetch(`${BASE}/api/admin/supplier-prices/maps`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          unitsPerPack: Number(form.unitsPerPack) || 1,
          active: true,
        }),
      });
      const data = await res.json() as { message?: string };
      if (!res.ok) {
        toast.error(data.message || "Não foi possível salvar o vínculo.");
        return;
      }
      toast.success("Vínculo salvo.");
      setOpenForm(false);
      await load();
    } catch {
      toast.error("Não foi possível salvar o vínculo.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleMap(map: MapRow) {
    await fetch(`${BASE}/api/admin/supplier-prices/maps/${map.id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ active: !map.active }),
    });
    await load();
  }

  return (
    <section className="bg-white rounded-2xl border border-border/60 shadow-sm p-5 mb-6">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Ranking de custo por fornecedor</h2>
          <p className="text-xs text-muted-foreground">Só consulta. Não altera o preço de venda da loja.</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => setOpenForm((open) => !open)} className="h-9 px-3 rounded-xl border border-border text-xs font-semibold">
            Vínculos
          </button>
          <button type="button" onClick={() => void refreshNow()} disabled={busy} className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-60">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Atualizar agora
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum vínculo ativo. A coleta das 6 h preenche os preços.</p>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => (
            <article key={product.key} className="rounded-2xl border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                {product.image ? (
                  <img src={product.image} alt="" className="h-14 w-14 rounded-xl object-cover bg-muted" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-muted" />
                )}
                <h3 className="font-semibold text-foreground">{product.name}</h3>
              </div>
              <ul className="space-y-2">
                {product.offers.map((offer) => (
                  <li key={offer.mapId} className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-semibold w-6">{offer.position ?? "–"}</span>
                      <span className="font-medium">{offer.supplierName}</span>
                      <span>{moneyUsd(offer.priceUsd)}</span>
                      {offer.unitsPerPack > 1 ? <span className="text-xs text-muted-foreground">{moneyUsd(offer.pricePerUnitUsd)} / un.</span> : null}
                      {moneyLocal(offer) ? <span className="text-muted-foreground">{moneyLocal(offer)} no site</span> : null}
                      <span className={offer.label === "ok" ? "text-emerald-700" : "text-amber-700"}>{labelOf(offer)}</span>
                      <span className="text-xs text-muted-foreground">{when(offer.collectedAt)} BRT</span>
                      {offer.url ? (
                        <a href={offer.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary">
                          Ficha <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : null}
                    </div>
                    {offer.swingWarning ? <p className="text-xs text-amber-700 mt-1">Variação acima de 30% em relação à coleta anterior.</p> : null}
                    {Array.isArray(offer.tiers) && offer.tiers.length > 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Faixas: {offer.tiers.map((tier) => `${tier.min}${tier.max == null ? "+" : `–${tier.max}`} ${moneyUsd(tier.amount)}`).join(" · ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      {openForm ? (
        <div className="mt-4 rounded-2xl border border-border p-4 space-y-3">
          <p className="text-sm font-semibold">Novo vínculo</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="Nome do produto" className="h-10 px-3 rounded-xl border border-border text-sm" />
            <select value={form.supplierSiteId} onChange={(event) => setForm({ ...form, supplierSiteId: event.target.value })} className="h-10 px-3 rounded-xl border border-border text-sm">
              <option value="">Fornecedor</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name}{site.active ? "" : " (inativo)"}</option>)}
            </select>
            <input value={form.externalUrl} onChange={(event) => setForm({ ...form, externalUrl: event.target.value })} placeholder="URL da ficha" className="h-10 px-3 rounded-xl border border-border text-sm sm:col-span-2" />
            <input value={form.externalSku} onChange={(event) => setForm({ ...form, externalSku: event.target.value })} placeholder="SKU no fornecedor" className="h-10 px-3 rounded-xl border border-border text-sm" />
            <input value={form.unitsPerPack} onChange={(event) => setForm({ ...form, unitsPerPack: event.target.value })} placeholder="Unidades na embalagem" className="h-10 px-3 rounded-xl border border-border text-sm" />
            <input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="Foto (opcional)" className="h-10 px-3 rounded-xl border border-border text-sm sm:col-span-2" />
          </div>
          <button type="button" disabled={busy} onClick={() => void saveMap()} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">Salvar vínculo</button>
          {maps.length > 0 ? (
            <ul className="text-xs text-muted-foreground space-y-1">
              {maps.map((map) => (
                <li key={map.id} className="flex items-center gap-2">
                  <button type="button" onClick={() => void toggleMap(map)} className="underline">{map.active ? "Desligar" : "Ligar"}</button>
                  <span>{map.displayName} · {sites.find((site) => site.id === map.supplierSiteId)?.name || map.supplierSiteId} · {map.unitsPerPack} un. {map.active ? "" : "· fora do ranking"}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
