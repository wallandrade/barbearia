import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
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
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Oferta relâmpago</p>
                <h2 className="text-lg font-bold text-neutral-900">{offer.name}</h2>
              </div>
              <button type="button" aria-label="Agora não" className="rounded-full p-1 text-neutral-500" onClick={() => setOffer(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {offer.image ? (
              <img src={offer.image} alt="" className="mb-3 h-40 w-full rounded-xl bg-neutral-100 object-contain" />
            ) : null}
            <p className="text-sm text-neutral-500 line-through">{formatCurrency(offer.chargedPrice)}</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(offer.flashPrice)}</p>
            <p className="mt-1 text-xs text-neutral-500">A vaga fica reservada por 1 hora, para 1 unidade.</p>
            <button
              type="button"
              disabled={claiming}
              onClick={() => void acceptOffer()}
              className="mt-4 h-11 w-full rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-60"
            >
              {claiming ? "Reservando..." : offer.hasVariants ? "Escolher variante" : "Quero essa oferta"}
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
