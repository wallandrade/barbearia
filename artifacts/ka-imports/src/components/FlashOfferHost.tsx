import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/store/use-cart";
import {
  claimFlashOffer,
  drawFlashOffer,
  flashOfferAllowedPath,
  flashProductStub,
  productPathForOffer,
  releaseFlashReservation,
  savePendingFlashOffer,
  type FlashOffer,
} from "@/lib/flash-offer";

function formatRemaining(expiresAt: string, now: number): string {
  const left = Math.max(0, new Date(expiresAt).getTime() - now);
  const totalSeconds = Math.floor(left / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function FlashOfferHost() {
  const [location, setLocation] = useLocation();
  const addItem = useCart((state) => state.addItem);
  const removeItem = useCart((state) => state.removeItem);
  const items = useCart((state) => state.items);
  const [offer, setOffer] = useState<FlashOffer | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const flashReservationIds = useRef<string[]>([]);

  const allowed = flashOfferAllowedPath(location);
  const flashLine = items.find((item) => item.flashOffer && item.flashExpiresAt && item.flashReservationId);

  useEffect(() => {
    if (!allowed) {
      setOffer(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void drawFlashOffer()
        .then((next) => {
          if (next) setOffer(next);
        })
        .catch(() => undefined);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [location, allowed]);

  useEffect(() => {
    const current = items
      .map((item) => item.flashReservationId)
      .filter((id): id is string => Boolean(id));
    const previous = flashReservationIds.current;
    for (const id of previous) {
      if (!current.includes(id)) void releaseFlashReservation(id);
    }
    flashReservationIds.current = current;
  }, [items]);

  useEffect(() => {
    if (!flashLine?.flashExpiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [flashLine?.flashExpiresAt]);

  useEffect(() => {
    if (!flashLine?.flashExpiresAt) return;
    const left = new Date(flashLine.flashExpiresAt).getTime() - Date.now();
    const timer = window.setTimeout(() => {
      removeItem(flashLine.lineKey || flashLine.id);
    }, Math.max(0, left));
    return () => window.clearTimeout(timer);
  }, [flashLine?.flashExpiresAt, flashLine?.lineKey, flashLine?.id, removeItem]);

  async function acceptOffer() {
    if (!offer || claiming) return;
    if (offer.hasVariants) {
      savePendingFlashOffer(offer);
      setOffer(null);
      setLocation(productPathForOffer(location, offer.productId));
      return;
    }
    setClaiming(true);
    const claimed = await claimFlashOffer(offer.campaignId, offer.productId);
    setClaiming(false);
    if (!claimed.ok) {
      toast.error(claimed.message);
      setOffer(null);
      return;
    }
    addItem(flashProductStub(offer), {
      quantity: 1,
      unitPrice: claimed.reservation.flashPrice,
      flash: {
        reservationId: claimed.reservation.id,
        expiresAt: claimed.reservation.expiresAt,
        catalogPrice: offer.chargedPrice,
      },
    });
    setOffer(null);
  }

  const showModal = Boolean(offer) && allowed;
  const remaining = flashLine?.flashExpiresAt ? formatRemaining(flashLine.flashExpiresAt, now) : "";

  return (
    <>
      {showModal && offer ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[340px] rounded-[28px] bg-white px-5 pb-5 pt-6 text-center shadow-2xl">
            <p className="text-[13px] font-bold uppercase tracking-wide text-[#ff6a00]">Promoção relâmpago</p>
            <h2 className="mt-1 text-[28px] font-black leading-tight text-neutral-950">Essa oferta é sua</h2>
            <p className="mx-auto mt-2 max-w-[280px] text-[15px] leading-snug text-neutral-500">
              Aparece uma vez. Se aceitar, tem 1 hora para pagar no PIX ou no WhatsApp.
            </p>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#fff4ea] p-3 text-left">
              {offer.image ? (
                <img src={offer.image} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-white object-contain" />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-xl bg-white" />
              )}
              <div className="min-w-0">
                <p className="text-[15px] font-bold leading-tight text-neutral-950">{offer.name}</p>
                <p className="mt-1 text-sm text-neutral-400 line-through">{formatCurrency(offer.chargedPrice)}</p>
                <p className="text-[28px] font-black leading-none text-[#ff6a00]">{formatCurrency(offer.flashPrice)}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={claiming}
              onClick={() => void acceptOffer()}
              className="mt-4 h-14 w-full rounded-full bg-[#ff6a00] text-lg font-bold text-white disabled:opacity-60"
            >
              {claiming ? "Reservando..." : "Quero essa oferta"}
            </button>
            <button
              type="button"
              onClick={() => setOffer(null)}
              className="mt-3 text-base font-medium text-neutral-500"
            >
              Agora não
            </button>
          </div>
        </div>
      ) : null}
      {flashLine && remaining ? (
        <div className="fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          Oferta relâmpago · {remaining}
        </div>
      ) : null}
    </>
  );
}
