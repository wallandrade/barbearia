import { PEPTIDE_ATLAS_SHEETS } from "./peptide-atlas-sheets";
import { PEPTIDE_CHAT_ENTRIES } from "./peptide-chat-knowledge";
import type { PeptideBrief } from "./whatsapp-group-campaign";

function aboutFromBody(body: string): string {
  const line = body.split("\n").map((item) => item.trim()).find((item) => /^o que é:/i.test(item));
  return line ? line.replace(/^o que é:\s*/i, "").trim() : "";
}

/** Fichas com texto de explicação. A do atlas vale mais do que o texto antigo do mesmo nome. */
export function peptideBriefs(): PeptideBrief[] {
  const atlas = new Map(PEPTIDE_ATLAS_SHEETS.map((sheet) => [sheet.slug, sheet]));
  const fromChat = PEPTIDE_CHAT_ENTRIES.flatMap((entry) => {
    const sheet = atlas.get(entry.slug);
    if (sheet) {
      return [{ slug: sheet.slug, name: sheet.name, aliases: sheet.aliases, tagline: sheet.tagline, about: sheet.about.prose }];
    }
    const about = aboutFromBody(entry.body);
    if (about.length < 40) return [];
    return [{ slug: entry.slug, name: entry.name, aliases: entry.aliases, tagline: entry.body.split("\n")[0]?.trim() || entry.name, about }];
  });
  const known = new Set(fromChat.map((brief) => brief.slug));
  const extra = PEPTIDE_ATLAS_SHEETS.filter((sheet) => !known.has(sheet.slug)).map((sheet) => ({
    slug: sheet.slug,
    name: sheet.name,
    aliases: sheet.aliases,
    tagline: sheet.tagline,
    about: sheet.about.prose,
  }));
  return [...fromChat, ...extra].filter((brief) => brief.about.trim().length >= 40);
}
