import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  CheckCircle,
  ChevronDown,
  Copy,
  FileText,
  RefreshCw,
  Send,
  Unlink,
  Upload,
} from "lucide-react";

const MENU_PANEL =
  "z-[80] rounded-2xl border border-border bg-white p-1.5 text-foreground shadow-2xl";
const MENU_ITEM =
  "min-h-11 rounded-xl px-3 py-2.5 text-sm font-medium focus:bg-muted";

export function EnvioEcomManageMenu({
  busy = false,
  compact = false,
  canManageShipment = false,
  hasPdf = false,
  canUnlink = false,
  onGenerateLabel,
  onOpenPdf,
  onSyncStatus,
  onUnlink,
  onCancelShipment,
}: {
  busy?: boolean;
  compact?: boolean;
  canManageShipment?: boolean;
  hasPdf?: boolean;
  canUnlink?: boolean;
  onGenerateLabel: () => void;
  onOpenPdf: () => void;
  onSyncStatus: () => void;
  onUnlink: () => void;
  onCancelShipment: () => void;
}) {
  if (!canManageShipment && !hasPdf && !canUnlink) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          className={compact
            ? "h-7 gap-1 text-teal-800 border-teal-300 hover:bg-teal-50"
            : "gap-1.5 text-teal-800 border-teal-300 hover:bg-teal-50"}
        >
          Gerenciar EE
          <ChevronDown className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" collisionPadding={16} className={`${MENU_PANEL} w-52`}>
        {canManageShipment && (
          <DropdownMenuItem disabled={busy} className={MENU_ITEM} onSelect={() => onGenerateLabel()}>
            <Upload className="w-4 h-4" />
            Etiqueta EE
          </DropdownMenuItem>
        )}
        {hasPdf && (
          <DropdownMenuItem className={MENU_ITEM} onSelect={() => onOpenPdf()}>
            <FileText className="w-4 h-4" />
            Ver PDF
          </DropdownMenuItem>
        )}
        {canManageShipment && (
          <DropdownMenuItem disabled={busy} className={MENU_ITEM} onSelect={() => onSyncStatus()}>
            <RefreshCw className="w-4 h-4" />
            Sync status
          </DropdownMenuItem>
        )}
        {canUnlink && (
          <>
            {(canManageShipment || hasPdf) && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={busy}
              className={`${MENU_ITEM} text-amber-800 focus:text-amber-900`}
              onSelect={() => onUnlink()}
            >
              <Unlink className="w-4 h-4" />
              Desvincular
            </DropdownMenuItem>
          </>
        )}
        {canManageShipment && (
          <DropdownMenuItem
            disabled={busy}
            className={`${MENU_ITEM} text-red-700 focus:text-red-800`}
            onSelect={() => onCancelShipment()}
          >
            Cancelar EE
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type CopyKind = "resumo" | "full" | "post";

function copyTriggerLabel(copiedKind: CopyKind | null) {
  if (copiedKind === "resumo") return "Resumo copiado!";
  if (copiedKind === "full") return "Completo copiado!";
  if (copiedKind === "post") return "Pós-pagamento copiado!";
  return "Copiar";
}

function CopyOptionButtons({
  copiedKind,
  showPostPayment,
  onPick,
}: {
  copiedKind: CopyKind | null;
  showPostPayment: boolean;
  onPick: (kind: CopyKind) => void;
}) {
  const options: Array<{ kind: CopyKind; label: string; hint: string; Icon: typeof FileText }> = [
    { kind: "resumo", label: "Resumo", hint: "Texto curto para WhatsApp / 48h", Icon: FileText },
    { kind: "full", label: "Completo", hint: "Pedido inteiro", Icon: Copy },
  ];
  if (showPostPayment) {
    options.push({ kind: "post", label: "Pós-pagamento", hint: "Mensagem depois do PIX", Icon: Send });
  }

  return (
    <div className="space-y-1.5">
      {options.map(({ kind, label, hint, Icon }) => {
        const done = copiedKind === kind;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onPick(kind)}
            className={`w-full min-h-12 rounded-xl border px-3 py-2.5 text-left transition ${
              done
                ? "border-emerald-200 bg-emerald-50"
                : "border-border bg-white hover:bg-muted/70"
            }`}
          >
            <span className="flex items-center gap-3">
              {done
                ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                : <Icon className="w-4 h-4 text-slate-500 shrink-0" />}
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function OrderCopyMenu({
  copiedKind,
  showPostPayment,
  onCopyResumo,
  onCopyFull,
  onCopyPost,
}: {
  copiedKind: CopyKind | null;
  showPostPayment: boolean;
  onCopyResumo: () => void;
  onCopyFull: () => void;
  onCopyPost: () => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const label = copyTriggerLabel(copiedKind);

  const pick = (kind: CopyKind) => {
    if (kind === "resumo") onCopyResumo();
    else if (kind === "full") onCopyFull();
    else onCopyPost();
    setSheetOpen(false);
    setDesktopOpen(false);
  };

  const trigger = (
    <>
      {copiedKind
        ? <CheckCircle className="w-3.5 h-3.5 text-green-600" />
        : <Copy className="w-3.5 h-3.5" />}
      {label}
      {!copiedKind && <ChevronDown className="w-3.5 h-3.5" />}
    </>
  );

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 text-slate-700 border-slate-200 hover:bg-slate-50 sm:hidden"
          >
            {trigger}
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-border bg-white px-4 pb-8 pt-5 z-[80]"
        >
          <SheetHeader className="text-left mb-3">
            <SheetTitle>Copiar pedido</SheetTitle>
          </SheetHeader>
          <CopyOptionButtons
            copiedKind={copiedKind}
            showPostPayment={showPostPayment}
            onPick={pick}
          />
        </SheetContent>
      </Sheet>

      <DropdownMenu open={desktopOpen} onOpenChange={setDesktopOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="hidden sm:inline-flex gap-1.5 text-slate-700 border-slate-200 hover:bg-slate-50"
          >
            {trigger}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          collisionPadding={16}
          className={`${MENU_PANEL} w-64 p-2`}
        >
          <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Copiar pedido
          </p>
          <CopyOptionButtons
            copiedKind={copiedKind}
            showPostPayment={showPostPayment}
            onPick={pick}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
