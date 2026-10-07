import { PEPTIDE_CARDS, type PeptideCard, type PeptideCategory } from "./peptide-catalog";

export type FinderGoalId =
  | "recovery"
  | "weight"
  | "performance"
  | "cognition"
  | "longevity"
  | "aesthetic"
  | "sleep"
  | "immune"
  | "hormonal"
  | "wellbeing";

export type FinderExperience = "beginner" | "intermediate" | "advanced";

export type FinderRoute = "sc" | "im" | "nasal" | "oral";

export type FinderGoal = {
  id: FinderGoalId;
  label: string;
  hint: string;
};

export type FinderExperienceOption = {
  id: FinderExperience;
  label: string;
  hint: string;
};

export type FinderRouteOption = {
  id: FinderRoute;
  label: string;
  hint: string;
};

type GoalPool = {
  id: FinderGoalId;
  category?: PeptideCategory;
  names?: string[];
  starters: string[];
};

export const FINDER_GOALS: FinderGoal[] = [
  { id: "recovery", label: "Recuperação muscular", hint: "Tecidos, lesão e reparo" },
  { id: "weight", label: "Emagrecimento / Gordura", hint: "Perda de peso e gordura" },
  { id: "performance", label: "Performance e força", hint: "GH, treino e composição" },
  { id: "cognition", label: "Cognição e foco", hint: "Foco, memória e humor" },
  { id: "longevity", label: "Longevidade / Anti-aging", hint: "Envelhecimento celular" },
  { id: "aesthetic", label: "Estética e pele", hint: "Pele, cabelo e bronzeado" },
  { id: "sleep", label: "Sono e recuperação", hint: "Sono e ritmo" },
  { id: "immune", label: "Imunidade e inflamação", hint: "Defesa e modulação" },
  { id: "hormonal", label: "Hormonal / Libido", hint: "Eixo e libido" },
  { id: "wellbeing", label: "Bem-estar geral", hint: "Equilíbrio do dia a dia" },
];

export const FINDER_EXPERIENCES: FinderExperienceOption[] = [
  { id: "beginner", label: "Iniciante", hint: "Nunca usei peptídeos ou poucas experiências" },
  { id: "intermediate", label: "Intermediário", hint: "Já realizei 2–5 ciclos com orientação" },
  { id: "advanced", label: "Avançado", hint: "Usuário experiente, conheço os protocolos" },
];

export const FINDER_ROUTES: FinderRouteOption[] = [
  { id: "sc", label: "Subcutâneo", hint: "Injeção sob a pele — via mais comum" },
  { id: "im", label: "Intramuscular", hint: "Injeção no músculo" },
  { id: "nasal", label: "Nasal / spray", hint: "Spray intranasal, sem agulhas" },
  { id: "oral", label: "Oral / sublingual", hint: "Cápsulas, gotas ou forma sublingual" },
];

const GOAL_POOLS: GoalPool[] = [
  { id: "recovery", category: "Recuperação", starters: ["BPC-157", "TB-500", "KPV"] },
  { id: "weight", category: "Emagrecimento", starters: ["Tirzepatida", "Semaglutida", "AOD-9604"] },
  { id: "performance", category: "Performance", starters: ["Ipamorelin", "CJC-1295", "Sermorelin"] },
  { id: "cognition", category: "Cognição", starters: ["Semax", "Selank", "Pinealon"] },
  { id: "longevity", category: "Longevidade", starters: ["Epithalon", "MOTS-C", "SS-31"] },
  { id: "aesthetic", category: "Estética", starters: ["GHK-Cu", "SNAP-8", "Melanotan II"] },
  { id: "sleep", names: ["DSIP", "Pinealon", "Selank"], starters: ["DSIP", "Pinealon", "Selank"] },
  { id: "immune", category: "Imunidade", starters: ["Timosina Alfa-1", "Thymalin", "LL-37"] },
  { id: "hormonal", names: ["PT-141", "Kisspeptin", "HCG", "Gonadorelin", "Testagen", "Melanotan II", "HMG"], starters: ["PT-141", "Kisspeptin", "HCG"] },
  { id: "wellbeing", names: ["BPC-157", "Epithalon", "Selank", "Ipamorelin", "NAD+ Injetável", "MOTS-C", "Glutationa"], starters: ["BPC-157", "Epithalon", "Selank"] },
];

/** Via do cabeçalho da ficha. Quem não está aqui não ganha preferência de via. */
const ROUTE_TAGS: Record<string, FinderRoute[]> = {
  "Ara-290": ["sc"],
  "BPC-157": ["sc", "oral"],
  Cardiogen: ["oral", "sc"],
  Cartalax: ["oral", "sc"],
  Cerebrolysin: ["im"],
  Chonluten: ["oral"],
  "CJC-1295": ["sc"],
  "CJC-1295 DAC": ["sc"],
  Cortagen: ["sc", "oral"],
  Crystagen: ["sc"],
  Dihexa: ["oral"],
  DSIP: ["sc", "nasal"],
  Epithalon: ["sc"],
  "Follistatin 344": ["im"],
  "FOXO4-DRI": ["sc"],
  "GHK-Cu": ["sc"],
  "GHRP-2": ["sc", "nasal"],
  "GHRP-6": ["sc"],
  Glutationa: ["im"],
  Gonadorelin: ["sc"],
  HCG: ["sc", "im"],
  Hexarelin: ["sc"],
  "HGH 191AA": ["sc"],
  "HGH Fragment 176-191": ["sc"],
  HMG: ["sc", "im"],
  "IGF-1 DES": ["im"],
  "IGF-1 LR3": ["sc", "im"],
  Ipamorelin: ["sc"],
  Kisspeptin: ["sc"],
  KLOW: ["sc"],
  KPV: ["oral", "sc"],
  "L-Carnitina Injetável": ["im"],
  Livagen: ["oral", "sc"],
  "LL-37": ["sc"],
  Mazdutide: ["sc"],
  "Melanotan II": ["sc"],
  MGF: ["sc", "im"],
  "MOTS-C": ["sc"],
  Noopept: ["oral"],
  Ocitocina: ["nasal", "sc"],
  Ovagen: ["oral", "sc"],
  P21: ["sc"],
  "PE-22-28": ["sc"],
  Pinealon: ["oral"],
  "PNC-27": ["sc"],
  Prostamax: ["oral", "sc"],
  "PT-141": ["sc"],
  Retatrutide: ["sc"],
  Selank: ["nasal", "sc"],
  Semaglutida: ["sc", "oral"],
  Semax: ["nasal", "sc"],
  Sermorelin: ["sc"],
  "SLU-PP-332": ["oral"],
  "SNAP-8": ["sc"],
  Survodutide: ["sc"],
  "SS-31": ["sc"],
  "TB-500": ["sc", "im"],
  Tesamorelin: ["sc"],
  "Tesamorelin + Ipamorelin (Blend 10mg)": ["sc"],
  Testagen: ["oral", "sc"],
  Thymalin: ["sc", "im"],
  "Timosina Alfa-1": ["sc"],
  Tirzepatida: ["sc"],
  Vesugen: ["oral", "sc"],
  Vilon: ["sc"],
};

const CARD_BY_NAME = new Map(PEPTIDE_CARDS.map((card) => [card.name, card]));

function cardsNamed(names: string[]): PeptideCard[] {
  return names.flatMap((name) => {
    const card = CARD_BY_NAME.get(name);
    return card ? [card] : [];
  });
}

function poolOf(goal: GoalPool): PeptideCard[] {
  if (goal.names) return cardsNamed(goal.names);
  return PEPTIDE_CARDS.filter((card) => card.category === goal.category);
}

function orderedPool(goal: GoalPool, experience: FinderExperience): PeptideCard[] {
  const all = poolOf(goal);
  const starterNames = new Set(goal.starters);
  const starters = cardsNamed(goal.starters).filter((card) => all.some((item) => item.name === card.name));
  const rest = all.filter((card) => !starterNames.has(card.name));
  if (experience === "beginner") return starters;
  if (experience === "advanced") return [...rest, ...starters];
  return [...starters, ...rest];
}

function preferRoute(cards: PeptideCard[], route: FinderRoute | null): PeptideCard[] {
  if (!route) return cards;
  const matched = cards.filter((card) => (ROUTE_TAGS[card.name] ?? []).includes(route));
  const rest = cards.filter((card) => !(ROUTE_TAGS[card.name] ?? []).includes(route));
  return [...matched, ...rest];
}

export function recommendPeptides(input: {
  goals: FinderGoalId[];
  experience: FinderExperience;
  route: FinderRoute | null;
}): { best: PeptideCard; also: PeptideCard[] } | null {
  const selected = input.goals.slice(0, 4);
  const ranked = selected.flatMap((id) => {
    const goal = GOAL_POOLS.find((item) => item.id === id);
    return goal ? [preferRoute(orderedPool(goal, input.experience), input.route)] : [];
  });
  const best = ranked[0]?.[0];
  if (!best) return null;
  const also: PeptideCard[] = [];
  const used = new Set([best.name]);
  const take = (cards: PeptideCard[]) => {
    for (const card of cards) {
      if (also.length >= 3) return;
      if (used.has(card.name)) continue;
      used.add(card.name);
      also.push(card);
    }
  };
  for (const cards of ranked.slice(1)) take(cards.slice(0, 1));
  for (const cards of ranked) take(cards);
  return { best, also };
}
