import type { MouseEvent } from "react";
import { Copy, RefreshCw, ShoppingBag } from "lucide-react";

import type { AdminOrdersKind } from "@/lib/admin-orders-kind";

type DeadlineGroup = {
  hours: number;
  count: number;
};

type AdminOrdersCopyBarProps = {
  ordersKind: AdminOrdersKind;
  onCopyShoppingList: (event: MouseEvent<HTMLButtonElement>) => void;
  onReprocessQueue: (event: MouseEvent<HTMLButtonElement>) => void;
  deadlineGroups: DeadlineGroup[];
  onCopyDeadline: (hours: number, event: MouseEvent<HTMLButtonElement>) => void;
  otherCount: number;
  onCopyOthers: (event: MouseEvent<HTMLButtonElement>) => void;
  motoboyCount: number;
  onCopyMotoboy: (event: MouseEvent<HTMLButtonElement>) => void;
};

const buttonClass =
  "inline-flex items-center gap-1 rounded-xl border-2 border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/60 whitespace-nowrap";

export function AdminOrdersCopyBar({
  ordersKind,
  onCopyShoppingList,
  onReprocessQueue,
  deadlineGroups,
  onCopyDeadline,
  otherCount,
  onCopyOthers,
  motoboyCount,
  onCopyMotoboy,
}: AdminOrdersCopyBarProps) {
  if (ordersKind === "aguardando_estoque") {
    return (
      <p className="text-xs text-amber-900 bg-amber-50 border-2 border-amber-200 rounded-xl px-3 py-2">
        Pedidos nesta aba não entram na cópia 48h / lista de compra até Liberar para envio.
      </p>
    );
  }

  if (ordersKind === "motoboy") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={onCopyMotoboy} className={`${buttonClass} border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100`}>
          🏍️ Motoboy ({motoboyCount})
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button type="button" onClick={onCopyShoppingList} className={buttonClass}>
        <ShoppingBag className="w-3.5 h-3.5" /> Lista de Compra
      </button>
      <button
        type="button"
        title="Reprocessar fila de expedição"
        onClick={onReprocessQueue}
        className={buttonClass}
      >
        <RefreshCw className="w-3.5 h-3.5" /> Fila
      </button>
      {deadlineGroups.map((group) => (
        <button
          key={group.hours}
          type="button"
          onClick={(event) => onCopyDeadline(group.hours, event)}
          className={buttonClass}
        >
          <Copy className="w-3.5 h-3.5" /> {group.hours}h ({group.count})
        </button>
      ))}
      {otherCount > 0 && (
        <button type="button" onClick={onCopyOthers} className={buttonClass}>
          <Copy className="w-3.5 h-3.5" /> Outros ({otherCount})
        </button>
      )}
    </div>
  );
}
