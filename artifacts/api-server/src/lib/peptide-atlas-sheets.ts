export type AtlasStat = {
  id: string;
  label: string;
  value: string;
  pill?: "amber" | "green";
};

export type AtlasSheet = {
  slug: string;
  name: string;
  aliases: string[];
  tagline: string;
  stats: AtlasStat[];
  about: { heading: string; prose: string };
  mechanism: { heading: string; prose: string; points: string[] };
  benefits: { heading: string; points: string[] };
  timeline: { heading: string; periods: Array<{ period: string; text: string }> };
  dose: {
    heading: string;
    facts: Array<{ label: string; value: string }>;
    indications: Array<{ name: string; note: string; dose: string }>;
    phases: Array<{ phase: string; dose: string }>;
  };
  reconstitution: { heading: string; note: string; steps: string[] };
  effects: { heading: string; points: string[] };
  stacks: {
    heading: string;
    partners: Array<{ name: string; status: string; note: string }>;
    bundles?: Array<{ name: string; category: string; items: string[]; goal: string }>;
  };
  research: { heading: string; papers: Array<{ title: string; meta: string; year: string; summary: string }> };
};

export const PEPTIDE_ATLAS_SHEETS: AtlasSheet[] = [
  {
    slug: "ara-290",
    name: "Ara-290",
    aliases: ["Cibinetide", "ARA290", "Hélice-B EPO peptídeo", "EPOR/CD131 agonista citoprotetor"],
    tagline: "Peptídeo neuroprotetor derivado da eritropoietina",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~3-5 h (subcutâneo); sem atividade eritropoiética em doses terapêuticas" },
      { id: "classification", label: "Classificação", value: "Peptídeo de 11 aminoácidos derivado da hélice B da eritropoietina; agonista seletivo do receptor heterômero EPOR/CD131 (innate repair receptor)" },
      { id: "cycle", label: "Ciclo", value: "4–8 semanas" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "4 mg subcutâneo, 3x/semana" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Médio", pill: "amber" },
    ],
    about: {
      heading: "O que é Ara-290",
      prose: "Ara-290 é um peptídeo de 11 aminoácidos derivado da eritropoietina sem atividade eritropoética, ligando-se exclusivamente ao receptor beta comum (βcR). Demonstrou potente efeito neuroprotetor, regenerativo e anti-inflamatório em modelos de neuropatia diabética e lesão tecidual.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Ara-290 (Cibinetide) é um peptídeo sintético de 11 aminoácidos derivado da hélice B da eritropoietina (EPO), desenvolvido pela Araim Pharmaceuticals pelos pesquisadores Michael Brines e Anthony Cerami (Albert Einstein College of Medicine). O objetivo do design foi dissociar os efeitos citoprotetores e anti-inflamatórios da EPO dos seus efeitos hematopoiéticos (aumento de eritrócitos e risco trombótico), criando um agonista seletivo para o receptor heterômero EPOR/CD131, denominado innate repair receptor (IRR).\n\nO IRR é expresso em células não hematopoiéticas em condições de estresse tecidual — neurônios, células endoteliais, macrófagos, células beta pancreáticas — mediando efeitos citoprotetores, anti-inflamatórios e pró-regenerativos. O mecanismo envolve ativação de JAK2/STAT5, supressão de NF-kB e redução de citocinas pró-inflamatórias (TNF-alfa, IL-6, IL-1beta) no tecido lesionado. Estudos de fase 2 mostraram melhora significativa de neuropatia periférica diabética (densidade de fibras nervosas intraepidérmicas) e alívio de dor neuropática em sarcoidose. Pesquisa ativa em lesão renal isquêmica e outras condições inflamatórias.",
      points: [
        "Agonista seletivo de EPOR/CD131 (innate repair receptor): efeitos citoprotetores da EPO sem atividade eritropoiética",
        "Ativação de JAK2/STAT5 e supressão de NF-kB em neurônios, endotélio e macrófagos sob estresse",
        "Aumento de densidade de fibras nervosas intraepidérmicas em neuropatia periférica diabética (fase 2)",
        "Alívio de dor neuropática em sarcoidose e potencial neuroprotetor em lesão isquêmica",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Neuroproteção periférica",
        "Redução de dor neuropática",
        "Regeneração de fibras nervosas",
        "Anti-inflamatório sistêmico",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Redução inicial de dor neuropática; melhora de parestesias em extremidades" },
        { period: "Semana 3-4", text: "Aumento detectável de densidade de fibras nervosas; melhora de sensibilidade tátil" },
        { period: "Mês 2-3", text: "Melhora consolidada de função neurológica periférica; redução de marcadores inflamatórios" },
        { period: "Mês 3+", text: "Efeitos neuroprotetores e regenerativos sustentados; manutenção de ganho neurológico com ciclos repetidos" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "4 mg subcutâneo, 3x/semana" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "1x/dia SC; ciclos de 28 dias conforme ensaios de fase 2" },
        { label: "Duração do ciclo", value: "4–8 semanas" },
        { label: "Concentração", value: "Dose de ensaio: 4-8 mg/dia SC; reconstituir para 0,5-1 mg/mL (0,5-1 mL por dose)" },
      ],
      indications: [
        { name: "Neuropatia periférica diabética", note: "Dose de ensaio fase 2 publicada; monitorar densidade de fibras nervosas (punch biopsy) e escores de dor neuropática", dose: "4 mg/dia SC × 28 dias" },
        { name: "Sarcoidose com dor neuropática", note: "Baseado em ensaio de fase 2 positivo; acompanhamento especializado obrigatório em sarcoidose", dose: "4 mg/dia SC × 28 dias" },
        { name: "Neuropatia periférica crônica outras causas", note: "Uso off-label extrapolado de ensaios; sem protocolo estabelecido fora de DPN e sarcoidose", dose: "4-8 mg/dia SC × 28 dias" },
        { name: "Lesão renal isquêmica aguda", note: "Fase pré-clínica/fase 1 apenas; sem protocolo clínico estabelecido para uso fora de pesquisa", dose: "Protocolo em investigação" },
      ],
      phases: [
        { phase: "Ciclo de tratamento (28 dias)", dose: "4-8 mg/dia SC 1x/dia consecutivos" },
        { phase: "Avaliação", dose: "Avaliar resposta clínica ao final do ciclo com exame neurológico e escores de dor" },
        { phase: "Ciclos subsequentes", dose: "Repetir ciclo de 28 dias conforme resposta; intervalo e número de ciclos não padronizados em humanos" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Retirar frasco/ampola do freezer (-20°C) e descongelar em geladeira overnight ou à temperatura ambiente por 30 min",
        "Adicionar volume calculado de água bacteriostática estéril para atingir concentração desejada (0,5-1 mg/mL típico)",
        "Agitar suavemente até dissolução completa — peptídeo de maior cadeia, pode requerer mais tempo",
        "Filtrar com membrana 0,22 µm estéril antes da administração SC se preparado artesanalmente",
        "Refrigerar (2-8°C) após reconstituição; validade 7-14 dias; não recongelar após reconstituição",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: ["Leve desconforto local", "Tontura transitória"],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "BPC-157", status: "Sinérgico", note: "BPC-157 tem ação neuroprotetora e angiogênica periférica; combinação com Ara-290 potencializa regeneração de fibras nervosas em neuropatia periférica" },
        { name: "SS-31 (Elamipretide)", status: "Sinérgico", note: "SS-31 protege mitocôndrias em neurônios periféricos isquêmicos; sinergia com Ara-290 no suporte mitocondrial-citoprotetor em neuropatia" },
        { name: "GHK-Cu", status: "Compatível", note: "GHK-Cu tem ação anti-inflamatória e regenerativa; pode complementar Ara-290 no controle da neuroinflamação periférica" },
        { name: "Thymosin Beta-4", status: "Compatível", note: "Thymosin Beta-4 promove reparo tecidual e angiogênese; sinergia potencial com Ara-290 em lesão isquêmica e neuropatia" },
        { name: "Cerebrolysin", status: "Compatível", note: "Cerebrolysin tem ação neuroprotetora central e periférica; combinação com Ara-290 para neuroprotecção abrangente em neuropatia diabética grave" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Brines M et al. Nonerythropoietic, tissue-protective peptides derived from the tertiary structure of erythropoietin",
          meta: "Animal/Humano · Paper seminal descrevendo design do Ara-290 a partir da estrutura terciária da EPO para dissociar efeitos citoprotetores dos hematopoiéticos",
          year: "2008",
          summary: "Identificação e caracterização do receptor heterômero EPOR/CD131 (innate repair receptor) e desenvolvimento de peptídeos não-eritropoiéticos citoprotetores incluindo Ara-290.",
        },
        {
          title: "Niesters M et al. Effect of the innate repair receptor agonist Cibinetide on corneal nerve fiber density in patients with sarcoidosis",
          meta: "Humano · Ensaio clínico fase 2 de Ara-290 (Cibinetide) em neuropatia de fibras pequenas em sarcoidose",
          year: "2017",
          summary: "Ara-290 (4 mg/dia SC × 28 dias) aumentou significativamente densidade de fibras nervosas corneais e reduziu dor neuropática em pacientes com sarcoidose — ensaio fase 2 randomizado.",
        },
        {
          title: "Brines M et al. ARA 290, a nonerythropoietic peptide engineered from erythropoietin, improves metabolic control and neuropathic symptoms in patients with type 2 diabetes",
          meta: "Humano · Ensaio clínico avaliando Ara-290 em neuropatia periférica diabética e controle metabólico",
          year: "2015",
          summary: "Ara-290 melhorou controle glicêmico, reduziu HbA1c e aumentou densidade de fibras nervosas intraepidérmicas em pacientes com DM2 e neuropatia periférica.",
        },
      ],
    },
  },
  {
    slug: "bpc-157",
    name: "BPC-157",
    aliases: ["Body Protection Compound-157", "Bepecin", "PL 14736"],
    tagline: "Regeneração sistêmica de tecidos moles",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~4-6 horas" },
      { id: "classification", label: "Classificação", value: "Pentadecapeptídeo sintético" },
      { id: "cycle", label: "Ciclo", value: "4–12 semanas" },
      { id: "route", label: "Via", value: "Subcutânea (próximo ao local da lesão) ou oral" },
      { id: "dose", label: "Dose típica", value: "250–500 mcg/dia" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é BPC-157",
      prose: "BPC-157 (Body Protection Compound-157) é um pentadecapeptídeo sintético derivado de uma proteína protetora isolada do suco gástrico humano. É um dos peptídeos mais estudados para reparo de tendões, ligamentos, músculo e mucosa gástrica, com perfil de segurança extensamente documentado em modelos animais.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O BPC-157 é um fragmento pentadecapeptídico derivado de uma proteína protetora gástrica humana. Atua principalmente acelerando a regeneração tecidual via modulação da via NO (óxido nítrico) e ativação do receptor de VEGFR-2, promovendo angiogênese local. Estimula a expressão de fatores de crescimento (FGF, EGF) e modula a via dopaminérgica e serotonérgica. Em modelos pré-clínicos demonstrou aceleração de cicatrização de tendões, ligamentos, mucosa gástrica e tecido muscular.",
      points: [
        "Modula a via do óxido nítrico (NO).",
        "Ativa receptores VEGFR-2 promovendo angiogênese.",
        "Estimula expressão de fatores de crescimento locais (FGF, EGF).",
        "Acelera regeneração de tendões, ligamentos e mucosas.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Aceleração da cicatrização de tendões e ligamentos",
        "Proteção e regeneração da mucosa gástrica",
        "Efeito anti-inflamatório sistêmico",
        "Neuroproteção e melhora cognitiva",
        "Cardioproteção e melhora da função vascular",
        "Recuperação muscular pós-exercício acelerada",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Redução de inflamação local; alívio de dor inicial" },
        { period: "Semana 3-4", text: "Melhora significativa em mobilidade e cicatrização tendínea" },
        { period: "Mês 2-3", text: "Recuperação consolidada de lesões; retorno funcional" },
        { period: "Mês 3+", text: "Benefícios sustentados; possível pausa para reavaliação" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "250–500 mcg/dia" },
        { label: "Via", value: "Subcutâneo (próximo à lesão) ou Oral" },
        { label: "Frequência", value: "1-2 vezes ao dia" },
        { label: "Duração do ciclo", value: "4–12 semanas" },
        { label: "Concentração", value: "2 mL = 2.5 mg/mL (vial de 5mg)" },
      ],
      indications: [
        { name: "Lesão tendínea / ligamentar", note: "SC próximo à lesão, 1-2x ao dia", dose: "250–500 mcg/dia" },
        { name: "Recuperação musculoesquelética geral", note: "SC, manhã", dose: "250 mcg/dia" },
        { name: "Saúde gástrica / intestinal", note: "Oral em jejum", dose: "500 mcg/dia" },
        { name: "Pós-cirúrgico", note: "SC, dividido em 2 doses", dose: "500 mcg/dia" },
      ],
      phases: [
        { phase: "Fase 1 (Indução, 2 semanas)", dose: "500 mcg/dia dividido em 2" },
        { phase: "Fase 2 (Manutenção, 4-6 semanas)", dose: "250 mcg/dia" },
        { phase: "Pausa", dose: "4 semanas off antes de novo ciclo" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 2.0 mL de água bacteriostática com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma",
        "Girar suavemente até dissolver (não agitar)",
        "Rotular e refrigerar a 2–8°C, proteger da luz",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Náusea leve (rara, principalmente oral)",
        "Tontura transitória nas primeiras aplicações",
        "Rubor facial passageiro",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "TB-500", status: "Sinérgico", note: "Combinação clássica de recuperação: BPC-157 atua localmente, TB-500 sistemicamente via mobilização de células-tronco." },
        { name: "GHK-Cu", status: "Sinérgico", note: "Efeitos complementares em reparo tecidual e angiogênese." },
        { name: "KPV", status: "Compatível", note: "Vias anti-inflamatórias complementares, especialmente para mucosa intestinal." },
        { name: "Corticosteroides", status: "Monitorar", note: "Corticoides podem antagonizar parcialmente o efeito regenerativo do BPC-157." },
      ],
      bundles: [
        { name: "The Wolverine", category: "Recuperação", items: ["BPC-157", "TB-500"], goal: "Recuperação de Lesão" },
        { name: "Gut Restore", category: "Recuperação", items: ["BPC-157 (Oral)", "KPV"], goal: "Saúde Intestinal" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Pentadecapeptide BPC 157 enhances the growth hormone receptor expression in tendon fibroblasts",
          meta: "In vitro · células tendíneas",
          year: "2017",
          summary: "Demonstrou que o BPC-157 aumenta a expressão do receptor de GH em fibroblastos tendíneos, sugerindo mecanismo pelo qual acelera a cicatrização tendínea.",
        },
        {
          title: "BPC 157 and standard angiogenic growth factors. Gastrointestinal tract healing",
          meta: "Rats · in vivo",
          year: "2018",
          summary: "Comparação direta com fatores angiogênicos padrão mostrou que o BPC-157 promove cicatrização gastrointestinal de forma comparável ou superior em modelos murinos.",
        },
        {
          title: "Stable Gastric Pentadecapeptide BPC 157 in the Treatment of Colitis and Ischemia and Reperfusion in Rats",
          meta: "Rats · in vivo",
          year: "2019",
          summary: "Estudo mostrou eficácia do BPC-157 em modelos de colite e lesão de isquemia-reperfusão, com redução significativa de marcadores inflamatórios.",
        },
      ],
    },
  },
];

export function atlasSheetBody(sheet: AtlasSheet): string {
  const stats = sheet.stats.map((item) => `${item.label}: ${item.value}`).join(". ");
  const indications = sheet.dose.indications.map((row) => `${row.name}: ${row.dose}. ${row.note}`).join("; ");
  const phases = sheet.dose.phases.map((row) => `${row.phase} = ${row.dose}`).join("; ");
  const partners = [
    ...sheet.stacks.partners.map((row) => `${row.name} ${row.status}. ${row.note}`),
    ...(sheet.stacks.bundles ?? []).map((row) => `${row.name} (${row.category}): ${row.items.join(" + ")}. ${row.goal}`),
  ].join("; ");
  const papers = sheet.research.papers.map((paper) => `${paper.title} (${paper.year}). ${paper.summary}`).join(" ");
  return [
    sheet.tagline,
    `Também conhecido como: ${sheet.aliases.join(", ")}.`,
    `${stats}.`,
    `O que é: ${sheet.about.prose}`,
    `Mecanismo: ${sheet.mechanism.prose.replace(/\n+/g, " ")} ${sheet.mechanism.points.join("; ")}.`,
    `Benefícios citados: ${sheet.benefits.points.join("; ")}.`,
    `Linha do tempo: ${sheet.timeline.periods.map((row) => `${row.period} ${row.text}`).join("; ")}.`,
    `Dosagem: ${sheet.dose.facts.map((row) => `${row.label} ${row.value}`).join(". ")}.`,
    `Indicações (ficha): ${indications}.`,
    `Fases SC: ${phases}.`,
    `Reconstituição: ${sheet.reconstitution.steps.join("; ")}.`,
    `Efeitos: ${sheet.effects.points.join("; ")}.`,
    `Stacks: ${partners}.`,
    `Pesquisa: ${papers}`,
  ].join("\n\n");
}
