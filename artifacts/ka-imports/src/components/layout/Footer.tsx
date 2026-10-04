import { useEffect, useState } from "react";
import { Link } from "wouter";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveWhatsApp } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const RESERVED_FIRST_SEGMENTS = new Set([
  "",
  "admin",
  "login",
  "checkout",
  "pix",
  "success",
  "r",
  "pagamento",
  "payment-link",
  "kyc",
  "rifas",
  "produto",
  "frete",
]);

function getSellerSlugFromPathname(pathname: string): string | null {
  const seg = pathname.replace(/^\/+/, "").split("/")[0]?.toLowerCase() ?? "";
  if (!seg || RESERVED_FIRST_SEGMENTS.has(seg)) return null;
  return seg;
}

async function resolveSupportWhatsApp(): Promise<string> {
  const slug = getSellerSlugFromPathname(window.location.pathname);
  if (!slug) return getActiveWhatsApp();

  try {
    const res = await fetch(`${BASE}/api/sellers/${encodeURIComponent(slug)}`);
    if (res.ok) {
      const data = (await res.json()) as { whatsapp?: string };
      const whatsapp = (data?.whatsapp ?? "").replace(/\D/g, "");
      if (whatsapp) {
        try { sessionStorage.setItem("sellerWhatsapp", whatsapp); } catch {}
        try { sessionStorage.setItem("sellerWhatsappSlug", slug); } catch {}
        return whatsapp;
      }
    }
  } catch {
    // ignore and fallback below
  }

  return getActiveWhatsApp();
}

async function openWhatsApp(text: string) {
  const number = await resolveSupportWhatsApp();
  const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function useFooterCategories(): string[] {
  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => {
    fetch(`${BASE}/api/products`)
      .then((res) => res.json())
      .then((data: { categories?: string[]; products?: Array<{ category?: string }> }) => {
        const fromApi = (data.categories ?? []).map((item) => String(item || "").trim()).filter(Boolean);
        if (fromApi.length > 0) {
          setCategories(fromApi);
          return;
        }
        const seen = new Set<string>();
        const list: string[] = [];
        for (const product of data.products ?? []) {
          const category = String(product.category || "").trim();
          if (!category || seen.has(category)) continue;
          seen.add(category);
          list.push(category);
        }
        setCategories(list);
      })
      .catch(() => {});
  }, []);
  return categories;
}

function categoryHref(category: string): string {
  const slug = getSellerSlugFromPathname(window.location.pathname);
  const query = `categoria=${encodeURIComponent(category)}`;
  return slug ? `/${encodeURIComponent(slug)}?${query}` : `/?${query}`;
}

export function Footer() {
  const categories = useFooterCategories();
  return (
    <footer className="bg-white border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="font-bold text-xl text-primary">Yury</span>
            </div>
            <p className="text-muted-foreground text-sm">
              A sua loja de importados com os melhores preços e garantia de qualidade.
            </p>
          </div>

          {categories.length > 0 && (
            <div>
              <h3 className="font-bold text-foreground mb-4">Categorias</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {categories.map((category) => (
                  <li key={category}>
                    <Link href={categoryHref(category)} className="hover:text-primary transition-colors">
                      {category}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="font-bold text-foreground mb-4">Links Úteis</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/" className="hover:text-primary transition-colors">Produtos</a></li>
              <li>
                <button
                  type="button"
                  onClick={() => openWhatsApp("Olá, gostaria de suporte.")}
                  className="hover:text-primary transition-colors"
                >
                  Suporte
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-4">Atendimento</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Precisa de ajuda? Fale com nosso suporte diretamente pelo WhatsApp.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600"
              onClick={() => openWhatsApp("Olá, gostaria de tirar uma dúvida.")}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Suporte via WhatsApp
            </Button>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Yury - Todos os direitos reservados</p>
        </div>
      </div>
    </footer>
  );
}
