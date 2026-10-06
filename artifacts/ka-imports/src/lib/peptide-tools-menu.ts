/** Janela em que o clique no menu de protocolos ainda abre o item. Depois, o clique pede a assinatura. */
export const PEPTIDE_MENU_TEST_MS = 30 * 60 * 1000;

export const PEPTIDE_MENU_TEST_STARTED_KEY = "yury-peptide-menu-test-started-at";

export type PeptideToolGroup = "main" | "tools";

export type PeptideToolItem = {
  id: string;
  label: string;
  group: PeptideToolGroup;
};

export const PEPTIDE_TOOL_ITEMS: PeptideToolItem[] = [
  { id: "individuals", label: "Peptídeos Individuais", group: "main" },
  { id: "find", label: "Encontre seu Peptídeo", group: "main" },
  { id: "compare", label: "Comparar Peptídeos", group: "main" },
  { id: "protocols", label: "Meus Protocolos", group: "main" },
  { id: "learn", label: "Aprender", group: "main" },
  { id: "calculator", label: "Calculadora", group: "tools" },
  { id: "stacks", label: "Biblioteca de Stacks", group: "tools" },
  { id: "interactions", label: "Interações", group: "tools" },
  { id: "application-map", label: "Mapa de Aplicação", group: "tools" },
  { id: "schedule", label: "Cronograma", group: "tools" },
];

export function resolvePeptideMenuTestStart(stored: string | null, now: number): { startedAt: number; shouldPersist: boolean } {
  const parsed = Number(stored);
  if (Number.isFinite(parsed) && parsed > 0 && parsed <= now) {
    return { startedAt: parsed, shouldPersist: false };
  }
  return { startedAt: now, shouldPersist: true };
}

/** Clique entra no item durante o teste de 30 min, ou com assinatura ativa. */
export function peptideMenuClickOpensTool(startedAt: number, now: number, subscribed = false): boolean {
  if (subscribed) return true;
  return now - startedAt < PEPTIDE_MENU_TEST_MS;
}

export function peptideMenuRemainingMs(startedAt: number, now: number): number {
  return Math.max(0, startedAt + PEPTIDE_MENU_TEST_MS - now);
}
