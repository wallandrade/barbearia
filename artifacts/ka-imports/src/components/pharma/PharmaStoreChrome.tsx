import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Menu, Search, ShoppingBag, User, X, Home, MessageCircle, ChevronDown } from "lucide-react";
import { getCustomerToken } from "@/lib/customer-auth";
import { useCart } from "@/store/use-cart";
import { formatCurrency, getActiveWhatsApp, getSellerSlugFromPath } from "@/lib/utils";
import { pharmaNameSuggestions, pharmaSalePrice } from "@/lib/pharma-catalog-query";
import { usePharmaLogin } from "@/components/pharma/PharmaLoginDialog";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function parseLogoScalePercent(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(180, Math.max(60, Math.round(parsed)));
}

function usePublicSiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      setSettings(JSON.parse(localStorage.getItem("siteSettings") || "{}") as Record<string, string>);
    } catch {
      setSettings({});
    }
    fetch(`${BASE}/api/settings`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: Record<string, string>) => {
        localStorage.setItem("siteSettings", JSON.stringify(data));
        setSettings(data || {});
      })
      .catch(() => {});
  }, []);
  return settings;
}

type PharmaSuggestProduct = {
  id: string;
  name: string;
  category: string;
  image: string | null;
  price: number;
  promoPrice: number | null;
  promoEndsAt: string | null;
  bulkDiscountEnabled: boolean;
  bulkDiscountTiers: unknown;
  isSoldOut: boolean;
};

function useStoreCatalog(): { categories: string[]; products: PharmaSuggestProduct[]; ready: boolean } {
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<PharmaSuggestProduct[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    fetch(`${BASE}/api/products`)
      .then((res) => res.json())
      .then((data: { categories?: string[]; products?: Array<Record<string, unknown>> }) => {
        const rows = Array.isArray(data.products) ? data.products : [];
        setProducts(
          rows
            .map((raw) => ({
              id: String(raw.id || ""),
              name: String(raw.name || ""),
              category: String(raw.category || "").trim(),
              image: typeof raw.image === "string" && raw.image.trim() ? raw.image : null,
              price: Number(raw.price) || 0,
              promoPrice: raw.promoPrice == null || raw.promoPrice === "" ? null : Number(raw.promoPrice),
              promoEndsAt: raw.promoEndsAt == null ? null : String(raw.promoEndsAt),
              bulkDiscountEnabled: raw.bulkDiscountEnabled === true,
              bulkDiscountTiers: raw.bulkDiscountTiers,
              isSoldOut: raw.isSoldOut === true,
            }))
            .filter((product) => product.id && product.name),
        );
        const fromApi = (data.categories ?? []).map((item) => String(item || "").trim()).filter(Boolean);
        if (fromApi.length > 0) {
          setCategories(fromApi);
          return;
        }
        const seen = new Set<string>();
        const list: string[] = [];
        for (const product of rows) {
          const category = String(product.category || "").trim();
          if (!category || seen.has(category)) continue;
          seen.add(category);
          list.push(category);
        }
        setCategories(list);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  return { categories, products, ready };
}

export function PharmaStoreChrome() {
  const { items, setIsOpen } = useCart();
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const authVersion = usePharmaLogin((state) => state.authVersion);
  const setLoginOpen = usePharmaLogin((state) => state.setOpen);
  const siteSettings = usePublicSiteSettings();
  const { categories, products, ready: catalogReady } = useStoreCatalog();
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const catBtnRef = useRef<HTMLButtonElement>(null);
  const catMenuRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ down: false, x: 0, left: 0, moved: false });

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  void authVersion;
  const loggedIn = Boolean(getCustomerToken());
  const logo = siteSettings.logo ?? "";
  const siteName = String(siteSettings.site_name ?? "").trim();
  const logoScale = parseLogoScalePercent(siteSettings.logo_scale_pct);
  const sellerSlug = getSellerSlugFromPath(location);
  const homeHref = sellerSlug ? `/${encodeURIComponent(sellerSlug)}` : "/";
  const offersHref = sellerSlug ? `/${encodeURIComponent(sellerSlug)}/ofertas` : "/ofertas";
  const params = new URLSearchParams(searchString);
  const activeCategory = params.get("categoria") || "";
  const suggestions = useMemo(
    () => pharmaNameSuggestions(products, searchValue, 8),
    [products, searchValue],
  );
  const showSuggestions = suggestionsOpen && searchValue.trim().length > 0;

  useEffect(() => {
    function closeSuggestions(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (searchRef.current?.contains(target)) return;
      setSuggestionsOpen(false);
    }
    document.addEventListener("mousedown", closeSuggestions);
    document.addEventListener("touchstart", closeSuggestions);
    return () => {
      document.removeEventListener("mousedown", closeSuggestions);
      document.removeEventListener("touchstart", closeSuggestions);
    };
  }, []);

  useEffect(() => {
    setSearchValue(new URLSearchParams(searchString).get("q") || "");
    setSuggestionsOpen(false);
    setMenuOpen(false);
  }, [location, searchString]);

  useEffect(() => {
    if (!catOpen) return;
    function closeOnPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (catBtnRef.current?.contains(target) || catMenuRef.current?.contains(target)) return;
      setCatOpen(false);
    }
    document.addEventListener("mousedown", closeOnPointer);
    return () => document.removeEventListener("mousedown", closeOnPointer);
  }, [catOpen]);

  function catalogPath(): string {
    const path = location.split("?")[0] || "/";
    if (path === homeHref || path === "/ofertas" || path.endsWith("/ofertas") || path.includes("/categoria/")) return path;
    return homeHref;
  }

  function goWithQuery(next: URLSearchParams, path = catalogPath()) {
    const qs = next.toString();
    setLocation(qs ? `${path}?${qs}` : path);
  }

  function handleSearch(event?: FormEvent) {
    event?.preventDefault();
    const next = new URLSearchParams(searchString);
    const q = searchValue.trim();
    if (q) next.set("q", q);
    else next.delete("q");
    next.delete("pagina");
    setSuggestionsOpen(false);
    goWithQuery(next);
  }

  function productHref(id: string): string {
    return sellerSlug ? `/${sellerSlug}/produto/${id}` : `/produto/${id}`;
  }

  function selectCategory(category: string) {
    const next = new URLSearchParams(searchString);
    if (category) next.set("categoria", category);
    else next.delete("categoria");
    next.delete("pagina");
    setCatOpen(false);
    goWithQuery(next, homeHref);
  }

  function openCategories() {
    const button = catBtnRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 8, left: Math.max(12, rect.left) });
    setCatOpen((open) => !open);
  }

  function onMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || !scrollerRef.current) return;
    dragRef.current = { down: true, x: event.clientX, left: scrollerRef.current.scrollLeft, moved: false };
  }

  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!dragRef.current.down || !scrollerRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    if (Math.abs(dx) >= 6) dragRef.current.moved = true;
    if (dragRef.current.moved) scrollerRef.current.scrollLeft = dragRef.current.left - dx;
  }

  function onMouseUp() {
    dragRef.current.down = false;
    window.setTimeout(() => {
      dragRef.current.moved = false;
    }, 0);
  }

  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!dragRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
  }

  async function openSupportWhatsApp() {
    let number = getActiveWhatsApp();
    if (sellerSlug) {
      try {
        const res = await fetch(`${BASE}/api/sellers/${encodeURIComponent(sellerSlug)}`);
        if (res.ok) {
          const data = (await res.json()) as { whatsapp?: string };
          const sellerWhatsApp = String(data?.whatsapp || "").replace(/\D/g, "");
          if (sellerWhatsApp) number = sellerWhatsApp;
        }
      } catch {
        // Mantém o número já guardado.
      }
    }
    window.open(`https://wa.me/${number}?text=${encodeURIComponent("Olá, gostaria de suporte.")}`, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
        <div className="h-1 bg-gradient-to-r from-orange-500 via-red-500 to-red-600" />
        <div ref={searchRef} className="relative z-20">
        <div className="flex h-14 items-center gap-2 px-3">
          <button
            type="button"
            className="rounded-full p-2 md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href={homeHref} className="flex shrink-0 items-center">
            {logo ? (
              <img
                src={logo}
                alt={siteName || "Logo da loja"}
                className="w-auto object-contain"
                style={{ height: `${Math.round(32 * (logoScale / 100))}px`, maxWidth: `${Math.round(120 * (logoScale / 100))}px` }}
              />
            ) : (
              <span className="max-w-[7rem] truncate text-sm font-bold text-neutral-900">{siteName || "Loja"}</span>
            )}
          </Link>
          <form onSubmit={handleSearch} className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchValue}
              onChange={(event) => {
                const value = event.target.value;
                setSearchValue(value);
                setSuggestionsOpen(value.trim().length > 0);
              }}
              onFocus={() => {
                if (searchValue.trim()) setSuggestionsOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setSuggestionsOpen(false);
                }
              }}
              placeholder="Buscar produtos.."
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
              className="h-11 w-full rounded-full bg-[#f3f4f6] pl-9 pr-3 text-sm outline-none"
            />
          </form>
          {loggedIn ? (
            <Link href="/minha-conta/pedidos" className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200" aria-label="Minha conta">
              <User className="h-5 w-5" />
            </Link>
          ) : (
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200" aria-label="Entrar" onClick={() => setLoginOpen(true)}>
              <User className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--pharma-cart)] text-white"
            aria-label="Carrinho"
            onClick={() => setIsOpen(true)}
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--pharma-green)] px-1 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </button>
        </div>
        {showSuggestions && (
          <div className="absolute top-full right-3 left-3 z-30 mt-1 max-h-80 overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-xl">
            {!catalogReady ? (
              <p className="px-4 py-3 text-sm text-neutral-500">Buscando produtos...</p>
            ) : suggestions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-neutral-500">Nenhum produto encontrado.</p>
            ) : (
              suggestions.map((product) => {
                const sale = pharmaSalePrice(product);
                return (
                  <Link
                    key={product.id}
                    href={productHref(product.id)}
                    onClick={() => setSuggestionsOpen(false)}
                    className="flex items-center gap-3 border-b border-neutral-100 px-3 py-2.5 last:border-0 hover:bg-neutral-50"
                  >
                    {product.image ? (
                      <img src={product.image} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-neutral-200 object-cover" />
                    ) : (
                      <span className="h-10 w-10 shrink-0 rounded-lg border border-neutral-200 bg-neutral-100" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-neutral-900">{product.name}</span>
                      <span className="block truncate text-xs text-neutral-500">
                        {product.isSoldOut ? "Esgotado" : product.category}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-[var(--pharma-green-ink)]">{formatCurrency(sale)}</span>
                  </Link>
                );
              })
            )}
          </div>
        )}
        </div>
        <div
          ref={scrollerRef}
          className="flex cursor-grab gap-2 overflow-x-auto px-3 py-2 scrollbar-hide active:cursor-grabbing"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onClickCapture={onClickCapture}
          onScroll={() => setCatOpen(false)}
        >
          <button
            ref={catBtnRef}
            type="button"
            onClick={openCategories}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--pharma-green)] px-4 py-2 text-sm font-semibold text-white"
          >
            Categorias
            <ChevronDown className={`h-4 w-4 transition-transform ${catOpen ? "rotate-180" : ""}`} />
          </button>
          <Link href={offersHref} className="shrink-0 rounded-full border border-[var(--pharma-green)]/30 bg-[var(--pharma-green-soft)] px-4 py-2 text-sm font-semibold text-[var(--pharma-green-ink)]">
            🔥 Promoções 🔥
          </Link>
          {categories.map((category) => {
            const selected = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => selectCategory(selected ? "" : category)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${selected ? "border-[var(--pharma-green)] bg-[var(--pharma-green)] text-white" : "border-neutral-200 bg-white text-neutral-800"}`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </header>

      {catOpen && (
        <div
          ref={catMenuRef}
          className="fixed z-50 max-h-[70vh] w-[min(18.5rem,calc(100vw-1.5rem))] overflow-y-auto rounded-3xl bg-white p-3 shadow-xl"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <button
            type="button"
            className={`block w-full rounded-xl px-4 py-2.5 text-left text-sm ${activeCategory === "" ? "bg-[var(--pharma-green)] font-semibold text-white" : "font-medium text-neutral-800"}`}
            onClick={() => selectCategory("")}
          >
            Todos os produtos
          </button>
          {categories.map((category) => {
            const selected = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                className={`mt-0.5 block w-full rounded-xl px-4 py-2.5 text-left text-sm ${selected ? "bg-[var(--pharma-green)] font-semibold text-white" : "font-medium text-neutral-800"}`}
                onClick={() => selectCategory(category)}
              >
                {category}
              </button>
            );
          })}
        </div>
      )}

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/35 md:hidden" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-0 left-0 z-50 flex h-full w-72 flex-col bg-white shadow-2xl md:hidden">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <span className="font-bold">Menu</span>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X className="h-5 w-5" /></button>
            </div>
            <nav className="space-y-1 px-3 py-4">
              <Link href={homeHref} className="flex items-center gap-3 rounded-xl px-3 py-3" onClick={() => setMenuOpen(false)}>
                <Home className="h-5 w-5" /> Produtos
              </Link>
              {loggedIn ? (
                <Link href="/minha-conta/pedidos" className="flex items-center gap-3 rounded-xl px-3 py-3" onClick={() => setMenuOpen(false)}>
                  <User className="h-5 w-5" /> Minha conta
                </Link>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left"
                  onClick={() => { setMenuOpen(false); setLoginOpen(true); }}
                >
                  <User className="h-5 w-5" /> Entrar / Criar conta
                </button>
              )}
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-green-700"
                onClick={() => { setMenuOpen(false); void openSupportWhatsApp(); }}
              >
                <MessageCircle className="h-5 w-5" /> Suporte via WhatsApp
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left"
                onClick={() => { setMenuOpen(false); setIsOpen(true); }}
              >
                <ShoppingBag className="h-5 w-5" /> Carrinho
              </button>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
