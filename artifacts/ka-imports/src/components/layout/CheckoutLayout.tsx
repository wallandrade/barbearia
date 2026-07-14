import { ReactNode, useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Footer } from "./Footer";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function parseLogoScalePercent(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(180, Math.max(60, Math.round(parsed)));
}

function useSiteBranding() {
  const [branding, setBranding] = useState<{ logo: string | null; siteName: string; logoScalePercent: number }>({
    logo: null,
    siteName: "",
    logoScalePercent: 100,
  });

  useEffect(() => {
    fetch(`${BASE}/api/settings`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        localStorage.setItem("siteSettings", JSON.stringify(data));
        setBranding({
          logo: data?.logo ?? null,
          siteName: String(data?.site_name ?? "").trim(),
          logoScalePercent: parseLogoScalePercent(data?.logo_scale_pct),
        });
      })
      .catch(() => {
        setBranding({ logo: null, siteName: "", logoScalePercent: 100 });
      });
  }, []);

  return branding;
}

export function CheckoutLayout({ children }: { children: ReactNode }) {
  const { logo, siteName, logoScalePercent } = useSiteBranding();
  const logoAlt = siteName || "Logo da loja";
  const logoBoxHeightPx = Math.round(32 * (logoScalePercent / 100));
  const logoBoxMaxWidthPx = Math.round(140 * (logoScalePercent / 100));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 w-full glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Voltar</span>
            </Link>
            <div className="flex-1 flex items-center justify-center gap-2">
              {logo && (
                <div
                  className="border border-primary/10 rounded-sm px-1 flex items-center justify-center"
                  style={{ height: `${logoBoxHeightPx}px`, maxWidth: `${logoBoxMaxWidthPx}px` }}
                >
                  <img src={logo} alt={logoAlt} className="h-full w-auto object-contain" />
                </div>
              )}
              {siteName ? <span className="font-display font-bold text-lg tracking-tight text-primary">{siteName}</span> : null}
            </div>
            <div className="w-16" />
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
