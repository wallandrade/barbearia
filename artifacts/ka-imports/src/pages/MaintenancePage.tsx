import { useEffect } from "react";

export function MaintenancePage() {
  useEffect(() => {
    document.title = "Estamos em manutenção | Yury";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <main className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "var(--pharma-green-ink, #166534)" }} aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="52" height="52" fill="none">
            <g fill="none" stroke="#ffffff" strokeWidth="20" strokeLinecap="round">
              <circle cx="256" cy="256" r="150" />
              <ellipse cx="256" cy="256" rx="150" ry="52" />
              <ellipse cx="256" cy="256" rx="52" ry="150" />
            </g>
          </svg>
        </div>
        <p className="font-display text-2xl font-bold tracking-tight text-[var(--pharma-green-ink,#166534)] mb-8">Yury</p>
        <div className="bg-card rounded-2xl border border-border shadow-sm px-8 py-10">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">Estamos em manutenção</h1>
          <p className="text-muted-foreground text-base leading-relaxed">Estamos fazendo melhorias no site. Voltaremos em breve! Obrigado pela paciência.</p>
        </div>
      </main>
    </div>
  );
}

export default MaintenancePage;
