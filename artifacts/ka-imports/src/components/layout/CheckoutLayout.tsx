import { ReactNode, useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Footer } from "./Footer";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useSiteLogo() {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/settings`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        localStorage.setItem("siteSettings", JSON.stringify(data));
        setLogo(data?.logo ?? null);
      })
      .catch(() => {
        setLogo(null);
      });
  }, []);

  return logo;
}

export function CheckoutLayout({ children }: { children: ReactNode }) {
  const logo = useSiteLogo();

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
                  <img src={logo} alt="Clayton" className="h-full w-auto object-contain" />
                </div>
              )}
              <span className="font-display font-bold text-lg tracking-tight text-primary">Clayton</span>
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
