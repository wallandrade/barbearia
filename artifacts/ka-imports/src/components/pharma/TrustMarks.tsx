import { Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Selos factuais e discretos, perto do botão de comprar / finalizar.
 * Não usa selos de terceiros nem garante o que a loja não oferece.
 * "Pagamento via PIX" descreve o meio usado na loja (PIX direto ou via WhatsApp);
 * não afirma exclusividade nem menciona cartão (desativado nas settings atuais).
 * O SVG oficial da marca PIX do Banco Central não está publicado para uso direto,
 * então o selo é ícone tipográfico + texto, como o briefing permite.
 */
function PixLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-3.5 items-center text-[10px] font-bold leading-none tracking-[0.06em] text-[#00BDAE]",
        className,
      )}
      aria-hidden="true"
    >
      PIX
    </span>
  );
}

const ITEMS = [
  { key: "segura", icon: "shield" as const, label: "Compra segura" },
  { key: "pix", icon: "pix" as const, label: "Pagamento via PIX" },
  { key: "ssl", icon: "lock" as const, label: "Site protegido (SSL)" },
];

function MarkIcon({ name }: { name: (typeof ITEMS)[number]["icon"] }) {
  if (name === "pix") return <PixLabel />;
  if (name === "lock") return <Lock className="h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={1.75} aria-hidden="true" />;
  return <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={1.75} aria-hidden="true" />;
}

export function TrustMarks({ className, placement = "inline" }: { className?: string; placement?: "inline" | "footer" }) {
  return (
    <ul
      data-trust-marks={placement}
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-none text-neutral-500",
        className,
      )}
    >
      {ITEMS.map((item) => (
        <li key={item.key} className="inline-flex items-center gap-1">
          <MarkIcon name={item.icon} />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function TrustMarksFooterStrip({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center", className)}>
      <TrustMarks placement="footer" className="justify-center gap-x-4 text-[10px] text-neutral-400" />
    </div>
  );
}
