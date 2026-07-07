import { ReactNode, useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Footer } from "./Footer";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useSiteBranding() {
  const [branding, setBranding] = useState<{ logo: string | null; siteName: string }>({
    logo: null,
    siteName: "Clayton",
  });

  useEffect(() => {
    fetch(`${BASE}/api/settings`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        localStorage.setItem("siteSettings", JSON.stringify(data));
        setBranding({
          logo: data?.logo ?? null,
          siteName: String(data?.site_name ?? "Clayton").trim() || "Clayton",
        });
      })
      .catch(() => {
        setBranding({ logo: null, siteName: "Clayton" });
      });
  }, []);

  return branding;
}

export function CheckoutLayout({ children }: { children: ReactNode }) {
  const { logo, siteName } = useSiteBranding();

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
                <div className="h-8 max-w-[140px] border border-primary/10 rounded-sm px-1 flex items-center justify-center">
                  <img src={logo} alt={siteName} className="h-full w-auto object-contain" />
                </div>
              )}
              <span className="font-display font-bold text-lg tracking-tight text-primary">{siteName}</span>
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
