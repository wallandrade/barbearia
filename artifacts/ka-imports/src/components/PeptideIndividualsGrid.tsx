import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import {
  PEPTIDE_CARDS,
  PEPTIDE_CATEGORIES,
  filterPeptideCards,
  type PeptideCategory,
} from "@/lib/peptide-catalog";

const CATEGORY_CLASS: Record<PeptideCategory, string> = {
  Emagrecimento: "text-amber-300",
  Cognição: "text-violet-300",
  Performance: "text-sky-300",
  Recuperação: "text-emerald-300",
  Longevidade: "text-cyan-300",
  Imunidade: "text-teal-300",
  Estética: "text-pink-300",
};

export default function PeptideIndividualsGrid() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const cards = useMemo(() => filterPeptideCards(PEPTIDE_CARDS, query, category), [query, category]);

  return (
    <div className="rounded-3xl bg-[#0c1016] p-4 sm:p-6 text-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Peptídeos Individuais</h2>
          <p className="mt-1 text-sm text-[#9aa3b2]">{cards.length} peptídeos</p>
        </div>
        <label className="block text-sm">
          <span className="sr-only">Categoria</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-[#141820] px-3 text-sm text-white"
          >
            <option value="">Todas as categorias</option>
            {PEPTIDE_CATEGORIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="relative mt-4 block">
        <span className="sr-only">Buscar por nome do peptídeo</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome do peptídeo..."
          className="h-11 w-full rounded-xl border border-white/10 bg-[#141820] pl-10 pr-3 text-sm text-white outline-none placeholder:text-[#6b7280]"
        />
      </label>

      {cards.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#9aa3b2]">Nenhum peptídeo com esse nome.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((item) => (
            <article key={item.name} className="rounded-2xl border border-white/10 bg-[#141820] p-4">
              <div className="flex items-start justify-between gap-3">
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${CATEGORY_CLASS[item.category]}`}>
                  {item.category}
                </p>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#6b7280]" />
              </div>
              <h3 className="mt-2 text-base font-semibold text-white">{item.name}</h3>
              <p className="mt-1 text-sm text-[#9aa3b2]">{item.summary}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
