import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle, ChevronDown, Copy, FileText, RefreshCw, Unlink, Upload } from "lucide-react";

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
      <DropdownMenuContent align="start" className="w-48">
        {canManageShipment && (
          <DropdownMenuItem disabled={busy} onSelect={() => onGenerateLabel()}>
            <Upload className="w-4 h-4" />
            Etiqueta EE
          </DropdownMenuItem>
        )}
        {hasPdf && (
          <DropdownMenuItem onSelect={() => onOpenPdf()}>
            <FileText className="w-4 h-4" />
            Ver PDF
          </DropdownMenuItem>
        )}
        {canManageShipment && (
          <DropdownMenuItem disabled={busy} onSelect={() => onSyncStatus()}>
            <RefreshCw className="w-4 h-4" />
            Sync status
          </DropdownMenuItem>
        )}
        {canUnlink && (
          <>
            {(canManageShipment || hasPdf) && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={busy}
              className="text-amber-800 focus:text-amber-900"
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
            className="text-red-700 focus:text-red-800"
            onSelect={() => onCancelShipment()}
          >
            Cancelar EE
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OrderCopyMenu({
  copiedKind,
  showPostPayment,
  onCopyResumo,
  onCopyFull,
  onCopyPost,
}: {
  copiedKind: "resumo" | "full" | "post" | null;
  showPostPayment: boolean;
  onCopyResumo: () => void;
  onCopyFull: () => void;
  onCopyPost: () => void;
}) {
  const label = copiedKind === "resumo"
    ? "Resumo copiado!"
    : copiedKind === "full"
      ? "Completo copiado!"
      : copiedKind === "post"
        ? "Pós-pagamento copiado!"
        : "Copiar";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50"
        >
          {copiedKind
            ? <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            : <Copy className="w-3.5 h-3.5" />}
          {label}
          {!copiedKind && <ChevronDown className="w-3.5 h-3.5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onSelect={() => onCopyResumo()}>Copiar Resumo</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onCopyFull()}>Copiar Completo</DropdownMenuItem>
        {showPostPayment && (
          <DropdownMenuItem onSelect={() => onCopyPost()}>Copiar pós-pagamento</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
