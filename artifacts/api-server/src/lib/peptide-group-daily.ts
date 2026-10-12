import { PEPTIDE_ATLAS_SHEETS, type AtlasSheet } from "./peptide-atlas-sheets";
import { PEPTIDE_CHAT_ENTRIES } from "./peptide-chat-knowledge";
import type { PeptideBrief } from "./whatsapp-group-campaign";

function aboutFromBody(body: string): string {
  const line = body.split("\n").map((item) => item.trim()).find((item) => /^o que é:/i.test(item));
  return line ? line.replace(/^o que é:\s*/i, "").trim() : "";
}

/** Um estudo só. Prefere o que fala de pessoas. */
function studyLine(sheet: AtlasSheet): string {
  const papers = sheet.research?.papers || [];
  const paper = papers.find((item) => /humano/i.test(item.meta)) || papers[0];
  if (!paper) return "";
  const summary = String(paper.summary || "").replace(/\s+/g, " ").trim();
  if (summary.length < 20) return "";
  const year = String(paper.year || "").trim();
  const sentence = summary.endsWith(".") ? summary : `${summary}.`;
  return year ? `Em ${year}, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}` : sentence;
}

function fromSheet(sheet: AtlasSheet): PeptideBrief {
  return {
    slug: sheet.slug,
    name: sheet.name,
    aliases: sheet.aliases,
    tagline: sheet.tagline,
    about: sheet.about.prose,
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
