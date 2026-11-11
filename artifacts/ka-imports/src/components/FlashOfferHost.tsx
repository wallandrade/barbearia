import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/store/use-cart";
import {
  claimFlashOffer,
  drawFlashOffers,
  flashOfferAllowedPath,
  flashProductStub,
  productPathForOffer,
  releaseFlashReservation,
  savePendingFlashOffer,
  type FlashOffer,
} from "@/lib/flash-offer";
import { PHARMA_COMPACT_THEME, useStoreTheme } from "@/lib/store-theme";

function formatRemaining(expiresAt: string, now: number): string {
  const left = Math.max(0, new Date(expiresAt).getTime() - now);
  const totalSeconds = Math.floor(left / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function FlashOfferHost() {
  const pharma = useStoreTheme() === PHARMA_COMPACT_THEME;
  const [location, setLocation] = useLocation();
  const addItem = useCart((state) => state.addItem);
  const removeItem = useCart((state) => state.removeItem);
  const items = useCart((state) => state.items);
  const [offers, setOffers] = useState<FlashOffer[]>([]);
  const [offerIndex, setOfferIndex] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const flashReservationIds = useRef<string[]>([]);

  const allowed = flashOfferAllowedPath(location);
  const flashLine = items.find((item) => item.flashOffer && item.flashExpiresAt && item.flashReservationId);

  useEffect(() => {
    if (!allowed) {
      setOffers([]);
      setOfferIndex(0);
      return;
    }
    const timer = window.setTimeout(() => {
      void drawFlashOffers()
        .then((next) => {
          if (next.length > 0) {
            setOffers(next);
            setOfferIndex(0);
          }
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

  const offer = offers[offerIndex] ?? offers[0] ?? null;
  const carousel = offers.length > 1;

  function closeOffers() {
    setOffers([]);
    setOfferIndex(0);
  }

  function stepOffer(direction: -1 | 1) {
    setOfferIndex((current) => {
      const count = offers.length;
      if (count < 2) return 0;
      return (current + direction + count) % count;
    });
  }

  async function acceptOffer() {
    if (!offer || claiming) return;
    if (offer.hasVariants) {
      savePendingFlashOffer(offer);
      closeOffers();
      setLocation(productPathForOffer(location, offer.productId));
      return;
    }
    setClaiming(true);
    const claimed = await claimFlashOffer(offer.campaignId, offer.productId);
    setClaiming(false);
    if (!claimed.ok) {
      toast.error(claimed.message);
      setOffers((current) => current.filter((item) => item.campaignId !== offer.campaignId));
      setOfferIndex(0);
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
    setOffers((current) => current.filter((item) => item.campaignId !== offer.campaignId));
    setOfferIndex(0);
  }

  const showModal = Boolean(offer) && allowed;
  const remaining = flashLine?.flashExpiresAt ? formatRemaining(flashLine.flashExpiresAt, now) : "";

  return (
    <>
      {showModal && offer ? (
        <div className={`fixed inset-0 z-[80] flex justify-center ${pharma ? "items-center bg-black/45 p-4" : "items-center bg-black/45 p-4"}`}>
          <div className={`w-full max-w-[340px] bg-white px-5 pt-4 text-center shadow-2xl ${pharma ? "max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[28px] pb-5 sm:pt-6" : "rounded-[28px] pb-5 pt-6"}`}>
            <p className={`text-[13px] font-bold uppercase tracking-wide ${pharma ? "text-[var(--pharma-green-ink)]" : "text-[#ff6a00]"}`}>
              {carousel ? `Promoção relâmpago · ${offerIndex + 1} de ${offers.length}` : "Promoção relâmpago"}
            </p>
            <h2 className={`mt-1 font-black leading-tight text-neutral-950 ${pharma ? "text-xl sm:text-[28px]" : "text-[28px]"}`}>Essa oferta é sua</h2>
            <p className="mx-auto mt-2 max-w-[280px] text-[15px] leading-snug text-neutral-600">
              Aparece uma vez. Se aceitar, tem 1 hora para pagar no PIX ou no WhatsApp.
            </p>
            <div className={`mt-4 overflow-hidden rounded-2xl p-3 text-left ${pharma ? "bg-[var(--pharma-green-soft)]" : "bg-[#fff4ea]"}`}>
              <div className="relative">
                {offer.image ? (
                  <img src={offer.image} alt="" className={`mx-auto w-full rounded-xl bg-white object-contain ${pharma ? "h-28 sm:h-44" : "h-44"}`} />
                ) : (
                  <div className={`mx-auto w-full rounded-xl bg-white ${pharma ? "h-28 sm:h-44" : "h-44"}`} />
                )}
                {carousel ? (
                  <>
                    <button
                      type="button"
                      aria-label="Oferta anterior"
                      onClick={() => stepOffer(-1)}
                      className={`absolute left-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-white ${pharma ? "border-[var(--pharma-green)]/30 text-[var(--pharma-green-ink)]" : "border-[#ffd7b8] text-[#ff6a00]"}`}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Próxima oferta"
                      onClick={() => stepOffer(1)}
                      className={`absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-white ${pharma ? "border-[var(--pharma-green)]/30 text-[var(--pharma-green-ink)]" : "border-[#ffd7b8] text-[#ff6a00]"}`}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                ) : null}
              </div>
              <p className="mt-3 text-[15px] font-bold leading-tight text-neutral-950">{offer.name}</p>
              <p className="mt-1 text-sm text-neutral-600 line-through">{formatCurrency(offer.chargedPrice)}</p>
              <p className={`font-black leading-none ${pharma ? "text-2xl text-[var(--pharma-green)] sm:text-[26px]" : "text-[26px] text-[#ff6a00]"}`}>{formatCurrency(offer.flashPrice)}</p>
            </div>
            {carousel ? (
              <div className="mt-3 flex items-center justify-center gap-1.5">
                {offers.map((item, index) => (
                  <button
                    key={item.campaignId}
                    type="button"
                    aria-label={`Oferta ${index + 1}`}
                    onClick={() => setOfferIndex(index)}
                    className={`h-1.5 rounded-full ${index === offerIndex ? (pharma ? "w-4 bg-[var(--pharma-green)]" : "w-4 bg-[#ff6a00]") : (pharma ? "w-1.5 bg-[var(--pharma-green)]/30" : "w-1.5 bg-[#ffd7b8]")}`}
                  />
                ))}
              </div>
            ) : null}
            <button
              type="button"
              disabled={claiming}
              onClick={() => void acceptOffer()}
              className={`mt-4 h-14 w-full rounded-full text-lg font-bold text-white disabled:opacity-60 ${pharma ? "bg-[var(--pharma-green)]" : "bg-[#ff6a00]"}`}
            >
              {claiming ? "Reservando..." : "Quero essa oferta"}
            </button>
            <button
              type="button"
              onClick={closeOffers}
              className="mt-2 inline-flex h-11 w-full items-center justify-center text-base font-medium text-neutral-600"
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
