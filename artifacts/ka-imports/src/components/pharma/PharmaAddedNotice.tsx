import { X } from "lucide-react";
import { useEffect } from "react";
import { create } from "zustand";
import { useCart } from "@/store/use-cart";
import { formatCurrency } from "@/lib/utils";

type NoticePayload = {
  name: string;
  image?: string | null;
  addedQty: number;
};

type NoticeState = {
  notice: NoticePayload | null;
  hide: () => void;
  show: (payload: NoticePayload) => void;
};

let hideTimer: number | null = null;

export const usePharmaAddedNotice = create<NoticeState>((set) => ({
  notice: null,
  hide: () => {
    if (hideTimer != null) window.clearTimeout(hideTimer);
    hideTimer = null;
    set({ notice: null });
  },
  show: (payload) => {
    if (hideTimer != null) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      hideTimer = null;
      set({ notice: null });
    }, 4500);
    set({ notice: payload });
  },
}));

export function PharmaAddedNotice() {
  const notice = usePharmaAddedNotice((state) => state.notice);
  const hide = usePharmaAddedNotice((state) => state.hide);
  const { items, getSubtotal, setIsOpen } = useCart();
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => () => {
    if (hideTimer != null) window.clearTimeout(hideTimer);
  }, []);

  if (!notice) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[70] w-[min(100%-1.5rem,28rem)] -translate-x-1/2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-2xl">
      <div className="flex items-start gap-3">
        {notice.image ? (
          <img src={notice.image} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-neutral-200 object-contain bg-white" />
        ) : (
          <div className="h-14 w-14 shrink-0 rounded-xl bg-neutral-100" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-wide text-[var(--pharma-green-ink)]">
            ADICIONADO · {notice.addedQty}X
          </p>
          <p className="truncate text-sm font-semibold text-neutral-900">{notice.name}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {itemCount} {itemCount === 1 ? "item" : "itens"} · {formatCurrency(getSubtotal())}
          </p>
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-[var(--pharma-green-strong)]"
            onClick={() => setIsOpen(true)}
          >
            Ver carrinho
          </button>
        </div>
        <button type="button" className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100" onClick={hide} aria-label="Fechar aviso">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
