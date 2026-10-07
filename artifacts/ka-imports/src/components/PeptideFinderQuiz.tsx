import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Flower2,
  Heart,
  Moon,
  RotateCcw,
  Shield,
  Smile,
  Sparkles,
  Syringe,
  Zap,
  type LucideIcon,
} from "lucide-react";
import PeptideCardSheet from "@/components/PeptideCardSheet";
import { foldPeptideName, PEPTIDE_LIBRARY_FALLBACK } from "@/components/PeptideIndividualsGrid";
import type { PeptideCard, PeptideCategory } from "@/lib/peptide-catalog";
import {
  FINDER_EXPERIENCES,
  FINDER_GOALS,
  FINDER_ROUTES,
  recommendPeptides,
  type FinderExperience,
  type FinderGoalId,
  type FinderRoute,
} from "@/lib/peptide-finder";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const GOAL_LIMIT = 4;

const GOAL_ICONS: Record<FinderGoalId, LucideIcon> = {
  recovery: Activity,
  weight: Flame,
  performance: Zap,
  cognition: Brain,
  longevity: Sparkles,
  aesthetic: Flower2,
  sleep: Moon,
  immune: Shield,
  hormonal: Heart,
  wellbeing: Smile,
};

const CATEGORY_PILL: Record<PeptideCategory, string> = {
  Emagrecimento: "bg-amber-100 text-amber-800",
  Cognição: "bg-violet-100 text-violet-800",
  Performance: "bg-sky-100 text-sky-800",
  Recuperação: "bg-emerald-100 text-emerald-800",
  Longevidade: "bg-cyan-100 text-cyan-900",
  Imunidade: "bg-teal-100 text-teal-800",
  Estética: "bg-pink-100 text-pink-800",
};

function initials(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
}

export default function PeptideFinderQuiz({
  contentOpen = null,
  onRequireSubscription,
}: {
  contentOpen?: boolean | null;
  onRequireSubscription?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<FinderGoalId[]>([]);
  const [experience, setExperience] = useState<FinderExperience | null>(null);
  const [route, setRoute] = useState<FinderRoute | null>(null);
  const [open, setOpen] = useState<PeptideCard | null>(null);
  const [library, setLibrary] = useState(PEPTIDE_LIBRARY_FALLBACK);

  const slugByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of library) map.set(foldPeptideName(item.name), item.slug);
    return map;
  }, [library]);

  useEffect(() => {
    fetch(`${BASE}/api/chat/status`)
      .then((res) => res.json())
      .then((data: { products?: unknown }) => {
        if (!Array.isArray(data?.products) || !data.products.length) return;
        const products = data.products.filter((item): item is { slug: string; name: string } => (
          !!item && typeof item === "object" && typeof (item as { slug?: unknown }).slug === "string" && typeof (item as { name?: unknown }).name === "string"
        ));
        if (products.length) setLibrary(products);
      })
      .catch(() => {
        /* a lista local cobre as fichas */
      });
  }, []);

  useEffect(() => {
    if (contentOpen === false) setOpen(null);
  }, [contentOpen]);

  const result = useMemo(() => {
    if (!experience) return null;
    return recommendPeptides({ goals, experience, route });
  }, [goals, experience, route]);

  function toggleGoal(id: FinderGoalId) {
    setGoals((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= GOAL_LIMIT) return current;
      return [...current, id];
    });
  }

  function openSheet(card: PeptideCard) {
    if (contentOpen === false) {
      onRequireSubscription?.();
      return;
    }
    if (contentOpen == null) return;
    setOpen(card);
  }

  function restart() {
    setStep(0);
    setGoals([]);
    setExperience(null);
    setRoute(null);
    setOpen(null);
  }

  if (open && contentOpen !== false) {
    const slug = slugByName.get(foldPeptideName(open.name));
    if (slug) {
      return <PeptideCardSheet slug={slug} category={open.category} onBack={() => setOpen(null)} />;
    }
  }

  const progress = step === 0 ? 33 : step === 1 ? 67 : 100;
  const canNext = step === 0 ? goals.length > 0 : step === 1 ? experience != null : route != null;

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Quiz personalizado</p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Encontre seu Peptídeo</h2>
          <p className="mt-1 text-sm text-muted-foreground">Responda 3 perguntas e receba indicações personalizadas</p>
        </div>
      </div>

      {step < 3 ? (
        <>
          <div className="mt-6 flex items-center justify-between text-[11px] font-semibold tracking-wide text-muted-foreground">
            <span>ETAPA {step + 1} DE 3</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-white p-4">
            {step === 0 ? (
              <>
                <h3 className="text-base font-semibold text-foreground">Quais são seus objetivos?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Selecione até {GOAL_LIMIT} opções{goals.length > 0 ? ` · ${goals.length}/${GOAL_LIMIT} selecionados` : ""}
                </p>
                <div className="mt-3 space-y-2">
                  {FINDER_GOALS.map((goal) => {
                    const selected = goals.includes(goal.id);
                    const locked = !selected && goals.length >= GOAL_LIMIT;
                    const Icon = GOAL_ICONS[goal.id];
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        disabled={locked}
                        onClick={() => toggleGoal(goal.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                          selected ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40"
                        } ${locked ? "opacity-40" : ""}`}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${selected ? "bg-primary/15 text-primary" : "bg-slate-100 text-slate-500"}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground">{goal.label}</span>
                        </span>
                        {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <h3 className="text-base font-semibold text-foreground">Qual sua experiência com peptídeos?</h3>
                <div className="mt-3 space-y-2">
                  {FINDER_EXPERIENCES.map((item) => {
                    const selected = experience === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setExperience(item.id)}
                        className={`block w-full rounded-xl border px-4 py-3 text-left transition ${
                          selected ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40"
                        }`}
                      >
                        <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">{item.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h3 className="text-base font-semibold text-foreground">Preferência de administração?</h3>
                <div className="mt-3 space-y-2">
                  {FINDER_ROUTES.map((item) => {
                    const selected = route === item.id;
                    const Icon = item.id === "nasal" ? Droplets : Syringe;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setRoute(item.id)}
                        className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                          selected ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40"
                        }`}
                      >
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? "text-primary" : "text-slate-400"}`} />
                        <span>
                          <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                          <span className="mt-0.5 block text-sm text-muted-foreground">{item.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((current) => current + 1)}
              className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {step === 2 ? "Ver recomendações" : "Próximo"}
              {step === 2 ? <Sparkles className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </>
      ) : result ? (
        <div className="mt-6">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">Suas recomendações</h3>
              <p className="mt-1 text-sm text-muted-foreground">Com base nos seus objetivos, separamos os melhores peptídeos para você.</p>
            </div>
          </div>

          <article className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${CATEGORY_PILL[result.best.category]}`}>
                {result.best.category}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <Sparkles className="h-3 w-3" />
                Melhor match
              </span>
            </div>
            <h4 className="mt-3 text-lg font-semibold text-foreground">{result.best.name}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{result.best.summary}</p>
            <button type="button" onClick={() => openSheet(result.best)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Ver ficha completa
              <ChevronRight className="h-4 w-4" />
            </button>
          </article>

          {result.also.length > 0 ? (
            <>
              <p className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Também considere</p>
              <div className="space-y-2">
                {result.also.map((card) => (
                  <button
                    key={card.name}
                    type="button"
                    onClick={() => openSheet(card)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border bg-white p-3 text-left transition hover:border-primary"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-600">
                      {initials(card.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{card.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CATEGORY_PILL[card.category]}`}>
                          {card.category}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">{card.summary}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <button type="button" onClick={restart} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <RotateCcw className="h-4 w-4" />
            Refazer o questionário
          </button>

          <p className="mt-4 rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
            Esta recomendação tem caráter educacional e é baseada nas respostas do quiz. Sempre consulte um profissional de saúde antes de iniciar qualquer protocolo.
          </p>
        </div>
      ) : null}
    </div>
  );
}
