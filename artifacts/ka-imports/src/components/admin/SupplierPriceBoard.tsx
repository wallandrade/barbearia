import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Compared = {
  siteId: string;
  siteName: string;
  url: string | null;
  priceUsd: number | null;
  localPrice: number | null;
  localCurrency: string | null;
  inStock: boolean;
  collectedAt: string | null;
  position: number | null;
  label: "ok" | "fora_de_estoque";
  source: "auto" | "manual";
};

type Deal = {
  rank: number;
  productId: string | null;
  name: string;
  image: string | null;
  soldQty: number;
  fingerprint: string | null;
  found: boolean;
  cheapestStore: string | null;
  priceUsd: number | null;
  localPrice: number | null;
  localCurrency: string | null;
  storeCount: number;
  gapUsd: number | null;
  nextGapUsd: number | null;
  tieWith: string | null;
  collectedAt: string | null;
  url: string | null;
  badge: "auto" | "confirmado" | null;
  offers: Compared[];
};

type Site = { id: string; name: string; active: boolean };
type MapRow = { id: string; displayName: string; supplierSiteId: string; unitsPerPack: number; active: boolean };

function moneyUsd(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function moneyLocal(value: number | null, currency: string | null): string {
  if (value == null) return "";
  const prefix = currency === "BRL" ? "R$" : currency || "";
  return `${prefix} ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
}

function OfferList({ product, onLink, onDecide }: { product: Deal; onLink: () => void; onDecide: (action: string) => void }) {
  return (
    <div className="space-y-2">
      {product.found && product.url ? <a href={product.url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">Abrir a mais barata <ExternalLink className="w-3 h-3" /></a> : (
        <button type="button" className="text-xs underline" onClick={onLink}>Vincular manualmente</button>
      )}
      {product.fingerprint ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="text-xs underline" onClick={() => onDecide("confirm")}>Confirmar</button>
          <button type="button" className="text-xs underline" onClick={() => onDecide("reject")}>Rejeitar</button>
        </div>
      ) : null}
      <ul className="space-y-1">
        {product.offers.map((offer) => (
          <li key={`${offer.siteId}-${offer.url}`} className="rounded-xl bg-muted/40 px-3 py-2 text-sm flex flex-wrap gap-x-3">
            <span className="font-semibold w-6">{offer.position ?? "–"}</span>
            <span>{offer.siteName}</span>
            <span>{moneyUsd(offer.priceUsd)}</span>
            {moneyLocal(offer.localPrice, offer.localCurrency) ? <span className="text-muted-foreground">{moneyLocal(offer.localPrice, offer.localCurrency)}</span> : null}
            <span className={offer.label === "ok" ? "text-emerald-700" : "text-amber-700"}>{offer.label === "ok" ? "em estoque" : "fora de estoque"}</span>
            <span className="text-xs text-muted-foreground">{offer.source === "manual" ? "vínculo" : "auto"}</span>
            {offer.url ? <a href={offer.url} target="_blank" rel="noreferrer" className="text-xs text-primary">Ficha</a> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FragmentRow({ product, open, onToggle, onLink, onDecide }: { product: Deal; open: boolean; onToggle: () => void; onLink: () => void; onDecide: (action: string) => void }) {
  return (
    <>
      <tr className="border-b border-border/70 cursor-pointer" onClick={onToggle}>
        <td className="py-3 pr-3 font-semibold">{product.rank}</td>
        <td className="py-3 pr-3">
          <div className="flex items-center gap-3">
            {product.image ? <img src={product.image} alt="" className="h-10 w-10 rounded-lg object-cover bg-muted" /> : <div className="h-10 w-10 rounded-lg bg-muted" />}
            <span className="font-medium">{product.name}</span>
          </div>
        </td>
        <td className="py-3 pr-3">{product.soldQty}</td>
        <td className="py-3 pr-3">{product.found ? product.cheapestStore : "—"}</td>
        <td className="py-3 pr-3">{product.found ? `${moneyUsd(product.priceUsd)}${moneyLocal(product.localPrice, product.localCurrency) ? ` · ${moneyLocal(product.localPrice, product.localCurrency)}` : ""}` : "não encontrado"}</td>
        <td className="py-3 pr-3">{product.found ? product.storeCount : "—"}</td>
        <td className="py-3 pr-3">{product.tieWith ? `empate com ${product.tieWith}` : product.gapUsd != null ? `${moneyUsd(product.gapUsd)} acima na 2ª` : "—"}</td>
        <td className="py-3">{product.found ? `${when(product.collectedAt)} BRT` : "—"}</td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={8} className="pb-4">
            <OfferList product={product} onLink={onLink} onDecide={onDecide} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function when(value: string | null): string {
  if (!value) return "sem coleta";
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function SupplierPriceBoard({ headers }: { headers: Record<string, string> }) {
  const [products, setProducts] = useState<Deal[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [maps, setMaps] = useState<MapRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);
  const [form, setForm] = useState({ displayName: "", supplierSiteId: "", externalUrl: "", externalSku: "", unitsPerPack: "4", imageUrl: "" });
  const headersRef = useRef(headers);
  headersRef.current = headers;

  const load = useCallback(async () => {
    const auth = headersRef.current;
    setLoading(true);
    try {
      const [dealsRes, sitesRes, mapsRes] = await Promise.all([
        fetch(`${BASE}/api/admin/supplier-prices/deals`, { headers: auth }),
        fetch(`${BASE}/api/admin/supplier-prices/sites`, { headers: auth }),
        fetch(`${BASE}/api/admin/supplier-prices/maps`, { headers: auth }),
      ]);
      const deals = await dealsRes.json() as { products?: Deal[]; windowDays?: number };
      const siteBody = await sitesRes.json() as { sites?: Site[] };
      const mapBody = await mapsRes.json() as { maps?: MapRow[] };
      setProducts(deals.products || []);
      if (deals.windowDays === 7 || deals.windowDays === 30 || deals.windowDays === 90) setWindowDays(deals.windowDays);
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
      const res = await fetch(`${BASE}/api/admin/supplier-prices/collect`, { method: "POST", headers: headersRef.current });
      if (!res.ok) {
        toast.error("A coleta não rodou.");
        return;
      }
      toast.success("Catálogos consultados.");
      await load();
    } catch {
      toast.error("A coleta não rodou.");
    } finally {
      setBusy(false);
    }
  }

  async function changeWindow(days: 7 | 30 | 90) {
    setBusy(true);
    try {
      const res = await fetch(`${BASE}/api/admin/settings/supplier_price_sales_window_days`, {
        method: "PUT",
        headers: { ...headersRef.current, "Content-Type": "application/json" },
        body: JSON.stringify({ value: String(days) }),
      });
      if (!res.ok) {
        toast.error("Não foi possível salvar o período.");
        return;
      }
      setWindowDays(days);
      await load();
    } catch {
      toast.error("Não foi possível salvar o período.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(fingerprint: string, action: string) {
    await fetch(`${BASE}/api/admin/supplier-prices/groups`, {
      method: "POST",
      headers: { ...headersRef.current, "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint, action }),
    });
    await load();
  }

  async function saveMap() {
    setBusy(true);
    try {
      const res = await fetch(`${BASE}/api/admin/supplier-prices/maps`, {
        method: "POST",
        headers: { ...headersRef.current, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, unitsPerPack: Number(form.unitsPerPack) || 1, active: true }),
      });
      if (!res.ok) {
        toast.error("Não foi possível salvar o vínculo.");
        return;
      }
      toast.success("Vínculo salvo. Ele tem prioridade sobre o casamento automático.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Seus 10 mais vendidos — onde está mais barato hoje</h2>
          <p className="text-sm text-muted-foreground">Só pedidos pagos. Só consulta. Anabolizante não entra.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border p-0.5">
            {([7, 30, 90] as const).map((days) => (
              <button key={days} type="button" disabled={busy} onClick={() => void changeWindow(days)} className={`h-9 px-3 rounded-lg text-xs font-semibold ${windowDays === days ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {days} dias
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void refreshNow()} disabled={busy} className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-60">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Atualizar agora
          </button>
        </div>
      </div>

      {loading ? <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div> : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma venda paga no período. Use Atualizar agora depois que houver pedidos.</p>
      ) : (
        <>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Produto</th>
                <th className="py-2 pr-3 font-medium">Vendidos</th>
                <th className="py-2 pr-3 font-medium">Mais barata</th>
                <th className="py-2 pr-3 font-medium">Preço</th>
                <th className="py-2 pr-3 font-medium">Lojas</th>
                <th className="py-2 pr-3 font-medium">Diferença</th>
                <th className="py-2 font-medium">Coleta</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <FragmentRow key={`${product.productId || product.name}-${product.rank}`} product={product} open={open === String(product.rank)} onToggle={() => setOpen(open === String(product.rank) ? null : String(product.rank))} onLink={() => setForm({ ...form, displayName: product.name })} onDecide={(action) => void decide(product.fingerprint || "", action)} />
              ))}
            </tbody>
          </table>
        </div>
        <ul className="md:hidden divide-y divide-border rounded-2xl border border-border">
          {products.map((product) => (
            <li key={`${product.productId || product.name}-${product.rank}`}>
              <button type="button" onClick={() => setOpen(open === String(product.rank) ? null : String(product.rank))} className="w-full text-left px-3 py-3 flex gap-3 items-start">
                <span className="font-bold text-sm w-5 pt-3">{product.rank}</span>
                {product.image ? <img src={product.image} alt="" className="h-12 w-12 rounded-xl object-cover bg-muted" /> : <div className="h-12 w-12 rounded-xl bg-muted" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{product.name}</span>
                    <span className="text-xs text-muted-foreground">{product.soldQty} vendidos</span>
                    {product.badge ? <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ${product.badge === "confirmado" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{product.badge}</span> : null}
                  </div>
                  {product.found ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {product.cheapestStore} · {moneyUsd(product.priceUsd)}
                      {moneyLocal(product.localPrice, product.localCurrency) ? ` · ${moneyLocal(product.localPrice, product.localCurrency)} no site` : ""}
                      {" · "}{product.storeCount} lojas
                      {product.tieWith ? ` · empate com ${product.tieWith}` : product.gapUsd != null ? ` · ${moneyUsd(product.gapUsd)} acima na 2ª` : ""}
                      {product.tieWith && product.nextGapUsd != null ? ` · próximo preço ${moneyUsd(product.nextGapUsd)} a mais` : ""}
                      {" · "}{when(product.collectedAt)} BRT
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700 mt-1">não encontrado nos fornecedores</p>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 mt-1 ${open === String(product.rank) ? "rotate-180" : ""}`} />
              </button>
              {open === String(product.rank) ? (
                <div className="px-3 pb-3 space-y-2">
                  {product.found && product.url ? <a href={product.url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">Abrir a mais barata <ExternalLink className="w-3 h-3" /></a> : (
                    <button type="button" className="text-xs underline" onClick={() => setForm({ ...form, displayName: product.name })}>Vincular manualmente</button>
                  )}
                  {product.fingerprint ? (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="text-xs underline" onClick={() => void decide(product.fingerprint || "", "confirm")}>Confirmar</button>
                      <button type="button" className="text-xs underline" onClick={() => void decide(product.fingerprint || "", "reject")}>Rejeitar</button>
                    </div>
                  ) : null}
                  <ul className="space-y-1">
                    {product.offers.map((offer) => (
                      <li key={`${offer.siteId}-${offer.url}`} className="rounded-xl bg-muted/40 px-3 py-2 text-sm flex flex-wrap gap-x-3">
                        <span className="font-semibold w-6">{offer.position ?? "–"}</span>
                        <span>{offer.siteName}</span>
                        <span>{moneyUsd(offer.priceUsd)}</span>
                        {moneyLocal(offer.localPrice, offer.localCurrency) ? <span className="text-muted-foreground">{moneyLocal(offer.localPrice, offer.localCurrency)}</span> : null}
                        <span className={offer.label === "ok" ? "text-emerald-700" : "text-amber-700"}>{offer.label === "ok" ? "em estoque" : "fora de estoque"}</span>
                        <span className="text-xs text-muted-foreground">{offer.source === "manual" ? "vínculo" : "auto"}</span>
                        {offer.url ? <a href={offer.url} target="_blank" rel="noreferrer" className="text-xs text-primary">Ficha</a> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        </>
      )}
      </div>

      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 sm:p-6 space-y-3">
          <p className="text-sm font-semibold">Vínculo manual</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="Nome, ex. TG 15 mg 4 frascos" className="h-10 px-3 rounded-xl border border-border text-sm" />
            <select value={form.supplierSiteId} onChange={(event) => setForm({ ...form, supplierSiteId: event.target.value })} className="h-10 px-3 rounded-xl border border-border text-sm">
              <option value="">Fornecedor</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name}{site.active ? "" : " (inativo)"}</option>)}
            </select>
            <input value={form.externalUrl} onChange={(event) => setForm({ ...form, externalUrl: event.target.value })} placeholder="URL da ficha" className="h-10 px-3 rounded-xl border border-border text-sm sm:col-span-2" />
            <input value={form.externalSku} onChange={(event) => setForm({ ...form, externalSku: event.target.value })} placeholder="SKU" className="h-10 px-3 rounded-xl border border-border text-sm" />
            <input value={form.unitsPerPack} onChange={(event) => setForm({ ...form, unitsPerPack: event.target.value })} placeholder="Unidades na embalagem" className="h-10 px-3 rounded-xl border border-border text-sm" />
          </div>
          <button type="button" disabled={busy} onClick={() => void saveMap()} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Salvar vínculo</button>
          <ul className="text-xs text-muted-foreground space-y-1">
            {maps.map((map) => <li key={map.id}>{map.displayName} · {sites.find((site) => site.id === map.supplierSiteId)?.name} · {map.active ? "ativo" : "inativo"}</li>)}
          </ul>
      </div>
    </section>
  );
}
