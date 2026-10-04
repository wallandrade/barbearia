import { useEffect, useState } from "react";
import { Loader2, Truck } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatCurrency } from "@/lib/utils";
import {
  formatFreightCep,
  freightCepDigits,
  freightDeadlineFromResponse,
  freightDeadlineLabel,
  MOTOBOY_CONSULT_HINT,
  motoboyCardFromCoverage,
  standardFreightOptions,
  type FreightDeadline,
  type FreightMotoboyCard,
  type FreightOptionInput,
} from "@/lib/freight-lookup";
import { fetchMotoboyCoverage } from "@/lib/motoboy-coverage";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ListedOption = FreightOptionInput & { price: string | number };

export default function FreightLookup() {
  const [cepDisplay, setCepDisplay] = useState("");
  const [options, setOptions] = useState<ListedOption[]>([]);
  const [optionsStatus, setOptionsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [deadline, setDeadline] = useState<FreightDeadline | null>(null);
  const [motoboyCard, setMotoboyCard] = useState<FreightMotoboyCard | null>(null);
  const [motoboyConsult, setMotoboyConsult] = useState(false);
  const [motoboyLoading, setMotoboyLoading] = useState(false);

  const cep = freightCepDigits(cepDisplay);
  const showCards = cep.length === 8;
  const visibleDeadline: FreightDeadline | null = showCards
    ? (deadline ?? { kind: "loading" })
    : null;

  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE}/api/shipping-options`)
      .then((res) => {
        if (!res.ok) throw new Error("shipping-options");
        return res.json() as Promise<{ options?: ListedOption[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setOptions(standardFreightOptions(data.options ?? []));
        setOptionsStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setOptionsStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (cep.length !== 8) {
      setDeadline(null);
      return;
    }
    setDeadline({ kind: "loading" });
    const controller = new AbortController();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch(`${BASE}/api/shipping/delivery-estimate?cep=${cep}`, { signal: controller.signal })
        .then(async (res) => {
          if (cancelled) return;
          const body = res.ok
            ? await res.json() as { deliveryTimeDays?: number | null }
            : null;
          if (cancelled) return;
          setDeadline(freightDeadlineFromResponse(res.status, body));
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          setDeadline({ kind: "unavailable" });
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cep]);

  useEffect(() => {
    if (cep.length !== 8) {
      setMotoboyCard(null);
      setMotoboyConsult(false);
      setMotoboyLoading(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setMotoboyLoading(true);
    setMotoboyCard(null);
    setMotoboyConsult(false);
    (async () => {
      try {
        const via = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
        const data = await via.json() as { erro?: boolean; bairro?: string; localidade?: string };
        if (cancelled) return;
        if (!via.ok || data.erro) {
          setMotoboyCard(null);
          setMotoboyConsult(false);
          return;
        }
        const coverage = await fetchMotoboyCoverage(BASE, {
          cep,
          bairro: data.bairro ?? "",
          cidade: data.localidade ?? "",
          signal: controller.signal,
        });
        if (cancelled) return;
        const result = motoboyCardFromCoverage(coverage, data.bairro ?? "");
        setMotoboyCard(result.card);
        setMotoboyConsult(result.consult);
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setMotoboyCard(null);
        setMotoboyConsult(false);
      } finally {
        if (!cancelled) setMotoboyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [cep]);

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-12 w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Truck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Consultar frete</h1>
          <p className="text-muted-foreground mt-2 text-base">
            Digite o CEP para ver o valor e o prazo de entrega.
          </p>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/50 space-y-6">
          <div className="w-full space-y-1.5">
            <label htmlFor="freight-cep" className="text-sm font-medium text-foreground ml-1">CEP</label>
            <div className="relative">
              <input
                id="freight-cep"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                value={cepDisplay}
                onChange={(event) => setCepDisplay(formatFreightCep(event.target.value))}
                placeholder="00000-000"
                maxLength={9}
                className="flex h-12 w-full rounded-xl border-2 border-border bg-white px-4 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all duration-200 pr-10"
              />
              {motoboyLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
              )}
            </div>
          </div>

          {showCards && optionsStatus === "loading" && (
            <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando opções de frete...
            </div>
          )}

          {showCards && optionsStatus === "error" && (
            <p className="py-4 text-muted-foreground text-sm text-center rounded-xl border-2 border-border">
              Não foi possível carregar os fretes.
            </p>
          )}

          {showCards && optionsStatus === "ready" && options.length === 0 && !motoboyLoading && !motoboyCard && (
            <p className="py-4 text-muted-foreground text-sm text-center rounded-xl border-2 border-border">
              Nenhuma opção de frete disponível no momento.
            </p>
          )}

          {showCards && ((optionsStatus === "ready" && options.length > 0 && visibleDeadline) || motoboyCard) && (
            <div className="grid grid-cols-1 gap-4">
              {optionsStatus === "ready" && visibleDeadline && options.map((option) => (
                <div
                  key={option.id}
                  className="p-4 rounded-xl border-2 border-border flex items-start gap-4"
                >
                  <Truck className="w-4 h-4 mt-1 text-foreground shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">{option.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{freightDeadlineLabel(visibleDeadline)}</p>
                    <p className="font-semibold text-primary mt-2">
                      {formatCurrency(Number(option.price))}
                    </p>
                  </div>
                </div>
              ))}
              {motoboyCard && (
                <div className="p-4 rounded-xl border-2 border-border flex items-start gap-4">
                  <span className="text-base leading-none mt-0.5">🏍️</span>
                  <div>
                    <p className="font-bold text-foreground flex items-center gap-2">
                      {motoboyCard.name}
                      <span className="text-xs font-normal px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                        {motoboyCard.byDistance ? "Por km" : "Seu bairro"}
                      </span>
                    </p>
                    {motoboyCard.detail && (
                      <p className="text-sm text-muted-foreground mt-1">{motoboyCard.detail}</p>
                    )}
                    <p className="font-semibold text-primary mt-2">
                      {formatCurrency(motoboyCard.price)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {showCards && motoboyConsult && (
            <p className="text-xs text-amber-800">
              {MOTOBOY_CONSULT_HINT}
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
