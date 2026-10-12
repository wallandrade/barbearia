import { PEPTIDE_ATLAS_SHEETS, type AtlasSheet } from "./peptide-atlas-sheets";
import { PEPTIDE_CHAT_ENTRIES } from "./peptide-chat-knowledge";
import type { PeptideBrief } from "./whatsapp-group-campaign";

function aboutFromBody(body: string): string {
  const line = body.split("\n").map((item) => item.trim()).find((item) => /^o que é:/i.test(item));
  return line ? line.replace(/^o que é:\s*/i, "").trim() : "";
}

function benefitIsDry(point: string): boolean {
  return /bdnf|ngf|\bgh\b|ghrh|igf-?1|gaba|vegf|\berr\b|agonista|receptor|aminoácid|análogo|heptap|pentadecap|pept[ií]d|mitocond|dopamin|seroton|transcri|hipocamp|córtex|cortisol|secretagogo|off-label|sintético|sintetico|isquemi/i.test(point);
}

function feelingScore(point: string): number {
  if (benefitIsDry(point)) return -1;
  if (/sono|ansiol|ansied|mem[oó]ria|fadiga|gordura|queima|cicatriz|humor|libido/i.test(point)) return 5;
  if (/foco|concentra|energia|disposi|pele|cabelo|recuper|tend[aã]o|ligament|dor\b|inflama/i.test(point)) return 4;
  if (/exerc[ií]cio|composi|corpo|peso/i.test(point)) return 2;
  return 1;
}

function rankedBenefits(points: string[]): string[] {
  return points
    .map((point) => point.replace(/\s+/g, " ").trim().replace(/\.$/, ""))
    .filter((point) => point.length >= 8)
    .map((point) => ({ point, score: feelingScore(point) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.point);
}

/** O benefício que a pessoa entende. Sono, memória, gordura e recuperação passam na frente do jargão. */
export function peptideAppeal(points: string[]): string {
  return rankedBenefits(points)[0] || "";
}

/** Até três benefícios legíveis para os pontos da legenda. */
export function peptideHighlightPoints(points: string[]): string[] {
  return rankedBenefits(points).slice(0, 3);
}

function paperIsHuman(meta: string): boolean {
  return /human|humano|pessoa/i.test(meta);
}

function studyFeel(summary: string): number {
  return /sono|ansiol|mem[oó]ria|fadiga|gordura|queima|cicatriz|humor|recupera|concentra|foco/i.test(summary) ? 2 : 1;
}

/** Um estudo só. Prefere gente, e entre esses o que fala de um resultado do dia a dia. */
function studyLine(sheet: AtlasSheet): string {
  const papers = sheet.research?.papers || [];
  const human = papers.filter((item) => paperIsHuman(item.meta));
  const pool = human.length > 0 ? human : papers;
  const paper = [...pool].sort((a, b) => studyFeel(b.summary || "") - studyFeel(a.summary || ""))[0];
  if (!paper) return "";
  const summary = String(paper.summary || "").replace(/\s+/g, " ").trim();
  if (summary.length < 20) return "";
  const year = String(paper.year || "").trim();
  const sentence = summary.endsWith(".") ? summary : `${summary}.`;
  const word = /^[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõç]/.test(sentence);
  const lead = word ? `${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}` : sentence;
  return year ? `Em ${year}, ${lead}` : sentence;
}

function fromSheet(sheet: AtlasSheet): PeptideBrief {
  return {
    slug: sheet.slug,
    name: sheet.name,
    aliases: sheet.aliases,
    tagline: sheet.tagline,
    about: sheet.about.prose,
    appeal: peptideAppeal(sheet.benefits?.points || []),
    points: peptideHighlightPoints(sheet.benefits?.points || []),
    study: studyLine(sheet),
  };
}

/** Fichas com texto de explicação. A do atlas vale mais do que o texto antigo do mesmo nome. */
export function peptideBriefs(): PeptideBrief[] {
  const atlas = new Map(PEPTIDE_ATLAS_SHEETS.map((sheet) => [sheet.slug, sheet]));
  const fromChat = PEPTIDE_CHAT_ENTRIES.flatMap((entry) => {
    const sheet = atlas.get(entry.slug);
    if (sheet) return [fromSheet(sheet)];
    const about = aboutFromBody(entry.body);
    if (about.length < 40) return [];
    return [{ slug: entry.slug, name: entry.name, aliases: entry.aliases, tagline: entry.body.split("\n")[0]?.trim() || entry.name, about }];
  });
  const known = new Set(fromChat.map((brief) => brief.slug));
  const extra = PEPTIDE_ATLAS_SHEETS.filter((sheet) => !known.has(sheet.slug)).map(fromSheet);
  return [...fromChat, ...extra].filter((brief) => brief.about.trim().length >= 40);
}
