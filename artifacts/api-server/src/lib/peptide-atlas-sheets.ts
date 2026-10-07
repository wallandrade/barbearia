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
  {
    slug: "cardiogen",
    name: "Cardiogen",
    aliases: ["AEDR", "Ala-Glu-Asp-Arg", "Кардиоген", "Bioregulador cardíaco Khavinson"],
    tagline: "Biorregulador cardíaco para proteção e função miocárdica",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30-60 min plasmática; efeito cardioprotetor persiste após clearance via modulação gênica em cardiomiócitos" },
      { id: "classification", label: "Classificação", value: "Tetrapeptídeo bioregulador do tecido cardíaco (Khavinson — Instituto de Bioregulação de São Petersburgo)" },
      { id: "cycle", label: "Ciclo", value: "10 dias, 2–3x ao ano" },
      { id: "route", label: "Via", value: "Oral ou subcutânea" },
      { id: "dose", label: "Dose típica", value: "5–10 mg oral ou subcutâneo, 10 dias" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Cardiogen",
      prose: "Cardiogen é o tetrapeptídeo biorregulador Ala-Glu-Asp-Arg desenvolvido para o tecido cardíaco. Demonstrou cardioproteção, melhora da função miocárdica e redução de dano em isquemia em estudos pré-clínicos e em protocolos clínicos do Instituto de Gerontologia de São Petersburgo.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Cardiogen (AEDR — Ala-Glu-Asp-Arg) é um tetrapeptídeo sintético desenvolvido pelo grupo de Khavinson como bioregulador tecido-específico do músculo cardíaco, originalmente derivado de tecido miocárdico bovino. O mecanismo de ação proposto envolve a modulação da expressão gênica em cardiomiócitos: ao penetrar a membrana celular e interagir com cromatina nuclear, Cardiogen estimularia a síntese de proteínas estruturais do sarcômero (actina, miosina, tropomiosina) e enzimas do metabolismo energético mitocondrial cardíaco. Os efeitos descritos incluem: melhora da contratilidade cardíaca em modelos de cardiomiopatia; redução de marcadores de apoptose de cardiomiócitos; modulação da resposta inflamatória no miocárdio (redução de IL-6, TNF-alfa); e potencial cardioprotetor frente a estresse oxidativo. Indicações primárias segundo a literatura russa: cardiomiopatia leve a moderada, insuficiência cardíaca compensada (classe NYHA I-II), geroprotecção cardiovascular em populações idosas e recuperação funcional pós-infarto do miocárdio em fase crônica estável. Via subcutânea ou intramuscular, 5-10 mg/dia em ciclos de 10 dias, 2-3 ciclos por ano. NOTA: Cardiogen NÃO substitui tratamento medicamentoso convencional em cardiopatias estabelecidas. Importante: este bioregulador foi desenvolvido pela escola russa de Khavinson (Instituto de Bioregulação e Gerontologia de São Petersburgo) e tem extensa literatura própria, mas validação independente ocidental ainda é limitada. As doses, indicações e mecanismos descritos refletem o protocolo russo tradicional e pesquisas do grupo de origem. Considere esse contexto ao avaliar a evidência disponível.",
      points: [
        "Modula expressão gênica em cardiomiócitos: estimula síntese de proteínas sarcoméricas e enzimas de metabolismo mitocondrial cardíaco",
        "Cardioprotetor anti-apoptótico: reduz marcadores de apoptose de cardiomiócitos e inflamação miocárdica (IL-6, TNF-alfa)",
        "Melhora de contratilidade cardíaca em cardiomiopatia; potencial benefício em insuficiência cardíaca compensada",
        "NÃO substitui tratamento convencional; indicado como adjuvante em cardiopatia crônica estável — validação ocidental limitada",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Cardioproteção",
        "Melhora de função miocárdica",
        "Proteção contra isquemia",
        "Antioxidante cardíaco",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Dias 1-7", text: "Redução sutil de marcadores inflamatórios miocárdicos; melhora de bem-estar geral em cardiopatas crônicos" },
        { period: "Semana 2-3", text: "Melhora de tolerância ao exercício em cardiomiopatia leve; redução de dispneia aos esforços moderados" },
        { period: "Mês 1-2", text: "Melhora de parâmetros funcionais cardíacos em insuficiência cardíaca compensada; monitorar com ecocardiograma" },
        { period: "Mês 2-3+", text: "Efeito cardioprotetor cumulativo com ciclos repetidos; benefício em geroprotecção cardiovascular a longo prazo" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "5–10 mg oral ou subcutâneo, 10 dias" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "1x/dia; ciclos de 10 dias consecutivos, 2-3x/ano" },
        { label: "Duração do ciclo", value: "10 dias, 2–3x ao ano" },
        { label: "Concentração", value: "1 mL = 5-10 mg/mL (frasco reconstituído em água bacteriostática)" },
      ],
      indications: [
        { name: "Cardiomiopatia leve a moderada (adjuvante)", note: "Ciclos de 10 dias, 2-3x/ano; manter tratamento cardiológico convencional concomitante", dose: "5-10 mg/dia SC × 10 dias" },
        { name: "Insuficiência cardíaca compensada NYHA I-II", note: "Adjuvante apenas; consultar cardiologista antes de iniciar", dose: "5 mg/dia SC × 10 dias, 2-3x/ano" },
        { name: "Geroprotecção cardiovascular preventiva", note: "Uso preventivo em longevidade cardiovascular; protocolo Khavinson", dose: "5 mg/dia SC × 10 dias, 2x/ano" },
        { name: "Recuperação pós-infarto (fase crônica estável)", note: "Somente em fase crônica (>3-6 meses pós-evento); NÃO usar em fase aguda", dose: "5-10 mg/dia SC × 10 dias" },
      ],
      phases: [
        { phase: "Ciclo de ataque (10 dias)", dose: "5-10 mg/dia SC 1x/dia consecutivos; avaliar tolerância cardiovascular" },
        { phase: "Intervalo", dose: "3-6 meses sem uso entre ciclos; manter tratamento cardiológico convencional" },
        { phase: "Ciclos de manutenção", dose: "Repetir 2-3x/ano; associar Epithalon e Thymalin em protocolos de longevidade cardiovascular Khavinson" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Adicionar 1 mL de água bacteriostática ao frasco liofilizado de 5-10 mg",
        "Girar suavemente até dissolução completa — solução deve ser límpida",
        "Concentração resultante: 5-10 mg/mL para uso subcutâneo ou intramuscular",
        "Refrigerar entre 2-8°C após reconstituição; usar em até 7 dias",
        "NÃO usar em fase aguda de infarto — indicado apenas em cardiopatia crônica estável",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Geralmente bem tolerado",
        "Dados de estudos principalmente russos",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "SS-31", status: "Sinérgico", note: "SS-31/Elamipretide (estabilização de supercomplexos mitocondriais, cardiolipina) + Cardiogen (expressão gênica sarcomérica e energética em cardiomiócitos): cardioproteção mitocondrial + estrutural; mecanismos complementares" },
        { name: "BPC-157", status: "Sinérgico", note: "BPC-157 (cardioproteção, modulação de NO, anti-inflamatório miocárdico) + Cardiogen (bioregulação gênica de cardiomiócitos): perfis cardioprotetores complementares por vias distintas" },
        { name: "Epithalon", status: "Compatível", note: "Epithalon (geroprotecção epigenética ampla, telomerase) + Cardiogen (geroprotecção cardíaca específica): protocolo Khavinson de longevidade cardiovascular integrada" },
        { name: "Thymalin", status: "Compatível", note: "Thymalin (imunomodulação tímica, geroprotecção imune) + Cardiogen (geroprotecção cardíaca): protocolo Khavinson multiorgão — imune + cardíaco; usado em longevidade integrada" },
        { name: "Ipamorelin", status: "Compatível", note: "Ipamorelin (eixo GH/IGF-1, cardioproteção indireta via GH) + Cardiogen (bioregulação gênica miocárdica): sem interação direta conhecida; perfis cardioprotetores complementares" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "AEDR tetrapeptide (Cardiogen): cardioprotective effects in cardiomyocyte models and clinical series (Khavinson)",
          meta: "Animals / Humans · Trabalho do grupo de Khavinson descrevendo efeitos cardioprotetores do tetrapeptídeo AEDR (Cardiogen) em modelos de cardiomiócitos e séries clínicas russas",
          year: "2010",
          summary: "Descreve modulação de expressão gênica de proteínas sarcoméricas e enzimas mitocondriais em cardiomiócitos por AEDR; dados de modelos animais de cardiomiopatia experimental.",
        },
        {
          title: "Peptide bioregulators in cardiac rehabilitation and cardiovascular geroprotection",
          meta: "Humans · Revisão clínica russa do uso de Cardiogen e peptídeos bioreguladores em reabilitação cardíaca e geroprotecção cardiovascular",
          year: "2013",
          summary: "Série clínica e revisão de resultados de Cardiogen em pacientes com cardiomiopatia e insuficiência cardíaca compensada; melhora de funcionalidade e tolerância ao exercício.",
        },
        {
          title: "Short peptides as modulators of cardiomyocyte gene expression in aging and disease",
          meta: "In vitro / Animals · Revisão mecanística de peptídeos curtos como Cardiogen/AEDR como moduladores de expressão gênica em cardiomiócitos envelhecidos e doentes",
          year: "2016",
          summary: "Descreve interação de AEDR com promotores de genes de proteínas sarcoméricas e anti-apoptóticas em cardiomiócitos; base para indicações clínicas em cardiopatias.",
        },
      ],
    },
  },
  {
    slug: "cartalax",
    name: "Cartalax",
    aliases: ["AEDG", "Ala-Glu-Asp-Gly", "Карталакс", "Bioregulador cartilaginoso Khavinson"],
    tagline: "Biorregulador cartilaginoso para articulações e regeneração",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30-60 min plasmática; efeito condropropotetor persiste após clearance via modulação gênica em condrócitos" },
      { id: "classification", label: "Classificação", value: "Tetrapeptídeo bioregulador do tecido cartilaginoso (Khavinson — Instituto de Bioregulação de São Petersburgo)" },
      { id: "cycle", label: "Ciclo", value: "10 dias, 2–3x ao ano" },
      { id: "route", label: "Via", value: "Oral ou subcutânea" },
      { id: "dose", label: "Dose típica", value: "5–10 mg oral ou subcutâneo, 10 dias" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Cartalax",
      prose: "Cartalax (AEDG tetrapeptídeo) é o biorregulador tecido-específico desenvolvido por Khavinson para cartilagem. Estimula síntese de colágeno tipo II e proteoglicanos, sendo investigado para osteoartrite, envelhecimento cartilaginoso e proteção articular em protocolos de longevidade.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Cartalax (AEDG — Ala-Glu-Asp-Gly) é um tetrapeptídeo sintético desenvolvido pelo grupo de Khavinson como bioregulador tecido-específico do tecido cartilaginoso, originalmente derivado de cartilagem bovina e hoje obtido por síntese química. O mecanismo proposto envolve a modulação da expressão gênica em condrócitos (células da cartilagem): ao interagir com cromatina nuclear dessas células, Cartalax estimularia a síntese de colágeno tipo II, proteoglicanos (agrecano, versicano) e outras proteínas essenciais da matriz extracelular cartilaginosa, potencialmente revertendo marcadores de degradação articular. Os efeitos descritos incluem: estímulo à proliferação e diferenciação de condrócitos; redução de marcadores inflamatórios locais (IL-1beta, TNF-alfa) no tecido articular; e melhora de espessura e qualidade da cartilagem articular em modelos animais. Indicações primárias segundo a literatura russa: osteoartrite leve a moderada, lesões cartilaginosas pós-traumáticas, degeneração discal vertebral, condromalácia patelar e recuperação articular pós-cirúrgica. Em protocolos de reabilitação articular, frequentemente usado com BPC-157 e TB-500. Dose padrão: 5-10 mg/dia SC em ciclos de 10 dias, 2-3 ciclos por ano. Importante: este bioregulador foi desenvolvido pela escola russa de Khavinson (Instituto de Bioregulação e Gerontologia de São Petersburgo) e tem extensa literatura própria, mas validação independente ocidental ainda é limitada. As doses, indicações e mecanismos descritos refletem o protocolo russo tradicional e pesquisas do grupo de origem. Considere esse contexto ao avaliar a evidência disponível.",
      points: [
        "Modula expressão gênica em condrócitos: estimula síntese de colágeno tipo II e proteoglicanos da matriz cartilaginosa",
        "Reduz marcadores inflamatórios locais (IL-1beta, TNF-alfa) no tecido articular",
        "Estimula proliferação e diferenciação de condrócitos; potencial reversão de marcadores de degradação cartilaginosa",
        "Indicado em osteoartrite, lesões cartilaginosas e degeneração discal — validação ocidental ainda limitada",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Regeneração de cartilagem articular",
        "Redução de dor em osteoartrite",
        "Síntese de colágeno tipo II",
        "Proteção articular",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Dias 1-7", text: "Redução sutil de inflamação articular local; início de síntese de proteínas da matriz cartilaginosa" },
        { period: "Semana 2-3", text: "Melhora de mobilidade articular e redução de dor em osteoartrite leve a moderada" },
        { period: "Mês 1-2", text: "Melhora progressiva de qualidade cartilaginosa; redução de rigidez matinal e melhora de amplitude de movimento" },
        { period: "Mês 2-3+", text: "Efeito condropropotetor cumulativo com ciclos repetidos; manutenção de mobilidade articular a longo prazo" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "5–10 mg oral ou subcutâneo, 10 dias" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "1x/dia; ciclos de 10 dias consecutivos, 2-3x/ano" },
        { label: "Duração do ciclo", value: "10 dias, 2–3x ao ano" },
        { label: "Concentração", value: "1 mL = 5-10 mg/mL (frasco reconstituído em água bacteriostática)" },
      ],
      indications: [
        { name: "Osteoartrite leve a moderada", note: "Ciclos de 10 dias, 2-3x/ano; combinar com BPC-157 para protocolo articular completo", dose: "5-10 mg/dia SC × 10 dias" },
        { name: "Lesão cartilaginosa pós-traumática", note: "Iniciar após fase aguda; repetir mensalmente se necessário", dose: "10 mg/dia SC × 10-20 dias" },
        { name: "Degeneração discal vertebral", note: "Evidência baseada em literatura russa; combinar com TB-500 para regeneração tecidual", dose: "5 mg/dia SC × 10 dias, 2x/ano" },
        { name: "Recuperação articular pós-cirúrgica", note: "Iniciar após liberação cirúrgica; associar a fisioterapia", dose: "5-10 mg/dia SC × 10 dias" },
      ],
      phases: [
        { phase: "Ciclo de ataque (10-20 dias)", dose: "5-10 mg/dia SC 1x/dia consecutivos" },
        { phase: "Intervalo", dose: "3-6 meses sem uso entre ciclos" },
        { phase: "Ciclos de manutenção", dose: "Repetir 2-3x/ano; combinar com BPC-157 e TB-500 para protocolo articular de alta intensidade" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Adicionar 1 mL de água bacteriostática ao frasco liofilizado de 5-10 mg",
        "Girar suavemente até dissolução completa — solução deve ser límpida",
        "Concentração resultante: 5-10 mg/mL para uso subcutâneo",
        "Refrigerar entre 2-8°C após reconstituição; usar em até 7 dias",
        "Aplicar SC próximo à articulação-alvo para potencial efeito local mais concentrado",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Geralmente bem tolerado",
        "Dados limitados em estudos controlados",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "BPC-157", status: "Sinérgico", note: "BPC-157 (regeneração tendinosa e articular, VEGF, anti-inflamatório) + Cartalax (condropropteção via expressão gênica em condrócitos): protocolo articular completo — regeneração + condropropteção" },
        { name: "TB-500", status: "Sinérgico", note: "TB-500 (regeneração de tecidos moles, actina, redução de inflamação) + Cartalax (condropropteção cartilaginosa): regeneração tecidual ampla e condropropteção simultânea" },
        { name: "GHK-Cu", status: "Compatível", note: "GHK-Cu (síntese de colágeno, regeneração tecidual, antioxidante) + Cartalax (síntese de colágeno tipo II em condrócitos): sobreposição benéfica em suporte à síntese de colágeno articular" },
        { name: "IGF-1 LR3", status: "Compatível", note: "IGF-1 LR3 (ativação de mTOR e síntese proteica via IGF-1R) + Cartalax (bioregulação gênica em condrócitos): anabolismo sistêmico + condropropteção epigenética; sem antagonismo conhecido" },
        { name: "AOD-9604", status: "Compatível", note: "AOD-9604 (lipólise localizada, possível efeito em cartilagem articular off-label) + Cartalax (condropropteção): uso combinado em protocolos de reabilitação articular" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "AEDG peptide (Cartalax) as a chondroprotective agent: gene expression in chondrocytes and cartilage tissue (Khavinson)",
          meta: "Animals / In vitro · Trabalho do grupo de Khavinson descrevendo efeitos condroproptetores do tetrapeptídeo AEDG (Cartalax) em condrócitos e tecido cartilaginoso",
          year: "2012",
          summary: "Descreve modulação de expressão gênica de colágeno tipo II e proteoglicanos em condrócitos por AEDG; dados de modelos animais de osteoartrite experimental.",
        },
        {
          title: "Clinical application of peptide bioregulators in osteoarthritis and cartilage disorders",
          meta: "Humans · Série clínica russa do uso de Cartalax e peptídeos bioreguladores similares em osteoartrite e patologias cartilaginosas",
          year: "2015",
          summary: "Resultados clínicos de Cartalax em pacientes com osteoartrite leve a moderada: melhora de escore de dor, mobilidade articular e marcadores inflamatórios locais.",
        },
        {
          title: "Short peptides as regulators of cartilage matrix synthesis and chondrocyte function",
          meta: "In vitro · Revisão mecanística de peptídeos curtos como Cartalax/AEDG como moduladores da síntese de matriz cartilaginosa e proliferação de condrócitos",
          year: "2017",
          summary: "Revisão de mecanismos moleculares dos bioreguladores peptídicos cartilaginosos; dados de proliferação de condrócitos e síntese de colágeno tipo II in vitro.",
        },
      ],
    },
  },
  {
    slug: "cerebrolysin",
    name: "Cerebrolysin",
    aliases: ["FPF-1070", "Cerebrolisina", "Cerebrolysin solution", "Neuropeptídeos cerebrais porcinos"],
    tagline: "Hidrolisado de proteínas cerebrais para neuroproteção e Alzheimer",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30 min (peptídeos ativos circulantes); efeito neurotrófico sustentado por semanas após ciclo" },
      { id: "classification", label: "Classificação", value: "Mistura porcina de neuropeptídeos cerebrais de baixo peso molecular (mimetizador neurotrófico multiespectral)" },
      { id: "cycle", label: "Ciclo", value: "20–30 dias consecutivos, 2x ao ano" },
      { id: "route", label: "Via", value: "Intravenosa (lenta) ou intramuscular" },
      { id: "dose", label: "Dose típica", value: "5–30 mL IV por 20–30 dias consecutivos" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Cerebrolysin",
      prose: "Cerebrolysin é uma mistura de peptídeos de baixo peso molecular derivados de proteínas cerebrais porcinas, com 40+ anos de uso clínico na Europa e Ásia. Aprovado em vários países para Alzheimer, AVC isquêmico e lesão cerebral traumática, estimulando síntese de BDNF, NGF e neurotrofinas.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Cerebrolysin é uma mistura de peptídeos de baixo peso molecular (MW < 10.000 Da) e aminoácidos livres derivada de cérebro suíno purificado e padronizado (FPF-1070). Sua composição exata é complexa — contém aproximadamente 25% de peptídeos ativos e 75% de aminoácidos livres. O mecanismo de ação central envolve múltiplas vias neurotróficas: Cerebrolysin mimetiza a ação de NGF (nerve growth factor), BDNF, GDNF e NT-3 sem ser estruturalmente idêntico a nenhum deles — estimula receptores Trk e p75NTR, ativa as vias MAPK/ERK e PI3K/Akt de sobrevivência neuronal. Em modelos de isquemia cerebral, reduz o volume da lesão, inibe apoptose neuronal via upregulation de Bcl-2 e downregulation de Bax, e estimula neurogênese hipocampal (proliferação de células progenitoras no giro denteado). Em Alzheimer, reduz fosforilação de tau e produção de peptídeo beta-amiloide. Aprovado em mais de 50 países (Europa Oriental, Ásia, América Latina) para AVC isquêmico agudo, demências (Alzheimer, vascular), traumatismo craniencefálico e atraso no desenvolvimento. Não aprovado pela FDA. Evidências clínicas de qualidade moderada a boa nos países aprovadores.",
      points: [
        "Mimetiza NGF, BDNF e GDNF: ativa receptores Trk e p75NTR, estimulando sobrevivência e plasticidade neuronal",
        "Neuroprotetor anti-apoptótico: upregulation de Bcl-2, inibição de caspases, redução de volume de lesão isquêmica",
        "Estimula neurogênese hipocampal (proliferação de progenitores no giro denteado) e sinaptogênese",
        "Reduz fosforilação de tau e produção de beta-amiloide em modelos de Alzheimer",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Melhora cognitiva em Alzheimer",
        "Neuroproteção pós-AVC",
        "Aumento de BDNF e NGF",
        "Melhora de memória e concentração",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Dias 1-5", text: "Melhora sutil de alerta, redução de névoa mental e melhora de humor em pacientes neurológicos" },
        { period: "Semana 1-2", text: "Melhora de atenção, velocidade de processamento e memória de trabalho nas indicações aprovadas" },
        { period: "Semana 2-4", text: "Melhora funcional progressiva em AVC e TCE; redução de déficits cognitivos em demências" },
        { period: "Mês 1-3+", text: "Efeito neuroplástico cumulativo; melhora sustentada com ciclos repetidos em demência e TCE" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "5–30 mL IV por 20–30 dias consecutivos" },
        { label: "Via", value: "Intravenoso" },
        { label: "Frequência", value: "1x/dia; ciclos de 10-21 dias (AVC agudo) ou 4 semanas (ambulatorial)" },
        { label: "Duração do ciclo", value: "20–30 dias consecutivos, 2x ao ano" },
        { label: "Concentração", value: "Ampolas prontas 5 mL/215 mg ou 10 mL/430 mg; diluir para IV em 100-250 mL SF 0,9%" },
      ],
      indications: [
        { name: "AVC isquêmico agudo", note: "Iniciar nas primeiras 24-72h do AVC; diluir em SF; infusão lenta 30-60 min", dose: "30-50 mL IV/dia × 10-21 dias consecutivos" },
        { name: "Doença de Alzheimer / demência vascular", note: "Ciclos trimestrais ou semestrais; evidência moderada em Alzheimer leve a moderado", dose: "10-30 mL IV/dia × 4 semanas, repetir 2-4x/ano" },
        { name: "Traumatismo craniencefálico (TCE)", note: "Quanto mais precoce o início, melhor o prognóstico; VERIFICAR protocolo por gravidade", dose: "10-50 mL IV/dia × 2-4 semanas" },
        { name: "Ambulatorial (neuroproteção / cognição)", note: "Uso IM para prática ambulatorial; dose inferior ao protocolo hospitalar IV", dose: "5-10 mL IM/dia × 4 semanas, 2-3 ciclos/ano" },
      ],
      phases: [
        { phase: "Fase aguda (hospitalar)", dose: "30-50 mL IV diluído em 250 mL SF, infusão 30-60 min, 10-21 dias consecutivos" },
        { phase: "Fase ambulatorial (manutenção)", dose: "5-10 mL IM 1x/dia, ciclos de 4 semanas, 2-3x/ano" },
        { phase: "Intervalo entre ciclos", dose: "2-3 meses sem uso; repetir conforme resposta clínica e avaliação médica" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Apresentação já em solução pronta (ampola 5 mL/215 mg ou 10 mL/430 mg) — sem reconstituição hídrica necessária",
        "Para IV: diluir volume indicado em 100-250 mL de soro fisiológico 0,9% imediatamente antes da infusão",
        "Infusão IV lenta (30-60 minutos); NUNCA administrar IV em bolus direto — risco de efeitos adversos",
        "Para IM: usar diretamente da ampola sem diluição; máximo 5 mL por sítio de injeção",
        "Refrigerar entre 2-8°C; não congelar; proteger da luz; usar ampola aberta em uma única sessão",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Reações de hipersensibilidade",
        "Tontura",
        "Febre transitória",
        "Convulsões em doses altas (raro)",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Semax", status: "Sinérgico", note: "Semax (ACTH-análogo, upregulation de BDNF/NGF via ACTH4-7) + Cerebrolysin (mimetizador neurotrófico multiespectral): potencialização de neuroproteção e neuroplasticidade com mecanismos complementares" },
        { name: "BPC-157", status: "Sinérgico", note: "BPC-157 (neuroproteção, VEGF, regeneração neuronal) + Cerebrolysin (neurotrofia e anti-apoptose): perfis neuroprotetores complementares usados conjuntamente em protocolos de TCE e AVC" },
        { name: "Noopept", status: "Compatível", note: "Noopept (NGF/BDNF upregulation, AMPA/NMDA) + Cerebrolysin (mimetizador neurotrófico): sobreposição parcial de alvos neurotróficos; potencial stack nootrópico de alta intensidade" },
        { name: "Dihexa", status: "Compatível", note: "Dihexa (HGF/c-Met sinaptogênese) + Cerebrolysin (neurotrofia ampla): alvos distintos e complementares para sinaptogênese e neuroproteção; sem antagonismo conhecido" },
        { name: "Selank", status: "Compatível", note: "Selank (ansiolítico, BDNF, imunomodulação leve) + Cerebrolysin (neurotrofia): stack de suporte neurológico e cognitivo amplo; sem antagonismo conhecido" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Cerebrolysin in patients with acute ischaemic stroke in Asia: results of the double-blind, placebo-controlled randomized CASTA trial",
          meta: "Humans · Ensaio CASTA (n=1070) — maior RCT de Cerebrolysin em AVC isquêmico agudo na Ásia; Bornstein et al. publicado em Stroke",
          year: "2012",
          summary: "RCT multicêntrico demonstrando tendência a benefício funcional com Cerebrolysin 30 mL IV x 10 dias em AVC agudo; análises de subgrupos mostraram benefício em pacientes com déficits mais graves.",
        },
        {
          title: "Cerebrolysin combined with rehabilitation after stroke (CARS) — a double-blind, placebo-controlled randomized trial",
          meta: "Humans · Ensaio CARS — Cerebrolysin 30 mL IV × 21 dias em combinação com reabilitação pós-AVC; Muresanu et al. publicado em European Journal of Neurology",
          year: "2016",
          summary: "RCT mostrando benefício significativo de Cerebrolysin associado a reabilitação intensiva em funcionalidade motora e cognitiva pós-AVC nos primeiros 90 dias.",
        },
        {
          title: "Cerebrolysin in vascular dementia: improvement of clinical outcome and cognitive performance (review)",
          meta: "Humans · Revisão clínica de Cerebrolysin em demência vascular — múltiplos ensaios europeus e asiáticos",
          year: "2014",
          summary: "Revisão de ensaios clínicos mostrando melhora de ADAS-cog e funcionalidade global com Cerebrolysin em demência vascular leve a moderada; base de aprovação em países europeus.",
        },
      ],
    },
  },
  {
    slug: "chonluten",
    name: "Chonluten",
    aliases: ["Peptídeo brônquico Khavinson", "Bioregulador pulmonar Khavinson", "Glu-Asp-Gly (tripeptídeo brônquico)"],
    tagline: "Biorregulador pulmonar para proteção e função respiratória",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30-60 min plasmática; efeito modulador persiste via regulação gênica em células brônquicas e pneumócitos tipo II" },
      { id: "classification", label: "Classificação", value: "Tripeptídeo bioregulador de tecido pulmonar/brônquico (escola Khavinson)" },
      { id: "cycle", label: "Ciclo", value: "10 dias, 2–3x ao ano" },
      { id: "route", label: "Via", value: "Oral ou sublingual" },
      { id: "dose", label: "Dose típica", value: "5–10 mg oral ou sublingual, 10 dias" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Chonluten",
      prose: "Chonluten é o tripeptídeo biorregulador Glu-Asp-Leu (EDL) desenvolvido por Khavinson para o tecido pulmonar. Demonstrou proteção epitelial pulmonar, redução de inflamação nas vias aéreas e efeitos benéficos em DPOC e envelhecimento pulmonar em estudos clínicos.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Chonluten é um tripeptídeo bioregulador derivado de extrato de tecido pulmonar bovino, desenvolvido pelo grupo de Khavinson no Instituto de Bioregulação e Gerontologia de São Petersburgo. Sua sequência peptídica — atribuída como Glu-Asp-Gly ou variante próxima — atua como sinalizador epigenético em células epiteliais brônquicas e pneumócitos tipo II, induzindo expressão de genes relacionados à regeneração do epitélio respiratório, síntese de surfactante e clearance mucociliar.\n\nO mecanismo proposto envolve ligação a receptores peptídicos de superfície em células brônquicas, ativação de vias de sinalização ligadas ao fator de crescimento epidermal (EGF) e modulação de genes de remodelamento tecidual pulmonar. Em modelos animais, demonstrou redução de fibrose pulmonar experimental, melhora da capacidade respiratória e aumento de células ciliadas funcionais. Na literatura clínica russa, ciclos de 10-20 dias foram relatados como benéficos em DPOC moderada, bronquite crônica e recuperação pós-pneumonia.\n\nImportante: este bioregulador foi desenvolvido pela escola russa de Khavinson (Instituto de Bioregulação e Gerontologia de São Petersburgo) e tem extensa literatura própria, mas validação independente ocidental ainda é limitada. As doses, indicações e mecanismos descritos refletem o protocolo russo tradicional e pesquisas do grupo de origem. Considere esse contexto ao avaliar a evidência disponível.",
      points: [
        "Modulação epigenética em células brônquicas e pneumócitos tipo II via peptídeo-sinal tecido-específico",
        "Estímulo à regeneração do epitélio respiratório e síntese de surfactante pulmonar",
        "Redução de inflamação e fibrose em tecido pulmonar — evidência principalmente em modelos animais",
        "Melhora de clearance mucociliar e capacidade respiratória em DPOC e bronquite crônica",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Proteção epitelial pulmonar",
        "Melhora de função respiratória",
        "Redução de inflamação brônquica",
        "Anti-aging pulmonar",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Redução progressiva de secreção brônquica excessiva; melhora leve da dispneia ao esforço" },
        { period: "Semana 3-4", text: "Aumento perceptível de capacidade respiratória; tosse produtiva reduzida" },
        { period: "Mês 2-3", text: "Melhora consolidada de função pulmonar; menos episódios de exacerbação respiratória" },
        { period: "Mês 3+", text: "Efeitos geroprotectores cumulativos no epitélio brônquico com ciclos repetidos sazonais" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "5–10 mg oral ou sublingual, 10 dias" },
        { label: "Via", value: "Oral (cápsulas) ou Subcutâneo" },
        { label: "Frequência", value: "1-2x/dia oral; ou 1x/dia SC; ciclos de 10-20 dias consecutivos, 2-3x/ano" },
        { label: "Duração do ciclo", value: "10 dias, 2–3x ao ano" },
        { label: "Concentração", value: "Oral: cápsulas 10 mg; SC: reconstituir 1 frasco em 1-2 mL (5-10 mg/mL)" },
      ],
      indications: [
        { name: "DPOC moderada ou bronquite crônica", note: "Ciclos sazonais; combinar com Crystagen para suporte imune-respiratório", dose: "1-2 cápsulas/dia oral × 20 dias, 2-3x/ano" },
        { name: "Recuperação pós-pneumonia", note: "Iniciar após fase aguda resolvida; reforçar com segundo ciclo após 1 mês se necessário", dose: "10 mg/dia SC × 10-20 dias" },
        { name: "Fibrose pulmonar leve", note: "Protocolo de longo prazo; monitorar função pulmonar por espirometria a cada 6 meses", dose: "10 mg/dia SC × 20 dias, 2x/ano" },
        { name: "Geroprotecção respiratória preventiva", note: "Uso preventivo em 50+ para manutenção do epitélio brônquico; ciclo primavera/outono Khavinson", dose: "1 cápsula/dia oral × 10 dias, 2x/ano" },
      ],
      phases: [
        { phase: "Ciclo de ataque (10-20 dias)", dose: "10 mg/dia SC ou 1-2 cápsulas/dia oral, consecutivos" },
        { phase: "Intervalo", dose: "2-4 meses sem uso entre ciclos" },
        { phase: "Ciclos de manutenção", dose: "Repetir 2-3x/ano; combinar com Crystagen e Epithalon no protocolo imune-respiratório Khavinson" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Retirar frasco da geladeira e aguardar temperatura ambiente (~10 min)",
        "Adicionar 1-2 mL de água bacteriostática ou solução salina 0,9% com seringa e agulha estéreis",
        "Rodar suavemente o frasco entre os dedos até dissolução completa — NÃO agitar",
        "Solução final: 5-10 mg/mL; usar imediatamente ou refrigerar (validade 14-21 dias após reconstituição)",
        "Administração SC: abdômen, coxa ou deltóide; rotacionar sítios de aplicação",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Geralmente bem tolerado",
        "Dados de estudos principalmente russos",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Crystagen", status: "Sinérgico", note: "Combinação respiratório-imune clássica Khavinson: Crystagen suporta imunidade tímica enquanto Chonluten regenera epitélio brônquico" },
        { name: "Thymosin Alpha-1", status: "Sinérgico", note: "Thymosin Alpha-1 modula imunidade pulmonar e resposta antiviral; complementa ação regenerativa de Chonluten no epitélio respiratório" },
        { name: "Epithalon", status: "Compatível", note: "Epithalon como hub geroprotector; pode ser incluído no mesmo ciclo para ampliar efeito antiaging sistêmico respiratório" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 tem ação anti-inflamatória sistêmica que pode potencializar recuperação de tecido pulmonar inflamado" },
        { name: "Selank", status: "Compatível", note: "Selank modula resposta imune e reduz ansiedade associada a doenças respiratórias crônicas; sinergia indireta" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Khavinson VKh et al. Peptide regulation of lung tissue functions in experimental models",
          meta: "Animal · Estudo em modelos animais avaliando bioregulador pulmonar Khavinson em fibrose experimental e DPOC",
          year: "2004",
          summary: "Ciclos de 10-20 dias com peptídeo brônquico Khavinson resultaram em melhora de função respiratória, redução de fibrose e aumento de células ciliadas funcionais em modelos animais.",
        },
        {
          title: "Khavinson VKh, Morozov VG. Tissue-specific peptide bioregulators: clinical applications",
          meta: "Humano · Revisão clínica do grupo Khavinson sobre bioreguladores tecido-específicos incluindo trato respiratório",
          year: "2003",
          summary: "Revisão abrangente da eficácia de peptídeos bioreguladores de múltiplos tecidos em protocolos de longevidade e tratamento de doenças crônicas.",
        },
        {
          title: "Anisimov VN, Khavinson VKh. Peptide bioregulation of aging: results and prospects",
          meta: "Animal/Humano · Revisão sobre bioreguladores Khavinson incluindo peptídeos pulmonares em modelos de envelhecimento",
          year: "2010",
          summary: "Análise dos resultados acumulados com peptídeos tecido-específicos em modelos de envelhecimento acelerado e populações clínicas russas.",
        },
      ],
    },
  },
  {
    slug: "cjc-1295",
    name: "CJC-1295",
    aliases: ["Mod GRF 1-29", "Modified GRF(1-29)", "CJC-1295 sem DAC"],
    tagline: "Análogo de GHRH com meia-vida ultraestendida",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30 minutos" },
      { id: "classification", label: "Classificação", value: "Análogo sintético do GHRH (sem DAC)" },
      { id: "cycle", label: "Ciclo", value: "8–16 semanas" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "2 mg/semana (DAC) ou 100 mcg/dia (sem DAC)" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é CJC-1295",
      prose: "CJC-1295 é um análogo sintético do GHRH (Growth Hormone Releasing Hormone) com meia-vida prolongada por conjugação a albumina plasmática via tecnologia DAC. Estimula a liberação pulsátil de GH pela hipófise, mimetizando o padrão fisiológico de secreção e amplificando seus efeitos anabólicos.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O CJC-1295 sem DAC (também chamado Mod GRF 1-29) é um análogo sintético dos primeiros 29 aminoácidos do GHRH (Hormônio Liberador de GH). As quatro substituições de aminoácidos introduzidas tornam o peptídeo resistente à clivagem pela enzima DPP-IV, prolongando sua meia-vida de ~2 minutos (GHRH nativo) para ~30 minutos. Ao se ligar ao receptor GHRH-R na hipófise anterior, estimula a liberação pulsátil de GH endógeno de forma fisiológica. A curta meia-vida imita o padrão natural de secreção de GH e minimiza dessensibilização dos receptores hipofisários. Para máxima eficácia, é tipicamente combinado com um GHRP (como Ipamorelin ou GHRP-2), que amplifica o pulso de GH via receptor de grelina, criando sinergia pronunciada no mesmo instante de secreção. Diferentemente do CJC-1295-DAC, não eleva os níveis basais de GH de forma contínua, preservando o ritmo circadiano fisiológico.",
      points: [
        "Análogo do GHRH com meia-vida de ~30 min (vs ~2 min do nativo), resistente à DPP-IV.",
        "Liga-se ao receptor GHRH-R na hipófise, promovendo liberação pulsátil de GH.",
        "Combinado com GHRP (Ipamorelin, GHRP-2) amplifica o pulso de GH sinergicamente.",
        "Preserva o ritmo circadiano de GH, minimizando dessensibilização hipofisária.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Aumento sustentado e prolongado de GH e IGF-1",
        "Ganho de massa muscular magra e redução de gordura",
        "Melhora da recuperação e da qualidade do sono profundo",
        "Efeitos anti-envelhecimento via eixo GH/IGF-1",
        "Fortalecimento de tendões, ossos e tecido conjuntivo",
        "Sinergia com Ipamorelin (efeito GHRH + secretagogo)",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Melhora do sono profundo; possível aumento de apetite noturno" },
        { period: "Semana 3-4", text: "Melhora de recuperação pós-treino; aumento de IGF-1 mensurável" },
        { period: "Mês 2-3", text: "Melhora de composição corporal; aumento de força e massa magra" },
        { period: "Mês 3+", text: "Pausa recomendada (4 semanas off) para restaurar sensibilidade receptora" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "2 mg/semana (DAC) ou 100 mcg/dia (sem DAC)" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "2–3× ao dia (com GHRP)" },
        { label: "Duração do ciclo", value: "8–16 semanas" },
        { label: "Concentração", value: "2 mL = 1 mg/mL (vial de 2 mg)" },
      ],
      indications: [
        { name: "Stack com Ipamorelin (anti-aging / sono)", note: "1× antes de dormir, em jejum de 2 h", dose: "100 mcg + 200 mcg Ipamorelin" },
        { name: "Stack com GHRP-2 (performance)", note: "Manhã e pré-treino, em jejum", dose: "100–200 mcg + 100–200 mcg GHRP-2" },
        { name: "Recomposição corporal", note: "Sempre combinado com GHRP correspondente", dose: "200 mcg 2–3×/dia" },
        { name: "Monoterapia (sem GHRP)", note: "Eficácia reduzida sem co-secretagogo", dose: "200–300 mcg 2×/dia" },
      ],
      phases: [
        { phase: "Semanas 1–12 (ciclo ativo)", dose: "100–200 mcg 2–3×/dia" },
        { phase: "Pausa (4 semanas)", dose: "Sem administração" },
        { phase: "Ciclo seguinte", dose: "Retomar mesma dose ou ajustar por IGF-1" },
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
        "Retenção hídrica (edema periférico leve)",
        "Dormência ou formigamento em extremidades",
        "Fadiga transitória pós-aplicação",
        "Hipoglicemia leve em jejum prolongado",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Ipamorelin", status: "Sinérgico", note: "Combinação clássica: CJC-1295 amplifica a janela de GHRH na hipófise; Ipamorelin dispara o pulso de GH via receptor de grelina no mesmo instante." },
        { name: "GHRP-2", status: "Sinérgico", note: "Similar ao Ipamorelin, porém GHRP-2 é mais potente por dose; monitorar elevação de cortisol na combinação." },
        { name: "BPC-157", status: "Compatível", note: "Mecanismos independentes; podem compor protocolos de recuperação e performance sem interação conhecida." },
        { name: "CJC-1295-DAC", status: "Monitorar", note: "Não combinar as duas versões: farmacocinéticas incompatíveis e risco de GH cronicamente suprafisiológico." },
        { name: "Tesamorelin", status: "Monitorar", note: "Não combinar dois análogos de GHRH simultaneamente — risco de hipersecreção de GH e dessensibilização." },
      ],
      bundles: [
        { name: "GH Optimizer", category: "Performance", items: ["Ipamorelin", "CJC-1295"], goal: "Performance e GH" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "CJC-1295, a long-acting growth hormone-releasing peptide, enhances pulsatile GH secretion and IGF-I levels",
          meta: "Humans · ensaio clínico",
          year: "2006",
          summary: "Estudo demonstrou que CJC-1295 aumenta de forma dose-dependente os níveis de GH e IGF-1 em voluntários saudáveis, com perfil farmacocinético compatível com administração pulsátil.",
        },
        {
          title: "Growth Hormone-Releasing Hormone and Its Analogs: from bench to bedside",
          meta: "Review · revisão",
          year: "2015",
          summary: "Revisão abrangente dos análogos de GHRH, incluindo Mod GRF 1-29, discutindo mecanismos, farmacocinética e aplicações clínicas comparativas.",
        },
        {
          title: "Pulsatile versus continuous GH stimulation: receptor desensitization and downstream signaling",
          meta: "Rats / In vitro · farmacologia",
          year: "2012",
          summary: "Comparou padrões pulsátil e contínuo de estimulação de GH, demonstrando que o padrão pulsátil (mimetizado pelo CJC-1295 sem DAC) preserva melhor a sensibilidade dos receptores hipofisários.",
        },
      ],
    },
  },
  {
    slug: "cjc-1295-dac",
    name: "CJC-1295 DAC",
    aliases: ["CJC-1295 with DAC", "DAC:GRF", "Drug Affinity Complex GRF"],
    tagline: "GHRH de longa ação — injeção 1–2x por semana",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~7–8 dias" },
      { id: "classification", label: "Classificação", value: "Análogo do GHRH com Drug Affinity Complex (DAC)" },
      { id: "cycle", label: "Ciclo", value: "8–16 semanas" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "1–2 mg subcutâneo, 1–2x por semana" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é CJC-1295 DAC",
      prose: "CJC-1295 DAC diferencia-se pela presença do Drug Affinity Complex, que permite ligação covalente à albumina sérica, estendendo a meia-vida para 6–8 dias. Proporciona elevação sustentada de GH e IGF-1 com conveniência de injeção semanal.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O CJC-1295-DAC incorpora um Drug Affinity Complex (DAC) ao Mod GRF 1-29 por meio de uma ligação covalente ao resíduo de lisina na posição 33. O DAC permite que o peptídeo se ligue reversivelmente à albumina sérica, criando um reservatório de liberação lenta na corrente sanguínea. Isso estende a meia-vida efetiva para ~7–8 dias, permitindo dosagem semanal. Ao contrário do CJC-1295 sem DAC, eleva os níveis basais de GH e IGF-1 de forma relativamente contínua — o que é eficaz para composição corporal, recuperação e anti-aging, mas suprime parcialmente o padrão pulsátil natural de GH. A combinação adicional com GHRPs geralmente não é recomendada, pois o estímulo de GH já é sustentado pela liberação prolongada de GHRH. A albumina plasmática atua como carreador reversível, liberando CJC-1295 ativo gradualmente ao longo de vários dias após cada injeção semanal.",
      points: [
        "DAC (Drug Affinity Complex) permite ligação reversível à albumina sérica.",
        "Meia-vida de ~7–8 dias garante dosagem semanal com níveis estáveis de GH/IGF-1.",
        "Eleva GH e IGF-1 de forma contínua — diferente do perfil pulsátil do CJC-1295 sem DAC.",
        "Adição de GHRP geralmente desnecessária e pode levar a GH cronicamente suprafisiológico.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Elevação sustentada de GH",
        "Aumento significativo de IGF-1",
        "Conveniente (1–2 injeções/semana)",
        "Melhora da composição corporal",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Níveis de GH e IGF-1 começam a subir; possível retenção hídrica inicial" },
        { period: "Semana 3-4", text: "IGF-1 estabilizado em nível suprafisiológico; melhora de recuperação e qualidade do sono" },
        { period: "Mês 2-3", text: "Melhora de composição corporal; ganho de massa magra e lipólise acelerada" },
        { period: "Mês 3+", text: "Pausa de 4–8 semanas recomendada para restaurar pulsatilidade natural de GH" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "1–2 mg subcutâneo, 1–2x por semana" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "1–2× por semana" },
        { label: "Duração do ciclo", value: "8–16 semanas" },
        { label: "Concentração", value: "2 mL = 1 mg/mL (vial de 2 mg)" },
      ],
      indications: [
        { name: "Composição corporal / recomposição", note: "SC 1× por semana, mesmo dia e horário", dose: "1–2 mg/semana" },
        { name: "Anti-aging / suporte hormonal", note: "Dose conservadora para efeito fisiológico suave", dose: "1 mg a cada 7–10 dias" },
        { name: "Recuperação de lesões", note: "Por 6–8 semanas, depois reduzir para manutenção", dose: "2 mg/semana" },
        { name: "Ciclo iniciante", note: "Checar IGF-1 basal e a cada 4 semanas", dose: "500 mcg–1 mg/semana" },
      ],
      phases: [
        { phase: "Semanas 1–8 (ciclo)", dose: "1–2 mg/semana" },
        { phase: "Semanas 9–12 (redução)", dose: "500 mcg–1 mg/semana" },
        { phase: "Pausa (4–8 semanas)", dose: "Sem administração" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 2.0 mL de água bacteriostática com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma",
        "Girar suavemente até dissolver (não agitar)",
        "Rotular e refrigerar a 2–8°C; válido por 28 dias após reconstituição",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Retenção hídrica",
        "Resistência à insulina",
        "Padrão não fisiológico de GH",
        "Artralgia",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Ipamorelin", status: "Compatível", note: "Pode ser combinado com cautela: Ipamorelin adiciona pulso via grelina, mas GH já está elevado pelo DAC — avaliar necessidade e monitorar IGF-1." },
        { name: "Semaglutida", status: "Compatível", note: "Sem interação farmacológica direta; podem compor stack de recomposição corporal sob supervisão." },
        { name: "BPC-157", status: "Compatível", note: "Mecanismos independentes; podem compor protocolos de recuperação e recomposição sem interação conhecida." },
        { name: "GHRP-2", status: "Monitorar", note: "Combinação aumenta risco de GH cronicamente suprafisiológico; monitorar IGF-1 a cada 4 semanas se usado." },
        { name: "CJC-1295", status: "Monitorar", note: "Não combinar as duas versões: farmacocinéticas incompatíveis e risco de hipersecreção de GH." },
      ],
      bundles: [
        { name: "GH Optimizer", category: "Performance", items: ["Ipamorelin", "CJC-1295"], goal: "Performance e GH" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Prolonged stimulation of growth hormone and insulin-like growth factor I secretion by CJC-1295 (DAC:GRF)",
          meta: "Humans · ensaio clínico",
          year: "2006",
          summary: "Estudo original de Teichman et al. demonstrou que CJC-1295-DAC produz elevação sustentada de GH e IGF-1 por vários dias após dose única em voluntários saudáveis, estabelecendo o conceito de estimulação prolongada de GH via DAC.",
        },
        {
          title: "Growth hormone-releasing hormone analogs with extended half-life: clinical implications and safety profile",
          meta: "Review · revisão",
          year: "2018",
          summary: "Revisão discutindo aplicações clínicas e farmacocinética de análogos de GHRH de longa ação, incluindo CJC-1295-DAC, com comparativo de perfis de GH contínuo vs pulsátil.",
        },
        {
          title: "Continuous versus pulsatile GH secretion: implications for receptor signaling and body composition",
          meta: "Rats / Review · farmacologia",
          year: "2014",
          summary: "Discutiu diferenças funcionais entre secreção contínua e pulsátil de GH, com implicações para compreender o perfil e os riscos do CJC-1295-DAC em uso prolongado.",
        },
      ],
    },
  },
  {
    slug: "cortagen",
    name: "Cortagen",
    aliases: ["AEDP", "Ala-Glu-Asp-Pro", "Кортаген", "Bioregulador cortical Khavinson"],
    tagline: "Biorregulador do córtex cerebral para função cognitiva",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30-60 min plasmática; efeito neuroprotetor persiste após clearance" },
      { id: "classification", label: "Classificação", value: "Tetrapeptídeo bioregulador do córtex cerebral (Khavinson — Instituto de Bioregulação de São Petersburgo)" },
      { id: "cycle", label: "Ciclo", value: "10 dias, 2–3x ao ano" },
      { id: "route", label: "Via", value: "Subcutânea ou oral" },
      { id: "dose", label: "Dose típica", value: "5–10 mg subcutâneo ou oral, 10 dias" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Cortagen",
      prose: "Cortagen é o tetrapeptídeo biorregulador Ala-Glu-Asp-Pro (AEDP) desenvolvido pelo Instituto de Gerontologia de São Petersburgo para o córtex cerebral. Demonstrou melhora de memória e aprendizado em estudos clínicos russos com efeito neuroprotetor documentado.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Cortagen (AEDP — Ala-Glu-Asp-Pro) é um tetrapeptídeo sintético desenvolvido pelo grupo de Khavinson como bioregulador tecido-específico do córtex cerebral, originalmente extraído de córtex bovino e hoje produzido por síntese química. O mecanismo de ação proposto envolve a modulação da expressão gênica em neurônios corticais: ao penetrar a membrana celular e interagir com cromatina nuclear, Cortagen estimularia a síntese de proteínas estruturais e enzimáticas necessárias para a manutenção e recuperação funcional das células nervosas corticais. Os efeitos descritos na literatura russa incluem: melhora de funções cognitivas comprometidas (memória episódica, atenção, velocidade de processamento); neuroproteção após lesão isquêmica ou traumática; modulação da atividade neuroelétrica cortical; e reversão de marcadores de encefalopatia leve. Indicações primárias: distúrbios cognitivos relacionados à idade, recuperação pós-traumatismo craniencefálico leve a moderado, encefalopatia de diversas etiologias e demência leve a moderada. Via IM é preferencial para uso clínico hospitalar; subcutâneo é usado em protocolos ambulatoriais. Dose padrão: 5-10 mg/dia em ciclos de 10 dias, 2-3 ciclos por ano. Importante: este bioregulador foi desenvolvido pela escola russa de Khavinson (Instituto de Bioregulação e Gerontologia de São Petersburgo) e tem extensa literatura própria, mas validação independente ocidental ainda é limitada. As doses, indicações e mecanismos descritos refletem o protocolo russo tradicional e pesquisas do grupo de origem. Considere esse contexto ao avaliar a evidência disponível.",
      points: [
        "Modula expressão gênica em neurônios corticais por interação com cromatina nuclear — mecanismo bioregulador Khavinson",
        "Neuroprotetor cortical: estimula síntese de proteínas de sobrevivência e recuperação neuronal",
        "Melhora de funções cognitivas comprometidas: memória episódica, atenção e velocidade de processamento",
        "Indicado em encefalopatia, recuperação pós-TCE e demência leve — validação ocidental ainda limitada",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Melhora de memória e aprendizado",
        "Neuroproteção cortical",
        "Melhora do foco",
        "Potencial anti-aging cerebral",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Dias 1-7", text: "Melhora sutil de alerta e clareza mental em pacientes com encefalopatia ou déficit cognitivo" },
        { period: "Semana 2-3", text: "Melhora de memória episódica e velocidade de processamento; redução de queixas cognitivas subjetivas" },
        { period: "Mês 1-2", text: "Melhora funcional progressiva em pós-TCE ou encefalopatia; benefício em demência leve" },
        { period: "Mês 2-3+", text: "Efeito neuroprotetor cumulativo com ciclos repetidos; melhora sustentada de funcionalidade cognitiva" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "5–10 mg subcutâneo ou oral, 10 dias" },
        { label: "Via", value: "Intramuscular" },
        { label: "Frequência", value: "1x/dia; ciclos de 10 dias consecutivos, 2-3x/ano" },
        { label: "Duração do ciclo", value: "10 dias, 2–3x ao ano" },
        { label: "Concentração", value: "1-2 mL = 5-10 mg/mL (frasco liofilizado reconstituído em SF 0,9%)" },
      ],
      indications: [
        { name: "Declínio cognitivo / encefalopatia leve a moderada", note: "Ciclos de 10 dias, 2-3x/ano; combinar com Pinealon para protocolo neuroprotetor completo", dose: "5-10 mg/dia IM × 10 dias" },
        { name: "Recuperação pós-TCE leve a moderado", note: "Iniciar após fase aguda estabilizada; pode repetir ciclos mensalmente", dose: "10 mg/dia IM × 10-20 dias" },
        { name: "Demência leve a moderada (adjuvante)", note: "Adjuvante ao tratamento convencional; evidência baseada em literatura russa", dose: "5 mg/dia IM × 10 dias, 2-3x/ano" },
        { name: "Geroprotecção cognitiva preventiva", note: "Uso preventivo em protocolos de longevidade Khavinson", dose: "5 mg/dia IM × 10 dias, 2x/ano" },
      ],
      phases: [
        { phase: "Ciclo de ataque (10-20 dias)", dose: "5-10 mg/dia IM 1x/dia consecutivos" },
        { phase: "Intervalo", dose: "3-6 meses sem uso entre ciclos" },
        { phase: "Ciclos de manutenção", dose: "Repetir 2-3x/ano; combinar com Pinealon e Epithalon em protocolos de longevidade Khavinson" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Adicionar 1-2 mL de solução fisiológica (SF 0,9%) ou água bacteriostática ao frasco liofilizado",
        "Girar suavemente até dissolução completa — solução deve ser límpida",
        "Para IM (uso clínico): concentração 5-10 mg/mL em 1-2 mL",
        "Refrigerar entre 2-8°C após reconstituição; usar em até 7 dias",
        "Usar em único sítio de injeção IM; alternar musculatura a cada aplicação",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Dados limitados na literatura ocidental",
        "Geralmente bem tolerado",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Pinealon", status: "Sinérgico", note: "Cortagen (bioregulador cortical, neuroproteção) + Pinealon (bioregulador pineal/cortical): protocolo neuroprotetor duplo Khavinson para recuperação cognitiva em AVC, TCE e demência" },
        { name: "Cerebrolysin", status: "Sinérgico", note: "Cerebrolysin (mimetizador neurotrófico NGF/BDNF/GDNF, aprovado em 50+ países) + Cortagen (bioregulador epigenético cortical): neuroproteção multiespectral por mecanismos complementares" },
        { name: "Semax", status: "Compatível", note: "Semax (ACTH-análogo, BDNF/NGF upregulation, nootrópico intranasal) + Cortagen (bioregulador cortical Khavinson): abordagens distintas à neuroproteção cortical; uso combinado em TCE e AVC" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 (neuroproteção, VEGF, modulação dopaminérgica) + Cortagen (expressão gênica cortical): perfis neuroprotetores complementares; sem antagonismo farmacológico conhecido" },
        { name: "Epithalon", status: "Compatível", note: "Epithalon (regulação epigenética ampla, geroprotecção) + Cortagen (epigenética cortical específica): overlapping de mecanismos epigenéticos sem antagonismo; protocolo de longevidade neurológica" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "AEDP tetrapeptide (Cortagen): neuroprotective effects in cortical neurons and cognitive deficit models (Khavinson)",
          meta: "Animals / Humans · Trabalho do grupo de Khavinson descrevendo efeitos neuroprotetores do tetrapeptídeo AEDP (Cortagen) em neurônios corticais e modelos de déficit cognitivo",
          year: "2011",
          summary: "Descreve atividade neuroprotetora de Cortagen em modelos de lesão cortical isquêmica e cognitiva; dados de pequenas séries clínicas russas em encefalopatia e demência leve.",
        },
        {
          title: "Peptide bioregulators of the cerebral cortex: gene expression modulation and clinical applications (Khavinson, Ryzhak)",
          meta: "Animals / In vitro · Khavinson e Ryzhak descrevendo peptídeos bioreguladores corticais (incluindo Cortagen/AEDP) e mecanismos de modulação gênica em neurônios",
          year: "2014",
          summary: "Demonstra interação de AEDP com promotores de genes de sobrevivência neuronal em modelos in vitro; base para indicações em patologias corticais degenerativas.",
        },
        {
          title: "Clinical use of short peptide bioregulators in post-traumatic encephalopathy and cognitive disorders",
          meta: "Humans · Revisão clínica do uso de bioreguladores peptídicos curtos (incluindo Cortagen) em encefalopatia pós-traumática e distúrbios cognitivos na prática médica russa",
          year: "2015",
          summary: "Série de casos e revisão de evidências clínicas russas sobre Cortagen e peptídeos similares em TCE e encefalopatia; resultados positivos em funcionalidade cognitiva.",
        },
      ],
    },
  },
  {
    slug: "crystagen",
    name: "Crystagen",
    aliases: ["EDP", "Glu-Asp-Pro", "Кристаген", "Bioregulador tímico Khavinson"],
    tagline: "Biorregulador tímico para imunoestimulação e anti-aging imune",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30-60 min plasmática; efeito imunomodulador persiste após clearance via modulação gênica em timócitos" },
      { id: "classification", label: "Classificação", value: "Tripeptídeo bioregulador do timo (Khavinson — Instituto de Bioregulação de São Petersburgo)" },
      { id: "cycle", label: "Ciclo", value: "10 dias, 2–3x ao ano" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "1–2 mg subcutâneo, 10 dias consecutivos" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Crystagen",
      prose: "Crystagen (Lys-Glu-Asp, KED) é um tripeptídeo biorregulador tímico do grupo Khavinson. Desenvolvido como versão de curta cadeia do Thymogen, demonstrou imunoestimulação, melhora de resposta a infecções e efeito anti-aging no sistema imune em estudos clínicos russos.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Crystagen (EDP — Glu-Asp-Pro) é um tripeptídeo sintético desenvolvido pelo grupo de Khavinson como bioregulador tecido-específico do timo, originalmente derivado de tecido tímico bovino. Diferentemente do Thymalin (extrato peptídico complexo do mesmo grupo), Crystagen é um peptídeo único e sintético. O mecanismo de ação proposto envolve a modulação da expressão gênica em timócitos e linfócitos T: ao interagir com cromatina nuclear dessas células, Crystagen estimularia a diferenciação e proliferação de linfócitos T, a síntese de timosinas endógenas (timulina, timopentina) e a maturação de células NK. Os efeitos descritos incluem: restauração da resposta imune celular comprometida por envelhecimento ou estresse imunológico; modulação da proporção CD4/CD8; redução de marcadores de inflamação crônica de baixo grau (IL-6, TNF-alfa); e melhora da resposta a estímulos antigênicos. Indicações primárias segundo a literatura russa: imunodeficiência leve relacionada ao envelhecimento, recuperação pós-infecção grave, geroprotecção imune em populações idosas e suporte imunológico em pós-operatório. Frequentemente usado em trio com Thymalin e Vilon nos protocolos de Khavinson para imunossenescência. Dose padrão: 5-10 mg/dia SC em ciclos de 10 dias, 2-3 ciclos por ano. Importante: este bioregulador foi desenvolvido pela escola russa de Khavinson (Instituto de Bioregulação e Gerontologia de São Petersburgo) e tem extensa literatura própria, mas validação independente ocidental ainda é limitada. As doses, indicações e mecanismos descritos refletem o protocolo russo tradicional e pesquisas do grupo de origem. Considere esse contexto ao avaliar a evidência disponível.",
      points: [
        "Modula expressão gênica em timócitos e linfócitos T: estimula diferenciação, síntese de timosinas e maturação de NK",
        "Restaura resposta imune celular comprometida por envelhecimento; modula proporção CD4/CD8",
        "Reduz marcadores de inflamação crônica de baixo grau (IL-6, TNF-alfa) em imunossenescência",
        "Indicado em imunodeficiência leve e geroprotecção imune — validação ocidental ainda limitada",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Imunoestimulação",
        "Restauração imune no envelhecimento",
        "Melhora de resposta a infecções",
        "Redução de incidência de infecções em idosos",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Dias 1-7", text: "Melhora sutil de imunidade celular; redução de infecções recorrentes de vias aéreas superiores" },
        { period: "Semana 2-3", text: "Aumento de energia e resistência a infecções; melhora da resposta imune a estímulos antigênicos" },
        { period: "Mês 1-2", text: "Restauração de parâmetros imunológicos em imunodeficiência leve; melhora de proporção CD4/CD8" },
        { period: "Mês 2-3+", text: "Efeito imunomodulador geroprotector cumulativo; melhora sustentada de imunidade em populações idosas" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "1–2 mg subcutâneo, 10 dias consecutivos" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "1x/dia; ciclos de 10 dias consecutivos, 2-3x/ano" },
        { label: "Duração do ciclo", value: "10 dias, 2–3x ao ano" },
        { label: "Concentração", value: "1 mL = 5-10 mg/mL (frasco reconstituído em água bacteriostática)" },
      ],
      indications: [
        { name: "Imunodeficiência leve relacionada à idade", note: "Ciclos de 10 dias, 2-3x/ano; combinar com Thymalin para protocolo imunomodulador completo Khavinson", dose: "5-10 mg/dia SC × 10 dias" },
        { name: "Recuperação pós-infecção grave", note: "Iniciar após resolução da fase aguda; pode repetir após 1 mês se necessário", dose: "10 mg/dia SC × 10 dias" },
        { name: "Geroprotecção imune preventiva", note: "Uso preventivo em longevidade imunológica; protocolo Khavinson outono/primavera", dose: "5 mg/dia SC × 10 dias, 2x/ano" },
        { name: "Suporte imune pós-operatório", note: "Iniciar após liberação cirúrgica; suporte à recuperação imunológica", dose: "5 mg/dia SC × 10 dias" },
      ],
      phases: [
        { phase: "Ciclo de ataque (10 dias)", dose: "5-10 mg/dia SC 1x/dia consecutivos" },
        { phase: "Intervalo", dose: "3-6 meses sem uso entre ciclos" },
        { phase: "Ciclos de manutenção", dose: "Repetir 2-3x/ano; combinar com Thymalin e Epithalon no trio Khavinson de geroprotecção imune" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Adicionar 1 mL de água bacteriostática ao frasco liofilizado de 5-10 mg",
        "Girar suavemente até dissolução completa — solução deve ser límpida",
        "Concentração resultante: 5-10 mg/mL para uso subcutâneo",
        "Refrigerar entre 2-8°C após reconstituição; usar em até 7 dias",
        "Proteger da luz; aplicar SC em rotação de sítios",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Bem tolerado",
        "Reação local leve",
        "Dados de estudos principalmente russos",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Thymalin", status: "Sinérgico", note: "Thymalin (extrato peptídico tímico complexo) + Crystagen (tripeptídeo tímico sintético EDP): trio imunomodulador Khavinson completo — extrato amplo + peptídeo específico; potencialização da restauração imune em imunossenescência" },
        { name: "Thymosin Alpha-1", status: "Sinérgico", note: "Thymosin Alpha-1 (peptídeo tímico sintético, aprovado em 35+ países, diferenciação T e NK) + Crystagen (bioregulador epigenético tímico Khavinson): abordagens complementares à imunomodulação tímica" },
        { name: "Epithalon", status: "Compatível", note: "Epithalon (geroprotecção epigenética, telomerase, eixo pineal-imune) + Crystagen (imunomodulação tímica): protocolo Khavinson de longevidade multiorgão — pineal + timo" },
        { name: "Selank", status: "Compatível", note: "Selank (imunomodulação via IL-6/BDNF, ansiolítico) + Crystagen (imunomodulação tímica Khavinson): abordagens distintas à modulação imune sem antagonismo conhecido" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 (imunomodulação indireta, regeneração tecidual, anti-inflamatório) + Crystagen (bioregulação imune tímica): perfis de imunomodulação complementares sem sobreposição direta conhecida" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "EDP tripeptide (Crystagen) as thymic bioregulator: T-lymphocyte differentiation and immune restoration (Khavinson)",
          meta: "Animals / Humans · Trabalho do grupo de Khavinson descrevendo efeitos imunomoduladores do tripeptídeo EDP (Crystagen) em timócitos e linfócitos T",
          year: "2009",
          summary: "Descreve estimulação de diferenciação de linfócitos T e síntese de timosinas endógenas por EDP/Crystagen; dados de modelos animais e séries clínicas russas em imunodeficiência leve.",
        },
        {
          title: "Thymic peptide bioregulators in immunosenescence and geriatric immunodeficiency (Khavinson, Morozov)",
          meta: "Humans · Khavinson e Morozov sobre bioreguladores peptídicos tímicos (incluindo Crystagen e Thymalin) em imunossenescência e imunodeficiência geriátrica",
          year: "2012",
          summary: "Revisão clínica de bioreguladores tímicos em populações idosas; dados de restauração imunológica e redução de morbidade infecciosa com Crystagen e Thymalin.",
        },
        {
          title: "Short peptide bioregulators of the immune system: from thymus extracts to synthetic peptides",
          meta: "Review · Revisão da evolução dos bioreguladores imunomoduladores: de extratos tímicos complexos (Thymalin) a peptídeos únicos sintéticos (Crystagen, Vilon)",
          year: "2018",
          summary: "Contextualiza Crystagen como evolução sintética do Thymalin, com mesmo espectro imunomodulador mas composição definida e reprodutível; dados comparativos de eficácia.",
        },
      ],
    },
  },
  {
    slug: "dihexa",
    name: "Dihexa",
    aliases: ["PNB-0408", "N-hexanoic-Tyr-Ile-(6) aminohexanoic amide", "Angiotensina IV análogo hexapeptídeo"],
    tagline: "Nootrópico com potência 10⁷x superior ao BDNF em modelos animais",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "Desconhecido em humanos; alta lipofilicidade sugere boa penetração SNC e meia-vida plasmática prolongada" },
      { id: "classification", label: "Classificação", value: "Hexapeptídeo análogo da angiotensina IV (ativador HGF/c-Met)" },
      { id: "cycle", label: "Ciclo", value: "4–8 semanas" },
      { id: "route", label: "Via", value: "Oral ou transdérmica" },
      { id: "dose", label: "Dose típica", value: "10–30 mg oral, 1x ao dia (ou transdérmico)" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Dihexa",
      prose: "Dihexa (PNB-0408) é um heptapeptídeo derivado de angiotensina IV que ativa o sistema HGF/Met. Publicado pela Washington State University, é considerado potencialmente 10 milhões de vezes mais potente que o BDNF em modelos de Alzheimer, promovendo sinaptogênese e formação de novos espinhos dendríticos.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Dihexa (PNB-0408) é um hexapeptídeo de baixo peso molecular desenvolvido por Joseph Harding e colaboradores na Washington State University como análogo da angiotensina IV com alta afinidade pelo receptor AT4 (também denominado IRAP — insulin-regulated aminopeptidase). Seu mecanismo central, distinto dos outros peptídeos nootrópicos, envolve a ativação potente da via HGF (hepatocyte growth factor) / c-Met receptor. Estudos pré-clínicos de Harding demonstraram que Dihexa induz sinaptogênese de novo — formação de novas sinapses funcionais — com potência estimada em 7 ordens de magnitude superior ao BDNF em modelos in vitro. A ativação do eixo HGF/c-Met promove crescimento de espinhas dendríticas, arborização axonal, potenciação de longa duração (LTP) e restauração de circuitos hipocampais comprometidos. Em modelos animais de Alzheimer e déficit cognitivo pós-isquêmico, Dihexa reverteu déficits de memória espacial em testes de labirinto aquático. A biodisponibilidade oral é reportada como alta por conta da lipofilicidade do composto e pela estabilidade frente a proteases intestinais. Importante ressalva: todos os dados robustos são pré-clínicos (modelos animais); ensaios clínicos em humanos publicados são inexistentes até o momento — qualquer uso em humanos é experimental e off-label.",
      points: [
        "Ativa receptor AT4/IRAP (angiotensina IV), potencializando sinalização HGF/c-Met no SNC",
        "Induz sinaptogênese de novo com potência estimada 10 milhões × superior ao BDNF (in vitro animal)",
        "Promove crescimento de espinhas dendríticas, arborização axonal e potenciação de LTP hipocampal",
        "Alta biodisponibilidade oral e lipofílica; atravessa barreira hematoencefálica eficientemente",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Formação de novas sinapses",
        "Reversão de déficits cognitivos (modelos animais)",
        "Melhora de memória de longo prazo",
        "Potencial neuroprotetor",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Dias 1-7", text: "Sem efeito perceptível esperado na primeira semana (mecanismo neurotrófico requer tempo de síntese)" },
        { period: "Semana 2-4", text: "Primeiros relatos anedóticos de maior clareza mental e facilidade de aprendizado — VERIFICAR" },
        { period: "Mês 1-2", text: "Melhora de memória de trabalho e memória espacial (baseado em modelos animais — VERIFICAR)" },
        { period: "Mês 2-3+", text: "Efeito neurotrófico cumulativo; potencial neuroproteção de longo prazo — altamente VERIFICAR (sem dados humanos publicados)" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "10–30 mg oral, 1x ao dia (ou transdérmico)" },
        { label: "Via", value: "Oral" },
        { label: "Frequência", value: "1x/dia pela manhã" },
        { label: "Duração do ciclo", value: "4–8 semanas" },
        { label: "Concentração", value: "Cápsulas 8-45 mg (compounding); sem concentração padrão estabelecida — VERIFICAR" },
      ],
      indications: [
        { name: "Déficit cognitivo / neuroproteção (experimental)", note: "Dose baixa inicial; aumentar conforme tolerância — altamente VERIFICAR; sem dados clínicos humanos", dose: "8-15 mg/dia oral" },
        { name: "Doença de Alzheimer (investigacional)", note: "Baseado em extrapolação de modelos animais — SEM ensaios clínicos humanos publicados — VERIFICAR", dose: "15-45 mg/dia oral" },
        { name: "Recuperação cognitiva pós-AVC (investigacional)", note: "Uso experimental; sem protocolo estabelecido em humanos — VERIFICAR", dose: "10-30 mg/dia oral" },
        { name: "Nootrópico de performance cognitiva", note: "Uso off-label não validado em humanos; risco desconhecido — VERIFICAR", dose: "8-15 mg/dia oral" },
      ],
      phases: [
        { phase: "Início (semanas 1-4)", dose: "8 mg/dia oral — avaliar resposta e tolerância" },
        { phase: "Manutenção", dose: "15-30 mg/dia oral se bem tolerado" },
        { phase: "Ciclos", dose: "8-12 semanas de uso, intervalo de 4 semanas — sem dados para guiar ciclos" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Dihexa é tipicamente fornecido em cápsulas orais (compounding) — não requer reconstituição hídrica",
        "Para uso sublingual/tópico: dissolver pó em DMSO 99% ou propilenoglicol na concentração desejada — VERIFICAR",
        "Solução em DMSO deve ser preparada imediatamente antes do uso",
        "Armazenar pó ou cápsulas em local seco, fresco (15-25°C), protegido da luz",
        "Forma oral preferencial por praticidade e biodisponibilidade adequada",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Dados de segurança humana muito limitados",
        "Efeitos antissociais relatados",
        "Perfil de longo prazo desconhecido",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Semax", status: "Sinérgico", note: "Semax (BDNF/NGF upregulation via ACTH-análogo) + Dihexa (HGF/c-Met sinaptogênese): mecanismos neurotróficos complementares e não sobrepostos" },
        { name: "Selank", status: "Sinérgico", note: "Selank (BDNF, modulação IL-6, ansiolítico) + Dihexa (sinaptogênese HGF/Met): stack nootrópico de ação ansiolítica + sinaptogênica" },
        { name: "Noopept", status: "Compatível", note: "Noopept (upregulation NGF/BDNF + modulação AMPA/NMDA) + Dihexa (HGF/c-Met): alvos moleculares distintos; potencial stack nootrópico multicamada" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 (neuroproteção, vascularização via VEGF) + Dihexa (sinaptogênese): perfis neuroprotetores complementares sem antagonismo conhecido" },
        { name: "PE-22-28", status: "Compatível", note: "PE-22-28 (bloqueio TREK-1, efeito antidepressivo/nootrópico) + Dihexa (HGF sinaptogênese): abordagens distintas à neuroplasticidade; sem interação conhecida" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Dihexa (N-hexanoic-Tyr-Ile-(6)-aminohexanoic amide) facilitates social recognition in rats by increasing HGF/Met signaling",
          meta: "Animals (rats) · Estudo seminal de Harding et al. (Washington State University) demonstrando que Dihexa facilita reconhecimento social e memória via ativação da via HGF/c-Met",
          year: "2013",
          summary: "Demonstra que Dihexa potencializa sinalização HGF/Met no hipocampo, revertendo déficits de memória social em ratos; estabelece o mecanismo AT4/IRAP-HGF como alvo do composto.",
        },
        {
          title: "A new class of small molecule drugs for Alzheimer's disease: AT4 receptor-mediated HGF/Met signaling",
          meta: "Animals · Trabalho de Harding e equipe da WSU estabelecendo Dihexa como lead compound para doenças neurodegenerativas via eixo AT4/HGF",
          year: "2012",
          summary: "Caracteriza a potência de Dihexa na ativação de c-Met, comparação com BDNF e reversão de déficits cognitivos em modelos animais de Alzheimer.",
        },
        {
          title: "Angiotensin IV and its analogs as cognitive enhancers: mechanisms and therapeutic potential (review)",
          meta: "Animals / Preclinical · Revisão da família angiotensina IV e análogos como nootrópicos, contextualizando Dihexa dentro do desenvolvimento da classe AT4",
          year: "2015",
          summary: "Revisão dos análogos AT4 incluindo angiotensina IV e Dihexa; apresenta o composto como o análogo mais potente da série para sinaptogênese.",
        },
      ],
    },
  },
  {
    slug: "dsip",
    name: "DSIP",
    aliases: ["Delta Sleep-Inducing Peptide", "DSIP nonapeptídeo", "delta-sleep peptide", "Trp-Ala-Gly-Gly-Asp-Ala-Ser-Gly-Glu"],
    tagline: "Peptídeo indutor de sono delta com efeito ansiolítico e adaptogênico",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~7–15 minutos (plasma); efeito clínico prolongado por mecanismo indireto" },
      { id: "classification", label: "Classificação", value: "Nonapeptídeo indutor de sono delta (NREM3) — regulador do eixo HPA" },
      { id: "cycle", label: "Ciclo", value: "2–4 semanas" },
      { id: "route", label: "Via", value: "Subcutânea ou intranasal" },
      { id: "dose", label: "Dose típica", value: "100–500 mcg subcutâneo ou intranasal, ao dormir" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é DSIP",
      prose: "DSIP (Delta Sleep-Inducing Peptide) é um nonapeptídeo originalmente isolado de coelhos em estado de sono profundo. Além de promover sono delta de ondas lentas, demonstrou efeitos ansiolíticos, antioxidantes, analgésicos e regulação de cortisol, sendo investigado como adaptógeno peptídico.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O DSIP (Delta Sleep-Inducing Peptide) é um nonapeptídeo (Trp-Ala-Gly-Gly-Asp-Ala-Ser-Gly-Glu) isolado originalmente do liquor de coelhos induzidos ao sono delta por Monnier e Schoenenberger em 1977, na Universidade de Basel. É detectado em múltiplos tecidos humanos — hipotálamo, hipófise, plasma e tecido pancreático — sugerindo função endócrina e paracrina. O mecanismo de indução de sono delta (NREM3) não é completamente elucidado: envolve modulação dos ritmos circadianos hipotalâmicos, interação com receptores GABA-A (potencialização do tônus GABAérgico) e modulação do sistema opioide endógeno. Também regula o eixo HPA (hipotálamo-hipófise-adrenal): estudos em roedores demonstram redução da resposta corticosterônica ao estresse, sugerindo ação ansiolítica e adaptogênica. Efeitos adicionais pesquisados incluem ação analgésica (possivelmente via sistema opioide), anticonvulsivante e possível papel na termorregulação. A aparente discrepância entre a meia-vida plasmática muito curta (~7–15 min) e o efeito clínico persistente por horas sugere mecanismo de ação indireta — provavelmente via modulação de neurotransmissores com efeito prolongado. IMPORTANTE: a evidência clínica humana é limitada, data principalmente da década de 1970–1990 com metodologias menos rigorosas, e estudos modernos controlados são escassos.",
      points: [
        "Induz e prolonga sono delta (NREM3) via modulação GABAérgica e opioidérgica hipotalâmica.",
        "Regula eixo HPA: reduz resposta corticosterônica ao estresse em modelos animais.",
        "Paradoxo farmacocinético: meia-vida ~7–15 min no plasma, efeito clínico dura horas (mecanismo indireto).",
        "EVIDÊNCIA LIMITADA: estudos principais da década de 70–90; estudos modernos controlados escassos — VERIFICAR.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Melhora de sono delta profundo",
        "Efeito ansiolítico",
        "Redução de cortisol",
        "Analgesia",
        "Regulação de GH e ACTH",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Melhora perceptível na qualidade do sono e na proporção de sono profundo (NREM3); onset em 30–60 min" },
        { period: "Semana 3-4", text: "Redução de despertar noturno; melhora de recuperação muscular e cognitiva associada ao sono profundo" },
        { period: "Mês 2-3", text: "Benefícios na regulação do cortisol noturno e adaptação ao estresse reportados anedoticamente — VERIFICAR" },
        { period: "Mês 3+", text: "Ciclos de 4–8 semanas com pausas; avaliar qualidade do sono por diário ou polissonografia — VERIFICAR" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "100–500 mcg subcutâneo ou intranasal, ao dormir" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "1× ao dia (30–60 min antes de dormir)" },
        { label: "Duração do ciclo", value: "2–4 semanas" },
        { label: "Concentração", value: "2 mL = 100 mcg/mL (vial de 200 mcg)" },
      ],
      indications: [
        { name: "Insônia / melhora de sono profundo", note: "Doses dos estudos originais; resposta individual variável — VERIFICAR", dose: "100–300 mcg SC 30–60 min antes de dormir" },
        { name: "Regulação de cortisol / adaptogênico", note: "Efeito ansiolítico e HPA-modulatório reportado; sem protocolo padronizado — VERIFICAR", dose: "100–200 mcg SC à noite" },
        { name: "Dor crônica / analgesia adjuvante", note: "Ação analgésica via sistema opioide; evidência limitada — VERIFICAR", dose: "100–200 mcg SC" },
        { name: "Stack com Epithalon", note: "Combinação para otimização de sono: DSIP induz NREM3, Epithalon regula melatonina — VERIFICAR", dose: "100 mcg DSIP + 5 mg Epithalon SC antes de dormir" },
      ],
      phases: [
        { phase: "Semanas 1–6 (ciclo experimental)", dose: "100–200 mcg SC 30–60 min antes de dormir" },
        { phase: "Pausa (2–4 semanas)", dose: "Avaliar qualidade do sono e marcadores de cortisol" },
        { phase: "Ciclo seguinte", dose: "Retomar mesma dose ou ajustar; combinar com polissonografia para objetivar efeito" },
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
        "Injetar 30–60 min antes de dormir para coincidir com onset do sono NREM3",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Tolerância rápida",
        "Cefaleia",
        "Sonhos vívidos",
        "Dados humanos limitados",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Epithalon", status: "Sinérgico", note: "DSIP induz e prolonga sono delta (NREM3); Epithalon regula melatonina e circadiano via glândula pineal. Combinação abrangente de qualidade de sono e longevidade noturna." },
        { name: "Selank", status: "Compatível", note: "Selank reduz ansiedade e estresse diurno (GABAérgico/BDNF); DSIP otimiza o sono delta noturno. Vias distintas e complementares para recuperação neurológica." },
        { name: "Semax", status: "Compatível", note: "Semax é estimulante cognitivo (BDNF/NGF) para uso diurno; DSIP induz sono profundo noturno. Ciclos distintos que não se sobrepõem — manhã vs antes de dormir." },
        { name: "Ipamorelin", status: "Compatível", note: "Ipamorelin eleva GH via pulso noturno; DSIP aprofunda o sono delta onde o maior pulso de GH ocorre. Combinação potencializa recuperação noturna global." },
        { name: "Benzodiazepínicos", status: "Monitorar", note: "DSIP potencializa tônus GABAérgico; combinação com benzodiazepínicos pode causar sedação excessiva e supressão respiratória — VERIFICAR." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "The delta sleep-inducing peptide (DSIP): isolation and characterization (Monnier and Schoenenberger)",
          meta: "Rabbits · bioquímica / neurociência do sono",
          year: "1977",
          summary: "Trabalho seminal de Monnier e Schoenenberger isolando o DSIP do liquor de coelhos em estado de sono delta, caracterizando sua sequência nonapeptídica e demonstrando sua capacidade de induzir sono delta quando administrado a outros animais.",
        },
        {
          title: "Delta sleep-inducing peptide (DSIP): its functions and possible clinical relevance (Schoenenberger)",
          meta: "Review · revisão / neurociência do sono",
          year: "1984",
          summary: "Revisão abrangente de Schoenenberger sobre as propriedades biológicas do DSIP — indução de sono delta, modulação do eixo HPA, ação analgésica e termorreguladora — e sua potencial relevância clínica em distúrbios do sono e estresse.",
        },
        {
          title: "DSIP in human cerebrospinal fluid and plasma: distribution, metabolism and HPA axis modulation",
          meta: "Humans · neurociência / endocrinologia",
          year: "1989",
          summary: "Estudo medindo DSIP em liquor e plasma humanos, documentando sua distribuição tecidual ampla e correlacionando seus níveis com a resposta corticosterônica ao estresse, sugerindo papel fisiológico na modulação do eixo HPA.",
        },
      ],
    },
  },
  {
    slug: "epithalon",
    name: "Epithalon",
    aliases: ["Epitalon", "Epithalamin sintético", "Ala-Glu-Asp-Gly", "Tetrapeptídeo pineal de Khavinson"],
    tagline: "Peptídeo epifisário para longevidade e ativação de telomerase",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~1–2 horas (estimativa; dados humanos limitados)" },
      { id: "classification", label: "Classificação", value: "Tetrapeptídeo bioregulador pineal (modulador de telomerase)" },
      { id: "cycle", label: "Ciclo", value: "10–20 dias por ciclo; repetir 1–2 vezes ao ano" },
      { id: "route", label: "Via", value: "Subcutânea ou intravenosa" },
      { id: "dose", label: "Dose típica", value: "5–10 mg/dia (ciclos de 10–20 dias)" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Epithalon",
      prose: "Epithalon (Epitalon) é um tetrapeptídeo sintético (Ala-Glu-Asp-Gly) desenvolvido pelo Instituto de Gerontologia de São Petersburgo por Vladimir Khavinson. É baseado na epitlamina, um extrato da glândula pineal. É o peptídeo mais estudado para longevidade celular e ativação de telomerase em humanos.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O Epithalon é um tetrapeptídeo sintético (Ala-Glu-Asp-Gly) desenvolvido por Vladimir Khavinson no Instituto de Gerontologia e Bioregulação de São Petersburgo, baseado no Epithalamion, um extrato purificado da glândula pineal bovina com propriedades anti-aging documentadas. O mecanismo principal envolve a ativação da enzima telomerase em células somáticas — enzima normalmente inativa em células diferenciadas — que restaura os telômeros progressivamente encurtados durante as divisões celulares. O encurtamento telomérico é considerado um marcador molecular central do envelhecimento celular (Hayflick limit). Estudos de Khavinson et al. publicados no Bulletin of Experimental Biology and Medicine demonstraram que o Epithalon aumenta a expressão de telomerase em linfócitos humanos cultivados, em células epiteliais intestinais de ratos e em fibroblastos. Paralelamente, o Epithalon estimula a produção endógena de melatonina pela glândula pineal, melhorando o ritmo circadiano e a qualidade do sono. Reduz marcadores oxidativos (8-OHdG, MDA), inflamatórios (TNF-α, IL-6) e de dano ao DNA em modelos animais de envelhecimento acelerado. Cursos curtos e intermitentes (10–20 dias, 2–3× ao ano) são o protocolo mais estudado.",
      points: [
        "Ativa telomerase em células somáticas, restaurando telômeros encurtados — marcador do envelhecimento celular.",
        "Estimula produção endógena de melatonina pela glândula pineal, melhorando circadiano e sono.",
        "Reduz marcadores oxidativos (8-OHdG) e inflamatórios (TNF-α, IL-6) em modelos de envelhecimento.",
        "Cursos curtos e intermitentes (10–20 dias, 2–3×/ano) são o protocolo mais estudado por Khavinson.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Ativação da telomerase e alongamento de telômeros",
        "Normalização da secreção de melatonina e ritmo circadiano",
        "Melhora da qualidade do sono profundo (fase delta)",
        "Imunomodulação e restauração de funções imunes relacionadas à idade",
        "Atividade antioxidante e redução de dano ao DNA",
        "Melhora de marcadores epigenéticos de envelhecimento",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Melhora perceptível da qualidade do sono; sonhos mais vívidos; relaxamento geral" },
        { period: "Semana 3-4", text: "Energia diurna aumentada; possível melhora de marcadores oxidativos se avaliados laboratorialmente" },
        { period: "Mês 2-3", text: "Benefícios do primeiro curso consolidados; avaliação de segundo curso 2–3 meses depois" },
        { period: "Mês 3+", text: "Efeitos cumulativos com múltiplos cursos ao longo do ano; telômeros avaliáveis após 6–12 meses" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "5–10 mg/dia (ciclos de 10–20 dias)" },
        { label: "Via", value: "Subcutâneo (predominante) ou Intranasal" },
        { label: "Frequência", value: "1× ao dia (curso de 10–20 dias)" },
        { label: "Duração do ciclo", value: "10–20 dias por ciclo; repetir 1–2 vezes ao ano" },
        { label: "Concentração", value: "2 mL = 5 mg/mL (vial de 10 mg)" },
      ],
      indications: [
        { name: "Curso de longevidade (padrão Khavinson)", note: "Curso de 10 dias; 2–3 cursos por ano com intervalo de 4–6 meses", dose: "5–10 mg/dia SC" },
        { name: "Melhora do sono / melatonina endógena", note: "Curso de 10–14 dias; avaliar qualidade do sono por diário", dose: "5 mg SC antes de dormir" },
        { name: "Anti-aging intensivo", note: "Curso mais longo; repetir 2× ao ano; monitorar comprimento de telômeros se disponível", dose: "10 mg/dia SC por 20 dias" },
        { name: "Introdução / primeiro curso", note: "Dose padrão para primeiro contato; avaliar resposta antes de aumentar", dose: "5 mg/dia SC por 10 dias" },
      ],
      phases: [
        { phase: "Curso 1 (10–20 dias)", dose: "5–10 mg/dia SC" },
        { phase: "Intervalo (4–6 meses)", dose: "Sem administração" },
        { phase: "Curso 2 (10–20 dias)", dose: "5–10 mg/dia SC" },
        { phase: "Intervalo (4–6 meses)", dose: "Sem administração — 2–3 cursos por ano" },
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
        "Usar dentro de 14 dias após reconstituição",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Efeitos adversos mínimos relatados em literatura",
        "Dor ou vermelhidão leve no local da injeção",
        "Dados em humanos ainda limitados a estudos de menor escala",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Selank", status: "Compatível", note: "Epithalon melhora sono e circadiano via melatonina; Selank reduz ansiedade. Compõem protocolo de bem-estar neurológico e longevidade." },
        { name: "Semax", status: "Compatível", note: "Semax otimiza função cognitiva diurna; Epithalon melhora recuperação noturna via melatonina. Stack de saúde neurológica abrangente." },
        { name: "Ipamorelin", status: "Compatível", note: "Ipamorelin eleva GH via grelina (anabólico); Epithalon atua na longevidade celular via telomerase. Mecanismos distintos e complementares." },
        { name: "BPC-157", status: "Compatível", note: "Mecanismos independentes; podem compor protocolos de longevidade e regeneração tecidual." },
        { name: "Melatonina exógena", status: "Monitorar", note: "Epithalon eleva melatonina endógena; suplementação adicional de melatonina exógena pode resultar em níveis excessivos e distúrbios circadianos." },
      ],
      bundles: [
        { name: "Fountain of Youth", category: "Longevidade", items: ["Epithalon", "Ipamorelin"], goal: "Anti-Aging e Pele" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Epithalon peptide (Ala-Glu-Asp-Gly) activates telomerase in human somatic cells",
          meta: "Humans / In vitro · bioquímica / longevidade",
          year: "2003",
          summary: "Estudo de Khavinson et al. demonstrou que o tetrapeptídeo Epithalon ativa a enzima telomerase em culturas de linfócitos humanos e células epiteliais, promovendo elongação de telômeros e sugerindo mecanismo de ação anti-aging em nível molecular.",
        },
        {
          title: "Pineal gland peptides and aging: melatonin regulation and circadian normalization by Epithalon",
          meta: "Rats / Humans · gerontologia",
          year: "2008",
          summary: "Estudo de Khavinson et al. publicado no Bulletin of Experimental Biology and Medicine demonstrando que o Epithalon normaliza a produção de melatonina pela glândula pineal em animais idosos, com melhora do ritmo circadiano e redução de marcadores de envelhecimento.",
        },
        {
          title: "Tetrapeptide Epithalon reduces oxidative stress and DNA damage in aging organisms",
          meta: "Rats · gerontologia / pré-clínico",
          year: "2012",
          summary: "Demonstrou que o Epithalon reduz marcadores de dano oxidativo (8-OHdG, MDA) e lesão de DNA em modelos animais de envelhecimento acelerado, consistente com seu mecanismo de proteção telomérica.",
        },
      ],
    },
  },
  {
    slug: "follistatin-344",
    name: "Follistatin 344",
    aliases: ["FST-344", "FST-315", "Follistatin-315", "Follistatin isoforma longa", "Inibidor proteico de miostatina"],
    tagline: "Inibidor de miostatina para hipertrofia muscular máxima",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30-60 min plasmática; efeito inibitório sobre miostatina e ativina persiste além do clearance -- VERIFICAR" },
      { id: "classification", label: "Classificação", value: "Proteína inibidora de miostatina e ativina A (315-344 aminoácidos; variante por splicing alternativo do gene FST)" },
      { id: "cycle", label: "Ciclo", value: "4–8 semanas" },
      { id: "route", label: "Via", value: "Intramuscular (local)" },
      { id: "dose", label: "Dose típica", value: "100 mcg injeção intramuscular local, 1–2x/semana" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Médio", pill: "amber" },
    ],
    about: {
      heading: "O que é Follistatin 344",
      prose: "Follistatin 344 é uma isoforma da follistatina que se liga e neutraliza miostatina (GDF-8), o regulador negativo do crescimento muscular. Casos documentados de deleção do gene da miostatina em humanos e animais resultam em hipertrofia muscular extrema sem gordura, validando o conceito.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Follistatin-344 é uma glicoproteína de 344 aminoácidos (isoforma longa FST-344) ou 315 aminoácidos (isoforma curta FST-315) codificada pelo gene FST, produzida por splicing alternativo. Sua função fisiológica primária é a ligação e neutralização de membros da família TGF-beta com alta afinidade — em especial miostatina (GDF-8) e ativina A, dois potentes inibidores endógenos do crescimento muscular. A neutralização de miostatina desinibe a via anabólica PI3K/Akt/mTOR nas células musculares esqueléticas, resultando em hipertrofia miofibrilar intensa e ativação de células satélites musculares. O fenômeno de double-muscling observado naturalmente em bovinos Belgian Blue e Piedmontese, bem como o caso clínico descrito por Schuelke (criança com mutação no gene da miostatina, NEJM 2004), demonstram o potencial hipertrófico quando esta via é completamente desinibida. Pesquisa em distrofia muscular de Duchenne, Becker e sarcopenia mostra resultados promissores em modelos animais. ATENÇÃO CRÍTICA: a inibição sistêmica de ativina A pode causar hipertrofia cardíaca patológica, fibrose pulmonar e alterações na homeostase óssea — risco significativo sem supervisão médica especializada. Uso humano exógeno sem aprovação regulatória.",
      points: [
        "Liga e neutraliza miostatina (GDF-8) e ativina A com alta afinidade, desinibindo crescimento muscular",
        "Desinibe via PI3K/Akt/mTOR em células musculares: hipertrofia miofibrilar e ativação de células satélites",
        "RISCO CRÍTICO: inibição de ativina A sistêmica pode causar hipertrofia cardíaca patológica e fibrose pulmonar",
        "Modelos animais e caso humano com mutação natural (Schuelke 2004) confirmam potência hipertrófica; dados humanos exógenos muito limitados",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Bloqueio de miostatina",
        "Hipertrofia muscular significativa",
        "Ganho de força",
        "Preservação muscular no envelhecimento",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Sem efeito visual esperado; mecanismo requer síntese proteica muscular progressiva" },
        { period: "Semana 2-4", text: "Início de ganho de massa muscular acelerado — variável conforme protocolo de treino e dieta; dados humanos muito limitados" },
        { period: "Mês 1-2", text: "Hipertrofia muscular progressiva mais visível; possível melhora de força e velocidade de recuperação" },
        { period: "Mês 2-3+", text: "Efeito hipertrófico cumulativo; monitorar ECG e ecocardiograma — risco de hipertrofia cardíaca com uso prolongado" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "100 mcg injeção intramuscular local, 1–2x/semana" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "1x/dia ou 5x/semana -- VERIFICAR; aplicação preferencial em sítio muscular-alvo para efeito local" },
        { label: "Duração do ciclo", value: "4–8 semanas" },
        { label: "Concentração", value: "1 mL = 100 mcg/mL (reconstituir 200 mcg em 2 mL de água bacteriostática gelada) -- VERIFICAR" },
      ],
      indications: [
        { name: "Hipertrofia muscular / performance (experimental off-label)", note: "SEM aprovação humana; risco cardíaco real; sem ensaios clínicos em indivíduos saudáveis -- VERIFICAR", dose: "100-200 mcg/dia SC sítio-específico" },
        { name: "Distrofia muscular de Duchenne/Becker (investigacional)", note: "Baseado em modelos animais; ensaios fase inicial em humanos -- VERIFICAR protocolo específico", dose: "100-200 mcg/dia SC ou IM" },
        { name: "Sarcopenia / perda muscular (investigacional)", note: "Dose conservadora exploratória; sem protocolo estabelecido em humanos -- VERIFICAR", dose: "50-100 mcg/dia SC" },
      ],
      phases: [
        { phase: "Ciclo curto (4-8 semanas)", dose: "100-200 mcg/dia SC 5x/semana -- VERIFICAR; monitorar função cardíaca com ECG" },
        { phase: "Intervalo obrigatório", dose: "4-8 semanas sem uso; avaliação cardiológica recomendada antes de repetir -- VERIFICAR" },
        { phase: "Manutenção (ciclos repetidos)", dose: "Sem protocolo estabelecido; máxima cautela com uso continuado -- VERIFICAR risco acumulado" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Adicionar 2 mL de água bacteriostática GELADA ao frasco liofilizado; NÃO usar água morna ou quente",
        "Girar suavemente em movimentos circulares — NÃO agitar, sacudir nem usar vórtex (proteína de alto peso molecular é frágil)",
        "Aguardar 3-5 minutos para dissolução completa; solução deve ser límpida ou levemente opalescente",
        "Refrigerar entre 2-8°C após reconstituição; NÃO congelar; usar em até 14 dias",
        "Inspecionar antes de cada uso: descartar se turva, precipitada ou com partículas visíveis (sinal de desnaturação)",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Dados humanos muito limitados",
        "Crescimento tumoral teórico",
        "Desequilíbrio entre músculos e tendões",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "IGF-1 LR3", status: "Sinérgico", note: "IGF-1 LR3 (ativação direta de mTOR e síntese proteica via IGF-1R) + Follistatin-344 (remoção do freio anabólico miostatina/ativina): sinergismo anabólico potente — desinibição + ativação simultânea do crescimento muscular" },
        { name: "HGH 191aa", status: "Sinérgico", note: "HGH exógeno (eixo GH/IGF-1/mTOR) + Follistatin-344 (inibição de miostatina): potencialização anabólica por vias complementares; RISCO de hipertrofia excessiva e efeitos cardiovasculares -- VERIFICAR" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 (regeneração muscular, VEGF, anti-inflamatório) + Follistatin-344 (hipertrofia via inibição de miostatina): perfis regenerativos e anabólicos complementares; sem interação farmacológica direta conhecida" },
        { name: "TB-500", status: "Compatível", note: "TB-500 (actina, regeneração de fibras musculares, anti-inflamatório) + Follistatin-344 (anabolismo por desinibição): suporte à recuperação muscular durante hipertrofia acelerada; monitorar carga cardiovascular" },
        { name: "Ipamorelin", status: "Monitorar", note: "Ipamorelin (eixo GH/IGF-1) + Follistatin-344 (anti-miostatina): combinação potencialmente muito anabólica; monitorar crescimento de órgãos e função cardíaca em uso prolongado -- VERIFICAR" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Myostatin mutation associated with gross muscle hypertrophy in a child (Schuelke et al., NEJM)",
          meta: "Humans · Caso clínico seminal de Schuelke et al. (NEJM 2004) — criança com mutação de perda de função no gene da miostatina apresentando hipertrofia muscular extrema; validação humana do eixo miostatina-follistatin",
          year: "2004",
          summary: "Demonstra que ausência congênita de miostatina funcional em humanos resulta em hipertrofia muscular generalizada sem efeitos adversos aparentes na infância; valida o eixo miostatina-músculo em humanos.",
        },
        {
          title: "Regulation of skeletal muscle mass in mice by a new TGF-beta superfamily member (McPherron, Lawler, Lee)",
          meta: "Animals (mice) · Trabalho seminal de McPherron, Lawler e Lee (Nature 1997) descrevendo a miostatina como regulador negativo de massa muscular e identificando follistatin como inibidor natural",
          year: "1997",
          summary: "Demonstra que camundongos knockout para miostatina apresentam dobramento de massa muscular; follistatin identificada como inibidor natural capaz de fenócopia do knockout in vivo.",
        },
        {
          title: "Follistatin gene delivery enhances muscle growth and strength in nonhuman primates (Lee et al., Science Translational Medicine)",
          meta: "Animals (primates) · Lee et al. — terapia gênica com follistatin em primatas não humanos demonstrando hipertrofia muscular a curto prazo; base para estudos em distrofias musculares humanas",
          year: "2009",
          summary: "Administração de vetor AAV carregando gene de follistatin em primatas produziu hipertrofia muscular significativa sem toxicidade hepática ou cardíaca evidente a curto prazo.",
        },
      ],
    },
  },
  {
    slug: "foxo4-dri",
    name: "FOXO4-DRI",
    aliases: ["FOXO4-D-Retro-Inverso", "Peptídeo senolítico de Keizer", "FOXO4 DRI senolítico"],
    tagline: "Peptídeo senolítico para eliminação seletiva de células senescentes",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~2-4 h (estimativa experimental); dados farmacocinéticos humanos inexistentes" },
      { id: "classification", label: "Classificação", value: "Peptídeo senolítico D-retro-inverso; bloqueia interação FOXO4-p53 em células senescentes induzindo apoptose seletiva (senólise)" },
      { id: "cycle", label: "Ciclo", value: "3 semanas, 1–2x ao ano" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "5 mg/kg em modelos animais (doses humanas em investigação)" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Difícil", pill: "amber" },
    ],
    about: {
      heading: "O que é FOXO4-DRI",
      prose: "FOXO4-DRI é um peptídeo D-retro-inverso publicado na Nature (2017) que promove apoptose seletiva de células senescentes (células zombie) sem afetar células saudáveis. Desenvolvido pelo grupo de Peter de Keizer, demonstrou reversão de fenótipos de envelhecimento em modelos animais.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "FOXO4-DRI é um peptídeo senolítico desenvolvido por Peter de Keizer e colaboradores na Erasmus University Medical Center (Utrecht), publicado em Cell em 2017. O peptídeo é um D-retro-inverso do domínio de interação de FOXO4 com p53, construído com aminoácidos-D na sequência reversa para resistência a proteases. O mecanismo é elegante e específico: em células senescentes, FOXO4 retém p53 no núcleo de forma ativa, suprimindo apoptose e mantendo a célula em estado SASP (secretory senescent). FOXO4-DRI penetra em células senescentes, compete com FOXO4 endógeno pela ligação a p53, liberando p53 para migrar para mitocôndrias e ativar a via apoptótica intrínseca — promovendo morte seletiva de células senescentes sem afetar células proliferativas ou pós-mitóticas saudáveis. Em camundongos, resultou em melhora de densidade capilar hepática, resistência física, pelagem e marcadores de saúde geral. ATENÇÃO CRÍTICA: todos os dados são pré-clínicos em camundongos. Nenhum ensaio clínico humano publicado existe. Protocolos de uso underground carecem de qualquer base de segurança ou eficácia estabelecida. Perfil de risco desconhecido em humanos.",
      points: [
        "Bloqueia interação FOXO4-p53 em células senescentes: libera p53 para ativar apoptose intrínseca mitocondrial",
        "Senólise seletiva: induz apoptose em células senescentes sem afetar células saudáveis proliferativas ou pós-mitóticas",
        "Melhora de marcadores de saúde em camundongos idosos: densidade capilar, resistência física, pelagem",
        "ATENÇÃO: dados exclusivamente pré-clínicos em camundongos — sem ensaios humanos publicados, perfil de risco desconhecido",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Eliminação de células senescentes",
        "Reversão de fenótipos de envelhecimento",
        "Melhora de função tecidual",
        "Potencial anti-aging profundo",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Dados apenas de modelos murinos: redução de células p21+/p16+ senescentes em tecidos; sem dados humanos" },
        { period: "Semana 3-4", text: "Em camundongos: melhora de marcadores funcionais (resistência física, pelagem); extrapolação humana altamente especulativa" },
        { period: "Mês 2-3", text: "Efeitos de senólise em camundongos descritos como duradouros; timeline humana completamente desconhecida" },
        { period: "Mês 3+", text: "Sem dados de ciclos repetidos ou efeitos a longo prazo em qualquer espécie além de camundongos" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "5 mg/kg em modelos animais (doses humanas em investigação)" },
        { label: "Via", value: "Intravenoso (experimental)" },
        { label: "Frequência", value: "Protocolos underground: 3 doses IV em 5 dias, ciclo a cada 6 meses — SEM BASE CLÍNICA ESTABELECIDA" },
        { label: "Duração do ciclo", value: "3 semanas, 1–2x ao ano" },
        { label: "Concentração", value: "Dose experimental murina: 5 mg/kg IV; extrapolação humana não validada — dose underground: 5-10 mg IV total" },
      ],
      indications: [
        { name: "Senescência celular associada ao envelhecimento (pesquisa)", note: "Uso apenas em contexto de pesquisa supervisionada; protocolos underground de 5-10 mg IV carecem de qualquer validacao", dose: "5 mg/kg IV em camundongos; dose humana NAO estabelecida" },
        { name: "Fragilidade e sarcopenia (experimental)", note: "Dados pre-clinicos em camundongos promissores; extrapolacao humana prematura e potencialmente perigosa", dose: "Dose humana NAO estabelecida" },
        { name: "Fibrose pulmonar ou osteoartrite (experimental)", note: "Hipotese baseada em mecanismo de senolise; sem ensaios clinicos humanos em nenhuma indicacao", dose: "Dose humana NAO estabelecida" },
      ],
      phases: [
        { phase: "Protocolo experimental murino", dose: "5 mg/kg IV em 3 sessoes ao longo de 5 dias" },
        { phase: "Intervalo experimental", dose: "6 meses entre ciclos em modelos murinos" },
        { phase: "AVISO", dose: "Qualquer uso em humanos e experimental sem base clinica; risco desconhecido; acompanhamento especializado obrigatorio" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "ATENÇÃO: uso exclusivamente experimental — sem protocolo clínico estabelecido em humanos",
        "Descongelar o pó liofilizado em temperatura ambiente por 15-30 min protegido da luz",
        "Reconstituir em solução salina 0,9% estéril ou PBS — concentração típica de ensaio: 1-5 mg/mL",
        "Filtrar com membrana 0,22 µm estéril; preparar apenas o volume necessário para administração imediata",
        "Administração IV lenta (pesquisa apenas); armazenar reconstituído no máximo 24h a 2-8°C",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Dados humanos muito limitados",
        "Dano a células saudáveis em doses altas",
        "Flebite local",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Dasatinib + Quercetina", status: "Compatível", note: "D+Q é a combinação senolítica mais estudada em humanos; FOXO4-DRI atua por mecanismo complementar (FOXO4-p53) podendo ampliar espectro de senólise" },
        { name: "Navitoclax (ABT-263)", status: "Monitorar", note: "Navitoclax inibe Bcl-2/Bcl-xL em células senescentes; mecanismo convergente com FOXO4-DRI na via apoptótica — risco de potencialização de toxicidade desconhecida" },
        { name: "Epithalon", status: "Compatível", note: "Epithalon tem efeito de rejuvenescimento telomérico; combinação teórica com FOXO4-DRI para abordagem multi-mecanismo de envelhecimento celular" },
        { name: "GHK-Cu", status: "Compatível", note: "GHK-Cu promove regeneração tecidual após senólise; potencial sinergia sequencial — FOXO4-DRI para limpar células senescentes, GHK-Cu para regenerar tecido" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Baar MP et al. Targeted Apoptosis of Senescent Cells Restores Tissue Homeostasis in Response to Chemotoxicity and Aging",
          meta: "Animal · Paper seminal em Cell 2017 descrevendo FOXO4-DRI e seus efeitos em camundongos idosos e tratados com quimioterapia",
          year: "2017",
          summary: "FOXO4-DRI induziu apoptose seletiva de células senescentes in vitro e in vivo em camundongos, melhorando densidade capilar hepática, resistência física e marcadores de saúde em animais idosos e quimio-tratados.",
        },
        {
          title: "Keizer PL et al. The essence of senescence. Genes & Development",
          meta: "Revisão · Revisão de Peter de Keizer sobre mecanismos de senescência celular e estratégias senolíticas incluindo FOXO4-DRI",
          year: "2017",
          summary: "Revisão abrangente do papel de FOXO4 na manutenção de senescência e do potencial de peptídeos senolíticos como intervenção anti-envelhecimento.",
        },
        {
          title: "Zhu Y et al. The Achilles heel of senescent cells: from transcriptome to senolytic drugs",
          meta: "Revisão · Revisão comparativa de abordagens senolíticas incluindo FOXO4-DRI, Dasatinib+Quercetina e outros agentes",
          year: "2015",
          summary: "Análise comparativa de estratégias senolíticas: identificação de vulnerabilidades em células senescentes e mecanismos de ação de diferentes abordagens de senólise.",
        },
      ],
    },
  },
  {
    slug: "ghk-cu",
    name: "GHK-Cu",
    aliases: ["Copper peptide", "GHK", "Glycyl-L-histidyl-L-lysine copper", "Cu-GHK"],
    tagline: "Complexo cobre-peptídeo para pele, cabelo e regeneração",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30 minutos (SC); efeito depot tópico prolongado" },
      { id: "classification", label: "Classificação", value: "Tripeptídeo endógeno quelante de cobre (Cu²⁺)" },
      { id: "cycle", label: "Ciclo", value: "8–16 semanas" },
      { id: "route", label: "Via", value: "Subcutânea ou tópica" },
      { id: "dose", label: "Dose típica", value: "1–2 mg subcutâneo, 3–5x/semana ou uso tópico" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Médio", pill: "amber" },
    ],
    about: {
      heading: "O que é GHK-Cu",
      prose: "GHK-Cu (Gly-His-Lys cobre complexo) é um tripeptídeo naturalmente encontrado no plasma humano que declina com a idade. Com 40+ anos de pesquisa, demonstrou remodelação de colágeno, regeneração capilar, cicatrização acelerada e proteção neural tanto tópica quanto sistemicamente.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O GHK-Cu é um tripeptídeo endógeno (Gly-His-Lys) com alta afinidade ao cobre iônico (Cu²⁺), descoberto por Loren Pickart em 1973. Seus níveis plasmáticos caem progressivamente com a idade — de ~200 ng/mL em jovens para ~80 ng/mL após os 60 anos — correlacionando-se com o declínio da capacidade regenerativa dérmica. O mecanismo central envolve a ativação de fibroblastos dérmicos para síntese aumentada de colágeno tipo I e III, elastina e glicosaminoglicanos (especialmente hialuronano). Estudos de transcriptômica (Pickart et al.) demonstraram que o GHK-Cu modula a expressão de mais de 4.000 genes humanos, incluindo vias de reparo de DNA, anti-inflamação, antioxidação, angiogênese e controle de apoptose. Via uso sistêmico (SC), estimula migração de queratinócitos, síntese de VEGF e cicatrização acelerada de feridas. Via uso tópico, penetra a barreira dérmica e reverte sinais de fotoenvelhecimento. O átomo de cobre complexado é cofator enzimático indispensável — versões sem cobre (GHK livre) têm atividade biológica muito reduzida.",
      points: [
        "Ativa fibroblastos dérmicos para síntese de colágeno I/III, elastina e hialuronano.",
        "Modula >4.000 genes via transcriptômica (reparo de DNA, anti-aging, antioxidação).",
        "Estimula angiogênese local via VEGF e migração de queratinócitos para cicatrização.",
        "O cobre (Cu²⁺) complexado é cofator enzimático essencial — GHK livre é inativo.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Síntese de colágeno e elastina",
        "Regeneração capilar",
        "Cicatrização acelerada",
        "Neuroproteção",
        "Antioxidante potente",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Tópico: melhora de textura e hidratação imediata; SC: resposta inflamatória inicial mínima" },
        { period: "Semana 3-4", text: "Redução visível de linhas finas; SC: aceleração de cicatrização de lesões cutâneas" },
        { period: "Mês 2-3", text: "Melhora significativa de elasticidade, tônus e uniformidade da pele; firming dérmico" },
        { period: "Mês 3+", text: "Benefícios cumulativos sustentados; resultados mais pronunciados com uso tópico contínuo" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "1–2 mg subcutâneo, 3–5x/semana ou uso tópico" },
        { label: "Via", value: "Tópico (dérmico) ou Subcutâneo" },
        { label: "Frequência", value: "Tópico: 1–2×/dia | SC: 2–3×/semana" },
        { label: "Duração do ciclo", value: "8–16 semanas" },
        { label: "Concentração", value: "Tópico: 1–5% em solução | SC: 1 mL = 1 mg/mL" },
      ],
      indications: [
        { name: "Rejuvenescimento dérmico (tópico)", note: "Aplicar após limpeza, 1–2× ao dia; massagear até absorção", dose: "Concentração 1–5% tópica" },
        { name: "Cicatrização de feridas (tópico)", note: "Troca diária; acelera granulação e remodelação de matriz", dose: "2–5% em curativo oclusivo" },
        { name: "Anti-aging sistêmico (SC)", note: "Ciclos de 8 semanas com 4 semanas off", dose: "1–2 mg SC 2–3×/semana" },
        { name: "Alopecia / queda de cabelo (tópico)", note: "Massagear suavemente; uso noturno; avaliar após 90 dias", dose: "2–3% aplicado no couro cabeludo" },
      ],
      phases: [
        { phase: "Semanas 1–8 (ciclo ativo)", dose: "1–2 mg SC 2–3×/semana ou tópico 1–2×/dia" },
        { phase: "Pausa (4 semanas)", dose: "Apenas uso tópico de manutenção se desejado" },
        { phase: "Ciclo seguinte", dose: "Retomar conforme objetivo terapêutico" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 1.0 mL de água bacteriostática com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma e calor excessivo",
        "Girar suavemente até dissolver completamente (solução deve ser azul-celeste)",
        "Para uso tópico: diluir em solução salina ou base gel a 1–5% de concentração",
        "Refrigerar a 2–8°C, proteger da luz; válido por 21 dias após reconstituição",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Irritação tópica em pele sensível",
        "Pigmentação transitória",
        "Acúmulo de cobre em uso excessivo",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "BPC-157", status: "Sinérgico", note: "Efeitos complementares em reparo tecidual: GHK-Cu promove remodelação de matrix extracelular; BPC-157 acelera angiogênese e cicatrização local." },
        { name: "TB-500", status: "Sinérgico", note: "TB-500 mobiliza células-tronco sistemicamente; GHK-Cu sinaliza remodelação de colágeno e síntese de matriz localmente." },
        { name: "Ipamorelin", status: "Compatível", note: "GH elevado pelo Ipamorelin amplifica a síntese de colágeno estimulada pelo GHK-Cu via eixo GH/IGF-1." },
        { name: "Retinoides", status: "Monitorar", note: "Uso tópico combinado pode causar irritação cumulativa e eritema; introduzir gradualmente em dias alternados e monitorar tolerância." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "GHK: a naturally occurring human plasma copper-binding tripeptide with broad biologic activities",
          meta: "In vitro · bioquímica / fibroblastos humanos",
          year: "1985",
          summary: "Estudo seminal de Pickart demonstrando que GHK-Cu ativa fibroblastos dérmicos humanos para produção aumentada de colágeno, elastina e glicosaminoglicanos, estabelecendo a base molecular para aplicações anti-aging e regenerativas.",
        },
        {
          title: "The Human Tripeptide GHK-Cu in Prevention of Oxidative Stress and Degenerative Conditions of Aging",
          meta: "Review · revisão",
          year: "2018",
          summary: "Revisão abrangente de Pickart et al. cobrindo décadas de pesquisa em GHK-Cu, incluindo dados de transcriptômica mostrando modulação de >4.000 genes humanos associados a reparo, anti-inflamação e reversão de marcadores de envelhecimento.",
        },
        {
          title: "GHK peptide as a natural modulator of multiple cellular pathways in skin regeneration",
          meta: "In vitro / In vivo · dermatologia",
          year: "2015",
          summary: "Demonstrou que GHK-Cu ativa vias de síntese de matriz extracelular, angiogênese e reparo de DNA em modelos cutâneos, confirmando eficácia em rejuvenescimento dérmico e cicatrização de feridas.",
        },
      ],
    },
  },
  {
    slug: "ghrp-2",
    name: "GHRP-2",
    aliases: ["Pralmorelin", "KP-102", "GHRP-2 acetato", "Growth Hormone Releasing Peptide-2"],
    tagline: "Secretagogo de GH de segunda geração com alta potência",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~15–60 minutos" },
      { id: "classification", label: "Classificação", value: "Secretagogo de GH de 2ª geração (GHRP)" },
      { id: "cycle", label: "Ciclo", value: "8–12 semanas" },
      { id: "route", label: "Via", value: "Subcutânea ou intranasal" },
      { id: "dose", label: "Dose típica", value: "100–300 mcg, 2–3x ao dia" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Alto", pill: "green" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é GHRP-2",
      prose: "GHRP-2 é um hexapeptídeo sintético agonista do receptor de grelina (GHS-R1a), considerado um dos mais potentes secretagogos de GH disponíveis. Mais potente que o GHRP-6 na liberação de GH mas com maior efeito sobre cortisol e prolactina.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O GHRP-2 (Growth Hormone Releasing Peptide-2) é um hexapeptídeo sintético agonista do receptor de grelina (GHS-R1a), desenvolvido como GHRP de segunda geração com maior potência secretagoga que o GHRP-6. Estimula a hipófise anterior a liberar pulsos de GH de forma dose-dependente, atuando via via distinta do GHRH. Comparado ao Ipamorelin, o GHRP-2 tem maior eficácia secretagoga por unidade de dose, porém apresenta efeitos colaterais dose-dependentes: elevação moderada de cortisol (~20–30% acima do basal) e aumento de prolactina, além de estimulação de apetite via receptor de grelina periférico. A combinação com GHRH (CJC-1295 sem DAC ou Tesamorelin) é altamente sinérgica: GHRH abre a janela hipofisária de liberação, GHRP-2 amplifica o pulso via receptor alternativo (grelina), resultando em aumento de 2–5× no pico de GH comparado à monoterapia com qualquer um dos dois isolados. Pralmorelin (forma injetável aprovada no Japão) é utilizado clinicamente como teste provocativo padronizado para diagnóstico de deficiência de GH, validando a segurança e eficácia clínica deste mecanismo.",
      points: [
        "Agonista do receptor de grelina (GHS-R1a) — secretagogo de GH de alta potência.",
        "Libera pulsos de GH dose-dependentes via hipófise anterior.",
        "Eleva modestamente cortisol e prolactina — mais que Ipamorelin, menos que GHRP-6.",
        "Sinergia máxima com GHRH (CJC-1295 sem DAC ou Tesamorelin): amplificação 2–5× do pico de GH.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Alta elevação de GH",
        "Aumento de força e massa muscular",
        "Redução de gordura corporal",
        "Melhora da recuperação pós-treino",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Melhora do sono profundo; aumento de GH pós-injeção mensurável; possível aumento de apetite" },
        { period: "Semana 3-4", text: "Melhora de recuperação pós-treino; IGF-1 começa a subir; redução de gordura visceral inicial" },
        { period: "Mês 2-3", text: "Ganho de massa magra e melhora de composição corporal; pele mais firme; maior energia" },
        { period: "Mês 3+", text: "Pausa de 4 semanas para restaurar sensibilidade do GHS-R1a e evitar taquifilaxia" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "100–300 mcg, 2–3x ao dia" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "2–3× ao dia (em jejum)" },
        { label: "Duração do ciclo", value: "8–12 semanas" },
        { label: "Concentração", value: "2 mL = 2.5 mg/mL (vial de 5 mg)" },
      ],
      indications: [
        { name: "Iniciantes / dose conservadora", note: "Manhã em jejum e antes de dormir; checar cortisol basal", dose: "100 mcg SC 2×/dia" },
        { name: "Performance / composição corporal", note: "Manhã, pré-treino e/ou antes de dormir; em jejum de 2 h", dose: "200 mcg SC 2–3×/dia" },
        { name: "Stack com CJC-1295 sem DAC", note: "Aplicar concomitantemente; pico de GH em ~30 min", dose: "100–200 mcg GHRP-2 + 100–200 mcg CJC-1295" },
        { name: "Dose diagnóstica clínica (Pralmorelin)", note: "Uso hospitalar exclusivo — não replicar em contexto não clínico", dose: "2 mcg/kg IV" },
      ],
      phases: [
        { phase: "Semanas 1–12 (ciclo ativo)", dose: "100–200 mcg SC 2–3×/dia" },
        { phase: "Pausa (4 semanas)", dose: "Sem administração" },
        { phase: "Ciclo seguinte", dose: "Retomar mesma dose ou ajustar por IGF-1" },
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
        "Aumento de cortisol",
        "Elevação de prolactina",
        "Aumento de apetite",
        "Retenção hídrica",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "CJC-1295", status: "Sinérgico", note: "Combinação clássica: CJC-1295 abre a janela de GHRH na hipófise; GHRP-2 dispara o pulso via grelina — amplificação de 2–5× no pico de GH." },
        { name: "Tesamorelin", status: "Sinérgico", note: "Similar ao CJC-1295 sem DAC: Tesamorelin fornece o estímulo GHRH, GHRP-2 amplifica via receptor de grelina." },
        { name: "BPC-157", status: "Compatível", note: "Mecanismos independentes; podem compor protocolos combinados de performance e recuperação." },
        { name: "Ipamorelin", status: "Monitorar", note: "Não combinar dois GHRPs simultaneamente: dessensibilização do GHS-R1a e risco de GH excessivo e hipercortisolismo." },
        { name: "Corticosteroides", status: "Monitorar", note: "GHRP-2 eleva cortisol modestamente; combinação com corticosteroides exógenos pode suprimir ainda mais o eixo HPA." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "GHRP-2 as a highly potent growth hormone secretagogue: dose-response and pituitary specificity",
          meta: "Humans / Rats · farmacologia",
          year: "1993",
          summary: "Estudo inicial caracterizando a resposta dose-dependente do GHRP-2 na liberação de GH, demonstrando especificidade hipofisária e quantificando os efeitos colaterais sobre cortisol e prolactina em voluntários saudáveis.",
        },
        {
          title: "Pralmorelin (GHRP-2) in the diagnosis of adult growth hormone deficiency: standardized provocative test",
          meta: "Humans · ensaio clínico",
          year: "2006",
          summary: "Validou o uso do Pralmorelin (GHRP-2 injetável) como teste provocativo padronizado para diagnóstico de deficiência de GH em adultos, confirmando eficácia e segurança do mecanismo GHS-R1a.",
        },
        {
          title: "Synergistic growth hormone release with combined GHRH and GHRP-2 administration in healthy adults",
          meta: "Humans · ensaio clínico",
          year: "1997",
          summary: "Demonstrou que a administração combinada de GHRH e GHRP-2 produz liberação de GH 2–5× maior que cada secretagogo isolado, estabelecendo a base fisiológica para stacks GHRH+GHRP.",
        },
      ],
    },
  },
  {
    slug: "ghrp-6",
    name: "GHRP-6",
    aliases: ["Growth Hormone Releasing Peptide-6", "His-DTrp-Ala-Trp-DPhe-Lys-NH2", "GHRP-6 acetato"],
    tagline: "Secretagogo de GH com efeito pronunciado no apetite",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~15–60 minutos" },
      { id: "classification", label: "Classificação", value: "Hexapeptídeo secretagogo de GH (1ª geração)" },
      { id: "cycle", label: "Ciclo", value: "8–12 semanas" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "100–300 mcg, 2–3x ao dia" },
      { id: "cost", label: "Custo", value: "$" },
      { id: "evidence", label: "Evidência", value: "Alto", pill: "green" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é GHRP-6",
      prose: "GHRP-6 foi o primeiro secretagogo de GH sintético clinicamente testado. Além de estimular GH, é conhecido pelo intenso aumento de apetite mediado pela grelina, sendo amplamente utilizado em contextos de ganho de massa muscular e melhora da composição corporal.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O GHRP-6 é um hexapeptídeo sintético de primeira geração, agonista do receptor de grelina (GHS-R1a), e um dos primeiros secretagogos de GH desenvolvidos para pesquisa clínica. Estimula a hipófise anterior a liberar pulsos de GH de forma dose-dependente, atuando via mecanismo complementar ao GHRH. Entre os GHRPs, o GHRP-6 se destaca por causar estimulação intensa de apetite — efeito mediado pelo receptor de grelina periférico no hipotálamo e trato GI — nos 30–60 minutos seguintes à injeção. Essa característica é aproveitada em contextos de ganho de massa, mas torna o peptídeo inadequado para ciclos de cutting ou emagrecimento. Comparado ao GHRP-2 (2ª geração) e ao Ipamorelin (3ª geração), eleva cortisol e prolactina em intensidade similar ou ligeiramente maior, especialmente em doses acima de 200 mcg. A combinação com GHRH (CJC-1295 sem DAC ou Tesamorelin) é altamente sinérgica: GHRH abre a janela hipofisária de liberação, GHRP-6 dispara o pulso via receptor de grelina, resultando em amplificação de 2–5× no pico de GH comparado à monoterapia. Deve ser injetado em jejum de pelo menos 2 horas para maximizar o pulso de GH.",
      points: [
        "Agonista do receptor de grelina (GHS-R1a) — GHRP de primeira geração e alta potência.",
        "Libera pulsos de GH dose-dependentes com estimulação intensa de apetite pós-injeção.",
        "Eleva cortisol e prolactina de forma dose-dependente (mais que Ipamorelin, similar ao GHRP-2).",
        "Sinergia pronunciada com GHRH (CJC-1295): amplificação de 2–5× no pico de GH.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Estimulação de GH",
        "Aumento significativo do apetite",
        "Ganho de massa muscular",
        "Efeito gastroprotetor (via BPC-like)",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Melhora do sono profundo; aumento de apetite marcado após cada dose" },
        { period: "Semana 3-4", text: "Melhora de recuperação pós-treino; IGF-1 começa a elevar; ganho de peso possível pelo apetite aumentado" },
        { period: "Mês 2-3", text: "Ganho de massa muscular e força em ciclos de bulking; composição corporal melhora" },
        { period: "Mês 3+", text: "Pausa de 4 semanas recomendada para restaurar sensibilidade do GHS-R1a" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "100–300 mcg, 2–3x ao dia" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "2–3× ao dia (em jejum)" },
        { label: "Duração do ciclo", value: "8–12 semanas" },
        { label: "Concentração", value: "2 mL = 2.5 mg/mL (vial de 5 mg)" },
      ],
      indications: [
        { name: "Iniciantes / dose conservadora", note: "Manhã em jejum e antes de dormir; observar apetite e cortisol", dose: "100 mcg SC 2×/dia" },
        { name: "Bulking / ganho de massa", note: "Aproveitar estímulo de apetite pós-dose; em jejum de 2 h", dose: "200–300 mcg SC 2–3×/dia" },
        { name: "Stack com CJC-1295 sem DAC", note: "Aplicar concomitantemente; pico de GH em ~30 min", dose: "100–200 mcg GHRP-6 + 100–200 mcg CJC-1295" },
        { name: "Recuperação / anti-aging (dose baixa)", note: "Preferir Ipamorelin se apetite aumentado for indesejado", dose: "100 mcg 1–2×/dia" },
      ],
      phases: [
        { phase: "Semanas 1–12 (ciclo ativo)", dose: "100–200 mcg SC 2–3×/dia" },
        { phase: "Pausa (4 semanas)", dose: "Sem administração" },
        { phase: "Ciclo seguinte", dose: "Retomar mesma dose ou trocar GHRP por Ipamorelin" },
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
        "Aumento intenso de apetite",
        "Elevação de cortisol",
        "Retenção hídrica",
        "Sonolência",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "CJC-1295", status: "Sinérgico", note: "Combinação clássica de primeira geração: CJC-1295 fornece o estímulo GHRH, GHRP-6 amplifica via grelina — sinergia de 2–5× no pico de GH." },
        { name: "Ipamorelin", status: "Monitorar", note: "Não combinar dois GHRPs simultaneamente: dessensibilização do GHS-R1a e risco de hipersecreção de GH e hipercortisolismo." },
        { name: "GHRP-2", status: "Monitorar", note: "Não combinar dois GHRPs: mecanismo idêntico (GHS-R1a), sem benefício adicional e risco de dessensibilização." },
        { name: "BPC-157", status: "Compatível", note: "Mecanismos independentes; podem compor protocolos de recuperação e ganho de massa." },
        { name: "Tesamorelin", status: "Sinérgico", note: "Tesamorelin como GHRH + GHRP-6 como amplificador de grelina; padrão similar ao stack CJC-1295 + GHRP-6." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "GHRP-6 stimulates growth hormone secretion in humans: dose-response and specificity",
          meta: "Humans · ensaio clínico",
          year: "1990",
          summary: "Estudo pioneiro caracterizando a resposta dose-dependente do GHRP-6 em voluntários saudáveis, confirmando liberação hipofisária de GH e descrevendo o perfil de efeitos colaterais (apetite, cortisol, prolactina) em função da dose.",
        },
        {
          title: "Synergistic GH release with GHRH plus GHRP-6: amplification via dual receptor pathways",
          meta: "Humans / Rats · farmacologia",
          year: "1994",
          summary: "Demonstrou que a combinação de GHRH com GHRP-6 produz liberação de GH sinergicamente amplificada (2–5×) em relação a cada composto isolado, estabelecendo a base para stacks GHRH+GHRP de primeira geração.",
        },
        {
          title: "Ghrelin receptor (GHS-R1a) agonists: from GHRP-6 to selective secretagogues",
          meta: "Review · revisão",
          year: "2009",
          summary: "Revisão evolutiva dos secretagogos de GH, comparando GHRP-6 (1ª geração) com análogos mais seletivos (GHRP-2, Ipamorelin), destacando a importância do efeito orexigênico e dos efeitos colaterais adrenais.",
        },
      ],
    },
  },
  {
    slug: "glutationa",
    name: "Glutationa",
    aliases: ["GSH", "Glutathione", "Glu-Cys-Gly (tripeptídeo)", "L-Glutationa Reduzida", "Glutation"],
    tagline: "Antioxidante master tripeptídeo para detoxificação e longevidade",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "Intracelular: dias-semanas (reciclada continuamente via ciclo GSH/GSSG); plasmática após IV: ~15-30 min (rapidamente distribuída para tecidos)" },
      { id: "classification", label: "Classificação", value: "Tripeptídeo antioxidante endógeno (Glu-Cys-Gly) — único antioxidante intracelular de baixo peso molecular sintetizado pelo próprio organismo; cofator essencial de glutationa peroxidase, transferase e redutase" },
      { id: "cycle", label: "Ciclo", value: "4–8 semanas" },
      { id: "route", label: "Via", value: "Intravenosa ou intramuscular" },
      { id: "dose", label: "Dose típica", value: "600–1200 mg IV ou IM, 2–3x por semana" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Médio", pill: "amber" },
    ],
    about: {
      heading: "O que é Glutationa",
      prose: "Glutationa (GSH) é o principal antioxidante intracelular do organismo. Na forma injetável, bypassa as limitações de biodisponibilidade oral (< 1%), sendo utilizada para detoxificação hepática, clareamento de pele, neuroproteção no Parkinson e suporte imunológico em doenças crônicas.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Glutationa (GSH) é um tripeptídeo (Glu-Cys-Gly) sintetizado endogenamente em duas etapas enzimáticas (gama-glutamilcisteína sintetase e glutationa sintetase), sendo o antioxidante intracelular de baixo peso molecular mais abundante do organismo. Sua função central é reduzir espécies reativas de oxigênio (ROS) por meio do ciclo GSH/GSSG: glutationa reduzida (GSH) doa elétrons para neutralizar H2O2, ONOO- e outros ROS, formando glutationa oxidada (GSSG), que é reciclada de volta a GSH pela glutationa redutase com NADPH. Além da ação antioxidante, a glutationa participa da destoxificação hepática de fase 2 (conjugação com xenobióticos via glutationa-S-transferase), reciclagem de vitaminas C e E, modulação imune (proliferação linfocitária), transporte de aminoácidos e sinalização redox. A principal limitação clínica é a péssima biodisponibilidade oral convencional — o tripeptídeo é amplamente degradado no trato gastrointestinal. Formulações superiores incluem IV (600-2400 mg), lipossomal oral, sublingual e nebulizada (esta última com pesquisa em doença de Parkinson). A N-acetilcisteína (NAC) é o precursor mais utilizado para elevar GSH intracelular por via oral convencional.",
      points: [
        "Principal antioxidante intracelular endógeno: neutraliza ROS via ciclo GSH/GSSG com reciclagem por glutationa redutase",
        "Destoxificação hepática fase 2: conjugação de xenobióticos e metabólitos tóxicos via glutationa-S-transferase",
        "Reciclagem de vitaminas C e E; modulação imune; inibição de tirosinase (despigmentação cutânea em altas doses)",
        "Biodisponibilidade oral convencional muito baixa; formas IV, lipossomal ou sublingual são superiores",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Detoxificação hepática",
        "Antioxidante potente",
        "Neuroproteção",
        "Melhora de imunidade",
        "Clareamento de pele (efeito colateral desejado)",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "IV: elevação plasmática imediata de glutationa; melhora de energia percebida e redução de fadiga oxidativa em estados de deficiência" },
        { period: "Semana 3-4", text: "Melhora de marcadores de estresse oxidativo; efeito despigmentante cutâneo inicial com doses altas; melhora de função imune" },
        { period: "Mês 2-3", text: "Melhora de função hepática (ALT/AST) em hepatopatias; Parkinson: possível melhora de sintomas motores com nebulização; pele: clareamento progressivo" },
        { period: "Mês 3+", text: "Efeitos sustentados com protocolo contínuo; manutenção de níveis celulares de GSH; reversão gradual de clareamento ao interromper uso estético" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "600–1200 mg IV ou IM, 2–3x por semana" },
        { label: "Via", value: "Intravenoso, Lipossomal Oral ou Subcutâneo" },
        { label: "Frequência", value: "IV: 600-2400 mg em infusão/push lento, 1-3x/semana; lipossomal oral: 500-1000 mg/dia; sublingual: 100-400 mg/dia" },
        { label: "Duração do ciclo", value: "4–8 semanas" },
        { label: "Concentração", value: "IV push: 600-1200 mg em 10-20 mL SF lento (3-5 min); infusão: 1200-2400 mg em 250 mL SF 0,9% em 30-60 min; lipossomal: 500-1000 mg/dose" },
      ],
      indications: [
        { name: "Suporte hepático e detoxificação (hepatopatias, hepatite, sobrecarga tóxica)", note: "Combinar com NAC oral (600 mg 2x/dia) para manutenção; monitorar ALT/AST e gama-GT a cada 4 semanas", dose: "600-1200 mg IV 2-3x/semana × 4-8 semanas" },
        { name: "Estética — despigmentação cutânea", note: "Off-label; efeito reversível ao interromper; popular na medicina estética asiática; segurança em altas doses crônicas não totalmente estabelecida", dose: "1200-2400 mg IV 1-2x/semana × 8-16 semanas" },
        { name: "Doença de Parkinson (nebulização)", note: "Protocolo de David Perlmutter; evidência preliminar de melhora motora; sem ensaio clínico fase 3 publicado; usar sob supervisão neurológica", dose: "600-2000 mg nebulizados 2-3x/semana" },
        { name: "Suporte oncológico adjuvante (proteção de toxicidade)", note: "Evidência de nefroproteção e neuroproteção em cisplatina; verificar com oncologista interacao com esquema quimioterápico antes de usar", dose: "1500-2500 mg IV antes de quimioterapia neurotóxica (cisplatina, taxanos)" },
        { name: "Geroprotecção e suporte imune antioxidante", note: "Protocolo de manutenção de longo prazo; combinar com NAC e vitamina C para ciclo antioxidante completo", dose: "500-1000 mg/dia lipossomal oral ou 600 mg IV 1x/semana" },
      ],
      phases: [
        { phase: "Fase intensiva (4-8 semanas)", dose: "IV 600-1200 mg 2-3x/semana; ou lipossomal oral 1000 mg/dia; para indicacoes agudas (hepatopatia, detox)" },
        { phase: "Fase de manutenção", dose: "IV 600 mg 1x/semana ou lipossomal oral 500 mg/dia; manter NAC oral como suporte contínuo" },
        { phase: "Monitoramento", dose: "GSH eritrocitária ou plasmática se disponível; marcadores de estresse oxidativo (8-OHdG, isoprostanos); função hepática a cada 3 meses" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Forma IV (pó liofilizado): reconstituir em água para injeção estéril ou SF 0,9% — tipicamente 600-2400 mg em 10-20 mL para push lento (3-5 min) ou diluir em 100-250 mL para infusão 30 min",
        "Forma lipossomal oral (preferida sobre oral convencional): já formulada — agitar frasco e medir dose; tomar em jejum para melhor absorção",
        "Forma sublingual: colocar sob a língua e manter 30-60 s antes de engolir; não comer ou beber por 15 min após",
        "Forma nebulizada (Parkinson): 600-2000 mg em 3 mL de SF para nebulização; preparar imediatamente antes do uso",
        "Proteger da luz e do calor; reconstituído IV: usar imediatamente; formas orais: refrigerar após abertura (2-8°C)",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Rash cutâneo",
        "Broncoespasmo (IV rápido)",
        "Neuropatia periférica com uso excessivo",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "NAC (N-Acetilcisteína)", status: "Sinérgico", note: "NAC é o precursor oral mais eficaz para elevar GSH intracelular; combinação clássica: glutationa IV/lipossomal para efeito imediato + NAC oral para manutenção contínua" },
        { name: "Vitamina C", status: "Sinérgico", note: "Vitamina C recicla glutationa oxidada (GSSG) de volta a GSH; combinação antioxidante clássica e sinérgica para ciclo redox completo" },
        { name: "SS-31 (Elamipretide)", status: "Compatível", note: "SS-31 protege cardiolipina mitocondrial do dano oxidativo; glutationa reduz ROS citoplasmáticos — sinergia de proteção oxidativa em dois compartimentos celulares" },
        { name: "Livagen", status: "Compatível", note: "Livagen promove regeneração hepática; combinação com glutationa IV para protocolo de suporte hepático completo em hepatopatias crônicas" },
        { name: "Cerebrolysin", status: "Compatível", note: "Cerebrolysin tem ação neuroprotetora central; combinação com glutationa nebulizada ou IV pode ampliar proteção antioxidante em neurodegeneração (Parkinson, demência)" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Weschawalit S et al. Glutathione and its antiaging and antimelanogenic effects",
          meta: "Humano · Revisão clínica sobre glutationa e seus efeitos antienvelhecimento e despigmentantes na pele",
          year: "2017",
          summary: "Revisão dos mecanismos de ação da glutationa como antioxidante sistêmico e inibidor de tirosinase, com análise crítica da biodisponibilidade de diferentes formas de administração e evidências clínicas de despigmentação cutânea.",
        },
        {
          title: "Lirussi F et al. Glutathione in the treatment of chronic liver diseases",
          meta: "Humano · Revisão e meta-análise do uso de glutationa IV em doenças hepáticas crônicas",
          year: "2006",
          summary: "Glutationa IV demonstrou melhora de enzimas hepáticas (ALT, AST, gama-GT) e marcadores de estresse oxidativo em pacientes com hepatite alcoólica, NASH e hepatite viral crônica.",
        },
        {
          title: "Mischley LK et al. Phase IIb study of intranasal glutathione in Parkinson disease",
          meta: "Humano · Ensaio clínico fase IIb de glutationa intranasal em doença de Parkinson",
          year: "2017",
          summary: "Glutationa intranasal (200-400 mg 3x/dia) foi segura e demonstrou tendência a melhora de escores motores (UPDRS) em pacientes com Parkinson — base para pesquisa de formas alternativas de administração.",
        },
      ],
    },
  },
  {
    slug: "gonadorelin",
    name: "Gonadorelin",
    aliases: ["GnRH sintético", "Factrel", "Lutrepulse", "LHRH", "Gonadorelina", "Gonadorelin acetato", "Cystorelin"],
    tagline: "GnRH sintético para manutenção do eixo hipotálamo-hipofisário",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~2–4 minutos" },
      { id: "classification", label: "Classificação", value: "Decapeptídeo idêntico ao GnRH endógeno (hormônio liberador de gonadotrofinas)" },
      { id: "cycle", label: "Ciclo", value: "Contínuo (junto com TRT) ou ciclos de 4–8 semanas" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "100–200 mcg subcutâneo, 2–3x por semana" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Alto", pill: "green" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Gonadorelin",
      prose: "Gonadorelin é o decapeptídeo sintético idêntico ao GnRH endógeno. Amplamente utilizado em protocolos de TRT para manter função testicular durante uso de testosterona exógena, preservar espermatogênese e prevenir atrofia testicular.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "A Gonadorelin é um decapeptídeo sintético quimicamente idêntico ao GnRH (Hormônio Liberador de Gonadotrofinas) endógeno produzido pelo hipotálamo. Liga-se ao receptor GnRH-R nas células gonadotróficas da hipófise anterior, estimulando a síntese e liberação pulsátil de LH (hormônio luteinizante) e FSH (hormônio folículo-estimulante). O LH atua nas células de Leydig testiculares, estimulando a produção endógena de testosterona; o FSH mantém a espermatogênese nos túbulos seminíferos. Em homens em terapia de reposição de testosterona (TRT), a testosterona exógena suprime o eixo hipotálamo-hipofisário-gonadal (HPG) pelo feedback negativo, levando à atrofia testicular e infertilidade. A Gonadorelin, administrada em regime pulsátil (2× ao dia ou em dias alternados), restaura a sinalização LH/FSH preservando a função testicular e a espermatogênese. É considerada mais fisiológica que o hCG porque mantém a secreção tanto de LH quanto de FSH — o hCG mimetiza apenas o LH. A meia-vida extremamente curta (~2–4 min) requer administração frequente para mimetizar os pulsos hipotalâmicos naturais de 90–120 minutos. Doses administradas continuamente causam down-regulation dos receptores GnRH-R, o que é a base dos agonistas de depósito (Lupron) usados para suprimir testosterona em câncer de próstata.",
      points: [
        "Decapeptídeo idêntico ao GnRH endógeno: estimula LH e FSH na hipófise de forma pulsátil.",
        "Em TRT: preserva função testicular, espermatogênese e volume testicular que a testosterona exógena suprime.",
        "Mais fisiológico que hCG: mantém LH e FSH vs hCG que mimetiza apenas LH.",
        "Meia-vida de ~2–4 min: administração pulsátil obrigatória (2×/dia ou EOD) para evitar down-regulation.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Manutenção da função testicular",
        "Preservação de espermatogênese",
        "Prevenção de atrofia testicular",
        "Estimulação fisiológica de LH/FSH",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "LH e FSH começam a ser restaurados; testículos respondem com elevação de testosterona intratesticular" },
        { period: "Semana 3-4", text: "Volume testicular preservado ou recuperado; espermatogênese mantida em homens em TRT" },
        { period: "Mês 2-3", text: "Função endócrina testicular estabilizada; FSH sustentando espermatogênese ativa" },
        { period: "Mês 3+", text: "Manutenção contínua enquanto TRT estiver ativa; avaliar volume testicular e espermograma a cada 6 meses" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "100–200 mcg subcutâneo, 2–3x por semana" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "2× ao dia ou em dias alternados (EOD)" },
        { label: "Duração do ciclo", value: "Contínuo (junto com TRT) ou ciclos de 4–8 semanas" },
        { label: "Concentração", value: "2 mL = 100 mcg/mL (vial de 200 mcg)" },
      ],
      indications: [
        { name: "TRT — preservação testicular / fertilidade", note: "Substituição ao hCG; meia-vida curta exige administração frequente", dose: "100 mcg SC 2×/dia ou 100–200 mcg EOD" },
        { name: "Diagnóstico de hipogonadismo (teste GnRH)", note: "Colher LH/FSH basal e 30/60 min após; avalia reserva hipofisária", dose: "100 mcg IV ou SC dose única" },
        { name: "Hipogonadismo hipogonadotrófico (off-label)", note: "Reproduz pulsatilidade hipotalâmica fisiológica; uso especializado com bomba portátil", dose: "Bomba de infusão pulsátil 5–20 mcg/90 min" },
        { name: "Criptorquidismo (diagnóstico/terapêutico)", note: "Em meninos pré-púberes; off-label; eficácia variável", dose: "100 mcg SC 1–2×/dia por 4–6 semanas" },
      ],
      phases: [
        { phase: "Indução (semanas 1–4)", dose: "100–200 mcg SC 2×/dia" },
        { phase: "Manutenção (enquanto TRT ativa)", dose: "100–200 mcg SC EOD ou 2×/dia" },
        { phase: "Avaliação semestral", dose: "Espermograma + volume testicular por ultrassom" },
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
        "Administrar o mais próximo possível da reconstituição pela meia-vida muito curta",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Desconforto local",
        "Cefaleia",
        "Flush facial",
        "Instabilidade hormonal transitória",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "hCG", status: "Monitorar", note: "Não combinar Gonadorelin e hCG simultaneamente em TRT: sobreposição de ação (LH/testicular) sem benefício adicional e risco de hiperstimulação." },
        { name: "Ipamorelin", status: "Compatível", note: "Ipamorelin eleva GH via grelina; Gonadorelin preserva eixo gonadal em TRT. Mecanismos completamente distintos e compatíveis." },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 modula dopamina e serotonina sem interação direta com o eixo HPG. Compatíveis em protocolos de TRT integrada." },
        { name: "Kisspeptina", status: "Sinérgico", note: "Kisspeptina estimula neurônios GnRH hipotalâmicos; Gonadorelin atua downstream na hipófise. Combinação potencializa o eixo HPG." },
        { name: "Enclomifeno", status: "Compatível", note: "Enclomifeno estimula GnRH/LH por via antiestrogênica; Gonadorelin estimula diretamente a hipófise. Vias complementares de restauração do eixo HPG." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Pulsatile GnRH therapy for male infertility and hypogonadotropic hypogonadism (Schally et al.)",
          meta: "Humans · revisão clínica seminal",
          year: "1971",
          summary: "Trabalho seminal de Schally e colaboradores (Nobel de Medicina, 1977) caracterizando a estrutura do GnRH/LHRH e sua ação pulsátil na hipófise, base científica para o uso da Gonadorelin sintética em fertilidade e hipogonadismo.",
        },
        {
          title: "Gonadorelin versus hCG for testicular preservation during testosterone replacement therapy",
          meta: "Humans · revisão / medicina masculina",
          year: "2020",
          summary: "Revisão comparando Gonadorelin e hCG para preservação de função testicular em homens em TRT, destacando a vantagem fisiológica da Gonadorelin por manter FSH além de LH, relevante para manutenção da espermatogênese.",
        },
        {
          title: "GnRH analogue administration for cryptorchidism and hypogonadotropic hypogonadism in children",
          meta: "Humans · endocrinologia pediátrica",
          year: "2015",
          summary: "Revisão das indicações pediátricas do GnRH sintético (Gonadorelin) para criptorquidismo e hipogonadismo hipogonadotrófico, com dados de eficácia e segurança em crianças e adolescentes.",
        },
      ],
    },
  },
  {
    slug: "hcg",
    name: "HCG",
    aliases: ["Gonadotrofina Coriônica", "Pregnyl", "Novarel", "Ovidrel", "Choriogonadotropin alfa", "hCG urinário", "hCG recombinante"],
    tagline: "Gonadotrofina coriônica humana para estimulação testicular",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~24–36 horas (subunidade β)" },
      { id: "classification", label: "Classificação", value: "Glicoproteína gonadotrófica placentária (agonista do receptor LH/hCG) — NÃO é peptídeo estritamente" },
      { id: "cycle", label: "Ciclo", value: "Contínuo durante TRT ou TPC de 3–4 semanas" },
      { id: "route", label: "Via", value: "Subcutânea ou intramuscular" },
      { id: "dose", label: "Dose típica", value: "250–500 UI subcutâneo, 2–3x por semana" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Alto", pill: "green" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é HCG",
      prose: "HCG (Gonadotrofina Coriônica Humana) mimetiza o LH endógeno, estimulando diretamente as células de Leydig nos testículos a produzirem testosterona. É essencial em protocolos de TRT para manter volume testicular e na terapia pós-ciclo (TPC) androgênico.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "A hCG (Gonadotrofina Coriônica Humana) é uma glicoproteína dimérica de ~36–40 kDa produzida pelo sinciciotrofoblasto placentário durante a gravidez. É composta por uma subunidade α (comum a LH, FSH e TSH) e uma subunidade β específica da hCG, que confere especificidade ao receptor LH/hCGR. NOTA IMPORTANTE: a hCG NÃO é estritamente um peptídeo — é uma proteína glicosilada de alto peso molecular, incluída aqui pelo seu uso rotineiro em protocolos de medicina masculina e TRT. No contexto masculino, a hCG mimetiza a ação do LH (homologia de ~85% entre as subunidades β do hCG e do LH) nas células de Leydig testiculares, estimulando a síntese intratesticular de testosterona e mantendo o volume testicular, a espermatogênese e a fertilidade durante a TRT — onde a testosterona exógena suprime o LH endógeno. A meia-vida muito mais longa (~24–36 h vs ~60–90 min do LH) permite dosagem 2–3× por semana. Existem duas formas: hCG urinário (Pregnyl, Novarel — purificado de urina de mulheres grávidas) e hCG recombinante (Ovidrel/choriogonadotropin alfa — DNA recombinante, maior pureza). Em PCT (terapia pós-ciclo com AAS): restaura rapidamente a produção de testosterona endógena antes do uso de SERMs (tamoxifeno, clomifeno).",
      points: [
        "NOTA: hCG é glicoproteína (~37 kDa), NÃO peptídeo. Incluída aqui pelo uso em protocolos de TRT e fertilidade.",
        "Mimetiza LH com alta afinidade (homologia ~85% subunidade β): preserva testículos e espermatogênese em TRT.",
        "Meia-vida ~24–36 h vs ~60–90 min do LH: dosagem 2–3×/semana suficiente.",
        "Urinário (Pregnyl/Novarel) vs Recombinante (Ovidrel): mesma ação; recombinante tem maior pureza e reprodutibilidade.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Manutenção do volume testicular",
        "Estimulação de testosterona endógena",
        "Suporte à fertilidade",
        "Terapia pós-ciclo eficaz",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "LH-like stimulation das células de Leydig; testosterona intratesticular começa a subir; sensação de volume testicular preservado" },
        { period: "Semana 3-4", text: "Esteroidogênese testicular estabilizada; volume testicular mantido vs TRT sem hCG" },
        { period: "Mês 2-3", text: "Espermatogênese preservada; FSH ainda pode estar suprimido (hCG não estimula FSH); avaliar espermograma" },
        { period: "Mês 3+", text: "Manutenção contínua durante TRT; evaluar espermograma a cada 6 meses; considerar FSH exógeno (hMG) se fertilidade prioritária" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "250–500 UI subcutâneo, 2–3x por semana" },
        { label: "Via", value: "Subcutâneo ou Intramuscular" },
        { label: "Frequência", value: "2–3× por semana" },
        { label: "Duração do ciclo", value: "Contínuo durante TRT ou TPC de 3–4 semanas" },
        { label: "Concentração", value: "1 mL = 500–1000 UI (diluição conforme produto)" },
      ],
      indications: [
        { name: "TRT — preservação testicular", note: "Dose que minimiza atrofia testicular; superior a doses maiores por evitar downregulation do LHR", dose: "250–500 UI SC 2–3×/semana" },
        { name: "Fertilidade masculina em TRT", note: "Combinar com FSH (hMG) se espermatogênese comprometida após TRT prolongada", dose: "500–1000 UI SC 2–3×/semana" },
        { name: "PCT (pós-ciclo AAS)", note: "Restaura testosterona endógena antes dos SERMs (tamoxifeno/clomifeno); depois parar hCG antes de iniciar SERM", dose: "500–1000 UI SC/IM/dia por 7–10 dias" },
        { name: "Hipogonadismo hipogonadotrófico", note: "Tratamento de longo prazo para restaurar esteroidogênese; combinar com FSH para espermatogênese", dose: "1500–3000 UI IM 2–3×/semana" },
      ],
      phases: [
        { phase: "Indução TRT (semanas 1–4)", dose: "500 UI SC 2–3×/semana concomitante à testosterona" },
        { phase: "Manutenção TRT (contínuo)", dose: "250–500 UI SC 2×/semana" },
        { phase: "PCT (se suspensão de AAS)", dose: "500–1000 UI/dia por 7–10 dias, depois SERM por 4 semanas" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 1.0–2.0 mL de solução salina 0.9% ou água bacteriostática com seringa estéril",
        "Injetar lentamente no frasco de pó liofilizado; girar suavemente até dissolução",
        "NÃO agitar vigorosamente — glicoproteína sensível à desnaturação mecânica",
        "Rotular e refrigerar a 2–8°C; válido por 30–60 dias após reconstituição",
        "Ovidrel (hCG recombinante): já vem em solução pronta em seringa preenchida — não reconstitui",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Ginecomastia por aromatização",
        "Acne",
        "Supressão HPTA com uso prolongado",
        "Retenção hídrica",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Gonadorelin", status: "Monitorar", note: "Não combinar hCG e Gonadorelin simultaneamente: sobreposição de ação no eixo LH-testicular sem benefício adicional e risco de hiperstimulação de células de Leydig." },
        { name: "Ipamorelin", status: "Compatível", note: "Ipamorelin eleva GH via eixo somatotrófico; hCG preserva eixo gonadal. Mecanismos completamente independentes e compatíveis em protocolos integrais." },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 atua em reparo tecidual e modulação dopaminérgica; sem interação direta com eixo gonadal. Compatíveis em protocolos de TRT integrada." },
        { name: "Kisspeptina", status: "Sinérgico", note: "Kisspeptina estimula GnRH hipotalâmico upstream; hCG estimula testículos downstream. Podem complementar o eixo HPG em diferentes níveis." },
        { name: "Enclomifeno", status: "Compatível", note: "Enclomifeno restaura eixo HPG via antiestrogênio central; hCG estimula diretamente células de Leydig. Vias distintas; compatíveis em protocolos de PCT ou restauração hormonal." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Human chorionic gonadotropin (hCG) for male hypogonadism and fertility: mechanisms and clinical use",
          meta: "Humans · revisão endocrinológica",
          year: "2012",
          summary: "Revisão abrangente do uso de hCG em medicina masculina, cobrindo mecanismo de ação via receptor LH/hCGR, preservação de função testicular durante TRT, tratamento de hipogonadismo hipogonadotrófico e restauração de espermatogênese.",
        },
        {
          title: "Low-dose hCG co-administration with testosterone replacement preserves spermatogenesis and testicular volume",
          meta: "Humans · ensaio clínico",
          year: "2005",
          summary: "Estudo demonstrando que a co-administração de hCG em baixas doses (500 UI 3×/semana) com testosterona exógena preserva o volume testicular e a concentração espermática em homens em TRT, vs supressão completa sem hCG.",
        },
        {
          title: "hCG versus gonadorelin for testicular function preservation in testosterone replacement: comparative review",
          meta: "Humans · revisão comparativa",
          year: "2022",
          summary: "Comparação de hCG e Gonadorelin para preservação testicular em TRT, discutindo vantagens e limitações de cada abordagem: hCG não estimula FSH (limitação para fertilidade), Gonadorelin é mais fisiológica mas exige administração mais frequente.",
        },
      ],
    },
  },
  {
    slug: "hexarelin",
    name: "Hexarelin",
    aliases: ["Examorelin", "EP-23905", "MF-6003", "Hexarelin acetato", "His-D-2MeTrp-Ala-Trp-D-Phe-Lys-NH2"],
    tagline: "GHRP com efeito cardioprotetor adicional",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30–60 minutos" },
      { id: "classification", label: "Classificação", value: "Hexapeptídeo secretagogo de GH de alta potência (agonista GHS-R1a + CD36)" },
      { id: "cycle", label: "Ciclo", value: "8–12 semanas" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "100–200 mcg, 2–3x ao dia" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Hexarelin",
      prose: "Hexarelin é um hexapeptídeo agonista do receptor de grelina com potente efeito secretagogo de GH e efeito cardioprotetor independente de GH. Estudos demonstraram melhora da função cardíaca em insuficiência cardíaca via receptor CD36 em cardiomiócitos.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O Hexarelin é um hexapeptídeo sintético (His-D-2MeTrp-Ala-Trp-D-Phe-Lys-NH2) desenvolvido pela Europeptides como secretagogo de GH de alta potência. É considerado o mais potente da família GHRP disponível, com maior eficácia secretagoga por dose que GHRP-6, GHRP-2 e Ipamorelin. Atua como agonista do receptor de grelina (GHS-R1a) na hipófise anterior, provocando liberação pulsátil de GH de forma dose-dependente. Como todo GHRP, eleva cortisol e prolactina de forma dose-dependente, e estimula o apetite (menos intensamente que o GHRP-6). A principal limitação clínica do Hexarelin é a taquifilaxia rápida: tolerância ao efeito secretagogo de GH desenvolve-se em 4–6 semanas de uso contínuo independentemente de variações de dose, tornando ciclos curtos (3–4 semanas) com pausas prolongadas (4–6 semanas) essenciais para manter eficácia. Um mecanismo único do Hexarelin, não compartilhado com outros GHRPs, é a ligação ao receptor escavenger CD36 em cardiomiócitos, macrófagos e células endoteliais — independentemente do receptor de grelina. Esse mecanismo CD36-dependente confere efeitos cardioprotetores diretos documentados em modelos experimentais de isquemia cardíaca, disfunção ventricular esquerda e cardiomiopatia, abrindo perspectivas terapêuticas além do eixo GH/IGF-1.",
      points: [
        "GHRP mais potente disponível (>GHRP-6 >GHRP-2 >Ipamorelin) via agonismo GHS-R1a.",
        "Taquifilaxia rápida (4–6 semanas): ciclos curtos com pausas longas são obrigatórios.",
        "Liga-se ao receptor CD36 em cardiomiócitos: efeito cardioprotetor único independente do eixo GH.",
        "Eleva cortisol e prolactina dose-dependente; estimula apetite (menos que GHRP-6).",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Alta elevação de GH",
        "Efeito cardioprotetor único",
        "Aumento de massa muscular",
        "Lipólise",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Melhora pronunciada de sono e recuperação; maior estímulo de GH vs outros GHRPs" },
        { period: "Semana 3-4", text: "Ganho de massa magra e melhora de composição corporal; IGF-1 elevado; taquifilaxia começa a surgir" },
        { period: "Mês 2-3", text: "PAUSA OBRIGATÓRIA após 3–4 semanas de uso para restaurar sensibilidade do GHS-R1a" },
        { period: "Mês 3+", text: "Retomar após pausa de 4–6 semanas; considerar trocar por Ipamorelin para uso mais prolongado" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "100–200 mcg, 2–3x ao dia" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "2–3× ao dia (em jejum) — ciclos curtos de 3–4 semanas" },
        { label: "Duração do ciclo", value: "8–12 semanas" },
        { label: "Concentração", value: "2 mL = 1 mg/mL (vial de 2 mg)" },
      ],
      indications: [
        { name: "Secretagogo de GH / performance", note: "Em jejum de 2 h; manhã, pré-treino e/ou antes de dormir; ciclo máximo 4 semanas", dose: "100–200 mcg SC 2–3×/dia" },
        { name: "Stack com CJC-1295 sem DAC", note: "Aplicar concomitantemente; pico máximo em 30 min; maior sinergia de todos os stacks GHRP+GHRH", dose: "100–200 mcg Hexarelin + 100–200 mcg CJC-1295" },
        { name: "Cardioproteção / saúde cardiovascular", note: "Off-label; mecanismo via CD36; ciclos de 4 semanas com 4 semanas off", dose: "100 mcg SC 1–2×/dia" },
        { name: "Dose conservadora (iniciantes)", note: "Manhã e antes de dormir; observar tolerância a apetite e cortisol antes de aumentar", dose: "100 mcg SC 2×/dia" },
      ],
      phases: [
        { phase: "Semanas 1–4 (ciclo curto obrigatório)", dose: "100–200 mcg SC 2–3×/dia" },
        { phase: "Pausa (4–6 semanas)", dose: "Obrigatória para restaurar sensibilidade do GHS-R1a" },
        { phase: "Ciclo seguinte", dose: "Retomar 100–200 mcg/dose ou substituir por Ipamorelin para uso mais prolongado" },
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
        "Dessensibilização mais rápida que outros GHRP",
        "Aumento de cortisol",
        "Retenção hídrica",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "CJC-1295", status: "Sinérgico", note: "A combinação mais potente GHRH+GHRP: CJC-1295 fornece o estímulo GHRH máximo; Hexarelin (o GHRP mais potente) amplifica o pulso via grelina — maior pico de GH disponível." },
        { name: "Ipamorelin", status: "Monitorar", note: "Não combinar dois GHRPs: dessensibilização do GHS-R1a acelerada e risco de GH excessivo. Escolher apenas um GHRP por ciclo." },
        { name: "BPC-157", status: "Compatível", note: "Hexarelin cardioprotetor (CD36) + BPC-157 regenerador tecidual. Podem compor protocolo de recuperação e saúde cardiovascular." },
        { name: "Thymosin Alpha-1", status: "Compatível", note: "Mecanismos completamente independentes; podem coexistir em protocolos de performance + imunidade sem interação." },
        { name: "Corticosteroides", status: "Monitorar", note: "Hexarelin eleva cortisol modestamente; combinação com corticosteroides exógenos pode suprimir o eixo HPA e mascarar marcadores inflamatórios." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Hexarelin (EP-23905): a potent GH secretagogue with unique cardioprotective properties via CD36",
          meta: "Humans / Rats · farmacologia",
          year: "1997",
          summary: "Estudo de Deghenghi e colaboradores (Europeptides) descrevendo a síntese e farmacologia do Hexarelin, sua potência secretagoga superior aos GHRPs de primeira geração e os primeiros dados de efeitos cardioprotetores via receptor CD36.",
        },
        {
          title: "Hexarelin activates CD36 in cardiomyocytes independent of GHS-R1a: cardioprotection in ischemia models",
          meta: "Rats · cardiologia / pré-clínico",
          year: "2005",
          summary: "Demonstrou que o Hexarelin protege cardiomiócitos de isquemia/reperfusão por mecanismo dependente do receptor CD36, independente do receptor de grelina e do eixo GH/IGF-1, expandindo as aplicações terapêuticas do composto.",
        },
        {
          title: "Tachyphylaxis to GH secretion with continuous GHRP administration: Hexarelin desensitization kinetics",
          meta: "Humans · ensaio clínico / farmacologia",
          year: "2001",
          summary: "Estudo documentando a taquifilaxia rápida (4–6 semanas) ao efeito secretagogo de GH do Hexarelin em administração contínua, estabelecendo a base para os protocolos de ciclos curtos com pausas obrigatórias.",
        },
      ],
    },
  },
  {
    slug: "hgh-191aa",
    name: "HGH 191AA",
    aliases: ["Somatropina", "rHGH", "HGH recombinante", "Norditropin", "Genotropin", "Humatrope", "Saizen", "Omnitrope"],
    tagline: "Hormônio de crescimento humano recombinante com 191 aminoácidos",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~15–20 min (IV); pico SC em 3–5 h; duração 12–24 h" },
      { id: "classification", label: "Classificação", value: "Hormônio do crescimento humano recombinante 191aa (somatropina) — NÃO é secretagogo" },
      { id: "cycle", label: "Ciclo", value: "3–6 meses ou uso contínuo em TRH" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "1–4 UI subcutâneo, ao dia ou 5x/semana" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Alto", pill: "green" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é HGH 191AA",
      prose: "HGH 191AA é o hormônio de crescimento humano recombinante com a sequência completa de 191 aminoácidos, idêntico à somatropina endógena. Utilizado para reposição hormonal em deficiência de GH, otimização da composição corporal e protocolos anti-aging em adultos.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "A somatropina (HGH 191aa) é a forma recombinante idêntica ao hormônio do crescimento humano endógeno (191 aminoácidos, 22 kDa), produzida por tecnologia de DNA recombinante em Escherichia coli ou células de mamíferos. IMPORTANTE: o HGH 191aa é o próprio GH exógeno — NÃO é um secretagogo. Diferentemente de CJC-1295, Ipamorelin ou Sermorelin, que estimulam a hipófise a produzir GH endógeno preservando o eixo hipotálamo-hipofisário, o HGH exógeno substitui diretamente o GH e pode suprimir a produção hipofisária endógena com uso prolongado. O mecanismo de ação envolve ligação ao receptor dimérico de GH (GHR) na superfície de hepatócitos, adipócitos e células musculares, ativando a cascata JAK2/STAT5b que estimula a produção hepática de IGF-1 — o principal mediador dos efeitos anabólicos (síntese proteica, hipertrofia muscular) e lipolíticos (lipólise visceral e subcutânea). Tem indicações FDA aprovadas para deficiência de GH (adultos e crianças), síndrome de Turner, Prader-Willi, insuficiência renal crônica, baixa estatura idiopática e wasting associado ao HIV. Off-label: anti-aging (2 UI/dia), recomposição corporal. Em doses fisiológicas é bem tolerado; doses suprafisiológicas causam edema, síndrome do túnel do carpo, artralgias e resistência insulínica progressiva.",
      points: [
        "ATENÇÃO: HGH 191aa é o GH exógeno direto — NÃO é secretagogo. Suprime produção endógena com uso prolongado.",
        "Liga-se ao receptor GHR → cascata JAK2/STAT5b → produção hepática de IGF-1 (anabólico + lipolítico).",
        "Aprovado FDA para deficiência de GH, Turner, Prader-Willi, wasting HIV e baixa estatura idiopática.",
        "Doses suprafisiológicas: edema, túnel do carpo, artralgias, resistência insulínica, risco de acromegalia.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Aumento de massa muscular magra",
        "Redução de gordura visceral",
        "Melhora do sono",
        "Aumento de IGF-1",
        "Anti-aging sistêmico",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Retenção hídrica inicial comum; melhora do sono; possível edema nas mãos" },
        { period: "Semana 3-4", text: "Edema reduz; melhora de recuperação e energia; IGF-1 sobe mensurável" },
        { period: "Mês 2-3", text: "Melhora de composição corporal; ganho de massa magra e redução de gordura; pele mais firme" },
        { period: "Mês 3+", text: "Benefícios sustentados; monitorar IGF-1, glicemia e marcadores metabólicos a cada 3 meses" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "1–4 UI subcutâneo, ao dia ou 5x/semana" },
        { label: "Via", value: "Subcutâneo (abdômen, coxas, braços)" },
        { label: "Frequência", value: "1× ao dia (noite) ou 5–6× por semana" },
        { label: "Duração do ciclo", value: "3–6 meses ou uso contínuo em TRH" },
        { label: "Concentração", value: "Variável por produto; típico: 5–10 mg/vial (15–30 UI)" },
      ],
      indications: [
        { name: "Deficiência de GH em adultos (aprovado FDA)", note: "Titulação por IGF-1; dose mínima eficaz; sob prescrição médica obrigatória", dose: "0.3–1.0 mg/dia SC (~1–3 UI)" },
        { name: "Anti-aging / recomposição corporal (off-label)", note: "~0.67 mg/dia; aplicar antes de dormir; monitorar IGF-1, glicemia e HbA1c", dose: "2 UI/dia SC" },
        { name: "Performance / hipertrofia avançada (off-label)", note: "Dividir em 2 doses (manhã e noite); ciclos de 4–6 meses; risco aumentado de efeitos colaterais", dose: "3–4 UI/dia SC" },
        { name: "Wasting associado ao HIV (aprovado FDA)", note: "Dose aprovada para síndrome de wasting; sob supervisão médica especializada", dose: "4 mg/dia SC (~12 UI)" },
      ],
      phases: [
        { phase: "Semanas 1–4 (titulação)", dose: "1–2 UI/dia; ajustar por IGF-1 (alvo: faixa etária jovem-adulta)" },
        { phase: "Semanas 5–24 (manutenção)", dose: "2–4 UI/dia conforme objetivo e tolerância" },
        { phase: "Pausa (4–8 semanas)", dose: "Avaliar supressão de GH endógeno e retorno basal" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Produtos farmacêuticos (Norditropin, Genotropin): seguir instruções do fabricante — a maioria já vem em solução pronta ou cartuchos duplos-câmara",
        "Para liofilizado genérico: aspirar 1.0 mL de água bacteriostática ou solução diluidora fornecida",
        "Injetar PELA PAREDE do frasco — nunca diretamente sobre o pó; risco de desnaturação por agitação",
        "Girar suavemente até dissolução completa; NÃO agitar — proteína de 22 kDa sensível",
        "Refrigerar a 2–8°C; válido por 28 dias após reconstituição; NÃO congelar",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Síndrome do túnel do carpo",
        "Retenção hídrica",
        "Resistência à insulina",
        "Artralgia",
        "Risco de acromegalia",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Ipamorelin", status: "Compatível", note: "Ipamorelin estimula GH endógeno (preserva eixo); HGH exógeno substitui GH. Combinar cria estado de GH elevado contínuo — monitorar IGF-1 e glicemia." },
        { name: "IGF-1 LR3", status: "Monitorar", note: "HGH já eleva IGF-1 via fígado; IGF-1 LR3 exógeno adicional cria hipersinalização anabólica severa — risco de hiperplasia e resistência insulínica." },
        { name: "CJC-1295", status: "Monitorar", note: "Não combinar HGH exógeno com análogos de GHRH: GH cronicamente suprafisiológico, supressão prolongada do eixo e risco metabólico aumentado." },
        { name: "AOD-9604", status: "Compatível", note: "AOD-9604 atua em receptor β3-AR (independente de GHR); HGH 191aa via GHR. Vias distintas e complementares para recomposição corporal." },
        { name: "Insulina", status: "Monitorar", note: "HGH cria resistência insulínica dose-dependente; combinação com insulina exógena exige monitoramento rigoroso de glicemia e ajuste fino de doses." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Recombinant human growth hormone in adults with growth hormone deficiency: the GHDA consensus guidelines",
          meta: "Humans · consenso clínico / guideline",
          year: "2007",
          summary: "Documento de consenso da Growth Hormone Deficiency in Adults (GHDA) estabelecendo doses, monitoramento e indicações aprovadas para somatropina recombinante em adultos com deficiência de GH documentada, base para a prática clínica atual.",
        },
        {
          title: "Effects of recombinant human growth hormone on body composition in adults: systematic review and meta-analysis",
          meta: "Humans · meta-análise",
          year: "2012",
          summary: "Meta-análise demonstrando que a somatropina recombinante em adultos com deficiência de GH melhora significativamente a composição corporal (redução de massa gorda, aumento de massa magra), com dose-dependência dos efeitos colaterais metabólicos.",
        },
        {
          title: "Growth hormone and insulin resistance: dose-dependent effects and clinical implications",
          meta: "Humans / Review · revisão endocrinológica",
          year: "2015",
          summary: "Revisão do risco de resistência insulínica com uso de HGH exógeno, especialmente em doses suprafisiológicas, e orientações para monitoramento de glicemia, HbA1c e IGF-1 em pacientes em uso de somatropina.",
        },
      ],
    },
  },
  {
    slug: "hgh-fragment-176-191",
    name: "HGH Fragment 176-191",
    aliases: ["HGH Frag 176-191", "Fragment 176-191", "GH Frag", "hGH C-terminal fragment", "GH fragment lipolytic"],
    tagline: "Fragmento lipolítico do GH sem efeitos anabólicos",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30 minutos" },
      { id: "classification", label: "Classificação", value: "Fragmento C-terminal do hGH (aminoácidos 176–191) — sem modificação N-terminal (vs AOD-9604)" },
      { id: "cycle", label: "Ciclo", value: "12–16 semanas" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "250–500 mcg, 1–2x ao dia em jejum" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é HGH Fragment 176-191",
      prose: "O HGH Fragment 176-191 é o fragmento C-terminal da molécula do GH (também chamado AOD-9604) que age especificamente no metabolismo lipídico. Estimula lipólise e inibe lipogênese sem os efeitos anabólicos ou proliferativos do GH completo, sendo mais seguro para uso a longo prazo.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O HGH Fragment 176-191 é um fragmento sintético dos aminoácidos 176–191 da cadeia C-terminal do hormônio do crescimento humano (hGH). É estruturalmente muito similar ao AOD-9604, com a diferença de não possuir a tirosina N-terminal adicional que o AOD-9604 incorpora para maior estabilidade metabólica. Funcionalmente, ambos compartilham o mesmo mecanismo lipolítico: ativação do receptor β3-adrenérgico (β3-AR) nos adipócitos, estimulando lipólise sem mediação pelo receptor clássico de GH (GHR). Não eleva IGF-1, não causa hiperglicemia e não estimula crescimento ósseo ou muscular. Sem a modificação de tirosina, o Fragment 176-191 pode ter ligeiramente menor estabilidade metabólica e meia-vida efetiva que o AOD-9604 — embora evidências diretas comparativas sejam escassas. É mais barato e amplamente disponível no mercado de compostos de pesquisa, sendo frequentemente o produto acessado por usuários que buscam o efeito do AOD-9604. A principal indicação off-label é a lipólise visceral e subcutânea, especialmente abdominal, sempre combinada com déficit calórico e exercício. Não possui estudos clínicos fase 2 ou fase 3 próprios — os dados pré-clínicos derivam do programa de pesquisa original do fragmento 176-191 que precedeu o desenvolvimento do AOD-9604.",
      points: [
        "Fragmento 176-191 do hGH sem modificação N-terminal: mecanismo lipolítico idêntico ao AOD-9604 (β3-AR).",
        "NÃO eleva IGF-1, NÃO causa hiperglicemia, NÃO estimula crescimento — efeito exclusivamente lipolítico.",
        "Sem estudos clínicos próprios fase 2/3: dados pré-clínicos do fragmento nativo; AOD-9604 tem mais evidências.",
        "Mais acessível que AOD-9604; importante distinguir: estruturalmente similar mas não idêntico.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Lipólise específica (especialmente gordura visceral)",
        "Sem efeitos anabólicos indesejados",
        "Melhora de sensibilidade à insulina",
        "Preservação de massa muscular",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Lipolítico; efeito perceptível em gordura localizada em combinação com déficit calórico" },
        { period: "Semana 3-4", text: "Redução progressiva de medidas em áreas de aplicação; melhora de definição muscular" },
        { period: "Mês 2-3", text: "Benefícios consolidados em composição corporal com protocolo nutricional adequado" },
        { period: "Mês 3+", text: "Ciclos de 8–12 semanas com pausas; reavaliação de composição corporal" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "250–500 mcg, 1–2x ao dia em jejum" },
        { label: "Via", value: "Subcutâneo (peri-adiposo para efeito localizado)" },
        { label: "Frequência", value: "1× ao dia (em jejum)" },
        { label: "Duração do ciclo", value: "12–16 semanas" },
        { label: "Concentração", value: "2 mL = 250 mcg/mL (vial de 500 mcg)" },
      ],
      indications: [
        { name: "Lipólise corporal geral", note: "Em jejum de 30–60 min; abdômen ou área-alvo; combinar com déficit calórico e exercício", dose: "250–500 mcg SC 1×/dia" },
        { name: "Lipólise localizada", note: "Injeção subcutânea no tecido adiposo da área-alvo; 1× ao dia", dose: "250 mcg SC diretamente na área adiposa" },
        { name: "Manutenção pós-cutting", note: "Após perda de peso ativa; manutenção de composição corporal", dose: "250 mcg SC 3–4×/semana" },
        { name: "Stack com semaglutida / tirzepatida", note: "Para refinamento localizado durante protocolo de GLP-1; sem interação farmacológica conhecida", dose: "250 mcg SC 1×/dia" },
      ],
      phases: [
        { phase: "Semanas 1–12 (ciclo ativo)", dose: "250–500 mcg SC 1×/dia em jejum" },
        { phase: "Pausa (4 semanas)", dose: "Avaliar composição corporal antes de reiniciar" },
        { phase: "Ciclo seguinte", dose: "Retomar mesma dose; considerar AOD-9604 se disponível para melhor estabilidade" },
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
        "Injetar preferencialmente em jejum de 30–60 min para maximizar lipólise",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Hipoglicemia leve",
        "Anticorpos neutralizantes com uso prolongado",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "AOD-9604", status: "Monitorar", note: "AOD-9604 e Fragment 176-191 compartilham o mesmo mecanismo (β3-AR lipolítico): combinar é redundante e desperdiça recursos. Escolher apenas um." },
        { name: "Semaglutida", status: "Compatível", note: "GLP-1 para perda sistêmica; Fragment 176-191 para lipólise localizada. Mecanismos distintos e complementares." },
        { name: "Tirzepatida", status: "Compatível", note: "Similar ao stack com semaglutida: refinamento localizado com Fragment durante protocolo de GIP/GLP-1 sistêmico." },
        { name: "5-Amino-1MQ", status: "Sinérgico", note: "Vias lipolíticas complementares: Fragment via β3-AR adipocitário; 5-Amino-1MQ via inibição de NNMT. Sinergia metabólica sem sobreposição." },
        { name: "Ipamorelin", status: "Compatível", note: "Ipamorelin eleva GH endógeno (anabólico); Fragment atua em β3-AR (lipolítico puro). Mecanismos distintos; compõem recomposição corporal." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "The lipolytic effects of a C-terminal fragment of human growth hormone (hGH 176-191) in isolated fat cells",
          meta: "In vitro / Rats · pré-clínico / bioquímica",
          year: "1997",
          summary: "Estudo original de Ng e colaboradores caracterizando o efeito lipolítico do fragmento C-terminal 176-191 do hGH em adipócitos isolados e modelos murinos, demonstrando atividade similar ao hGH completo sem atividade de crescimento ou insulinogênica.",
        },
        {
          title: "Lipolytic activity of a C-terminal hGH fragment without GH receptor binding or IGF-1 induction",
          meta: "Rats · pré-clínico / endocrinologia",
          year: "2001",
          summary: "Estudo confirmando que o fragmento 176-191 do hGH exerce efeito lipolítico em roedores sem ativar o receptor clássico de GH (GHR), sem elevar IGF-1 e sem alterar glicemia — estabelecendo o perfil de segurança metabólica do fragmento.",
        },
        {
          title: "HGH fragment 176-191 versus AOD-9604: structural differences and comparative lipolytic efficacy",
          meta: "In vitro / Review · farmacologia comparativa",
          year: "2008",
          summary: "Análise comparativa das estruturas do fragmento 176-191 nativo e do AOD-9604 (tirosina modificada), discutindo como a modificação N-terminal do AOD-9604 aumenta a estabilidade metabólica sem alterar significativamente o mecanismo lipolítico central.",
        },
      ],
    },
  },
  {
    slug: "hmg",
    name: "HMG",
    aliases: ["Human Menopausal Gonadotropin", "Menotropina", "Menopur", "Menogon", "Pergonal", "FSH + LH urinário 1:1"],
    tagline: "Gonadotrofina menopáusica com FSH e LH para fertilidade masculina",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "FSH: ~24-36 h (SC); LH: ~10-20 h (SC); farmacocinética influenciada pela glicosilação da proteína nativa" },
      { id: "classification", label: "Classificação", value: "Gonadotrofina urinária purificada (mistura FSH+LH extraída de urina de mulheres pós-menopausa) — glicoproteína complexa, NÃO é peptídeo curto; aprovada FDA/ANVISA para fertilidade" },
      { id: "cycle", label: "Ciclo", value: "12–24 semanas (protocolos de fertilidade)" },
      { id: "route", label: "Via", value: "Subcutânea ou intramuscular" },
      { id: "dose", label: "Dose típica", value: "75–150 UI subcutâneo, 3x por semana" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Alto", pill: "green" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é HMG",
      prose: "HMG (Gonadotrofina Menopáusica Humana) contém FSH e LH em proporção 1:1. Em homens, é utilizada para estimular espermatogênese em hipogonadismo hipogonadotrópico e como alternativa ao HCG para preservação completa da fertilidade com manutenção intratesticular de testosterona.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "HMG (Human Menopausal Gonadotropin / Menotropina) é uma preparação farmacêutica de gonadotrofinas purificadas extraídas da urina de mulheres pós-menopausa, que apresentam altos níveis circulantes de FSH e LH. Cada ampola padrão contém 75 UI de FSH (hormônio folículo-estimulante) e 75 UI de LH (hormônio luteinizante) na proporção 1:1 (marcas: Menopur, Menogon, Pergonal). Não se trata de peptídeo curto, mas de glicoproteínas complexas de alto peso molecular. Em mulheres, FSH estimula o crescimento folicular ovariano e LH contribui para a maturação folicular e produção de estradiol, sendo usada na indução de ovulação e em protocolos de FIV. Em homens com hipogonadismo hipogonadotrófico, o FSH contido no HMG estimula as células de Sertoli e a espermatogênese, enquanto o LH estimula as células de Leydig. O protocolo masculino clássico combina hCG (substituto do LH endógeno, para manter testosterona) com HMG (para manter espermatogênese) em ciclos de 3-6 meses monitorados por espermograma seriado. Indicação aprovada FDA/ANVISA: infertilidade feminina por anovulação e infertilidade masculina por hipogonadismo hipogonadotrófico documentado.",
      points: [
        "FSH (75 UI): estimula células de Sertoli e espermatogênese em homens; crescimento folicular em mulheres",
        "LH (75 UI): estimula células de Leydig (testosterona) em homens; maturação folicular e ovulação em mulheres",
        "Protocolo masculino clássico: hCG (LH-like) + HMG (FSH-like) para restaurar espermatogênese em hipogonadismo hipogonadotrófico",
        "Aprovado FDA/ANVISA para infertilidade; glicoproteína complexa, não peptídeo curto",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Indução de espermatogênese",
        "Tratamento de hipogonadismo hipogonadotrópico",
        "Preservação de fertilidade masculina",
        "Testosterona intratesticular",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Inicio de estimulacao de celulas de Sertoli; aumento de FSH sérico; sem resposta espermatogênica imediata (espermatogênese leva 70-90 dias)" },
        { period: "Semana 3-4", text: "Estimulacao progressiva da espermatogênese; avaliar testosterona e LH; em mulheres: monitorar folículos por ultrassom" },
        { period: "Mês 2-3", text: "Primeiro ciclo completo de espermatogênese esperado; espermograma pode mostrar melhora inicial de concentracao e motilidade" },
        { period: "Mês 3+", text: "Melhora progressiva de parametros do espermograma com tratamento continuado; objetivo: gravidez natural ou uso em FIV/ICSI" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "75–150 UI subcutâneo, 3x por semana" },
        { label: "Via", value: "Subcutâneo ou Intramuscular" },
        { label: "Frequência", value: "Masculino: 75-150 UI SC/IM 2-3x/semana combinado com hCG; feminino: 75-150 UI/dia conforme protocolo de estimulação ovariana supervisionado" },
        { label: "Duração do ciclo", value: "12–24 semanas (protocolos de fertilidade)" },
        { label: "Concentração", value: "Ampola padrão: 75 UI FSH + 75 UI LH reconstituídos em 1 mL de diluente; dose total ajustada por resposta clínica e laboratorial" },
      ],
      indications: [
        { name: "Hipogonadismo hipogonadotrófico masculino com infertilidade", note: "Protocolo combinado hCG+HMG; monitorar espermograma a cada 3 meses; ciclos de 6-12 meses; acompanhamento de endocrinologista/urologista obrigatorio", dose: "75-150 UI SC 2-3x/semana + hCG 1000-2000 UI 2-3x/semana" },
        { name: "Indução de ovulação em anovulação hipogonadotrófica", note: "Protocolo supervisionado por especialista em reprodução; risco de síndrome de hiperestimulação ovariana (SHO) requer monitoramento", dose: "75-150 UI/dia SC × 7-14 dias com monitoramento folicular por ultrassom" },
        { name: "Estimulação ovariana controlada para FIV", note: "Dose e duração determinadas pelo especialista em reprodução conforme resposta folicular; combinar com antagonista ou agonista de GnRH", dose: "75-300 UI/dia conforme protocolo individualizado de reprodução assistida" },
        { name: "Suporte à espermatogênese antes de FIV/ICSI", note: "Protocolo de preparo para banco de sêmen ou FIV; avaliar espermograma a cada 3 meses", dose: "75 UI SC 3x/semana + hCG 1000-1500 UI 3x/semana × 3-6 meses" },
      ],
      phases: [
        { phase: "Fase de estimulação (3-6 meses)", dose: "75-150 UI SC 2-3x/semana combinado com hCG 1000-2000 UI 2-3x/semana" },
        { phase: "Monitoramento", dose: "Espermograma mensal em homens; ultrassom folicular seriado em mulheres; LH, FSH, testosterona e estradiol periódicos" },
        { phase: "Manutenção ou interrupção", dose: "Continuar por 6-12 meses se resposta positiva; reavaliar protocolo se ausência de melhora após 6 meses" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "HMG (Menopur/Menogon) vem em frasco liofilizado com diluente próprio (solução salina 0,9% ou água para injeção)",
        "Injetar o diluente fornecido (1 mL) diretamente no frasco com a agulha em ângulo para não espumar",
        "Agitar suavemente em movimentos rotatórios até dissolução completa — NÃO agitar vigorosamente",
        "Múltiplos frascos podem ser combinados no mesmo diluente (para doses > 75 UI): reconstituir o 1o frasco e usar a solução para reconstituir os demais",
        "Administrar SC (abdômen) ou IM imediatamente após reconstituição; não armazenar após mistura",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Ginecomastia",
        "Acne",
        "Dor local",
        "Síndrome de hiperestimulação (raro)",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "hCG (Gonadotrofina Coriônica)", status: "Sinérgico", note: "Protocolo clássico de fertilidade masculina: hCG estimula células de Leydig (testosterona) enquanto HMG estimula células de Sertoli (espermatogênese) — combinação padrão-ouro" },
        { name: "Gonadorelin", status: "Sinérgico", note: "Gonadorelin como pulso hipotalâmico GnRH pode ser adicionado ao protocolo hCG+HMG para estimulação completa do eixo HPG em hipogonadismo hipotalâmico" },
        { name: "Testagen", status: "Compatível", note: "Testagen (bioregulador testicular Khavinson) oferece estímulo epigenético a células de Leydig e Sertoli; pode complementar HMG em protocolos de suporte androgênico" },
        { name: "Kisspeptin", status: "Compatível", note: "Kisspeptin ativa neurônios GnRH hipotalâmicos; pode ser adicionado ao protocolo para otimizar estímulo endógeno do eixo HPG em paralelo ao HMG exógeno" },
        { name: "Clomifeno", status: "Compatível", note: "Clomifeno aumenta FSH/LH endógenos via bloqueio de feedback estrogênico; pode ser usado antes de HMG em hipogonadismo menos severo ou como alternativa oral inicial" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Lunenfeld B et al. Human menopausal gonadotrophin: a regulator of ovulation induction",
          meta: "Humano · Trabalho histórico de Bruno Lunenfeld estabelecendo o uso clínico da menotropina (HMG) em indução de ovulação",
          year: "1962",
          summary: "Primeiro relato clínico do uso de gonadotrofinas urinárias de mulheres pós-menopausa para indução de ovulação — base histórica do uso de HMG em reprodução assistida.",
        },
        {
          title: "Buchter D et al. Pulsatile GnRH or human chorionic gonadotropin/human menopausal gonadotropin as effective treatment for men with hypogonadotropic hypogonadism",
          meta: "Humano · Ensaio clínico comparando protocolos de GnRH pulsátil vs hCG+HMG em homens com hipogonadismo hipogonadotrófico",
          year: "1998",
          summary: "Protocolo hCG+HMG foi eficaz para restaurar espermatogênese e testosterona em homens com hipogonadismo hipogonadotrófico, comparável a GnRH pulsátil em resultados de fertilidade.",
        },
        {
          title: "Rastrelli G et al. Recovery of spermatogenesis following testosterone replacement therapy or anabolic-androgenic steroid use",
          meta: "Humano · Revisão sobre recuperação de espermatogênese pós-TRT/esteróides incluindo uso de hCG+HMG como protocolo de recuperação",
          year: "2020",
          summary: "Análise de protocolos de recuperação de espermatogênese após supressão androgênica exógena, incluindo papel de hCG e HMG na estimulação do eixo HPG.",
        },
      ],
    },
  },
  {
    slug: "igf-1-des",
    name: "IGF-1 DES",
    aliases: ["DES(1-3)IGF-1", "DES-IGF-1", "Truncated IGF-1", "Des-N-terminal IGF-1", "IGF-1 DES 1-3"],
    tagline: "Variante truncada de IGF-1 com potência local aumentada 10x",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~20–30 minutos (ação predominantemente local/paracrina)" },
      { id: "classification", label: "Classificação", value: "Variante truncada do IGF-1 (sem os 3 aminoácidos N-terminais) — fração livre aumentada, ação local intensa" },
      { id: "cycle", label: "Ciclo", value: "4–6 semanas" },
      { id: "route", label: "Via", value: "Intramuscular (local)" },
      { id: "dose", label: "Dose típica", value: "20–50 mcg intramuscular local, após treino" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Médio", pill: "amber" },
    ],
    about: {
      heading: "O que é IGF-1 DES",
      prose: "IGF-1 DES é a variante truncada de IGF-1 sem os 3 aminoácidos N-terminais, resultando em 10 vezes menor ligação às IGFBPs e ativação 10x mais potente de células satélites musculares localmente. Utilizado em injeção intramuscular localizada para hipertrofia específica de grupos musculares.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O IGF-1 DES (DES(1-3) IGF-1) é uma variante natural do IGF-1 com deleção dos três aminoácidos N-terminais (Gly-Pro-Glu). Identificado primeiramente no tecido cerebral humano, onde ocorre por proteólise do IGF-1 completo. Essa truncagem N-terminal reduz drasticamente a afinidade pela proteína de ligação IGFBP-3 (a principal transportadora sistêmica do IGF-1) em ~10 vezes, aumentando a fração de IGF-1 biologicamente ativa livre. A redução de ligação às IGFBPs resulta em maior biodisponibilidade local mas menor meia-vida sistêmica — o IGF-1 DES tem ação predominantemente local/paracrina, ao contrário do IGF-1 LR3 que possui ação sistêmica prolongada. O IGF-1 DES liga-se ao receptor IGF-1R com afinidade comparável ao IGF-1 completo, ativando as cascatas PI3K/Akt (hipertrofia, sobrevivência) e MAPK/ERK (proliferação, diferenciação). O protocolo predominante é a injeção intramuscular site-specific no grupo muscular treinado, para induzir hipertrofia local direcionada. Ciclos de 4–6 semanas são obrigatórios pelo risco de hipoglicemia (captação de glicose independente de insulina) e hiperplasia tecidual com uso prolongado. Diferença-chave vs IGF-1 LR3: DES tem ação local (~30 min) vs LR3 sistêmica (~20-30 h).",
      points: [
        "Deleção N-terminal (Gly-Pro-Glu): reduz afinidade pela IGFBP-3 ~10×, aumentando fração livre ativa.",
        "Ação local/paracrina (meia-vida ~30 min) vs IGF-1 LR3 sistêmico (~20–30 h) — site-injection preferencial.",
        "Ativa IGF-1R → PI3K/Akt e MAPK/ERK: hipertrofia muscular local intensa com dose baixa.",
        "Ciclos máx 4–6 semanas: risco de hipoglicemia por captação de glicose independente de insulina.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Ativação 10x mais potente localmente",
        "Hipertrofia muscular localizada",
        "Ativação de células satélites",
        "Recuperação acelerada",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Pump local intenso nos músculos injetados; hipoglicemia leve possível na primeira hora pós-injeção" },
        { period: "Semana 3-4", text: "Hipertrofia visível e localizada; síntese proteica elevada nas fibras do grupo muscular-alvo" },
        { period: "Mês 2-3", text: "Ciclo de 4–6 semanas deve ser encerrado; avaliar ganhos locais antes de próximo ciclo" },
        { period: "Mês 3+", text: "Pausa obrigatória de 4–8 semanas para restaurar sensibilidade do IGF-1R e eliminar risco de hiperplasia" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "20–50 mcg intramuscular local, após treino" },
        { label: "Via", value: "Intramuscular (site-specific, preferencial) ou Subcutâneo" },
        { label: "Frequência", value: "1× ao dia pós-treino (no músculo treinado)" },
        { label: "Duração do ciclo", value: "4–6 semanas" },
        { label: "Concentração", value: "1 mL = 0.1 mg/mL (100 mcg/mL)" },
      ],
      indications: [
        { name: "Hipertrofia muscular local (site-injection)", note: "Injetar diretamente no grupo muscular treinado; monitorar glicemia 1 h após", dose: "20–50 mcg IM no músculo-alvo pós-treino" },
        { name: "Iniciantes / dose conservadora", note: "Primeiras doses para avaliar tolerância à hipoglicemia; ter glicose disponível", dose: "10–20 mcg IM/SC" },
        { name: "Ciclo avançado com IGF-1 DES", note: "Máximo 6 semanas; ciclo curto obrigatório; não exceder sem monitoramento clínico", dose: "50 mcg IM pós-treino 5×/semana" },
        { name: "Recuperação de lesão muscular localizada", note: "Efeito parácrino de reparo; combinar com BPC-157 ou TB-500 para sinergia de recuperação", dose: "20–30 mcg IM próximo ao tecido lesado" },
      ],
      phases: [
        { phase: "Semanas 1–6 (ciclo obrigatoriamente curto)", dose: "20–50 mcg IM diário pós-treino" },
        { phase: "Pausa (4–8 semanas)", dose: "Restaurar sensibilidade do IGF-1R; avaliar hipertrofia obtida" },
        { phase: "Ciclo seguinte (opcional)", dose: "Retomar mesma dose ou considerar IGF-1 LR3 para efeito sistêmico" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Reconstituir INICIALMENTE em 0.5 mL de ácido acético 0.1% (não usar água bacteriostática pura)",
        "Injetar o ácido acético lentamente pela parede do frasco; girar suavemente até dissolver completamente",
        "Após dissolução, diluir em solução salina 0.9% até o volume de uso desejado",
        "Verificar pH final: levemente ácido (4–6); solução turva indica degradação — descartar",
        "Refrigerar a 2–8°C, proteger da luz; válido por 14–21 dias após reconstituição",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Hipoglicemia localizada",
        "Dor local",
        "Crescimento assimétrico possível",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "MGF", status: "Sinérgico", note: "MGF ativa células satélite (1ª resposta ao dano muscular); IGF-1 DES amplifica hipertrofia via IGF-1R local. Sequência fisiológica: MGF pós-treino → IGF-1 DES para maturação da hipertrofia." },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 acelera reparo via VEGF/NO; IGF-1 DES amplifica síntese proteica local via IGF-1R. Compõem protocolo de recuperação e crescimento muscular." },
        { name: "TB-500", status: "Compatível", note: "TB-500 mobiliza células-tronco; IGF-1 DES amplifica sua diferenciação miogênica local. Protocolos de recuperação musculoesquelética combinados." },
        { name: "IGF-1 LR3", status: "Monitorar", note: "IGF-1 DES (local) + IGF-1 LR3 (sistêmico): hipersinalização IGF-1R cumulativa; risco elevado de hipoglicemia severa e hiperplasia. Não combinar." },
        { name: "Insulina", status: "Monitorar", note: "Ambos causam captação celular de glicose: risco severo de hipoglicemia. Monitorar glicemia obrigatoriamente se combinados." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "DES(1-3)IGF-I: a truncated form of insulin-like growth factor-I with reduced IGFBP affinity and enhanced biological activity",
          meta: "In vitro / Rats · bioquímica / endocrinologia",
          year: "1988",
          summary: "Estudo original caracterizando o DES(1-3)IGF-1 como variante natural no cérebro humano com ~10× menor afinidade pela IGFBP-3 em comparação ao IGF-1 completo, e demonstrando maior potência biológica local em modelos in vitro e in vivo.",
        },
        {
          title: "Truncated IGF-1 isoforms and site-specific muscle hypertrophy: local versus systemic effects",
          meta: "Review · revisão / fisiologia muscular",
          year: "2010",
          summary: "Revisão comparando as propriedades do DES(1-3)IGF-1 (ação local) e IGF-1 LR3 (ação sistêmica), discutindo implicações para protocolos de hipertrofia muscular direcionada e os riscos metabólicos associados ao uso exógeno.",
        },
        {
          title: "IGF-1 isoforms in muscle repair: DES-IGF-1, MGF and systemic IGF-1 as complementary mediators",
          meta: "Review · revisão / biologia muscular",
          year: "2015",
          summary: "Revisão das três principais isoformas de IGF-1 envolvidas em hipertrofia e reparo muscular — IGF-1Ea sistêmico, DES(1-3) local e MGF mecânico — e suas interações na resposta ao exercício e ao dano muscular.",
        },
      ],
    },
  },
  {
    slug: "igf-1-lr3",
    name: "IGF-1 LR3",
    aliases: ["Long R3 IGF-1", "IGF-1 Long Arg3", "Insulin-like Growth Factor-1 LR3", "Long-R3-IGF-I"],
    tagline: "IGF-1 de longa ação — meia-vida 20x superior ao nativo",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~20–30 horas (vs ~10–15 min do IGF-1 nativo)" },
      { id: "classification", label: "Classificação", value: "Análogo sintético do IGF-1 com Long R3 (meia-vida estendida)" },
      { id: "cycle", label: "Ciclo", value: "4–6 semanas com pausas obrigatórias" },
      { id: "route", label: "Via", value: "Subcutânea ou intramuscular" },
      { id: "dose", label: "Dose típica", value: "20–100 mcg, 1x ao dia" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Médio", pill: "amber" },
    ],
    about: {
      heading: "O que é IGF-1 LR3",
      prose: "IGF-1 LR3 é uma variante do IGF-1 com extensão de 13 aminoácidos no N-terminal que reduz sua ligação às proteínas transportadoras (IGFBPs), resultando em meia-vida de 20–30 horas versus 15 minutos do IGF-1 nativo. É o peptídeo anabólico mais potente após o GH.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O IGF-1 LR3 é uma forma modificada do IGF-1 (Fator de Crescimento Semelhante à Insulina-1) com duas alterações moleculares estratégicas: substituição do ácido glutâmico por arginina na posição 3 (R3) e adição de 13 aminoácidos na extremidade N-terminal (Long). Essas modificações reduzem drasticamente a afinidade pelas proteínas de ligação ao IGF-1 (IGFBPs), que normalmente sequestram o IGF-1 nativo na circulação e limitam sua meia-vida a ~10–15 minutos. O resultado é uma meia-vida de ~20–30 horas com biodisponibilidade sistêmica muito superior. O IGF-1 LR3 liga-se ao receptor IGF-1R (tirosina-quinase) com alta afinidade, ativando as cascatas intracelulares PI3K/Akt (sobrevivência e hipertrofia celular) e MAPK/ERK (proliferação e diferenciação). Promove síntese proteica muscular, captação de glicose independente de insulina, hiperplasia de células satélites e diferenciação miogênica. Os principais riscos incluem hipoglicemia (captação de glicose mesmo em repouso), hiperplasia de órgãos viscerais com uso prolongado, e sinalização proliferativa intensa que exige ciclos curtos. Injeção local (peri-muscular) pode induzir hiperplasia local direcionada.",
      points: [
        "Análogo do IGF-1 com meia-vida de ~20–30 h: redução de afinidade pelas IGFBPs vs nativo (~10 min).",
        "Ativa receptores IGF-1R via cascatas PI3K/Akt e MAPK/ERK: hipertrofia, síntese proteica, proliferação.",
        "Captação de glicose muscular independente de insulina — risco real de hipoglicemia.",
        "Ciclos curtos obrigatórios (4–6 semanas): risco de hiperplasia visceral e proliferação celular excessiva.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Alta atividade anabólica",
        "Regeneração muscular acelerada",
        "Redução de gordura corporal",
        "Ação anti-catabólica",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Pump muscular intenso; hipoglicemia leve possível; melhora de recuperação" },
        { period: "Semana 3-4", text: "Ganho de massa magra perceptível; síntese proteica elevada; veias mais visíveis" },
        { period: "Mês 2-3", text: "Ganhos consolidados; IGF-1 LR3 deve ser descontinuado após 4–6 semanas de uso" },
        { period: "Mês 3+", text: "Pausa obrigatória de 4–8 semanas para restaurar sensibilidade do receptor IGF-1R" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "20–100 mcg, 1x ao dia" },
        { label: "Via", value: "Subcutâneo (peri-muscular para efeito local)" },
        { label: "Frequência", value: "1× ao dia (pós-treino preferencialmente)" },
        { label: "Duração do ciclo", value: "4–6 semanas com pausas obrigatórias" },
        { label: "Concentração", value: "1 mL = 0.1 mg/mL (100 mcg/mL)" },
      ],
      indications: [
        { name: "Iniciantes / dose conservadora", note: "Pós-treino; monitorar glicemia por 1 h após injeção", dose: "20–40 mcg/dia SC" },
        { name: "Performance / hipertrofia avançada", note: "Dividir em 2 injeções peri-musculares pós-treino; não exceder 6 semanas", dose: "50–80 mcg/dia SC" },
        { name: "Recuperação de lesões", note: "Próximo ao tecido lesado; efeito parácrino de reparo", dose: "20–40 mcg/dia SC local" },
        { name: "Ciclo máximo (supervisionado)", note: "Apenas atletas avançados; monitorar glicemia e IGF-1 sérico", dose: "80–100 mcg/dia" },
      ],
      phases: [
        { phase: "Semanas 1–6 (ciclo curto obrigatório)", dose: "20–80 mcg/dia pós-treino" },
        { phase: "Pausa (4–8 semanas)", dose: "Sem administração — restaurar sensibilidade do IGF-1R" },
        { phase: "Ciclo seguinte (opcional)", dose: "Reavaliar necessidade; preferir GH endógeno via GHRH+GHRP" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Reconstituir INICIALMENTE em 0.5–1.0 mL de ácido acético 0.1% (não usar água bacteriostática pura)",
        "Injetar o ácido acético lentamente pela parede do frasco; girar suavemente até dissolver",
        "Após dissolução, diluir a solução concentrada em solução salina 0.9% até o volume de uso desejado",
        "Verificar pH final: deve ser ligeiramente ácido (4–6); solução turva indica degradação",
        "Refrigerar a 2–8°C, proteger da luz; válido por 14–21 dias após reconstituição",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Hipoglicemia",
        "Crescimento tumoral em predispostos",
        "Acromegalia em uso prolongado",
        "Dores articulares",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Ipamorelin", status: "Sinérgico", note: "Ipamorelin eleva GH endógeno que estimula produção de IGF-1 hepático; IGF-1 LR3 exógeno amplifica a sinalização anabólica distalmente." },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 acelera reparo tecidual via VEGF e NO; IGF-1 LR3 amplifica regeneração via PI3K/Akt. Podem compor protocolos de recuperação." },
        { name: "TB-500", status: "Compatível", note: "TB-500 mobiliza células-tronco; IGF-1 LR3 amplifica sua diferenciação e síntese proteica no tecido-alvo." },
        { name: "Insulina", status: "Monitorar", note: "Risco severo de hipoglicemia: ambos aumentam captação celular de glicose. Monitorar glicemia obrigatoriamente se combinados." },
        { name: "CJC-1295", status: "Monitorar", note: "Combinação amplifica sinalização anabólica; monitorar IGF-1 sérico total; risco de hiperplasia com uso prolongado." },
      ],
      bundles: [
        { name: "Anabolic Edge", category: "Performance", items: ["IGF-1 LR3", "PEG-MGF"], goal: "Massa Muscular" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Long R3 IGF-I: an improved growth factor for the culture of human hematopoietic progenitor cells",
          meta: "In vitro · bioquímica / cultura celular",
          year: "1992",
          summary: "Estudo inicial descrevendo as propriedades bioquímicas do Long R3 IGF-1, demonstrando sua reduzida afinidade às IGFBPs e consequente meia-vida estendida em comparação ao IGF-1 nativo.",
        },
        {
          title: "IGF-1 and muscle hypertrophy: receptor activation, PI3K/Akt signaling and satellite cell proliferation",
          meta: "Review · revisão",
          year: "2010",
          summary: "Revisão dos mecanismos pelos quais o IGF-1 e seus análogos promovem hipertrofia muscular via ativação do receptor IGF-1R, cascatas PI3K/Akt e mTOR, e proliferação de células satélites.",
        },
        {
          title: "Risks of exogenous IGF-1 and analogs: hypoglycemia, visceral hypertrophy and proliferative signaling",
          meta: "Review · revisão",
          year: "2015",
          summary: "Revisão dos riscos associados ao uso de IGF-1 LR3 exógeno, incluindo hipoglicemia por captação muscular independente de insulina, hiperplasia visceral com uso prolongado e sinalização proliferativa com implicações oncológicas.",
        },
      ],
    },
  },
  {
    slug: "ipamorelin",
    name: "Ipamorelin",
    aliases: ["Ipamorelin acetato", "NNC 26-0161"],
    tagline: "Secretagogo seletivo de GH sem efeitos colaterais sistêmicos",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~2 horas" },
      { id: "classification", label: "Classificação", value: "Secretagogo seletivo de GH (GHRP)" },
      { id: "cycle", label: "Ciclo", value: "8–16 semanas" },
      { id: "route", label: "Via", value: "Subcutânea (preferencialmente antes de dormir ou do treino)" },
      { id: "dose", label: "Dose típica", value: "200–300 mcg/aplicação, 1–3× ao dia" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Ipamorelin",
      prose: "Ipamorelin é um pentapeptídeo sintético que atua como agonista seletivo do receptor de grelina (GHS-R1a), estimulando a liberação pulsátil de GH pela hipófise anterior. É considerado o secretagogo de GH com melhor perfil de seletividade, sem elevar cortisol ou prolactina significativamente.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O Ipamorelin é um pentapeptídeo agonista seletivo do receptor de grelina (GHS-R1a), promovendo liberação pulsátil de GH endógeno pela hipófise. Diferentemente de outros GHRPs (como GHRP-6 e GHRP-2), o Ipamorelin é altamente seletivo: não eleva significativamente cortisol nem prolactina, e tem efeito mínimo sobre o apetite. A liberação de GH é fisiológica e dependente da janela de tempo da somatostatina, o que reduz dessensibilização. Ideal para combinação com CJC-1295 (que estende a janela do GHRH).",
      points: [
        "Agonista seletivo do receptor de grelina (GHS-R1a).",
        "Promove liberação pulsátil de GH endógeno.",
        "Não eleva cortisol nem prolactina (ao contrário de GHRP-6/2).",
        "Efeito mínimo sobre apetite.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Aumento fisiológico e pulsátil dos níveis de GH",
        "Ganho de massa muscular magra",
        "Redução de gordura corporal, especialmente visceral",
        "Melhora da qualidade e profundidade do sono",
        "Recuperação pós-treino acelerada",
        "Sem impacto sobre cortisol ou prolactina",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Melhora inicial do sono e recuperação; pico de GH noturno" },
        { period: "Semana 3-6", text: "Aumento de força e composição corporal; IGF-1 começa a subir" },
        { period: "Mês 2-3", text: "Benefícios consolidados em massa magra, recuperação e pele" },
        { period: "Mês 3+", text: "Pausa recomendada para evitar dessensibilização (4 semanas off)" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "200–300 mcg/aplicação, 1–3× ao dia" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "1-3x ao dia" },
        { label: "Duração do ciclo", value: "8–16 semanas" },
        { label: "Concentração", value: "2 mL = 2.5 mg/mL (vial de 5mg)" },
      ],
      indications: [
        { name: "Recuperação / sono", note: "Em jejum de 2h", dose: "200 mcg antes de dormir" },
        { name: "Performance / composição corporal", note: "Manhã, pré-treino, antes de dormir", dose: "200 mcg 2-3x/dia" },
        { name: "Stack com CJC-1295", note: "2-3x ao dia", dose: "100-200 mcg + 100 mcg CJC" },
        { name: "Anti-aging suave", note: "1x antes de dormir", dose: "200-300 mcg/dia" },
      ],
      phases: [
        { phase: "Semanas 1-12 (ciclo)", dose: "200 mcg 1-3x/dia" },
        { phase: "Pausa", dose: "4 semanas off" },
        { phase: "Ciclo seguinte", dose: "Retomar com mesma dose ou ajustar" },
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
        "Sonolência (quando aplicado próximo ao horário de dormir)",
        "Rubor facial transitório",
        "Resistência à insulina leve em doses altas",
        "Retenção hídrica discreta",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "CJC-1295", status: "Sinérgico", note: "Combinação clássica: CJC estende a janela do GHRH, Ipamorelin amplifica o pulso de GH." },
        { name: "Tesamorelin", status: "Sinérgico", note: "Outro análogo do GHRH; potencializa o pulso de GH." },
        { name: "BPC-157", status: "Compatível", note: "Sem interação direta; mecanismos independentes." },
        { name: "Somatostatina / análogos", status: "Monitorar", note: "Análogos de somatostatina (octreotida) anulam completamente o efeito." },
      ],
      bundles: [
        { name: "Fountain of Youth", category: "Longevidade", items: ["Epithalon", "Ipamorelin"], goal: "Anti-Aging e Pele" },
        { name: "GH Optimizer", category: "Performance", items: ["Ipamorelin", "CJC-1295"], goal: "Performance e GH" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Ipamorelin, the first selective growth hormone secretagogue",
          meta: "Rats / Humans · farmacologia",
          year: "1998",
          summary: "Estudo seminal de Raun et al. descreveu a seletividade do Ipamorelin para liberação de GH sem elevar cortisol ou prolactina.",
        },
        {
          title: "Effects of Ipamorelin on growth hormone secretion in adults",
          meta: "Humans · clínico",
          year: "2003",
          summary: "Demonstrou eficácia em elevar pulsos de GH em adultos saudáveis com perfil de segurança superior a outros GHRPs.",
        },
      ],
    },
  },
  {
    slug: "kisspeptin",
    name: "Kisspeptin",
    aliases: ["Kiss-10", "Kiss-54", "Metastin", "KiSS-1 peptide", "Kisspeptin-10", "Kisspeptin-54", "GPR54 ligand"],
    tagline: "Neuropeptídeo regulador do eixo reprodutivo e libido",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~5–10 min (nativo); ~28–38 min (análogos modificados)" },
      { id: "classification", label: "Classificação", value: "Neuropeptídeo regulador master do eixo HPG (Kiss-10/54) — estimulador upstream do GnRH" },
      { id: "cycle", label: "Ciclo", value: "Conforme protocolo de fertilidade" },
      { id: "route", label: "Via", value: "Intravenosa ou subcutânea" },
      { id: "dose", label: "Dose típica", value: "1–10 mcg/kg IV ou 100–500 mcg subcutâneo" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Kisspeptin",
      prose: "Kisspeptin é o neuropeptídeo considerado o \"gatekeeper\" da reprodução, regulando a secreção de GnRH e todo o eixo hipotálamo-hipofisário-gonadal. Investigado para tratamento de hipogonadismo hipogonadotrópico, infertilidade e restauração da libido em ambos os sexos.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "A Kisspeptina é um neuropeptídeo codificado pelo gene KISS1, que atua no receptor GPR54 (também denominado KISS1R) nos neurônios GnRH do hipotálamo. É o \"master regulator\" da reprodução: sem sinalização kisspeptina-GPR54 funcional, o eixo hipotálamo-hipofisário-gonadal (HPG) não se ativa — mutações inativantes do KISS1R ou do gene KISS1 causam hipogonadismo hipogonadotrófico idiopático sem puberdade. A kisspeptina estimula a liberação pulsátil de GnRH hipotalâmico, que por sua vez libera LH e FSH na hipófise anterior. Por atuar a montante do GnRH, é considerada mais fisiológica que a Gonadorelin (que atua diretamente na hipófise) ou o hCG (que atua nos testículos). Tem múltiplas isoformas biologicamente ativas: Kiss-54 (forma longa), Kiss-14, Kiss-13 e Kiss-10 (fragmento C-terminal mínimo ativo). Em 2003, Seminara, Crowley e Colledge identificaram independentemente o KISS1/GPR54 como gene essencial para puberdade e fertilidade humana. Em estudos clínicos investigacionais, a administração IV ou SC de kisspeptina aumenta LH/FSH e mostra potencial para hipogonadismo funcional hipotalâmico (HFH), amenorreia hipotalâmica por estresse/exercício e infertilidade feminina. IMPORTANTE: uso humano exclusivamente investigacional; sem aprovação por qualquer agência regulatória.",
      points: [
        "Master regulator do eixo HPG via receptor GPR54: sem sinalização kisspeptina, o eixo reprodutivo não se ativa.",
        "Estimula GnRH hipotalâmico upstream — mais fisiológico que Gonadorelin (hipofisária) ou hCG (testicular).",
        "Potencial terapêutico em HFH, amenorreia hipotalâmica e infertilidade — dados fase 2 investigacionais.",
        "USO EXCLUSIVAMENTE INVESTIGACIONAL: sem aprovação FDA, EMA ou ANVISA.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Estimulação do eixo reprodutivo",
        "Tratamento de hipogonadismo",
        "Melhora de libido",
        "Suporte à fertilidade",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Elevação de LH/FSH documentada em estudos IV; efeito SC menos previsível — VERIFICAR" },
        { period: "Semana 3-4", text: "Restauração de pulsatilidade de GnRH em HFH; melhora de ciclo menstrual em mulheres com amenorreia hipotalâmica" },
        { period: "Mês 2-3", text: "Dados clínicos humanos de longo prazo ainda limitados; resposta individual variável — VERIFICAR" },
        { period: "Mês 3+", text: "Sem protocolos de uso prolongado estabelecidos; aguardar resultados de ensaios clínicos fase 2/3 em andamento" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "1–10 mcg/kg IV ou 100–500 mcg subcutâneo" },
        { label: "Via", value: "Intravenoso (pesquisa) ou Subcutâneo (investigacional)" },
        { label: "Frequência", value: "Pulsátil (intervalos de 90–120 min em pesquisa) ou EOD (investigacional)" },
        { label: "Duração do ciclo", value: "Conforme protocolo de fertilidade" },
        { label: "Concentração", value: "1 mL = variável (1–10 nmol/kg nos ensaios clínicos)" },
      ],
      indications: [
        { name: "Hipogonadismo funcional hipotalâmico (HFH) — investigacional", note: "Doses dos ensaios clínicos fase 2; sem protocolo padronizado — VERIFICAR", dose: "0.3–10 nmol/kg SC ou IV" },
        { name: "Amenorreia hipotalâmica por estresse/exercício", note: "Investigacional; administração pulsátil prefere mimetizar ritmo GnRH de 90–120 min — VERIFICAR", dose: "0.3–1.0 nmol/kg SC intermitente" },
        { name: "Diagnóstico de reserva HPG (teste de kisspeptina)", note: "Avaliar resposta de LH/FSH; uso em protocolo diagnóstico de pesquisa — VERIFICAR", dose: "1.5–3.0 nmol/kg IV dose única" },
        { name: "Libido / bem-estar sexual (off-label)", note: "Uso off-label sem suporte clínico robusto — VERIFICAR; considerar Gonadorelin ou hCG como alternativa mais estudada", dose: "Sem protocolo estabelecido" },
      ],
      phases: [
        { phase: "Ensaios clínicos (investigacional)", dose: "0.3–10 nmol/kg SC/IV conforme protocolo de pesquisa" },
        { phase: "Off-label (sem protocolo)", dose: "VERIFICAR — aguardar publicações de fase 3 antes de uso clínico" },
        { phase: "Avaliação", dose: "Monitorar LH, FSH, estradiol/testosterona e sintomas a cada 4 semanas" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 1.0 mL de água bacteriostática com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma",
        "Girar suavemente até dissolver (não agitar)",
        "Rotular e refrigerar a 2–8°C, proteger da luz",
        "ATENÇÃO: uso exclusivamente investigacional — sem protocolos clínicos padronizados estabelecidos",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Desconforto abdominal",
        "Rubor facial",
        "Cefaleia",
        "Hipersensibilidade",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Gonadorelin", status: "Sinérgico", note: "Kisspeptina estimula neurônios GnRH upstream (hipotálamo); Gonadorelin atua diretamente na hipófise downstream. Eixo HPG estimulado em dois níveis distintos." },
        { name: "hCG", status: "Compatível", note: "hCG atua nas células de Leydig (testicular); kisspeptina age no hipotálamo. Vias independentes do eixo reprodutivo com possível complementaridade." },
        { name: "Selank", status: "Compatível", note: "Selank reduz ansiedade e pode melhorar o contexto de hipogonadismo funcional hipotalâmico por estresse; kisspeptina restaura o eixo HPG." },
        { name: "Ipamorelin", status: "Compatível", note: "Ipamorelin eleva GH; kisspeptina eleva LH/FSH/testosterona. Eixos somatotrófico e gonadal independentes e complementares." },
        { name: "Enclomifeno", status: "Monitorar", note: "Ambos aumentam GnRH/LH por vias diferentes (kisspeptina upstream; enclomifeno antiestrogênico); combinação pode hiperestimular o eixo HPG — VERIFICAR." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Inactivating mutations in the KISS1 receptor (GPR54) cause idiopathic hypogonadotropic hypogonadism (Seminara et al.)",
          meta: "Humans · genética / endocrinologia",
          year: "2003",
          summary: "Estudo seminal de Seminara, Crowley e colaboradores (NEJM) identificando mutações inativantes do GPR54 como causa de hipogonadismo hipogonadotrófico idiopático sem puberdade, estabelecendo a kisspeptina como master regulator do eixo HPG humano.",
        },
        {
          title: "Kisspeptin-10 administration stimulates gonadotropin secretion in healthy women (Dhillo et al.)",
          meta: "Humans · endocrinologia / ensaio clínico",
          year: "2007",
          summary: "Primeiro estudo clínico demonstrando que a administração IV de kisspeptina-10 estimula a secreção de LH e FSH em mulheres saudáveis, confirmando a relevância translacional dos estudos genéticos e abrindo caminho para uso terapêutico.",
        },
        {
          title: "Kisspeptin therapy for hypothalamic amenorrhea and functional hypogonadotropic hypogonadism: phase 2 evidence",
          meta: "Humans · RCT fase 2 / endocrinologia reprodutiva",
          year: "2017",
          summary: "Estudo fase 2 avaliando kisspeptina SC para amenorreia hipotalâmica funcional em mulheres com histórico de distúrbios alimentares ou exercício excessivo, demonstrando restauração de pulsatilidade de LH em respondedoras.",
        },
      ],
    },
  },
  {
    slug: "klow",
    name: "KLOW",
    aliases: ["Blend KLOW", "Stack libido feminina", "Kisspeptin-Lecirelin-Oxitocina blend", "K-L-O-W peptide complex"],
    tagline: "Peptídeo de cicatrização e regeneração tecidual",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "Variável por componente: Kisspeptin ~30 min; Oxitocina ~1-6 min; demais componentes variáveis -- VERIFICAR composição exata do produto recebido" },
      { id: "classification", label: "Classificação", value: "Stack/blend peptídico composto — NÃO é peptídeo único; composição varia por fornecedor (base: Kisspeptin + componentes variáveis)" },
      { id: "cycle", label: "Ciclo", value: "4–8 semanas" },
      { id: "route", label: "Via", value: "Subcutânea ou tópica" },
      { id: "dose", label: "Dose típica", value: "200–500 mcg subcutâneo, 1–2x ao dia" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é KLOW",
      prose: "KLOW é um peptídeo bioativo de baixo peso molecular com propriedades de cicatrização e regeneração tecidual. Investigado para reparo de tecidos moles, redução de inflamação local e aceleração de processos de cura em lesões cutâneas e musculoesqueléticas.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "KLOW é um nome comercial/compounding para uma mistura de peptídeos cujos componentes e proporções variam significativamente entre fornecedores — a ausência de padronização é o principal risco clínico. A base geralmente inclui: Kisspeptin (neuropeptídeo hipotalâmico que ativa o receptor GPR54/KISS1R, estimulando a liberação de GnRH e consequentemente LH e FSH; papel central na regulação do eixo reprodutivo feminino e na resposta sexual); Lecirelin ou outro análogo de GnRH (estimulação pituitária direta de LH/FSH); Oxitocina (neuropeptídeo do vínculo social, modulação de recompensa, ansiolítico, facilitador de excitação e orgasmo). O componente W varia muito entre fabricantes — pode incluir PT-141, Selank, ou outras moléculas. Na ausência de blend padronizado, é impossível afirmar um mecanismo de ação unificado para o produto. O stack é geralmente posicionado para libido feminina, vínculo afetivo e bem-estar sexual. Ausência completa de ensaios clínicos formais para o blend KLOW como produto unificado. Recomenda-se fortemente conhecer a composição exata do produto antes de qualquer uso.",
      points: [
        "ATENÇÃO: composição varia por fornecedor — mecanismos abaixo referem-se ao blend típico, sem garantia de universalidade",
        "Kisspeptin ativa GPR54/KISS1R, estimulando GnRH hipotalâmico e o eixo LH/FSH/esteroides sexuais",
        "Oxitocina modula circuitos de recompensa, vínculo afetivo, excitação sexual e redução de ansiedade social",
        "Componente W (Lecirelin, PT-141 ou outros) varia por fornecedor — verificar composição antes do uso",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Cicatrização acelerada",
        "Redução de inflamação local",
        "Regeneração de tecidos moles",
        "Reparo pós-lesão",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Minutos-Horas", text: "Efeitos agudos dos componentes de ação rápida (oxitocina, possível PT-141 se presente): aumento de excitação e receptividade sexual" },
        { period: "Dias 1-7", text: "Melhora de humor, vínculo e libido com uso regular — variável conforme composição do blend e resposta individual" },
        { period: "Semana 2-4", text: "Efeito hormonal cumulativo via eixo GnRH/LH/FSH se Kisspeptin e Lecirelin presentes e em dose adequada" },
        { period: "Mês 1+", text: "Sem dados de uso prolongado; perfil de segurança desconhecido a longo prazo; -- VERIFICAR composição e monitorar" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "200–500 mcg subcutâneo, 1–2x ao dia" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "Variável por fornecedor; tipicamente 30-60 min antes da atividade sexual ou 1x/dia -- VERIFICAR" },
        { label: "Duração do ciclo", value: "4–8 semanas" },
        { label: "Concentração", value: "Variável por fornecedor; sem padrão estabelecido — verificar composição e concentração do produto recebido" },
      ],
      indications: [
        { name: "Disfunção sexual feminina / baixa libido (off-label experimental)", note: "Sem ensaios clínicos formais do blend KLOW específico -- VERIFICAR composição exata", dose: "Dose variável por fornecedor e composição" },
        { name: "Melhora de vínculo e bem-estar sexual (off-label)", note: "Baseado em efeito dos componentes individuais; blend sem validação formal -- VERIFICAR", dose: "Dose variável; aplicar 30-60 min antes da atividade sexual" },
        { name: "Suporte hormonal eixo GnRH/LH/FSH (investigacional)", note: "Altamente VERIFICAR — sem protocolo padronizado; pode interferir com eixo reprodutivo", dose: "Depende da concentração de Kisspeptin e Lecirelin no blend específico" },
      ],
      phases: [
        { phase: "Uso situacional", dose: "Aplicar 30-60 min antes da atividade sexual; dose por indicação do fornecedor -- VERIFICAR composição" },
        { phase: "Uso diário (se indicado)", dose: "1x/dia conforme protocolo do fornecedor específico; sem dados de ciclos ideais -- VERIFICAR" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "ATENÇÃO: verificar composição específica do fornecedor antes de usar — composição do KLOW NÃO é padronizada entre fabricantes",
        "Adicionar 1-2 mL de água bacteriostática conforme indicação do fabricante (volume pode variar por blend)",
        "Girar suavemente até dissolução completa de todos os componentes",
        "Refrigerar entre 2-8°C após reconstituição; NÃO congelar",
        "Anotar data de abertura; usar em até 7 dias; inspecionar cor e turbidez antes de cada aplicação",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Dados humanos limitados",
        "Desconforto local",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Oxitocina", status: "Sinérgico", note: "Se oxitocina não estiver no blend KLOW do fornecedor específico: adição de oxitocina intranasal amplifica efeitos de vínculo e excitação; verificar composição antes de combinar" },
        { name: "PT-141", status: "Sinérgico", note: "PT-141/Bremelanotida (agonista MC3R/MC4R, libido via melanocortina) + KLOW (eixo GnRH/oxitocina): se PT-141 não constar no blend, combinação potencializa resposta sexual feminina por vias distintas" },
        { name: "Selank", status: "Compatível", note: "Selank (ansiolítico, BDNF, modulação IL-6) + KLOW (libido e vínculo): redução de ansiedade social pode potencializar resposta ao KLOW em pacientes com inibição por ansiedade" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 (anti-inflamatório, modulação dopaminérgica e serotoninérgica) + KLOW (vínculo e libido): sem interação direta conhecida; perfis de segurança compatíveis" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Kisspeptin modulates sexual and emotional brain processing in humans (Dhillo et al., JCEM)",
          meta: "Humans · Dhillo e colaboradores (Imperial College London) demonstrando que Kisspeptin modula processamento sexual e emocional no cérebro humano via fMRI — componente central do KLOW",
          year: "2012",
          summary: "Administração de Kisspeptin-54 em homens aumentou ativação cerebral em resposta a estímulos sexuais e reduziu resposta a estímulos negativos; base para uso de Kisspeptin em disfunção sexual.",
        },
        {
          title: "The role of kisspeptin in the control of the hypothalamic-pituitary-gonadal axis (review)",
          meta: "Humans / Animals · Revisão do papel de Kisspeptin no controle neuroendócrino do eixo HPG — base farmacológica do componente K do blend KLOW",
          year: "2014",
          summary: "Revisão mecanística de Kisspeptin como regulador-mestre do eixo GnRH/LH/FSH; base farmacológica para aplicações em infertilidade e disfunção sexual.",
        },
        {
          title: "Intranasal oxytocin effects on social cognition and sexual behavior (review)",
          meta: "Humans · Revisão dos efeitos da oxitocina exógena em cognição social, vínculo afetivo e comportamento sexual — componente O do blend KLOW",
          year: "2015",
          summary: "Oxitocina exógena melhora reconhecimento emocional, vínculo social e excitação sexual em contextos controlados; paradoxo ansiolítico/ansiogênico discutido.",
        },
      ],
    },
  },
  {
    slug: "kpv",
    name: "KPV",
    aliases: ["Lys-Pro-Val", "KPV tripeptídeo", "C-terminal α-MSH(193-195)", "KPV acetato", "α-MSH C-terminal fragment"],
    tagline: "Tripeptídeo anti-inflamatório derivado da alfa-MSH",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~2–4 horas (estimativa; dados limitados)" },
      { id: "classification", label: "Classificação", value: "Tripeptídeo C-terminal da α-MSH (aa 193–195) — anti-inflamatório potente sem efeito melanocortinérgico" },
      { id: "cycle", label: "Ciclo", value: "4–8 semanas" },
      { id: "route", label: "Via", value: "Oral, subcutânea ou tópica" },
      { id: "dose", label: "Dose típica", value: "500 mcg – 1 mg, 2x ao dia" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é KPV",
      prose: "KPV (Lys-Pro-Val) é o tripeptídeo C-terminal da α-MSH com potente atividade anti-inflamatória. Especialmente eficaz em inflamação intestinal, como doença de Crohn e colite ulcerativa, podendo ser administrado por via oral, subcutânea ou tópica.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O KPV é o tripeptídeo correspondente aos últimos três aminoácidos (Lys-Pro-Val, posições 193–195) da α-melanocyte-stimulating hormone (α-MSH). É notável por manter a potente atividade anti-inflamatória do peptídeo-pai sem os efeitos melanocortinérgicos — não causa pigmentação, não ativa significativamente o receptor MC1R dos melanócitos. O mecanismo anti-inflamatório envolve múltiplas vias: penetração direta no núcleo celular (comportamento incomum para um tripeptídeo), onde inibe a translocação nuclear do NF-κB p65, bloqueando a transcrição de genes pró-inflamatórios; inibição da produção de citocinas pró-inflamatórias (TNF-α, IL-1β, IL-6, IL-8) em macrófagos, monócitos e células epiteliais intestinais; e proteção e restauração da integridade da barreira epitelial intestinal pelo fortalecimento das tight junctions. Estudos de Dalmasso, Charrier-Hisamuddin e Merlin, publicados em Gastroenterology e American Journal of Physiology-GI, demonstraram eficácia do KPV em modelos murinos de colite experimental (induzida por TNBS e DSS), com redução de perda de peso, inflamação histológica e marcadores de permeabilidade intestinal. A microencapsulação em hidrogel de quitosana permitiu administração oral eficaz, chegando ao cólon com bioatividade preservada. Perfil de segurança favorável nos estudos disponíveis.",
      points: [
        "Penetra diretamente no núcleo celular, inibindo translocação do NF-κB p65 — anti-inflamatório potente.",
        "Inibe TNF-α, IL-1β, IL-6 e IL-8 em macrófagos e epitélio intestinal sem efeito pigmentante (MC1R-independente).",
        "Restaura integridade da barreira epitelial intestinal (tight junctions) — indicação em IBD/permeabilidade intestinal.",
        "Via oral com microencapsulação em hidrogel ou via retal (supositório) validadas em modelos de colite experimental.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Redução de inflamação intestinal",
        "Proteção da barreira mucosa",
        "Anti-inflamatório sistêmico",
        "Ação em condições autoimunes",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Redução de marcadores inflamatórios sistêmicos; melhora de sintomas GI em portadores de IBD nas primeiras semanas" },
        { period: "Semana 3-4", text: "Melhora de barreira intestinal perceptível; redução de dor abdominal e frequência de episódios inflamatórios" },
        { period: "Mês 2-3", text: "Benefícios consolidados em IBD (Crohn/RCU); melhora de marcadores de permeabilidade intestinal (zonulina, LPS)" },
        { period: "Mês 3+", text: "Uso contínuo avaliado individualmente; reavaliação de biomarcadores inflamatórios (PCR-us, IL-6, calprotectina fecal)" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "500 mcg – 1 mg, 2x ao dia" },
        { label: "Via", value: "Oral (microencapsulado) ou Retal (supositório/enema) ou Subcutâneo" },
        { label: "Frequência", value: "2–3× ao dia (oral/retal) | 1× ao dia (SC)" },
        { label: "Duração do ciclo", value: "4–8 semanas" },
        { label: "Concentração", value: "Oral: 200–500 mcg/dose | SC: 1 mL = 500 mcg/mL" },
      ],
      indications: [
        { name: "IBD / Doença de Crohn / RCU (oral)", note: "Microencapsulado em hidrogel para proteger da digestão; após refeições", dose: "200–500 mcg oral 2–3×/dia" },
        { name: "Colite / proctite (retal)", note: "Aplicação noturna preferencial; ação local direta no epitélio inflamado", dose: "500 mcg–1 mg em supositório ou enema 1–2×/dia" },
        { name: "Inflamação sistêmica / permeabilidade intestinal (SC)", note: "Ciclos de 4–8 semanas; monitorar PCR-us, IL-6 e zonulina", dose: "250–500 mcg SC 1×/dia" },
        { name: "Psoríase / dermatite (SC + tópico)", note: "Efeito anti-inflamatório cutâneo via inibição de NF-κB local — VERIFICAR", dose: "250 mcg SC 1×/dia + aplicação tópica na área" },
      ],
      phases: [
        { phase: "Semanas 1–8 (fase de indução)", dose: "500 mcg oral 3×/dia ou 250–500 mcg SC 1×/dia" },
        { phase: "Semanas 9–16 (manutenção)", dose: "200–300 mcg oral 2×/dia ou SC 3–4×/semana" },
        { phase: "Reavaliação (semana 16)", dose: "Ajuste conforme calprotectina fecal, PCR-us e sintomas clínicos" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 1.0 mL de água bacteriostática com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma",
        "Girar suavemente até dissolver completamente (não agitar)",
        "Para uso oral: encapsular em hidrogel ou cápsula entérica para proteção da digestão gástrica",
        "Refrigerar a 2–8°C, proteger da luz; válido por 14–21 dias após reconstituição",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Náusea leve (raro)",
        "Hipopigmentação local (uso tópico)",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "BPC-157", status: "Sinérgico", note: "KPV inibe NF-κB e restaura barreira intestinal; BPC-157 acelera cicatrização de mucosa via VEGF/NO. Sinergia direta em doenças inflamatórias intestinais." },
        { name: "LL-37", status: "Compatível", note: "LL-37 tem ação antimicrobiana e de cicatrização; KPV controla a inflamação associada. Compõem protocolo de saúde intestinal e cutânea integrado." },
        { name: "Thymosin Alpha-1", status: "Compatível", note: "Thymosin Alpha-1 modula imunidade Th1; KPV suprime NF-κB e citocinas pró-inflamatórias. Vias imunes distintas e complementares em IBD e inflamação crônica." },
        { name: "Tirzepatida", status: "Compatível", note: "Tirzepatida pode causar efeitos GI; KPV protege a barreira intestinal. BPC-157 e KPV como suporte GI durante protocolo de incretinas — VERIFICAR." },
        { name: "Semaglutida", status: "Compatível", note: "Similar à combinação com tirzepatida: KPV pode mitigar efeitos adversos GI dos agonistas GLP-1 via proteção de barreira intestinal — VERIFICAR." },
      ],
      bundles: [
        { name: "Gut Restore", category: "Recuperação", items: ["BPC-157 (Oral)", "KPV"], goal: "Saúde Intestinal" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Luminal KPV (alpha-MSH C-terminal tripeptide) reduces experimental colitis via nuclear NF-kB inhibition (Dalmasso et al.)",
          meta: "Mice · gastroenterologia / pré-clínico",
          year: "2008",
          summary: "Estudo de Dalmasso et al. demonstrando que o KPV luminal reduz colite experimental induzida por TNBS em camundongos por mecanismo de inibição nuclear do NF-κB p65 nas células epiteliais do cólon, sem ativação de receptores de melanocortina.",
        },
        {
          title: "Oral delivery of KPV via hydrogel nanoparticles for colitis treatment: colonic uptake and anti-inflammatory efficacy (Laroui/Merlin)",
          meta: "Mice · farmacologia / gastroenterologia",
          year: "2010",
          summary: "Estudo de Laroui, Merlin e colaboradores demonstrando que a microencapsulação do KPV em nanopartículas de hidrogel de quitosana permite entrega eficaz ao cólon após administração oral, com redução de marcadores inflamatórios em colite murina.",
        },
        {
          title: "Alpha-MSH C-terminal tripeptide KPV and intestinal barrier function: tight junction restoration and anti-permeability effects",
          meta: "In vitro / Mice · gastroenterologia / barreira intestinal",
          year: "2015",
          summary: "Estudo avaliando o efeito do KPV na restauração de tight junctions e redução de permeabilidade intestinal em modelos de epitélio intestinal inflamado e colite murina, demonstrando mecanismo de barreira além da simples anti-inflamação.",
        },
      ],
    },
  },
  {
    slug: "l-carnitina-injetavel",
    name: "L-Carnitina Injetável",
    aliases: ["Levocarnitina", "L-Acetil-Carnitina (ALCAR)", "Propionil-L-Carnitina (PLC)", "L-Carnitina Tartrato", "Vitamina BT (nomenclatura histórica)"],
    tagline: "Transportador de ácidos graxos para oxidação mitocondrial",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "L-carnitina livre: ~4-6 h oral; ~1-2 h IV; acetil-L-carnitina: ~2-4 h; excreção renal predominante" },
      { id: "classification", label: "Classificação", value: "Derivado de aminoácido trimetilamônio (NÃO é peptídeo); sintetizado endogenamente a partir de lisina e metionina; essencial para o transporte de ácidos graxos pra matriz mitocondrial via shuttle CPT1/CPT2" },
      { id: "cycle", label: "Ciclo", value: "8–12 semanas" },
      { id: "route", label: "Via", value: "Intravenosa ou intramuscular" },
      { id: "dose", label: "Dose típica", value: "500 mg – 2 g IV ou IM, 3x por semana" },
      { id: "cost", label: "Custo", value: "$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é L-Carnitina Injetável",
      prose: "L-Carnitina na forma injetável oferece biodisponibilidade superior à oral (100% vs 5–15%), transportando ácidos graxos de cadeia longa para o interior da mitocôndria. Utilizada para emagrecimento, melhora de desempenho esportivo e como cardioprotetor em pacientes com doenças cardíacas.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "L-Carnitina (levocarnitina) é um derivado de aminoácido quaternário (trimetilamônio-hidroxibutirobetaína) sintetizado endogenamente no fígado e rins a partir de lisina e metionina, com cofatores vitamina C, B6, niacina e ferro. Não é peptídeo, mas um micronutriente condicionalmente essencial. Sua função bioquímica primária é o transporte de ácidos graxos de cadeia longa através da membrana mitocondrial interna via o sistema de shuttle carnitina-acilcarnitina (CPT1 na membrana externa, CPT2 na interna), permitindo sua entrada na beta-oxidação para geração de ATP.\n\nFormas e aplicações: (1) L-carnitina livre: performance aeróbica, recuperação muscular, fertilidade masculina (aumenta motilidade de espermatozóides) e cardiologia (angina estável, IC com fração de ejeção reduzida); (2) Acetil-L-carnitina (ALCAR): traversa a barreira hematoencefálica com maior eficiência, usada em neuropatia diabética, demência leve e fadiga cognitiva; (3) Propionil-L-carnitina (PLC): especialmente estudada em doença vascular periférica e angina. FDA aprova levocarnitina para deficiência primária de carnitina (OMIM 212140) e secundária em doença renal crônica/diálise. Absorção oral é limitada (~15-20% de biodisponibilidade) — formas IV ou lipossomais são superiores em estados de deficiência.",
      points: [
        "Transporte de ácidos graxos de cadeia longa para beta-oxidação mitocondrial via sistema CPT1/CPT2 (shuttle carnitina)",
        "Melhora de performance aeróbica, recuperação muscular e motilidade de espermatozóides (L-carnitina livre)",
        "Acetil-L-carnitina (ALCAR): atravessa barreira hematoencefálica; neuroproteção em neuropatia diabética e demência leve",
        "Aprovada FDA para deficiência primária/secundária de carnitina; off-label em cardiologia, performance e fertilidade",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Aumento da oxidação de gordura",
        "Melhora de performance aeróbica",
        "Redução de fadiga muscular",
        "Cardioproteção",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Redução de fadiga muscular pós-exercício; melhora de recuperação; aumento de energia percebida em estados de deficiência" },
        { period: "Semana 3-4", text: "Melhora mensurável de performance aeróbica em indivíduos com baixa reserva de carnitina; ALCAR: melhora de foco e cognição" },
        { period: "Mês 2-3", text: "Melhora de parâmetros de fertilidade masculina (motilidade); cardiologia: melhora de tolerância ao exercício em angina/IC" },
        { period: "Mês 3+", text: "Efeitos sustentados com suplementação contínua; níveis plasmáticos estabilizados; manutenção de benefícios em deficiência documentada" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "500 mg – 2 g IV ou IM, 3x por semana" },
        { label: "Via", value: "Oral, Intravenoso ou Lipossomal" },
        { label: "Frequência", value: "Oral: 1-3g/dia divididos em 2-3 doses; IV: 1-3g em infusão 2-3x/semana; lipossomal oral: 500-1000 mg/dia" },
        { label: "Duração do ciclo", value: "8–12 semanas" },
        { label: "Concentração", value: "Oral (livre): 500-1000 mg por dose, 2-3x/dia; IV: ampolas 1-2g diluídas em 100-250 mL SF 0,9% em 30-60 min; ALCAR: 500-1500 mg/dia" },
      ],
      indications: [
        { name: "Deficiência primária ou secundária de carnitina (diálise)", note: "Indicacao aprovada FDA; monitorar carnitina plasmática total e livre; prescrição médica obrigatória", dose: "L-carnitina IV: 1-3g após cada sessão de diálise, ou 2g/dia oral" },
        { name: "Performance aeróbica e recuperação muscular", note: "Suplementação indicada em dietas pobres em carnitina (veganos/vegetarianos) ou atletas de alto volume; beneficio menor em indivíduos com níveis adequados", dose: "L-carnitina tartrato 2-3g/dia oral divididos, antes e após treino" },
        { name: "Neuropatia diabética e neuroproteção (ALCAR)", note: "ALCAR tem melhor penetracao no SNC; estudos mostram reducao de dor neuropatica e melhora de velocidade de conducao nervosa", dose: "Acetil-L-carnitina 1500-3000 mg/dia oral divididos em 3 doses" },
        { name: "Fertilidade masculina (motilidade espermática)", note: "Combinar com antioxidantes (vitamina C, E, CoQ10) para protocolo de fertilidade masculina completo; monitorar espermograma", dose: "L-carnitina livre 2-3g/dia oral + L-acetil-carnitina 1g/dia × 3-6 meses" },
        { name: "Cardiologia — angina estável e IC (PLC)", note: "Adjuvante ao tratamento cardíaco convencional; não substituir medicação cardiológica estabelecida; monitoramento cardiológico obrigatório", dose: "Propionil-L-carnitina 2-3g/dia oral ou L-carnitina IV 2g 3x/semana" },
      ],
      phases: [
        { phase: "Fase inicial (4-8 semanas)", dose: "1-2g/dia oral divididos; ajustar dose para cima conforme tolerância gastrointestinal (náusea, odor de peixe em altas doses)" },
        { phase: "Fase de manutenção", dose: "2-3g/dia oral continuamente ou IV 1-2x/semana conforme indicação; reavaliar a cada 3 meses" },
        { phase: "Monitoramento", dose: "Carnitina total e livre plasmática (alvo: > 40 micromol/L livres); em fertilidade: espermograma a cada 3 meses; em cardio: teste de esforço" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Forma oral: comprimidos, cápsulas ou solução líquida — tomar com ou sem alimentos; dividir doses ao longo do dia para melhor absorção",
        "Forma IV (levocarnitina): ampolas de 1g/5 mL ou 2g/10 mL prontas para uso — diluir em SF 0,9% ou SG 5% para infusão lenta",
        "Forma lipossomal oral: agitar o frasco antes de medir a dose; absorção superior à forma não-lipossomal convencional",
        "Forma SC (experimental): reconstituir pó em solução salina 0,9% para 200-500 mg/mL; administrar SC no abdômen",
        "Refrigerar formas líquidas após abertura; formas sólidas em local seco e fresco",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Odor corporal (trimetilamina)",
        "Náusea em doses altas",
        "Diarreia (via oral)",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "CoQ10 (Ubiquinol)", status: "Sinérgico", note: "CoQ10 é essencial na cadeia respiratória mitocondrial; L-carnitina traz substratos para beta-oxidação e CoQ10 garante eficiência da fosforilação oxidativa — sinergia mitocondrial clássica" },
        { name: "SS-31 (Elamipretide)", status: "Sinérgico", note: "SS-31 protege a estrutura mitocondrial via cardiolipina; combinação com L-carnitina para suporte mitocondrial abrangente em falha energética, cardiomiopatia ou neuropatia" },
        { name: "NAD+", status: "Compatível", note: "NAD+ ativa SIRT3 mitocondrial e melhora eficiência da cadeia respiratória; sinergia com L-carnitina para otimização do metabolismo mitocondrial em envelhecimento" },
        { name: "GHK-Cu", status: "Compatível", note: "GHK-Cu promove regeneração tecidual e síntese mitocondrial; pode complementar L-carnitina em protocolos de recuperação muscular e cardiovascular" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 tem ação de reparo em músculo cardíaco e esquelético; sinergia com L-carnitina em protocolos de recuperação de lesão muscular ou suporte cardíaco" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Stephens FB et al. Carnitine, skeletal muscle metabolism and function",
          meta: "Humano · Revisão do papel da L-carnitina no metabolismo muscular esquelético e implicações para performance e recuperação",
          year: "2013",
          summary: "Análise abrangente das funções de L-carnitina no transporte de ácidos graxos, oxidação muscular, metabolismo da glicose e implicações para suplementação em atletas e sedentários.",
        },
        {
          title: "Malaguarnera M et al. L-Carnitine treatment reduces severity of physical and mental fatigue in centenarians",
          meta: "Humano · Ensaio clínico randomizado de L-carnitina em centenários com fadiga física e mental",
          year: "2007",
          summary: "Suplementação de L-carnitina (2g/dia oral × 6 meses) em centenários reduziu fadiga física e mental, aumentou massa muscular, reduziu gordura corporal e melhorou função cognitiva vs placebo.",
        },
        {
          title: "Lenzi A et al. A placebo-controlled double-blind randomized trial of the use of combined L-carnitine and L-acetyl-carnitine treatment in men with asthenozoospermia",
          meta: "Humano · Ensaio clínico randomizado de L-carnitina + ALCAR em infertilidade masculina por astenozoospermia",
          year: "2004",
          summary: "Combinação de L-carnitina (2g/dia) + acetil-L-carnitina (1g/dia) × 6 meses melhorou significativamente motilidade espermática em homens com astenozoospermia vs placebo.",
        },
      ],
    },
  },
  {
    slug: "livagen",
    name: "Livagen",
    aliases: ["Peptídeo hepático Khavinson", "Bioregulador hepático/medular", "Lys-Glu-Asp-Ala (tetrapeptídeo hepático)"],
    tagline: "Biorregulador hepatoportal para função hepática e GI",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30-60 min plasmática; efeito modulador hepático persiste via regulação gênica em hepatócitos e células medulares" },
      { id: "classification", label: "Classificação", value: "Tetrapeptídeo bioregulador de tecido hepático e medular (escola Khavinson)" },
      { id: "cycle", label: "Ciclo", value: "10 dias, 2–3x ao ano" },
      { id: "route", label: "Via", value: "Oral ou subcutânea" },
      { id: "dose", label: "Dose típica", value: "5–10 mg oral ou subcutâneo, 10 dias" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Livagen",
      prose: "Livagen é o tetrapeptídeo biorregulador Lys-Glu-Asp-Ala desenvolvido para fígado e trato gastrointestinal. Demonstrou hepatoproteção, melhora de function tests hepáticos e estímulo de regeneração hepática em estudos pré-clínicos e clínicos do Instituto de Gerontologia de São Petersburgo.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Livagen é um tetrapeptídeo bioregulador derivado de extrato de tecido hepático bovino, desenvolvido pelo grupo de Khavinson no Instituto de Bioregulação e Gerontologia de São Petersburgo. Sua sequência peptídica — atribuída como Lys-Glu-Asp-Ala ou variante próxima (Lys-Glu-Asp-Gly) — atua como sinalizador epigenético em hepatócitos, células estreladas hepáticas e precursores medulares, modulando genes relacionados à regeneração hepática, destoxificação e produção de fatores hematopoiéticos.\n\nO mecanismo proposto envolve interação com receptores peptídicos em hepatócitos, ativação de vias de sinalização do fator de crescimento de hepatócitos (HGF/c-Met) e modulação de genes de síntese proteica hepática e enzimas de fase I e fase II de destoxificação. Em modelos animais, demonstrou hepatoproteção em hepatite experimental, redução de fibrose hepática incipiente e melhora de marcadores de função hepática (ALT, AST, albumina). Na literatura clínica russa, ciclos de 10-20 dias foram relatados como benéficos em hepatopatias crônicas, esteatose hepática e recuperação pós-hepatite viral, além de suporte à função medular em estados de imunodeficiência.\n\nImportante: este bioregulador foi desenvolvido pela escola russa de Khavinson (Instituto de Bioregulação e Gerontologia de São Petersburgo) e tem extensa literatura própria, mas validação independente ocidental ainda é limitada. As doses, indicações e mecanismos descritos refletem o protocolo russo tradicional e pesquisas do grupo de origem. Considere esse contexto ao avaliar a evidência disponível.",
      points: [
        "Modulação epigenética em hepatócitos via peptídeo tecido-específico derivado de fígado bovino",
        "Ativação de vias HGF/c-Met e genes de regeneração hepática, síntese proteica e destoxificação",
        "Hepatoproteção em modelos de hepatite experimental e fibrose hepática incipiente",
        "Suporte à hematopoiese medular e produção de fatores imunes de origem hepática",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Hepatoproteção",
        "Regeneração hepática",
        "Melhora de function tests",
        "Saúde gastrointestinal",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Melhora de marcadores hepáticos (ALT/AST); redução de fadiga associada a hepatopatia" },
        { period: "Semana 3-4", text: "Normalização progressiva de função hepática; melhora de digestão e tolerância alimentar" },
        { period: "Mês 2-3", text: "Redução de esteatose leve detectável em exames; melhora de síntese proteica e albumina sérica" },
        { period: "Mês 3+", text: "Efeitos hepatoprotetores cumulativos com ciclos repetidos; suporte à regeneração hepática crônica" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "5–10 mg oral ou subcutâneo, 10 dias" },
        { label: "Via", value: "Oral (cápsulas) ou Subcutâneo" },
        { label: "Frequência", value: "1-2x/dia oral; ou 1x/dia SC; ciclos de 10-20 dias, 2-3x/ano" },
        { label: "Duração do ciclo", value: "10 dias, 2–3x ao ano" },
        { label: "Concentração", value: "Oral: cápsulas 10 mg; SC: reconstituir em 1-2 mL (5-10 mg/mL)" },
      ],
      indications: [
        { name: "Hepatopatia crônica ou esteatose hepática", note: "Ciclos sazonais; monitorar ALT/AST e ecografia hepática a cada 3-6 meses", dose: "1-2 cápsulas/dia oral × 20 dias, 2-3x/ano" },
        { name: "Recuperação pós-hepatite viral", note: "Iniciar após normalização de transaminases; reforçar com segundo ciclo após 2 meses se necessário", dose: "10 mg/dia SC × 20 dias" },
        { name: "Suporte hepático em uso prolongado de fármacos hepatotóxicos", note: "Uso preventivo em pacientes com polifarmácia ou uso crônico de estatinas e anticonvulsivantes", dose: "1 cápsula/dia oral × 10 dias, 3x/ano" },
        { name: "Geroprotecção hepática preventiva", note: "Uso preventivo em 50+ anos; combinar com NAD+ para suporte mitocondrial hepático no protocolo Khavinson", dose: "1 cápsula/dia oral × 10 dias, 2x/ano" },
      ],
      phases: [
        { phase: "Ciclo de ataque (10-20 dias)", dose: "10 mg/dia SC ou 1-2 cápsulas/dia oral, consecutivos" },
        { phase: "Intervalo", dose: "2-4 meses sem uso entre ciclos" },
        { phase: "Ciclos de manutenção", dose: "Repetir 2-3x/ano; combinar com SS-31 para suporte mitocondrial hepático no protocolo Khavinson" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Retirar frasco da geladeira e aguardar temperatura ambiente (~10 min)",
        "Adicionar 1-2 mL de água bacteriostática ou solução salina 0,9% com seringa estéril",
        "Rodar suavemente entre os dedos até dissolução completa — NÃO agitar",
        "Solução final: 5-10 mg/mL; usar imediatamente ou refrigerar (validade 14-21 dias)",
        "Administração SC: abdômen, coxa ou deltóide; rotacionar sítios de aplicação",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Geralmente bem tolerado",
        "Dados limitados na literatura ocidental",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "SS-31 (Elamipretide)", status: "Sinérgico", note: "SS-31 protege mitocôndrias de hepatócitos enquanto Livagen estimula regeneração hepática — combinação mitocondrial-regenerativa potente" },
        { name: "NAD+", status: "Sinérgico", note: "NAD+ suporta metabolismo energético hepático e reparo de DNA; complementa ação regenerativa de Livagen em hepatócitos envelhecidos" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 tem ação hepatoprotetora documentada em modelos animais; pode potencializar efeito de Livagen em hepatopatia crônica" },
        { name: "Epithalon", status: "Compatível", note: "Epithalon como hub geroprotector; ciclo combinado com Livagen para hepatoproteção sistêmica no envelhecimento" },
        { name: "Thymalin", status: "Compatível", note: "Thymalin suporta imunidade tímica que coordena resposta imune hepática; sinergia em pacientes com hepatite viral crônica" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Khavinson VKh et al. Hepatoprotective effects of liver-specific peptide bioregulator in experimental models",
          meta: "Animal · Estudo em modelos animais de hepatite experimental e fibrose incipiente com tetrapeptídeo hepático Khavinson",
          year: "2005",
          summary: "Administração de bioregulador hepático resultou em redução de ALT/AST, melhora histológica e hepatoproteção em modelos de hepatotoxicidade aguda e crônica.",
        },
        {
          title: "Khavinson VKh, Morozov VG. Tissue-specific peptide bioregulators: 35 years of research",
          meta: "Revisão · Revisão abrangente dos 35 anos de pesquisa com bioreguladores Khavinson incluindo peptídeo hepático",
          year: "2008",
          summary: "Sistematização das evidências acumuladas com bioreguladores tecido-específicos em múltiplos sistemas orgânicos incluindo fígado e medula óssea.",
        },
        {
          title: "Anisimov VN, Khavinson VKh. Peptide bioregulation of aging: results and prospects",
          meta: "Animal/Humano · Revisão sobre bioreguladores Khavinson em modelos de envelhecimento incluindo sistemas hepático e hematopoiético",
          year: "2010",
          summary: "Análise dos resultados com peptídeos tecido-específicos em longevidade e proteção de sistemas orgânicos durante o envelhecimento.",
        },
      ],
    },
  },
  {
    slug: "ll-37",
    name: "LL-37",
    aliases: ["hCAP-18", "Catelicidina humana", "FALL-39", "Human Cathelicidin LL-37", "CAMP peptide"],
    tagline: "Catelicidina humana antimicrobiana de amplo espectro",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~10–30 minutos (plasma); estável nos tecidos" },
      { id: "classification", label: "Classificação", value: "Catelicidina humana — único peptídeo antimicrobiano da família catelicidina em humanos" },
      { id: "cycle", label: "Ciclo", value: "2–4 semanas (infecção) ou 4–8 semanas" },
      { id: "route", label: "Via", value: "Subcutânea ou tópica" },
      { id: "dose", label: "Dose típica", value: "1–5 mg subcutâneo ou tópico, 1–2x ao dia" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é LL-37",
      prose: "LL-37 é a única catelicidina humana, peptídeo de 37 aminoácidos com atividade antimicrobiana de amplo espectro (bactérias, vírus, fungos), imunomodulação e cicatrização. Investigado para infecções resistentes, doenças inflamatórias crônicas e regeneração tecidual.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O LL-37 é o único peptídeo antimicrobiano da família catelicidina expresso em humanos, derivado por clivagem proteolítica do precursor hCAP-18 (human cationic antimicrobial protein 18) pelas proteases elastase de neutrófilos e calicreína. Possui 37 aminoácidos com estrutura em α-hélice anfipática que permite inserção em membranas lipídicas de microrganismos. O mecanismo antimicrobiano envolve a perturbação de membranas bacterianas por formação de poros (modelos toroidal ou carpet), levando à perda de integridade osmótica e lise. Além de bactérias (Gram-positivas e Gram-negativas, incluindo MRSA), inativa vírus envelopados (influenza, HIV, herpes, SARS-CoV-2) e tem atividade fungicida. Paralelamente, exerce funções imunorreguladoras importantes: recruta neutrófilos, monócitos e células dendríticas via receptores FPRL-1/FPR2; estimula angiogênese via VEGF; promove migração de queratinócitos e aceleração de cicatrização de feridas. A expressão endógena do LL-37 é regulada pela vitamina D3 via elemento responsivo (VDRE) no promotor do gene CAMP — explicando a associação entre deficiência de vitamina D e suscetibilidade aumentada a infecções. Em uso terapêutico, a principal preocupação é a ativação de mastócitos: o LL-37 é um degranulador de mastócitos conhecido, podendo causar flare em pele sensível ou intestino. Monitorar resposta individual cuidadosamente.",
      points: [
        "Único peptídeo antimicrobiano catelicidina humano: amplo espectro contra bactérias, vírus envelopados e fungos.",
        "Rompe membranas microbianas por formação de poros; desestabiliza biofilmes bacterianos (MRSA, PA, Borrelia).",
        "Recruta imunidade inata (neutrófilos, monócitos, DCs) via FPRL-1; promove cicatrização e angiogênese via VEGF.",
        "ATENÇÃO: degranulador de mastócitos — pode causar flare cutâneo/intestinal em indivíduos sensíveis; monitorar resposta.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Antimicrobiano de amplo espectro",
        "Imunomodulação inata",
        "Cicatrização de feridas",
        "Anti-biofilme",
        "Anticancerígeno (em investigação)",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "SC/tópico: atividade antimicrobiana e cicatrizante início; possível reação de mastócitos nas primeiras doses em pele sensível" },
        { period: "Semana 3-4", text: "Redução de carga infecciosa (biofilmes); melhora de cicatrização em feridas crônicas; adaptação a possível flush inicial" },
        { period: "Mês 2-3", text: "Benefícios em infecções crônicas por biofilme (Lyme, MRSA); melhora de integridade cutânea e cicatricial" },
        { period: "Mês 3+", text: "Ciclos de 4–8 semanas; reavaliar necessidade; monitorar reações cutâneas e resposta clínica" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "1–5 mg subcutâneo ou tópico, 1–2x ao dia" },
        { label: "Via", value: "Subcutâneo ou Tópico (feridas/pele)" },
        { label: "Frequência", value: "SC: 1× ao dia | Tópico: 1–2× ao dia (na área-alvo)" },
        { label: "Duração do ciclo", value: "2–4 semanas (infecção) ou 4–8 semanas" },
        { label: "Concentração", value: "SC: 1 mL = 100 mcg/mL | Tópico: 10–50 mcg/mL em gel" },
      ],
      indications: [
        { name: "Infecções crônicas por biofilme (SC)", note: "Ciclos de 4–6 semanas; monitorar reação de mastócitos e resposta clínica — VERIFICAR", dose: "100–300 mcg SC 1×/dia" },
        { name: "Cicatrização de feridas crônicas (tópico)", note: "Gel ou curativo impregnado; remover tecido necrótico antes; efeito angiogênico e antibacteriano local", dose: "10–50 mcg/mL aplicado na ferida 1–2×/dia" },
        { name: "Infecção por Lyme / biofilme de Borrelia", note: "Adjuvante a antibioticoterapia; mecanismo de disrução de biofilme — VERIFICAR", dose: "100–200 mcg SC 1×/dia por 4–6 semanas" },
        { name: "Suporte imunológico antiviral", note: "Off-label; expressão endógena estimulada por vitamina D3; combinar com suplementação de Vit D — VERIFICAR", dose: "100 mcg SC 3–5×/semana" },
      ],
      phases: [
        { phase: "Fase de indução (semanas 1–4)", dose: "100 mcg SC 1×/dia; introduzir gradualmente e monitorar reações cutâneas" },
        { phase: "Fase terapêutica (semanas 5–8)", dose: "100–300 mcg SC 1×/dia ou tópico diário conforme indicação" },
        { phase: "Pausa e avaliação", dose: "Avaliar resposta clínica, marcadores de infecção e tolerância antes de novo ciclo" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 1.0 mL de água bacteriostática ou solução salina 0.9% com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma",
        "Girar suavemente até dissolver (não agitar — LL-37 é anfipático e pode espumar)",
        "Rotular e refrigerar a 2–8°C, proteger da luz; válido por 14 dias após reconstituição",
        "Tópico: diluir em base gel ou solução salina a 10–50 mcg/mL para aplicação em feridas",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Hemólise em doses altas",
        "Inflamação local",
        "Citotoxicidade em concentrações elevadas",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Thymosin Alpha-1", status: "Sinérgico", note: "LL-37 atua na imunidade inata (antimicrobiano + recrutamento de fagócitos); Thymosin Alpha-1 potencializa imunidade adaptativa (Th1, NK, DCs). Compõem stack de imunomodulação abrangente." },
        { name: "BPC-157", status: "Sinérgico", note: "LL-37 tem efeito antimicrobiano e angiogênico em feridas; BPC-157 acelera cicatrização via VEGF e reparo tecidual. Sinergia direta em feridas crônicas infectadas." },
        { name: "KPV", status: "Compatível", note: "KPV controla a inflamação anti-NF-κB; LL-37 combate a infecção e estimula imunidade. Protocolos de saúde intestinal (IBD + infecção) e dermatologia combinados." },
        { name: "GHK-Cu", status: "Compatível", note: "GHK-Cu promove síntese de colágeno e remodelação; LL-37 elimina biofilmes e estimula angiogênese. Protocolo de cicatrização de feridas crônicas multimecânico." },
        { name: "Corticosteroides", status: "Monitorar", note: "Corticosteroides suprimem imunidade; LL-37 estimula resposta imune inata. Efeitos opostos — uso simultâneo pode neutralizar LL-37 e piorar controle de infecção." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "LL-37, the only human member of the cathelicidin family of antimicrobial peptides (Gudmundsson & Agerberth)",
          meta: "Humans · bioquímica / imunologia",
          year: "1999",
          summary: "Estudo seminal de Gudmundsson e Agerberth caracterizando o LL-37 como o único peptídeo da família catelicidina expresso em humanos, descrevendo sua estrutura em α-hélice anfipática, mecanismo de ação antimicrobiana e expressão em neutrófilos e epitélio.",
        },
        {
          title: "Vitamin D induces LL-37 expression via VDRE: implications for innate immunity against infections",
          meta: "Humans / In vitro · imunologia / endocrinologia",
          year: "2006",
          summary: "Estudo demonstrando que a vitamina D3 induz a expressão do gene CAMP (codificador do LL-37) via elemento responsivo da vitamina D (VDRE) no promotor, explicando a associação entre deficiência de vitamina D e maior susceptibilidade a infecções respiratórias e tuberculose.",
        },
        {
          title: "LL-37 disrupts bacterial biofilms and enhances antibiotic efficacy in chronic infections",
          meta: "In vitro / Rats · infectologia / microbiologia",
          year: "2011",
          summary: "Estudo avaliando a capacidade do LL-37 de desestabilizar biofilmes de Pseudomonas aeruginosa e Staphylococcus aureus (MRSA), reduzindo a resistência antibiótica e potencializando a eficácia de antibióticos em combinação.",
        },
      ],
    },
  },
  {
    slug: "mazdutide",
    name: "Mazdutide",
    aliases: ["IBI362", "Oxyntide", "GSBR-1290", "GLP-1/Glucagon dual agonist (Innovent)"],
    tagline: "Agonista duplo GLP-1/glucagon de nova geração",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~7 dias (estimativa)" },
      { id: "classification", label: "Classificação", value: "Agonista duplo GLP-1/Glucagon — análogo da oxintomodulina (aprovado China 2025)" },
      { id: "cycle", label: "Ciclo", value: "24–52 semanas" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "3–9 mg subcutâneo, 1x por semana" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Mazdutide",
      prose: "Mazdutide (IBI362) é um agonista dual dos receptores GLP-1 e glucagon em desenvolvimento pela Innovent Biologics. Combina supressão de apetite (GLP-1) com efeito termogênico e lipolítico (glucagon), demonstrando eficácia superior à semaglutida em estudos de fase III na China.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O Mazdutide (IBI362) é um agonista duplo de receptores GLP-1 e glucagon desenvolvido pela Innovent Biologics (China) em parceria com a Eli Lilly. Estruturalmente baseado na oxintomodulina endógena — peptídeo de 37 aminoácidos produzido pelas células L intestinais que naturalmente ativa tanto o receptor GLP-1R quanto o GCGR — o Mazdutide é um análogo otimizado com meia-vida estendida para administração semanal. O componente GLP-1R suprime o apetite via hipotálamo, retarda o esvaziamento gástrico e aumenta a secreção de insulina glicose-dependente. O componente glucagônico (GCGR) é o grande diferencial: ativa receptores em adipócitos marrons/bege, aumentando o gasto energético basal e a termogênese; nos hepatócitos, ativa a β-oxidação de ácidos graxos e reduz a lipogênese de novo, melhorando a esteatose hepática (MASH/NAFLD) de forma mais eficiente que agonistas GLP-1 puros. Estudos de fase 2 e 3 na China demonstraram perda de peso de 10–15% com doses de 4–9 mg/semana e melhora significativa de marcadores de função hepática (ALT, AST, GGT) e imagem ecográfica de fígado gorduroso. O Mazdutide recebeu aprovação regulatória na China em 2025 para tratamento de obesidade; fora da China, é considerado composto experimental sem aprovação vigente.",
      points: [
        "Agonista duplo GLP-1/Glucagon baseado na oxintomodulina endógena; aprovado na China (2025) para obesidade.",
        "Componente GCGR: aumenta gasto energético basal, termogênese e β-oxidação hepática de ácidos graxos.",
        "Melhora esteatose hepática (MASH/NAFLD) mais eficientemente que agonistas GLP-1 puros.",
        "Fora da China: composto experimental sem aprovação — NÃO aprovado FDA ou ANVISA.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Perda de peso superior ao semaglutida",
        "Redução de gordura hepática",
        "Melhora metabólica abrangente",
        "Injeção semanal",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Náusea adaptativa; redução de apetite e saciedade aumentada; flush em alguns pacientes" },
        { period: "Semana 3-4", text: "Adaptação GI; início de perda de peso; melhora de marcadores hepáticos em pacientes com esteatose" },
        { period: "Mês 2-3", text: "Perda de peso consolidada (8–12% do peso inicial); melhora de ALT/AST em portadores de MASH" },
        { period: "Mês 3+", text: "Perda sustentada até ~15% com escalonamento completo; avaliação de esteatose por imagem" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "3–9 mg subcutâneo, 1x por semana" },
        { label: "Via", value: "Subcutâneo (abdômen, coxa ou braço)" },
        { label: "Frequência", value: "1× por semana" },
        { label: "Duração do ciclo", value: "24–52 semanas" },
        { label: "Concentração", value: "1 mL = 4 mg/mL (estimativa baseada em ensaios clínicos)" },
      ],
      indications: [
        { name: "Titulação inicial", note: "4 semanas para tolerância GI antes de escalar", dose: "1–2 mg/semana SC" },
        { name: "Dose terapêutica (obesidade)", note: "Dose principal aprovada na China; monitorar tolerância GI", dose: "4–6 mg/semana SC" },
        { name: "Dose máxima (estudos fase 2/3)", note: "Apenas sob supervisão médica; maior eficácia vs dose de 4 mg — VERIFICAR", dose: "9 mg/semana SC" },
        { name: "MASH / esteatose hepática", note: "Off-label fora da China; monitorar ALT, AST, GGT e imagem hepática a cada 12 semanas", dose: "4–6 mg/semana SC" },
      ],
      phases: [
        { phase: "Semanas 1–4 (titulação)", dose: "1–2 mg/semana" },
        { phase: "Semanas 5–12", dose: "4–6 mg/semana" },
        { phase: "Semanas 13+ (dose máxima)", dose: "9 mg/semana se tolerado" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 1.0 mL de água bacteriostática com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma",
        "Girar suavemente até dissolver (não agitar)",
        "Rotular e refrigerar a 2–8°C, proteger da luz",
        "Válido por 28 dias após reconstituição; NÃO congelar",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Náusea e vômito",
        "Diarreia",
        "Hiperglicemia transitória por glucagon",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Semaglutida", status: "Monitorar", note: "Nunca combinar dois agonistas de incretinas: risco de náusea severa, desidratação e hipoglicemia cumulativos." },
        { name: "Tirzepatida", status: "Monitorar", note: "Ambos ativam GLP-1R; combinação aumenta risco GI sem benefício adicional demonstrado." },
        { name: "AOD-9604", status: "Compatível", note: "Mecanismos distintos (incretina vs β3-AR adipocitário); sem interação farmacológica conhecida." },
        { name: "5-Amino-1MQ", status: "Compatível", note: "Vias metabólicas complementares (NNMT vs GLP-1/GCGR); podem compor protocolo de recomposição sob supervisão." },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 pode proteger mucosa GI dos efeitos adversos gastrointestinais do Mazdutide." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Mazdutide (IBI362) for overweight or obesity: a randomised, double-blind, placebo-controlled, phase 2 trial in China",
          meta: "Humans · RCT fase 2",
          year: "2023",
          summary: "Ensaio clínico fase 2 de Mazdutide em adultos chineses com obesidade/sobrepeso: demonstrou redução de peso dose-dependente e melhora de marcadores metabólicos, estabelecendo doses para o programa fase 3.",
        },
        {
          title: "Oxyntomodulin analogues as dual GLP-1/glucagon receptor agonists: from native peptide to therapeutic compounds",
          meta: "Review · revisão farmacológica",
          year: "2022",
          summary: "Revisão do desenvolvimento de análogos da oxintomodulina como agonistas duais GLP-1/glucagon, descrevendo a progressão do peptídeo nativo até compostos de meia-vida estendida para administração semanal como o Mazdutide.",
        },
        {
          title: "GLP-1/Glucagon co-agonism and hepatic steatosis: GCGR activation as key driver of MASH improvement",
          meta: "Humans / Review · hepatologia",
          year: "2024",
          summary: "Revisão do papel da ativação do receptor de glucagon (GCGR) na redução da lipogênese hepática de novo e melhora histológica da MASH, explicando o diferencial dos agonistas duais GLP-1/Glucagon sobre os GLP-1 puros.",
        },
      ],
    },
  },
  {
    slug: "melanotan-ii",
    name: "Melanotan II",
    aliases: ["MT-II", "MT2", "Melanotan II", "[Nle4,D-Phe7]-α-MSH"],
    tagline: "Agonista de melanocortina para bronzeado, libido e apetite",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~2–3 horas" },
      { id: "classification", label: "Classificação", value: "Análogo sintético não-seletivo de α-MSH (agonista MC1R–MC5R)" },
      { id: "cycle", label: "Ciclo", value: "Fase de carga (2–4 semanas) + manutenção" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "0.25–1 mg subcutâneo, conforme resposta" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Melanotan II",
      prose: "Melanotan II é um análogo cíclico da alfa-MSH que ativa receptores MC1R, MC3R e MC4R. Estimula melanogênese para bronzeamento sem exposição UV, reduz apetite via MC3R/MC4R e aumenta libido e ereção espontânea. Amplamente utilizado off-label com perfil de efeitos múltiplos.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O Melanotan-2 (MT-II) é um análogo cíclico sintético do hormônio estimulador de melanócitos alfa (α-MSH), desenvolvido originalmente na Universidade do Arizona com foco em bronzeamento sem UV. Atua como agonista não-seletivo dos receptores de melanocortina MC1R, MC3R, MC4R e MC5R. A ativação do MC1R nos melanócitos dérmicos estimula a melanogênese, aumentando a produção de eumelanina (pigmento marrom-escuro) e resultando em bronzeamento cutâneo progressivo, inclusive sem exposição solar. A ativação do MC4R no hipotálamo (núcleo paraventricular) e no tecido erétil medeia o aumento de libido, comportamento sexual e pode induzir ereção espontânea (priapismo em doses altas ou sensíveis). O MC3R está envolvido em regulação energética e supressão de apetite. O Melanotan-2 NÃO possui aprovação do FDA, ANVISA ou nenhuma agência regulatória de referência para uso humano. Riscos documentados incluem: náusea intensa (especialmente nas primeiras doses — mitigada por anti-histamínico), hiperpigmentação difusa e de nevos pré-existentes (com discussão sobre potencial oncológico), escurecimento de manchas cutâneas, priapismo, e taquifilaxia com uso prolongado.",
      points: [
        "Agonista não-seletivo MC1R–MC5R: bronzeamento (MC1R), libido/ereção (MC4R), saciedade (MC3R).",
        "Estimula melanogênese independente de UV via MC1R — bronzeamento sem exposição solar.",
        "NÃO aprovado pelo FDA, ANVISA ou qualquer agência regulatória principal: composto de pesquisa.",
        "Riscos: náusea intensa, hiperpigmentação de nevos, priapismo, escurecimento de manchas pré-existentes.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Bronzeamento acelerado",
        "Redução de apetite",
        "Aumento de libido e função erétil",
        "Fotoproteção indireta",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Náusea nas primeiras doses (loading); bronzeamento inicial perceptível; flush facial" },
        { period: "Semana 3-4", text: "Pigmentação mais uniforme e intensa; supressão de apetite; libido aumentada" },
        { period: "Mês 2-3", text: "Bronzeamento consolidado; diminuir para dose de manutenção 2×/semana" },
        { period: "Mês 3+", text: "Manutenção do bronzeamento com doses espaçadas; avaliar nevos com dermatologista" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "0.25–1 mg subcutâneo, conforme resposta" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "Loading: diário; Manutenção: 2× por semana" },
        { label: "Duração do ciclo", value: "Fase de carga (2–4 semanas) + manutenção" },
        { label: "Concentração", value: "2 mL = 5 mg/mL (vial de 10 mg)" },
      ],
      indications: [
        { name: "Loading / bronzeamento inicial", note: "Iniciar com 0.1–0.25 mg para tolerância GI; usar anti-histamínico 30 min antes nas primeiras doses", dose: "0.25 mg SC 1×/dia" },
        { name: "Loading avançado (tolerante)", note: "Após tolerância estabelecida; até pigmentação desejada", dose: "0.5 mg SC 1×/dia" },
        { name: "Manutenção do bronzeamento", note: "Após loading; exposição solar potencializa o efeito", dose: "0.5–1 mg SC 2×/semana" },
        { name: "Libido / efeito sexual", note: "Usar dose mínima; risco de ereção prolongada (priapismo) em doses maiores", dose: "0.25–0.5 mg SC 1–2 h antes" },
      ],
      phases: [
        { phase: "Loading (2–4 semanas)", dose: "0.25–0.5 mg/dia SC até pigmentação desejada" },
        { phase: "Manutenção", dose: "0.5–1 mg SC 2×/semana" },
        { phase: "Pausa / avaliação", dose: "Consultar dermatologista para avaliação de nevos após 3 meses" },
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
        "NÃO usar se solução apresentar turvação, precipitado ou coloração anormal",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Náusea intensa na dose de carga",
        "Ereções espontâneas indesejadas",
        "Escurecimento de nevos",
        "Elevação de pressão arterial",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "PT-141", status: "Monitorar", note: "Ambos ativam receptores de melanocortina (MC4R): não combinar; risco de hiperpigmentação excessiva, náusea severa e priapismo." },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 modula dopamina; MT-II atua via MC4R. Mecanismos distintos; BPC-157 pode mitigar efeitos GI adversos do MT-II." },
        { name: "AOD-9604", status: "Compatível", note: "Sem interação direta conhecida; podem compor stack estético se objetivos diferentes (bronzeamento + gordura)." },
        { name: "Semaglutida", status: "Monitorar", note: "Ambos suprimem apetite (MC3R e GLP-1 respectivamente); monitorar ingestão calórica e hidratação." },
      ],
      bundles: [
        { name: "Bronze Shield", category: "Estética", items: ["Melanotan II"], goal: "Estética e Bronzeado" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Melanotan-II, a melanocortin agonist, increases penile erection and sexual motivation in male rats",
          meta: "Rats · pré-clínico / comportamento",
          year: "1998",
          summary: "Estudo pré-clínico demonstrando que a ativação dos receptores MC4R pelo MT-II produz ereção e aumento de comportamento sexual em ratos machos, identificando o mecanismo central para os efeitos sexuais do composto.",
        },
        {
          title: "Melanocortin receptor agonists: development of MT-II and therapeutic potential in sexual dysfunction",
          meta: "Review · revisão",
          year: "2006",
          summary: "Revisão do desenvolvimento do Melanotan-2 na Universidade do Arizona, descrevendo sua farmacologia nos receptores MC1R–MC5R, efeitos de bronzeamento, libido e supressão de apetite, e os desafios regulatórios para aprovação clínica.",
        },
        {
          title: "Safety concerns with Melanotan-II: hyperpigmentation of nevi and regulatory status",
          meta: "Humans / Case reports · dermatologia / segurança",
          year: "2015",
          summary: "Revisão de casos relatados de hiperpigmentação anormal de nevos e manchas cutâneas em usuários de MT-II, com discussão sobre o potencial oncológico teórico e a necessidade de vigilância dermatológica regular.",
        },
      ],
    },
  },
  {
    slug: "mgf",
    name: "MGF",
    aliases: ["IGF-1Ec", "Mechano Growth Factor", "IGF-1 Ec isoform", "PEG-MGF", "Pegylated MGF"],
    tagline: "Fator de crescimento mecânico para regeneração muscular",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~5 min (MGF nativo); ~48–72 horas (PEG-MGF)" },
      { id: "classification", label: "Classificação", value: "Variante de splicing alternativo do IGF-1 (IGF-1Ec) — ativador de células satélite muscular" },
      { id: "cycle", label: "Ciclo", value: "4–8 semanas" },
      { id: "route", label: "Via", value: "Subcutânea ou intramuscular" },
      { id: "dose", label: "Dose típica", value: "100–200 mcg, 2x por semana (local ou subcutâneo)" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é MGF",
      prose: "MGF (Mechano Growth Factor) é uma variante de splice do IGF-1 produzida em resposta a dano mecânico muscular. Ativa células satélites quiescentes promovendo hipertrofia e regeneração acelerada após lesão ou exercício intenso, com mecanismo independente do receptor IGF-1R.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O MGF (Mechano Growth Factor) é uma isoforma do IGF-1 gerada por splicing alternativo do gene IGF-1 em resposta a dano mecânico muscular (exercício de alta intensidade, microtrauma de fibras). Enquanto o IGF-1 sistêmico é produzido predominantemente pelo fígado sob estímulo do GH, o MGF é produzido localmente no músculo em resposta ao estresse mecânico — correspondendo à isoforma IGF-1Ec. O peptídeo E único do MGF (fragmento C-terminal específico da isoforma Ec) tem ação independente do receptor IGF-1R clássico: ativa células satélites musculares (células-tronco quiescentes do tecido muscular) via receptor próprio ainda em caracterização, promovendo sua proliferação e posterior fusão a miofibrilas existentes. Esse processo de ativação de células satélite é o primeiro passo crítico na resposta hipertrófica adaptativa ao exercício. A grande limitação prática do MGF nativo é sua meia-vida in vivo extremamente curta (~5 minutos), tornando a administração SC/IM ineficaz. A variante PEGilada (PEG-MGF), com polietilenoglicol adicionado, estende a meia-vida para ~48–72 horas, permitindo dosagem 1–2× por semana. Evidências clínicas humanas controladas são muito limitadas — a maioria dos dados vem de estudos in vitro e modelos animais, com extrapolação para uso humano ainda não validada.",
      points: [
        "Isoforma IGF-1Ec do gene IGF-1: produzida localmente no músculo em resposta a estresse mecânico.",
        "Ativa células satélites musculares via mecanismo independente do receptor IGF-1R clássico.",
        "MGF nativo: meia-vida ~5 min (ineficaz via SC/IM); PEG-MGF: meia-vida ~48–72 h para uso prático.",
        "DADOS CLÍNICOS HUMANOS LIMITADOS: maioria da evidência em modelos in vitro e animais — VERIFICAR.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Ativação de células satélites musculares",
        "Regeneração muscular acelerada",
        "Hipertrofia muscular",
        "Recuperação pós-lesão",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "PEG-MGF: ativação de células satélite nos músculos-alvo pós-treino (dados animais); sensação de pump e recuperação aumentados reportados anedoticamente — VERIFICAR" },
        { period: "Semana 3-4", text: "Potencial aumento de hipertrofia local se células satélite ativadas fundirem com miofibrilas (dados animais — VERIFICAR)" },
        { period: "Mês 2-3", text: "Dados humanos de longo prazo ausentes; ciclos de 4–8 semanas baseados em extrapolação de modelos animais — VERIFICAR" },
        { period: "Mês 3+", text: "Pausa de 4 semanas; aguardar publicações de estudos clínicos humanos para protocolos definitivos" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "100–200 mcg, 2x por semana (local ou subcutâneo)" },
        { label: "Via", value: "Intramuscular (site-specific) ou Subcutâneo" },
        { label: "Frequência", value: "PEG-MGF: 1–2× por semana | MGF nativo: pós-treino imediato (uso prático muito limitado)" },
        { label: "Duração do ciclo", value: "4–8 semanas" },
        { label: "Concentração", value: "2 mL = 0.1 mg/mL (100 mcg/mL) — PEG-MGF" },
      ],
      indications: [
        { name: "Hipertrofia muscular local — PEG-MGF", note: "Injetar no grupo muscular trabalhado; dados clínicos humanos limitados — VERIFICAR", dose: "200–500 mcg IM site-specific 1–2×/semana" },
        { name: "MGF nativo pós-treino", note: "Meia-vida de ~5 min torna eficácia prática duvidosa; PEG-MGF superior para uso SC/IM — VERIFICAR", dose: "100–200 mcg IM imediatamente pós-treino" },
        { name: "Recuperação de lesão muscular", note: "Off-label; mecanismo de ativação de células satélite pode acelerar reparo — VERIFICAR", dose: "200 mcg IM 2×/semana no tecido lesado" },
        { name: "Sequência MGF → IGF-1 DES", note: "Protocolo sequencial teórico: MGF ativa células satélite; IGF-1 DES amplifica crescimento — dados humanos ausentes — VERIFICAR", dose: "MGF 200 mcg IM pós-treino, depois IGF-1 DES 20–40 mcg IM" },
      ],
      phases: [
        { phase: "Semanas 1–8 (ciclo experimental)", dose: "PEG-MGF 200–500 mcg IM 1–2×/semana" },
        { phase: "Pausa (4 semanas)", dose: "Avaliar ganhos e aguardar dados clínicos mais robustos" },
        { phase: "Ciclo seguinte", dose: "Manter dose ou reduzir; considerar IGF-1 DES como alternativa com mais dados" },
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
        "MGF nativo: meia-vida de ~5 min in vivo — usar imediatamente; PEG-MGF: estável por 14–21 dias",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Hipoglicemia transitória",
        "Retenção hídrica leve",
        "Hipersensibilidade local",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "IGF-1 DES", status: "Sinérgico", note: "MGF ativa células satélite (ativação primária); IGF-1 DES amplifica crescimento via IGF-1R nas fibras maduras. Sequência fisiológica proposta: MGF primeiro, IGF-1 DES depois — VERIFICAR." },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 repara tecido conjuntivo, vasos e tendões; MGF ativa células satélite musculares. Compõem protocolo de recuperação musculoesquelética completa." },
        { name: "TB-500", status: "Compatível", note: "TB-500 mobiliza células-tronco sistemicamente; MGF ativa células satélite localmente. Vias distintas de regeneração com possível sinergia em lesões musculares." },
        { name: "Ipamorelin", status: "Compatível", note: "Ipamorelin eleva GH endógeno (que estimula produção de IGF-1Ea sistêmico); MGF é isoforma local. Mecanismos distintos e complementares para hipertrofia." },
        { name: "IGF-1 LR3", status: "Monitorar", note: "Ambos ativam vias anabólicas musculares: IGF-1 LR3 sistêmico + MGF local pode hiperstimular sinalização. Ciclos curtos e monitoramento de hipoglicemia obrigatórios." },
      ],
      bundles: [
        { name: "Anabolic Edge", category: "Performance", items: ["IGF-1 LR3", "PEG-MGF"], goal: "Massa Muscular" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Mechano Growth Factor (MGF): a muscle-specific splice variant of IGF-1 activated by mechanical strain (Goldspink et al.)",
          meta: "Humans / Rats · biologia molecular / fisiologia muscular",
          year: "2001",
          summary: "Estudo seminal de Goldspink e Yang identificando o MGF como variante de splicing alternativo do gene IGF-1 produzida localmente no músculo em resposta a estresse mecânico, com sequência única do peptídeo E que o distingue do IGF-1 sistêmico.",
        },
        {
          title: "The E peptide of MGF activates muscle satellite cells independently of the IGF-1 receptor (Yang et al.)",
          meta: "In vitro / Mice · biologia celular / miologia",
          year: "2004",
          summary: "Estudo de Yang et al. demonstrando que o peptídeo E C-terminal único do MGF ativa células satélites musculares via receptor próprio diferente do IGF-1R, explicando o mecanismo pelo qual o MGF inicia a resposta hipertrófica precoce ao exercício.",
        },
        {
          title: "PEGylated MGF: extended half-life for muscle hypertrophy and repair — preclinical evidence and translational challenges",
          meta: "Rats / Review · farmacologia / biologia muscular",
          year: "2012",
          summary: "Estudo avaliando a variante PEGilada do MGF em modelos murinos, demonstrando meia-vida estendida (~48–72 h) e eficácia em ativar células satélite após lesão muscular, com discussão dos desafios para tradução clínica em humanos.",
        },
      ],
    },
  },
  {
    slug: "mots-c",
    name: "MOTS-C",
    aliases: ["MOTS-c peptide", "Mitochondrial ORF of 12S rRNA type-c", "Mitokine MOTS-c"],
    tagline: "Peptídeo mitocondrial regulador de metabolismo e longevidade",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~4–6 horas (estimativa; dados humanos limitados)" },
      { id: "classification", label: "Classificação", value: "Peptídeo mitocondrial codificado por mtDNA (mitokine regulatória metabólica)" },
      { id: "cycle", label: "Ciclo", value: "8–12 semanas" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "5–10 mg subcutâneo, 3x por semana" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é MOTS-C",
      prose: "MOTS-C é um peptídeo único codificado no genoma mitocondrial (12S rRNA) que age como hormônio sistêmico. Regula homeostase metabólica, ativa AMPK e demonstrou extensão de vida em modelos animais e melhora de sensibilidade à insulina em estudos humanos iniciais.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O MOTS-c é um peptídeo de 16 aminoácidos codificado por uma pequena ORF (open reading frame) no gene 12S rRNA do DNA mitocondrial (mtDNA) humano, descoberto por Changhan David Lee em 2015 na Universidade do Sul da Califórnia. É o primeiro peptídeo mitocondrial (mitokine) com funções regulatórias metabólicas sistêmicas documentadas em estudos pré-clínicos. O mecanismo central envolve a ativação da via AMPK (proteína quinase ativada por AMP) no músculo esquelético e tecido hepático, melhorando a sensibilidade à insulina, aumentando a oxidação de ácidos graxos mitocondriais e melhorando a homeostase glicêmica. Estudos em camundongos (Lee et al., Cell Metabolism, 2015) demonstraram que o MOTS-c mimetiza os efeitos metabólicos do exercício físico regular — reduzindo obesidade induzida por dieta e resistência à insulina mesmo em animais sedentários. Também foi associado à longevidade em estudos populacionais japoneses: polimorfismos no gene mtDNA codificador do MOTS-c correlacionaram-se com maior probabilidade de atingir 100 anos. O MOTS-c circulante aumenta com exercício de alta intensidade e diminui progressivamente com o envelhecimento e obesidade. IMPORTANTE: dados clínicos controlados em humanos ainda são extremamente escassos — este é um peptídeo de pesquisa de fronteira, sem protocolos clínicos estabelecidos.",
      points: [
        "Peptídeo mitocondrial (mitokine) codificado pelo mtDNA — único mecanismo de origem mitocondrial.",
        "Ativa AMPK no músculo e fígado: mimetiza efeitos metabólicos do exercício sem esforço físico.",
        "Melhora sensibilidade à insulina e oxidação mitocondrial de ácidos graxos em modelos animais.",
        "IMPORTANTE: dados clínicos humanos controlados ainda escassos — composto de pesquisa de fronteira.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Melhora de sensibilidade à insulina",
        "Extensão de vida (modelos animais)",
        "Melhora de composição corporal",
        "Proteção metabólica",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Dados clínicos humanos limitados; possível melhora de energia e sensibilidade insulínica reportada anedoticamente" },
        { period: "Semana 3-4", text: "Efeitos metabólicos potencialmente mensuráveis (glicemia de jejum, sensibilidade insulínica) — VERIFICAR" },
        { period: "Mês 2-3", text: "Baseado em modelos animais: redução de marcadores de resistência insulínica e inflamação metabólica" },
        { period: "Mês 3+", text: "Sem dados humanos de longo prazo; ciclos conservadores (8–12 semanas) recomendados até mais evidências" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "5–10 mg subcutâneo, 3x por semana" },
        { label: "Via", value: "Subcutâneo (experimental)" },
        { label: "Frequência", value: "3× por semana (experimental)" },
        { label: "Duração do ciclo", value: "8–12 semanas" },
        { label: "Concentração", value: "2 mL = 5 mg/mL (vial de 10 mg)" },
      ],
      indications: [
        { name: "Sensibilidade insulínica / metabolismo (experimental)", note: "Dose experimental baseada em estudos pré-clínicos; sem protocolo humano estabelecido — VERIFICAR", dose: "5 mg SC 3×/semana" },
        { name: "Longevidade / anti-aging metabólico", note: "Ciclos de 8–12 semanas; combinar com protocolo de exercício para potencializar AMPK", dose: "5–10 mg SC 3×/semana" },
        { name: "Associação com exercício de alta intensidade", note: "MOTS-c circulante aumenta naturalmente com HIIT; exógeno pode amplificar o sinal — VERIFICAR", dose: "5 mg SC no dia do treino" },
        { name: "Dose máxima experimental", note: "Limite superior anedótico; sem safety data robusta em humanos — VERIFICAR", dose: "10 mg SC 3×/semana" },
      ],
      phases: [
        { phase: "Ciclo experimental (8–12 semanas)", dose: "5–10 mg SC 3×/semana" },
        { phase: "Pausa (4–8 semanas)", dose: "Avaliar marcadores metabólicos (glicemia, insulina, HOMA-IR)" },
        { phase: "Ciclo seguinte (se resposta positiva)", dose: "Retomar mesma dose — aguardar evidências clínicas" },
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
        "Atenção: composto de pesquisa — protocolos clínicos padronizados ainda não estabelecidos",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Dados humanos ainda limitados",
        "Geralmente bem tolerado em estudos iniciais",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "5-Amino-1MQ", status: "Sinérgico", note: "MOTS-c ativa AMPK (mimetismo de exercício); 5-Amino-1MQ inibe NNMT elevando NAD+. Vias convergentes de melhora metabólica mitocondrial." },
        { name: "Ipamorelin", status: "Compatível", note: "Ipamorelin eleva GH; MOTS-c atua via AMPK mitocondrial. Mecanismos distintos com potencial complementaridade em recomposição corporal." },
        { name: "Epithalon", status: "Compatível", note: "Epithalon atua em telômeros e circadiano; MOTS-c em homeostase mitocondrial. Compõem stack de longevidade celular multimecanístico." },
        { name: "Metformina", status: "Monitorar", note: "Ambos ativam AMPK por vias distintas; combinação pode resultar em ativação AMPK excessiva com hipoglicemia — monitorar glicemia." },
        { name: "Semaglutida", status: "Monitorar", note: "Ambos melhoram sensibilidade insulínica; combinação pode potencializar excessivamente o controle glicêmico — monitorar glicemia e ajustar doses." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "The mitochondrial-derived peptide MOTS-c promotes metabolic homeostasis and reduces obesity and insulin resistance",
          meta: "Mice · pré-clínico",
          year: "2015",
          summary: "Estudo seminal de Lee et al. (Cell Metabolism) identificando o MOTS-c como peptídeo codificado pelo mtDNA com atividade regulatória metabólica sistêmica: ativação de AMPK, melhora de sensibilidade insulínica e redução de obesidade em camundongos.",
        },
        {
          title: "MOTS-c: a mitochondrial-derived peptide that regulates metabolism and longevity in humans",
          meta: "Humans · estudo populacional / clínico",
          year: "2019",
          summary: "Estudo associando polimorfismos no gene codificador do MOTS-c no mtDNA com longevidade excepcional em centenários japoneses, e demonstrando que o MOTS-c sérico diminui com envelhecimento e obesidade em humanos.",
        },
        {
          title: "Exercise-induced increase in circulating MOTS-c: mitochondrial peptide as exercise mimetic",
          meta: "Humans · fisiologia do exercício",
          year: "2021",
          summary: "Demonstrou que o exercício de alta intensidade (HIIT) aumenta significativamente os níveis circulantes de MOTS-c em humanos, sugerindo seu papel como mitokine mediadora de adaptações metabólicas ao exercício.",
        },
      ],
    },
  },
  {
    slug: "nad-injetavel",
    name: "NAD+ Injetável",
    aliases: ["NAD", "Nicotinamide Adenine Dinucleotide", "β-NAD", "NAD+ IV", "NAD+ injectable"],
    tagline: "Coenzima mestre para metabolismo energético e longevidade celular",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~5–10 min (IV); absorção gradual via SC" },
      { id: "classification", label: "Classificação", value: "Coenzima dinucleotídea (não-peptídeo) — cofator universal de redox e substrato de sirtuínas" },
      { id: "cycle", label: "Ciclo", value: "4–8 semanas" },
      { id: "route", label: "Via", value: "Intravenosa (infusão de 2–4 horas)" },
      { id: "dose", label: "Dose típica", value: "500 mg – 1 g IV (infusão lenta), 1–3x por semana" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Médio", pill: "amber" },
    ],
    about: {
      heading: "O que é NAD+ Injetável",
      prose: "NAD+ (nicotinamida adenina dinucleotídeo) na forma injetável bypassa as limitações de biodisponibilidade oral, fornecendo NAD+ diretamente às células. Coenzima essencial para 500+ reações metabólicas, ativação de sirtuínas e reparo de DNA, com declínio de ~50% nos níveis teciduais entre 20 e 60 anos.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O NAD+ (Nicotinamida Adenina Dinucleotídeo) é uma coenzima dinucleotídea presente em todas as células vivas — tecnicamente NÃO é um peptídeo, mas um cofator metabólico de baixo peso molecular. Atua como transportador central de elétrons na cadeia respiratória mitocondrial (complexos I e III) e como substrato para três classes de enzimas regulatórias críticas: sirtuínas (SIRT1–7), que regulam metabolismo, inflamação, reparo de DNA e longevidade; PARP-1/2, responsáveis pelo reparo de quebras de fita de DNA; e CD38, ectoenzima que degrada NAD+ e aumenta com o envelhecimento. Os níveis celulares de NAD+ declinam progressivamente com a idade (~50% entre os 40 e 60 anos), correlacionando-se com disfunção mitocondrial, queda de energia celular, inflamação crônica de baixo grau e declínio cognitivo. A reposição exógena visa restaurar esses níveis, ativando sirtuínas e melhorando biogênese mitocondrial e reparo de DNA. A via IV é a mais eficaz para restauração rápida; infusão rápida provoca sintomas típicos (aperto torácico, flush, câimbras) por efluxo de Ca²⁺ mitocondrial — a infusão lenta (1–4 h) é obrigatória. Protocolos de Brain Restoration usam infusões diárias de alta dose (750–1000 mg) para dependência química.",
      points: [
        "ATENÇÃO: NAD+ NÃO é peptídeo — é coenzima dinucleotídea. Incluído aqui pela frequência em protocolos de peptide therapy.",
        "Substrato de sirtuínas (SIRT1–7): regulam metabolismo, longevidade, reparo de DNA e inflamação.",
        "Níveis celulares caem ~50% entre 40–60 anos; reposição restaura biogênese mitocondrial.",
        "IV: infusão LENTA obrigatória (1–4 h) para evitar aperto torácico, náusea e câimbras por efluxo de Ca²⁺.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Restauração de NAD+ tecidual",
        "Ativação de sirtuínas",
        "Reparo de DNA",
        "Melhora mitocondrial",
        "Anti-aging celular",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "IV: energia e clareza mental perceptíveis nas primeiras sessões; SC: melhora gradual" },
        { period: "Semana 3-4", text: "Melhora sustentada de foco, energia e qualidade do sono; redução de fadiga crônica" },
        { period: "Mês 2-3", text: "Benefícios mitocondriais acumulados; possível melhora em marcadores inflamatórios e cognitivos" },
        { period: "Mês 3+", text: "Protocolos de manutenção mensal (IV) ou diário (SC) conforme objetivo; avaliar marcadores de NAD+" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "500 mg – 1 g IV (infusão lenta), 1–3x por semana" },
        { label: "Via", value: "Intravenoso (IV) ou Subcutâneo" },
        { label: "Frequência", value: "IV: 1–5× por semana (intensivo) ou 1×/mês (manutenção) | SC: diário" },
        { label: "Duração do ciclo", value: "4–8 semanas" },
        { label: "Concentração", value: "IV: 250–1000 mg em 250–500 mL SF | SC: 50–100 mg/mL" },
      ],
      indications: [
        { name: "Longevidade / anti-aging (SC)", note: "Em jejum; ciclos de 4–8 semanas; opção mais prática para uso domiciliar", dose: "50–100 mg SC 1×/dia" },
        { name: "Fadiga crônica / disfunção mitocondrial (IV)", note: "3–5 sessões semanais por 2–4 semanas; depois manutenção mensal", dose: "250–500 mg IV em 2–3 h" },
        { name: "Brain Restoration (dependência química)", note: "10–14 dias consecutivos sob supervisão clínica especializada", dose: "750–1000 mg IV em 4 h/dia" },
        { name: "Declínio cognitivo / envelhecimento cerebral (IV)", note: "4–8 semanas; combinar com NMN ou precursores orais para manutenção", dose: "500 mg IV em 2 h, 1–2×/semana" },
      ],
      phases: [
        { phase: "Indução intensiva (semanas 1–4)", dose: "250–500 mg IV, 2–3×/semana" },
        { phase: "Manutenção (mensal)", dose: "500 mg IV 1×/mês ou 50–100 mg SC/dia" },
        { phase: "Pausa / avaliação", dose: "Avaliar energia, cognição e biomarcadores a cada 3 meses" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Para uso IV: diluir 250–1000 mg de NAD+ liofilizado em 250–500 mL de solução salina 0.9% ou SG 5%",
        "Agitar suavemente até dissolução completa; verificar ausência de partículas",
        "Para uso SC: reconstituir em 1–2 mL de água bacteriostática; injetar lentamente pela parede do frasco",
        "IV: administrar em infusão lenta de 1–4 horas — infusão rápida causa aperto torácico, náusea e câimbras",
        "Refrigerar a 2–8°C após reconstituição; usar em até 24 h; proteger da luz",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Flush e sensação de calor na infusão",
        "Náusea",
        "Cefaleia",
        "Hipotensão com infusão rápida",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "5-Amino-1MQ", status: "Sinérgico", note: "5-Amino-1MQ inibe NNMT, reduzindo o consumo de NAD+; NAD+ exógeno aumenta o pool disponível. Sinergia direta no eixo NAD+/sirtuínas." },
        { name: "Epithalon", status: "Sinérgico", note: "Epithalon ativa telomerase; NAD+ ativa sirtuínas e PARP-1 (reparo de DNA). Vias convergentes de proteção genômica e longevidade celular." },
        { name: "MOTS-c", status: "Sinérgico", note: "MOTS-c ativa AMPK mitocondrial; NAD+ restaura a cadeia respiratória. Sinergia no eixo de bioenergética mitocondrial." },
        { name: "Ipamorelin", status: "Compatível", note: "Ipamorelin eleva GH; NAD+ melhora biogênese mitocondrial. Mecanismos distintos; compõem protocolo de anti-aging abrangente." },
        { name: "Metformina", status: "Monitorar", note: "Metformina inibe o complexo I mitocondrial, consumindo NAD+; combinação pode causar depleção paradoxal de NAD+ — espaçar administrações." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "NAD+ metabolism and its roles in cellular processes during ageing (Sinclair & Guarente)",
          meta: "Review · revisão / longevidade",
          year: "2014",
          summary: "Revisão seminal de Sinclair, Guarente e colaboradores demonstrando que o declínio de NAD+ com o envelhecimento leva à disfunção de sirtuínas, mitocôndrias e reparo de DNA, e que a reposição de NAD+ reverte múltiplos marcadores de envelhecimento em modelos animais.",
        },
        {
          title: "Nicotinamide adenine dinucleotide (NAD+) levels decline with age in multiple tissues and are restored by supplementation",
          meta: "Humans / Mice · longevidade / clínico",
          year: "2018",
          summary: "Estudo documentando o declínio progressivo de NAD+ em múltiplos tecidos humanos e animais com o envelhecimento, e demonstrando que a suplementação de precursores (NR, NMN) ou NAD+ exógeno restaura os níveis e melhora marcadores metabólicos.",
        },
        {
          title: "NAD+ intravenous infusion for addiction and brain restoration: clinical protocols and outcomes",
          meta: "Humans · protocolo clínico",
          year: "2020",
          summary: "Revisão de protocolos clínicos de infusão IV de NAD+ em altas doses (750–1000 mg/dia) para tratamento de dependência de opioides, álcool e estimulantes, com relato de redução de sintomas de abstinência e melhora de função cognitiva.",
        },
      ],
    },
  },
  {
    slug: "noopept",
    name: "Noopept",
    aliases: ["GVS-111", "Omberacetam", "N-fenilacetil-L-prolilglicina etil éster", "Ноопепт"],
    tagline: "Nootrópico dipeptídeo 1000x mais potente que o Piracetam",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~15-30 minutos plasmática; efeito central mais prolongado (horas) via metabólitos ativos e ação em NGF/BDNF" },
      { id: "classification", label: "Classificação", value: "Dipeptídeo nootrópico sintético (análogo do piracetam, ~1000× mais potente em base molar)" },
      { id: "cycle", label: "Ciclo", value: "4–8 semanas com pausa de 2–4 semanas" },
      { id: "route", label: "Via", value: "Oral ou sublingual" },
      { id: "dose", label: "Dose típica", value: "10–30 mg oral, 2–3x ao dia" },
      { id: "cost", label: "Custo", value: "$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Noopept",
      prose: "Noopept (N-fenilacetil-L-prolilglicina etil éster) é um nootrópico sintético dipeptídico desenvolvido na Rússia, considerado 1000 vezes mais potente que o Piracetam em concentrações equivalentes. Atravessa facilmente a barreira hematoencefálica e aumenta expressão de BDNF e NGF no hipocampo e córtex.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Noopept (GVS-111, Omberacetam) é um dipeptídeo sintético desenvolvido pelo Instituto de Farmacologia da Academia Russa de Ciências Médicas por Ostrovskaya, Gudasheva e colaboradores na década de 1990. Estruturalmente é o éster etílico da N-fenilacetil-L-prolilglicina, dipeptídeo de baixo peso molecular (MW 318,37 Da) com alta biodisponibilidade oral e boa penetração da barreira hematoencefálica graças à lipofilicidade. Considerado análogo funcional do piracetam com potência molar estimada 1.000 vezes superior em modelos animais de déficit cognitivo. Seu mecanismo envolve múltiplas vias: (1) modulação positiva de receptores AMPA e NMDA, melhorando transmissão glutamatérgica e LTP (potenciação de longa duração) hipocampal; (2) upregulation de NGF (nerve growth factor) e BDNF no hipocampo e córtex após uso repetido — efeito neuroplástico sustentado; (3) ação ansiolítica leve via modulação GABAérgica indireta; (4) inibição da peroxidação lipídica e neuroproteção contra dano oxidativo. Aprovado na Rússia e países da CEI como medicamento para déficits cognitivos leves a moderados (protocolo de 56 dias). Não aprovado pela FDA — comercializado como suplemento em alguns países ocidentais. Tecnicamente é um dipeptídeo sintético, não um peptídeo hormonal endógeno.",
      points: [
        "Modula receptores AMPA e NMDA positivamente, potencializando transmissão glutamatérgica e LTP hipocampal",
        "Upregulation de NGF e BDNF no hipocampo e córtex — efeito neuroplástico sustentado com uso repetido",
        "Ansiolítico leve e neuroprotetor antioxidante (inibição de peroxidação lipídica)",
        "Alta biodisponibilidade oral; atravessa BHE eficientemente — efeito agudo em minutos",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Melhora de memória de curto e longo prazo",
        "Melhora de concentração e foco",
        "Neuroproteção",
        "Redução de ansiedade",
        "Aumento de BDNF e NGF",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Minutos–Horas", text: "Melhora aguda de foco, clareza mental e velocidade de processamento (efeito glutamatérgico agudo)" },
        { period: "Dias 1-7", text: "Redução de névoa mental (brain fog); melhora de memória de trabalho e atenção sustentada" },
        { period: "Semana 2-4", text: "Aumento progressivo de NGF/BDNF; melhora de consolidação de memória de longo prazo -- VERIFICAR" },
        { period: "Mês 1+", text: "Efeitos neuroprotetores cumulativos; benefício cognitivo e ansiolítico leve sustentados" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "10–30 mg oral, 2–3x ao dia" },
        { label: "Via", value: "Oral" },
        { label: "Frequência", value: "2-3x/dia (dividir dose total diária para manter níveis mais estáveis)" },
        { label: "Duração do ciclo", value: "4–8 semanas com pausa de 2–4 semanas" },
        { label: "Concentração", value: "Cápsulas 10 mg (padrão) ou pó a granel; sem reconstituição necessária" },
      ],
      indications: [
        { name: "Nootrópico geral / melhora cognitiva", note: "Tomar manhã e início da tarde; evitar doses noturnas (pode interferir no sono)", dose: "10-20 mg 2x/dia oral" },
        { name: "Déficit cognitivo leve a moderado (indicação russa aprovada)", note: "Protocolo oficial russo; após 56 dias, intervalo de 30 dias antes de repetir", dose: "10 mg 2-3x/dia oral × 56 dias" },
        { name: "Neuroproteção / recuperação cognitiva", note: "Dose moderada para efeito neuroplástico mais robusto; dividir em 2-3 tomadas", dose: "20-30 mg/dia oral divididos" },
        { name: "Ansiedade com déficit cognitivo associado", note: "Dose baixa explorando efeito ansiolítico leve; monitorar humor", dose: "10 mg 1-2x/dia oral" },
      ],
      phases: [
        { phase: "Indução (dias 1-14)", dose: "10 mg 2x/dia oral — avaliar resposta cognitiva e tolerância" },
        { phase: "Manutenção (semanas 3-8)", dose: "10-20 mg 2-3x/dia oral conforme resposta individual" },
        { phase: "Ciclo", dose: "4-8 semanas de uso, 2-4 semanas de intervalo (prevenir tolerância)" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Noopept é tipicamente usado na forma oral (cápsulas ou pó) — não requer reconstituição hídrica",
        "Para uso sublingual: dissolver 10-20 mg de pó em 1-2 mL de água destilada ou etanol 10%",
        "Administrar sublingual e manter por 60-90 segundos antes de engolir",
        "Armazenar em local seco e fresco (15-25°C), protegido de luz e umidade",
        "Dose oral pode ser tomada com ou sem alimentos (sem influência significativa de biodisponibilidade)",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Cefaleia",
        "Irritabilidade em doses altas",
        "Tolerância com uso prolongado",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Selank", status: "Sinérgico", note: "Selank (modulação GABAérgica, BDNF, ansiolítico) + Noopept (NGF/BDNF, AMPA/NMDA): stack nootrópico russo clássico com efeito ansiolítico + cognitivo sinérgico" },
        { name: "Semax", status: "Sinérgico", note: "Semax (ACTH-análogo, BDNF/NGF upregulation, nootrópico intranasal) + Noopept (AMPA/NMDA/NGF): sobreposição positiva de upregulation neurotrófico e modulação de memória" },
        { name: "Dihexa", status: "Compatível", note: "Dihexa (HGF/c-Met sinaptogênese) + Noopept (AMPA/NMDA/NGF): alvos moleculares distintos; possível potencialização de neuroplasticidade multicamada" },
        { name: "PE-22-28", status: "Compatível", note: "PE-22-28 (antidepressivo TREK-1) + Noopept (nootrópico/ansiolítico leve): stack humor + cognição com mecanismos não sobrepostos" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 (neuroproteção VEGF/dopamina, anti-inflamatório) + Noopept (NGF/BDNF, neuroproteção antioxidante): perfis neuroprotetores complementares sem antagonismo conhecido" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Noopept stimulates the expression of NGF and BDNF in rat hippocampus",
          meta: "Animals (rats) · Gudasheva et al. (Instituto de Farmacologia, Academia de Ciências Médicas da Rússia) demonstrando upregulation de NGF e BDNF hipocampal após Noopept",
          year: "2008",
          summary: "Demonstra upregulation de NGF e BDNF hipocampal após administração repetida de Noopept em ratos, sugerindo mecanismo neuroplástico além do efeito agudo em receptores AMPA/NMDA.",
        },
        {
          title: "Neuroprotective and nootropic drug noopept rescues α-synuclein amyloid cytotoxicity",
          meta: "In vitro / Animals · Estudo demonstrando propriedades neuroprotetoras do Noopept contra toxicidade de α-sinucleína — relevante para Parkinson e demências com corpos de Lewy",
          year: "2014",
          summary: "Noopept demonstra proteção contra agregação de α-sinucleína e toxicidade celular associada, sugerindo potencial neuroprotegente em doenças neurodegenerativas.",
        },
        {
          title: "The original novel nootropic and neuroprotective agent Noopept (Ostrovskaya, Gudasheva et al.)",
          meta: "Humans / Animals · Revisão de Ostrovskaya et al. (Instituto de Farmacologia, Moscou) sobre Noopept: desenvolvimento, mecanismo, farmacologia e aplicações clínicas na Rússia/CEI",
          year: "2002",
          summary: "Revisão abrangente do desenvolvimento do GVS-111/Noopept incluindo dados de ensaios clínicos russos em déficits cognitivos leves e a base para aprovação na Rússia.",
        },
      ],
    },
  },
  {
    slug: "ocitocina",
    name: "Ocitocina",
    aliases: ["Ocitocina", "Oxytocin", "Pitocin", "Syntocinon", "OXT", "Hormônio do vínculo"],
    tagline: "Hormônio de vínculo social, recuperação e bem-estar",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~3–5 min (plasma); ~20 min no SNC via intranasal" },
      { id: "classification", label: "Classificação", value: "Nonapeptídeo neurohipofisário (hormônio do vínculo, parto e amamentação)" },
      { id: "cycle", label: "Ciclo", value: "Situacional ou ciclos de 4 semanas" },
      { id: "route", label: "Via", value: "Intranasal ou subcutânea" },
      { id: "dose", label: "Dose típica", value: "20–40 UI intranasal ou 0.5–2 mg subcutâneo" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Ocitocina",
      prose: "Ocitocina é um neuropeptídeo produzido no hipotálamo que regula vínculo social, redução de ansiedade, desempenho sexual e composição corporal. Na forma exógena (spray nasal ou injeção), é utilizada para redução de cortisol pós-treino, melhora de recuperação e benefícios psicológicos.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "A oxitocina é um nonapeptídeo cíclico sintetizado nos núcleos paraventricular e supraóptico do hipotálamo e liberado pela neurohipófise (hipófise posterior). Na periferia, estimula contrações do músculo liso uterino (base da aprovação FDA para indução de parto — Pitocin) e a ejeção de leite durante a amamentação. No SNC, atua como neuromodulador em circuitos mesolímbicos dopaminérgicos (nucleus accumbens), amigdalares e do cíngulo anterior, mediando comportamentos de vínculo afetivo, confiança, empatia, reconhecimento social e redução de resposta ao medo. Via intranasal, a oxitocina penetra o SNC pelos nervos olfatório e trigêmeo sem atravessar a barreira hematoencefálica, com concentrações cerebrais detectáveis em 30–60 minutos. Estudos de Heinrichs e Domes (2003–2005) demonstraram que a oxitocina intranasal aumenta confiança interpessoal, coesão social e reduz a reatividade amigdalar ao medo. Aplicações investigacionais incluem: transtorno do espectro autista (TEA), ansiedade social, PTSD, disfunção sexual feminina e transtornos de dependência. ATENÇÃO paradoxal: em alguns subtipos de ansiedade e personalidades com alta sensibilidade social, a oxitocina pode intensificar desconfiança e comportamentos de grupo (in-group favoritism vs out-group aversion) — monitorar resposta individual cuidadosamente.",
      points: [
        "Neuromodulador de circuitos de vínculo, confiança e empatia via receptores OXT no SNC.",
        "Via intranasal: penetração cerebral pelo nervo olfatório em 30–60 min sem atravessar BHE.",
        "Aprovada FDA (Pitocin) para indução de parto e amamentação; off-label para vínculo social e ansiedade.",
        "Paradoxo: em alguns subtipos pode intensificar desconfiança e in-group vs out-group — monitorar resposta individual.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Redução de ansiedade social",
        "Melhora do vínculo",
        "Melhora de desempenho sexual",
        "Analgesia e recuperação",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Intranasal: efeito agudo em 30–60 min após dose; redução de ansiedade social e melhora de vínculo percebida nas primeiras aplicações" },
        { period: "Semana 3-4", text: "Uso regular pode consolidar efeitos em comportamento social; melhora de empatia e reconhecimento emocional" },
        { period: "Mês 2-3", text: "Benefícios em TEA e PTSD documentados em estudos de 4–8 semanas; resposta individual variável" },
        { period: "Mês 3+", text: "Ciclos de 4–8 semanas com pausas; avaliar resposta — alguns indivíduos não respondem ou têm piora paradoxal" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "20–40 UI intranasal ou 0.5–2 mg subcutâneo" },
        { label: "Via", value: "Intranasal (preferencial off-label) ou Subcutâneo / Intravenoso (aprovado)" },
        { label: "Frequência", value: "Intranasal: 1–2× ao dia | SC: on-demand | IV: infusão hospitalar" },
        { label: "Duração do ciclo", value: "Situacional ou ciclos de 4 semanas" },
        { label: "Concentração", value: "Intranasal: 40 UI/mL (4 UI/spray) | SC: 10 UI/mL" },
      ],
      indications: [
        { name: "Vínculo social / ansiedade social (intranasal)", note: "20–40 min antes de interação social; máximo 40 UI/dose; não usar diariamente por meses sem pausa", dose: "16–24 UI intranasal (2–3 sprays/narina)" },
        { name: "TEA — melhora de reconhecimento social", note: "Ciclos de 4–8 semanas; resultados heterogêneos entre estudos — VERIFICAR", dose: "24 UI intranasal 2×/dia" },
        { name: "PTSD / resposta ao trauma", note: "Adjuvante à psicoterapia; não usar isoladamente — VERIFICAR", dose: "16–40 UI intranasal antes de sessão terapêutica" },
        { name: "Libido / orgasmo feminino", note: "20–30 min antes da atividade sexual; dados limitados — VERIFICAR", dose: "5–10 UI SC on-demand" },
        { name: "Indução de parto (aprovado FDA)", note: "Uso exclusivamente hospitalar; não replicar em ambiente domiciliar", dose: "0.5–2 mUI/min IV com escalonamento" },
      ],
      phases: [
        { phase: "Fase de titulação (semanas 1–2)", dose: "16 UI intranasal 1×/dia; avaliar resposta e tolerância" },
        { phase: "Fase de manutenção (semanas 3–8)", dose: "24–40 UI 1–2×/dia conforme objetivo" },
        { phase: "Pausa (2–4 semanas)", dose: "Avaliar manutenção de benefícios sem o peptídeo" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Oxitocina SC/IM: aspirar 1.0 mL de água bacteriostática com seringa estéril",
        "Injetar lentamente pela parede do frasco; girar suavemente até dissolver",
        "Intranasal: transferir solução para frasco nasal com conta-gotas calibrado (4 UI/spray é o padrão)",
        "Refrigerar a 2–8°C, proteger da luz; válido por 14 dias após reconstituição",
        "Produto farmacêutico (Syntocinon nasal): solução pronta de 40 UI/mL — não requer reconstituição",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Cefaleia",
        "Náusea",
        "Hiponatremia em uso excessivo",
        "Possível ansiedade em doses altas",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Selank", status: "Compatível", note: "Selank reduz ansiedade via GABA/encefalinas; oxitocina reduz resposta amigdalar ao medo social. Abordagens distintas e complementares para ansiedade social." },
        { name: "Semax", status: "Compatível", note: "Semax eleva BDNF/NGF e cognição; oxitocina melhora processamento social e emocional. Podem compor protocolo de saúde neurológica com dimensões cognitiva e social." },
        { name: "PT-141", status: "Compatível", note: "PT-141 eleva desejo sexual via MC4R; oxitocina facilita vínculo e resposta orgásmica. Mecanismos distintos; podem compor protocolo de disfunção sexual feminina." },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 modula dopamina e serotonina; oxitocina atua em circuitos mesolímbicos de vínculo. Sem interação conhecida; vias distintas." },
        { name: "Álcool / sedativos", status: "Monitorar", note: "Oxitocina tem efeito sedativo leve; combinação com álcool ou benzodiazepínicos pode potencializar sedação e comprometer julgamento social." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Oxytocin increases trust in humans (Kosfeld, Heinrichs et al., Nature 2005)",
          meta: "Humans · neurociência / comportamento",
          year: "2005",
          summary: "Estudo clássico de Kosfeld, Heinrichs e colaboradores (Nature) demonstrando que a oxitocina intranasal aumenta significativamente o comportamento de confiança interpessoal em um jogo econômico padronizado, estabelecendo a base para o uso social da oxitocina.",
        },
        {
          title: "Oxytocin reduces amygdala activation and social fear in healthy volunteers (Domes et al.)",
          meta: "Humans · neuroimagem / ansiedade",
          year: "2007",
          summary: "Estudo de neuroimagem (fMRI) de Domes et al. demonstrando que a oxitocina intranasal reduz a ativação da amígdala em resposta a estímulos de medo social, explicando o mecanismo neural do efeito ansiolítico social.",
        },
        {
          title: "Intranasal oxytocin in autism spectrum disorder: systematic review and meta-analysis of randomized controlled trials",
          meta: "Humans · meta-análise / TEA",
          year: "2019",
          summary: "Meta-análise de ensaios clínicos randomizados de oxitocina intranasal em TEA, mostrando melhoras modestas em reconhecimento social e empatia, com grande variabilidade individual e necessidade de mais estudos para definir subgrupos respondedores.",
        },
      ],
    },
  },
  {
    slug: "ovagen",
    name: "Ovagen",
    aliases: ["Peptídeo ovariano Khavinson", "Bioregulador ovariano", "Lys-Glu-Asp-Gly (tetrapeptídeo ovariano)", "Endoluten (variante temática feminina)"],
    tagline: "Biorregulador hepático para proteção e regeneração do fígado",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30-60 min plasmática; efeito modulador do eixo HPO persiste via regulação gênica em células foliculares e de teca" },
      { id: "classification", label: "Classificação", value: "Tetrapeptídeo bioregulador de tecido ovariano (escola Khavinson)" },
      { id: "cycle", label: "Ciclo", value: "10 dias, 2–3x ao ano" },
      { id: "route", label: "Via", value: "Oral ou subcutânea" },
      { id: "dose", label: "Dose típica", value: "5–10 mg oral ou subcutâneo, 10 dias" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Ovagen",
      prose: "Ovagen é o peptídeo biorregulador desenvolvido pelo Instituto de Gerontologia para o tecido hepático e gastrointestinal. Demonstrou ação hepatoprotetora, estimulando regeneração hepática, reduzindo inflamação e melhorando parâmetros de função hepática em estudos clínicos.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Ovagen é um tetrapeptídeo bioregulador derivado de extrato de tecido ovariano bovino, desenvolvido pelo grupo de Khavinson no Instituto de Bioregulação e Gerontologia de São Petersburgo. Sua sequência peptídica — atribuída como Lys-Glu-Asp-Gly ou variante próxima — atua como sinalizador epigenético em células granulosas, foliculares e de teca do ovário, modulando genes relacionados à esteroidogênese, maturação folicular, síntese de estradiol e receptividade endometrial.\n\nO mecanismo proposto envolve interação com receptores peptídicos ovarianos, ativação de vias do fator de crescimento semelhante à insulina (IGF-1) ovariano e regulação de genes de aromatase (CYP19A1) e receptores de LH/FSH em células foliculares. Em modelos animais, demonstrou preservação de reserva ovariana em envelhecimento acelerado, melhora da regularidade do ciclo estral e aumento de folículos primordiais funcionais. Na literatura clínica russa, ciclos de 10-20 dias foram relatados como benéficos em perimenopausa, irregularidade menstrual e suporte à fertilidade feminina.\n\nImportante: este bioregulador foi desenvolvido pela escola russa de Khavinson (Instituto de Bioregulação e Gerontologia de São Petersburgo) e tem extensa literatura própria, mas validação independente ocidental ainda é limitada. As doses, indicações e mecanismos descritos refletem o protocolo russo tradicional e pesquisas do grupo de origem. Considere esse contexto ao avaliar a evidência disponível.",
      points: [
        "Modulação epigenética em células foliculares e de teca ovariana via peptídeo tecido-específico",
        "Regulação de esteroidogênese ovariana: aromatase (CYP19A1), receptores de LH/FSH em células foliculares",
        "Preservação de reserva ovariana e manutenção de folículos primordiais em envelhecimento acelerado",
        "Melhora de regularidade do ciclo menstrual e suporte à fertilidade feminina",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Hepatoproteção",
        "Regeneração hepática",
        "Melhora de enzimas hepáticas",
        "Detoxificação",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Melhora leve da irregularidade menstrual; redução de fogachos em perimenopausa" },
        { period: "Semana 3-4", text: "Regularização progressiva do ciclo; melhora de qualidade do sono e humor associados ao ciclo" },
        { period: "Mês 2-3", text: "Melhora de marcadores hormonais (FSH basal, estradiol); sensação subjetiva de vitalidade feminina" },
        { period: "Mês 3+", text: "Efeitos geroprotectores cumulativos sobre reserva ovariana com ciclos repetidos sazonais" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "5–10 mg oral ou subcutâneo, 10 dias" },
        { label: "Via", value: "Oral (cápsulas)" },
        { label: "Frequência", value: "1-2x/dia oral; ciclos de 10-20 dias consecutivos, 2-3x/ano" },
        { label: "Duração do ciclo", value: "10 dias, 2–3x ao ano" },
        { label: "Concentração", value: "Oral: cápsulas 10 mg; SC opcional: reconstituir em 1-2 mL (5-10 mg/mL)" },
      ],
      indications: [
        { name: "Irregularidade menstrual funcional", note: "Ciclos sazonais; monitorar perfil hormonal (FSH, LH, estradiol) a cada 3 meses", dose: "1-2 cápsulas/dia oral × 10-20 dias" },
        { name: "Perimenopausa e transição menopausal", note: "Combinar com Epithalon para suporte do eixo pineal-gonadal; não substitui TRH quando clinicamente indicada", dose: "1-2 cápsulas/dia oral × 20 dias, 3x/ano" },
        { name: "Hipofunção ovariana leve", note: "Via SC para maior biodisponibilidade em hipofunção moderada; monitorar AMH e contagem folicular antral", dose: "10 mg/dia SC × 20 dias, 2x/ano" },
        { name: "Suporte à fertilidade feminina", note: "Protocolo de preparação ovariana; combinar com Kisspeptin se disponível", dose: "1-2 cápsulas/dia oral × 20 dias antes de tentativa de concepção" },
      ],
      phases: [
        { phase: "Ciclo de ataque (10-20 dias)", dose: "10 mg/dia SC ou 1-2 cápsulas/dia oral, consecutivos" },
        { phase: "Intervalo", dose: "2-4 meses sem uso entre ciclos" },
        { phase: "Ciclos de manutenção", dose: "Repetir 2-3x/ano; combinar com Epithalon e Pinealon no trio Khavinson para eixo pineal-gonadal feminino" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Retirar frasco da geladeira e aguardar temperatura ambiente (~10 min)",
        "Adicionar 1-2 mL de água bacteriostática ou solução salina 0,9% com seringa estéril",
        "Rodar suavemente entre os dedos até dissolução completa — NÃO agitar",
        "Solução final: 5-10 mg/mL; usar imediatamente ou refrigerar (validade 14-21 dias)",
        "Administração oral preferida (cápsulas); SC como alternativa para maior biodisponibilidade em hipofunção moderada",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Geralmente bem tolerado",
        "Dados de estudos principalmente russos",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Epithalon", status: "Sinérgico", note: "Epithalon regula eixo pineal-hipofisário-ovariano; combinação clássica Khavinson para geroprotecção reprodutiva feminina" },
        { name: "Kisspeptin", status: "Sinérgico", note: "Kisspeptin é o principal ativador do eixo HPG; combinação com Ovagen potencializa estimulação gonadotrópica no eixo reprodutivo feminino" },
        { name: "Pinealon", status: "Compatível", note: "Pinealon modula eixo pineal e ritmo circadiano; sinergia com Ovagen para regulação neuroendócrina do ciclo menstrual" },
        { name: "Thymalin", status: "Compatível", note: "Thymalin suporta imunidade que regula microambiente ovariano; relevante em casos de hipofunção ovariana com componente autoimune" },
        { name: "Crystagen", status: "Compatível", note: "Crystagen suporta imunidade tímica; combinação útil em pacientes com declínio reprodutivo associado a imunosenescência" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Khavinson VKh et al. Ovarian peptide bioregulator effects on reproductive aging in female rats",
          meta: "Animal · Estudo em ratas com envelhecimento reprodutivo acelerado avaliando bioregulador ovariano Khavinson",
          year: "2006",
          summary: "Administração de peptídeo ovariano preservou reserva folicular, regularizou ciclo estral e manteve níveis de estradiol em ratas idosas submetidas a envelhecimento reprodutivo acelerado.",
        },
        {
          title: "Khavinson VKh, Linkova NS. Peptide regulation of gene expression and protein synthesis in ovarian cells",
          meta: "Animal/Celular · Estudo mecanístico da regulação de esteroidogênese ovariana por peptídeos Khavinson",
          year: "2012",
          summary: "Peptídeo ovariano regulou expressão de CYP19A1 (aromatase) e receptores gonadotrópicos em células foliculares em cultura primária.",
        },
        {
          title: "Anisimov VN, Khavinson VKh. Peptide bioregulation of aging: results and prospects",
          meta: "Animal/Humano · Revisão sobre bioreguladores Khavinson incluindo peptídeo ovariano em contexto de longevidade reprodutiva",
          year: "2010",
          summary: "Análise dos efeitos de peptídeos tecido-específicos na preservação da função reprodutiva feminina durante o envelhecimento.",
        },
      ],
    },
  },
  {
    slug: "p21",
    name: "P21",
    aliases: ["CDKN1A", "WAF1", "Cip1", "Peptídeo derivado de p21/CDKN1A", "CIP1 fragmento peptídico"],
    tagline: "Peptídeo derivado de CNTF para neuroproteção e neurogênese",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "Desconhecida para peptídeos derivados de p21 em uso sistêmico; proteína p21 endógena tem meia-vida ~30-60 min (regulada por ubiquitinação)" },
      { id: "classification", label: "Classificação", value: "Peptídeo experimental derivado de fragmento funcional de CDKN1A (p21/WAF1/Cip1) — research-only; sem protocolo clínico validado em humanos" },
      { id: "cycle", label: "Ciclo", value: "4–8 semanas" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "100–200 mcg subcutâneo, 1x ao dia" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Médio", pill: "amber" },
    ],
    about: {
      heading: "O que é P21",
      prose: "P21 é um pentapeptídeo derivado do fator neurotrófico ciliar (CNTF) que demonstrou potente neuroproteção e capacidade de aumentar neurogênese hipocampal. Investigado para doenças neurodegenerativas e melhora cognitiva via ativação da via JAK2/STAT3.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "P21 (CDKN1A/WAF1/Cip1) é uma proteína inibidora de quinase dependente de ciclina (CDK) codificada pelo gene CDKN1A, um dos principais efetores do supressor tumoral p53. No ciclo celular, p21 liga-se e inibe complexos CDK2/Ciclina E e CDK4/Ciclina D, bloqueando a transição G1/S e induzindo parada do ciclo celular, senescência ou apoptose em células com dano ao DNA. Constitui um nó central na regulação da resposta ao estresse genotóxico.\n\nEm pesquisa, fragmentos peptídicos funcionais da proteína p21 têm sido explorados como ferramentas para indução de apoptose em células tumorais, modulação de senescência (estimulação ou reversão segundo o contexto) e controle de proliferação desregulada. A lógica é atrativa: entregar o sinal de parada de ciclo celular diretamente via peptídeo exógeno. No entanto, IMPORTANTE: não existe peptídeo p21 padronizado, aprovado ou com protocolo clínico validado para uso humano. O que circula em mercados underground é uma variedade de construtos peptídicos curtos baseados em fragmentos funcionais de CDKN1A, com identidade, pureza e atividade biológica variáveis entre fornecedores. O uso é estritamente research-only. Perfil de risco completamente desconhecido. Dose humana não estabelecida em nenhuma indicação.",
      points: [
        "CDKN1A endógeno: inibe CDK2/Ciclina E e CDK4/Ciclina D bloqueando transição G1/S do ciclo celular",
        "Efetor de p53 em resposta a dano ao DNA: induz parada do ciclo, senescência ou apoptose conforme contexto",
        "Fragmentos peptídicos explorados em pesquisa como moduladores de proliferação tumoral e senescência celular",
        "ATENÇÃO: sem peptídeo padronizado, sem protocolo clínico validado — research-only; composição variável em mercado underground",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Estímulo de neurogênese hipocampal",
        "Neuroproteção",
        "Melhora de memória em modelos animais",
        "Potencial anti-aging cerebral",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Sem dados clínicos humanos; efeitos de fragmentos peptídicos de p21 em humanos completamente desconhecidos" },
        { period: "Semana 3-4", text: "Modelos celulares in vitro: inducao de parada de ciclo em linhagens tumorais; extrapolacao humana nao validada" },
        { period: "Mês 2-3", text: "Sem dados de uso repetido em humanos; efeitos a medio prazo desconhecidos e potencialmente imprediciveis" },
        { period: "Mês 3+", text: "Uso cronico de fragmentos peptídicos de p21 em humanos completamente sem base de evidencia ou seguranca" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "100–200 mcg subcutâneo, 1x ao dia" },
        { label: "Via", value: "Subcutâneo (experimental)" },
        { label: "Frequência", value: "Não estabelecida — sem protocolo humano validado" },
        { label: "Duração do ciclo", value: "4–8 semanas" },
        { label: "Concentração", value: "Dose humana NÃO ESTABELECIDA; doses em modelos celulares: nanomolar a micromolar in vitro" },
      ],
      indications: [
        { name: "Pesquisa de modulacao do ciclo celular (pre-clinico/in vitro)", note: "Qualquer uso em humanos e experimental sem base clinica validada; risco completamente desconhecido", dose: "Dose humana NAO estabelecida; uso apenas in vitro ou em modelos animais supervisionados" },
        { name: "Pesquisa de senolise ou modulacao de senescencia (experimental)", note: "Contexto biologico de p21 na senescencia é complexo — p21 pode induzir OU manter senescencia conforme contexto; uso indiscriminado e perigoso", dose: "Dose humana NAO estabelecida" },
        { name: "Suporte oncologico experimental (research-only)", note: "Uso em oncologia APENAS em contexto de pesquisa clínica formal sob supervisao especializada; NAO substituir tratamento convencional", dose: "Dose humana NAO estabelecida" },
      ],
      phases: [
        { phase: "AVISO GERAL", dose: "Nenhum protocolo de uso humano existe para peptídeos derivados de p21; qualquer auto-administracao e research-only sem base de seguranca" },
        { phase: "Contexto de pesquisa", dose: "Uso apenas em estudos in vitro ou modelos animais com aprovacao de comite de etica competente" },
        { phase: "Status regulatorio", dose: "Nao aprovado em nenhuma indicacao; compostos underground de p21 sem padronizacao ou garantia de identidade quimica" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "ATENÇÃO: composto de pesquisa experimental — sem protocolo clínico humano estabelecido ou validado",
        "Descongelar o pó liofilizado em temperatura ambiente por 15-30 min protegido da luz",
        "Reconstituir em água bacteriostática estéril ou PBS para concentração de 1-5 mg/mL",
        "Agitar suavemente até dissolução; filtrar com membrana 0,22 µm se preparado artesanalmente",
        "Refrigerar (2-8°C) após reconstituição; validade 7 dias; não recongelar",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Dados humanos limitados",
        "Possível estimulação celular excessiva",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "FOXO4-DRI", status: "Compatível", note: "FOXO4-DRI é senolítico via FOXO4-p53; p21 é efetor de p53 — mecanismos convergentes na via apoptótica de células senescentes, apenas em contexto de pesquisa" },
        { name: "Dasatinib + Quercetina", status: "Compatível", note: "D+Q é a combinação senolítica com mais dados humanos; p21 peptídeo seria aditivo teórico no mesmo contexto — apenas research-only sem protocolo combinado validado" },
        { name: "PNC-27", status: "Monitorar", note: "PNC-27 também é derivado da via p53; combinar peptídeos que atuam sobre via p53/apoptose sem dados de segurança combinada representa risco desconhecido" },
        { name: "Epithalon", status: "Compatível", note: "Epithalon tem atividade de modulação telomética e rejuvenescimento; contexto teórico complementar em pesquisa de senescência celular" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "El-Deiry WS et al. WAF1, a potential mediator of p53 tumor suppression",
          meta: "Celular · Paper seminal de identificacao de p21/WAF1/CDKN1A como mediador de supressao tumoral por p53",
          year: "1993",
          summary: "Identificacao e caracterizacao de WAF1 (p21/CDKN1A) como gene ativado por p53 em resposta a dano ao DNA, estabelecendo p21 como inibidor de CDK e regulador central do ciclo celular.",
        },
        {
          title: "Harper JW et al. The p21 Cdk-interacting protein Cip1 is a potent inhibitor of G1 cyclin-dependent kinases",
          meta: "Celular · Estudo mecanístico de Cip1 (p21/CDKN1A) como inibidor potente de quinases dependentes de ciclina G1",
          year: "1993",
          summary: "Caracterizacao bioquimica de Cip1 como inibidor de CDK2/Ciclina E e CDK4/Ciclina D, estabelecendo a base molecular para uso de fragmentos peptídicos derivados de p21 em pesquisa de ciclo celular.",
        },
        {
          title: "Karimian A et al. Multiple functions of p21 in cell cycle, apoptosis and transcriptional regulation after DNA damage",
          meta: "Revisão · Revisão das múltiplas funções de p21/CDKN1A no ciclo celular, apoptose e resposta ao dano ao DNA",
          year: "2016",
          summary: "Análise abrangente das funções pleitrópicas de p21 incluindo indução de senescência, parada de ciclo, apoptose e implicações para o desenvolvimento de estratégias terapêuticas baseadas em p21.",
        },
      ],
    },
  },
  {
    slug: "pe-22-28",
    name: "PE-22-28",
    aliases: ["Spadin derivado", "Fragmento propeptídeo sortilina", "Bloqueador TREK-1 heptapeptídeo", "PE22-28"],
    tagline: "Peptídeo antidepressivo de ação rápida via receptores AMPA",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~15-30 minutos plasmática -- VERIFICAR; efeito antidepressivo persiste dias via mecanismo receptor" },
      { id: "classification", label: "Classificação", value: "Heptapeptídeo derivado do Spadin (bloqueador seletivo do canal TREK-1)" },
      { id: "cycle", label: "Ciclo", value: "4–6 semanas" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "200–500 mcg subcutâneo, 1x ao dia" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é PE-22-28",
      prose: "PE-22-28 é um peptídeo derivado do fragmento (22-28) da espiradelina que demonstrou potente efeito antidepressivo de ação rápida comparável à ketamina em modelos animais. Age via potencialização AMPA e ativação de mTOR, promovendo neuroplasticidade sináptica rápida.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "PE-22-28 é um heptapeptídeo derivado do Spadin, que por sua vez é um fragmento natural do propeptídeo da sortilina (proteína de tráfego intracelular). O mecanismo de ação central e diferencial desta classe é o bloqueio seletivo do canal de potássio TREK-1 (TRAAK-related K⁺ channel, família K2P — dois poros). TREK-1 é um canal de fundo que regula o potencial de membrana neuronal em repouso; sua hiperativação está associada a estados depressivos e à ação de anestésicos. A inibição de TREK-1 por PE-22-28 despolariza sutilmente neurônios serotoninérgicos e noradrenérgicos, aumentando o tônus monoaminérgico de forma rápida — com início de efeito antidepressivo estimado em 3-4 dias, contrastando com as 2-6 semanas características dos SSRIs. Diferentemente dos antidepressivos convencionais, PE-22-28 não bloqueia transportadores de monoaminas (SERT, NET) nem antagoniza receptores de monoaminas — seu mecanismo é puramente iônico/de canal. Pesquisas de Mazella e Borsotto (INSERM/Université Côte d'Azur) demonstraram eficácia antidepressiva de início rápido em modelos animais, com baixo perfil de efeitos adversos e sem síndrome de descontinuação aparente em modelos murinos. Dados humanos são ainda muito limitados — uso clínico é pré-clínico/early research.",
      points: [
        "Bloqueia seletivamente canal TREK-1 (K2P), despolarizando neurônios serotoninérgicos e noradrenérgicos",
        "Efeito antidepressivo de início rápido (3-4 dias vs semanas dos SSRIs/SNRIs) -- VERIFICAR em humanos",
        "Mecanismo iônico distinto: sem bloqueio de transportador de monoaminas (SERT/NET)",
        "Derivado do propeptídeo natural da sortilina; não atua sobre receptores de monoaminas clássicos",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Efeito antidepressivo de ação rápida",
        "Neuroplasticidade sináptica",
        "Aumento de BDNF",
        "Potencial antiansiogênico",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Dias 1-3", text: "Sem efeito perceptível esperado; período de modulação dos canais TREK-1" },
        { period: "Dias 3-7", text: "Primeiros sinais de melhora de humor e redução de anedonia -- VERIFICAR (relatos e modelos animais)" },
        { period: "Semana 2-4", text: "Efeito antidepressivo mais estável; possível melhora de cognição emocional -- VERIFICAR" },
        { period: "Mês 1+", text: "Manutenção do efeito antidepressivo; sem dados de longo prazo em humanos -- VERIFICAR" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "200–500 mcg subcutâneo, 1x ao dia" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "1x/dia" },
        { label: "Duração do ciclo", value: "4–6 semanas" },
        { label: "Concentração", value: "1 mL = 250-500 mcg/mL (frasco padrão compounding)" },
      ],
      indications: [
        { name: "Depressão (experimental/investigacional)", note: "Fase pré-clínica/early human — SEM protocolo estabelecido -- VERIFICAR", dose: "250-500 mcg/dia SC" },
        { name: "Depressão refratária (investigacional)", note: "Dose experimental superior; monitorar resposta rigorosamente -- altamente VERIFICAR", dose: "500 mcg/dia SC" },
        { name: "Ansiedade com componente depressivo", note: "Baseado em modelos animais apenas; sem validação humana -- VERIFICAR", dose: "250 mcg/dia SC" },
      ],
      phases: [
        { phase: "Indução (semanas 1-4)", dose: "250 mcg/dia SC — avaliar resposta antidepressiva" },
        { phase: "Manutenção (se resposta)", dose: "250-500 mcg/dia SC — sem dados de duração ideal" },
        { phase: "Descontinuação", dose: "Sem dados sobre necessidade de desmame gradual; monitorar recorrência" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Adicionar 1 mL de água bacteriostática ao frasco liofilizado (250-500 mcg)",
        "Girar suavemente até dissolução completa — solução deve ser límpida",
        "Concentração resultante: 250-500 mcg/mL para uso subcutâneo direto",
        "Refrigerar entre 2-8°C após reconstituição",
        "Usar em até 7 dias após abertura; proteger da luz",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Dados humanos muito limitados",
        "Possível agitação psicomotora",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Selank", status: "Sinérgico", note: "Selank (modulação GABAérgica, BDNF, anti-ansiedade) + PE-22-28 (bloqueio TREK-1, antidepressivo rápido): stack neuropsiquiátrico para ansiedade + depressão" },
        { name: "Semax", status: "Sinérgico", note: "Semax (BDNF/NGF upregulation, nootrópico) + PE-22-28 (antidepressivo via TREK-1): abordagem combinada de neuroplasticidade + modulação de humor" },
        { name: "Dihexa", status: "Compatível", note: "Dihexa (sinaptogênese HGF/c-Met) + PE-22-28 (modulação de humor TREK-1): alvos moleculares não sobrepostos; possível complementaridade cognitiva-afetiva" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 (neuroproteção, modulação dopaminérgica/serotoninérgica indireta) + PE-22-28 (canal TREK-1): mecanismos distintos; perfis de segurança compatíveis" },
        { name: "Noopept", status: "Compatível", note: "Noopept (nootrópico/neuroprotetor, leve ansiolítico) + PE-22-28 (antidepressivo TREK-1): stack humor + cognição com mecanismos não sobrepostos" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Spadin, a sortilin-derived peptide, targeting rodent TREK-1 channels: a new concept in the antidepressant drug design",
          meta: "Animals (mice) · Trabalho seminal de Mazella et al. (INSERM) descrevendo o Spadin e derivados como bloqueadores do canal TREK-1 com efeito antidepressivo de início rápido",
          year: "2010",
          summary: "Demonstra que Spadin bloqueia seletivamente TREK-1, produzindo efeito antidepressivo de início rápido em modelos murinos de depressão; estabelece a base para o desenvolvimento de PE-22-28.",
        },
        {
          title: "PE-22-28, a spadin analogue with improved antidepressant efficacy and selectivity for TREK-1",
          meta: "Animals (mice) · Borsotto e Mazella (INSERM/UCA) caracterizando PE-22-28 como análogo do Spadin com afinidade aprimorada pelo canal TREK-1 e eficácia antidepressiva superior",
          year: "2015",
          summary: "PE-22-28 demonstra maior potência e duração de ação antidepressiva comparado ao Spadin original em modelos de depressão por estresse crônico imprevisível.",
        },
        {
          title: "TREK-1 channel: a new target for antidepressant drugs (review)",
          meta: "Animals / Review · Revisão de Borsotto et al. (INSERM) sobre o canal TREK-1 como alvo terapêutico em depressão e ansiedade, contextualizando a série Spadin/PE-22-28",
          year: "2015",
          summary: "Revisão do papel de TREK-1 em neuropsiquiatria e do potencial terapêutico de bloqueadores peptídicos; posiciona PE-22-28 como candidato de segunda geração.",
        },
      ],
    },
  },
  {
    slug: "pinealon",
    name: "Pinealon",
    aliases: ["EDR", "Glu-Asp-Arg", "Пиналон", "Bioregulador pineal Khavinson"],
    tagline: "Biorregulador pineal para ritmo circadiano e neuroproteção",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30-60 min plasmática; efeito neuroprotetor e regulatório persiste além do clearance" },
      { id: "classification", label: "Classificação", value: "Tripeptídeo bioregulador pineal e cortical (Khavinson — Instituto de Bioregulação de São Petersburgo)" },
      { id: "cycle", label: "Ciclo", value: "10 dias, 2–4x ao ano" },
      { id: "route", label: "Via", value: "Oral ou sublingual" },
      { id: "dose", label: "Dose típica", value: "5–10 mg oral ou sublingual, 10 dias" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Pinealon",
      prose: "Pinealon é o tripeptídeo biorregulador Glu-Asp-Arg (EDR) desenvolvido para a glândula pineal pelo grupo Khavinson. Regula produção de melatonina, protege neurônios contra estresse oxidativo e demonstrou melhora cognitiva e do sono em estudos com idosos.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Pinealon (EDR — Glu-Asp-Arg) é um tripeptídeo sintético desenvolvido pelo grupo de Vladimir Khavinson como bioregulador do epitálamo e córtex cerebral. Originalmente isolado de preparações de epitálamo bovino, hoje produzido por síntese química. O mecanismo de ação proposto envolve a penetração intracelular do tripeptídeo e a interação direta com cromatina nuclear, modulando a expressão gênica em neurônios corticais e células do epitálamo. Os efeitos descritos incluem: atividade neuroprotetora e anti-apoptótica em neurônios (upregulation de Bcl-2, downregulation de proteínas pró-apoptóticas); modulação do ciclo circadiano e da síntese de melatonina pela glândula pineal; atividade antioxidante no tecido cerebral (redução de peroxidação lipídica); e melhora de processos cognitivos — memória, atenção e velocidade de processamento. Indicações descritas na literatura russa incluem declínio cognitivo relacionado à idade, distúrbios de sono, recuperação funcional pós-AVC e fadiga mental crônica. A forma oral em cápsulas (100-200 mg/dia) é a mais comum comercialmente; injeções SC (5-10 mg/dia) são usadas em protocolos clínicos russos intensivos. Importante: este bioregulador foi desenvolvido pela escola russa de Khavinson (Instituto de Bioregulação e Gerontologia de São Petersburgo) e tem extensa literatura própria, mas validação independente ocidental ainda é limitada. As doses, indicações e mecanismos descritos refletem o protocolo russo tradicional e pesquisas do grupo de origem. Considere esse contexto ao avaliar a evidência disponível.",
      points: [
        "Modula expressão gênica em neurônios corticais e células do epitálamo por interação com cromatina nuclear",
        "Neuroprotetor anti-apoptótico: upregulation de Bcl-2, redução de peroxidação lipídica cerebral",
        "Regula síntese de melatonina pela glândula pineal e modula ciclo circadiano",
        "Melhora de memória, atenção e qualidade do sono — indicações da literatura russa; validação ocidental limitada",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Regulação do ciclo circadiano",
        "Melhora da qualidade do sono",
        "Neuroproteção antioxidante",
        "Melhora cognitiva em idosos",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Dias 1-7", text: "Melhora de qualidade do sono e redução de fadiga mental com uso regular" },
        { period: "Semana 2-3", text: "Melhora de atenção, memória de trabalho e redução de névoa mental" },
        { period: "Mês 1-2", text: "Melhora cognitiva mais estável; benefício em regulação do ciclo circadiano" },
        { period: "Mês 2-3+", text: "Efeito geroprotector cumulativo em ciclos repetidos; benefício sustentado em declínio cognitivo" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "5–10 mg oral ou sublingual, 10 dias" },
        { label: "Via", value: "Oral" },
        { label: "Frequência", value: "1x/dia pela manhã (oral); 1x/dia (SC em protocolos clínicos); ciclos de 10-20 dias, 2-3x/ano" },
        { label: "Duração do ciclo", value: "10 dias, 2–4x ao ano" },
        { label: "Concentração", value: "Cápsulas 10-20 mg (oral, padrão comercial russo); injetável 5-10 mg/mL (SC)" },
      ],
      indications: [
        { name: "Declínio cognitivo relacionado à idade", note: "Ciclos de 20 dias, 2-3x/ano; forma oral padrão", dose: "100-200 mg/dia oral × 20 dias" },
        { name: "Distúrbio de sono / dissonias", note: "Tomar à noite para melhor efeito no ciclo circadiano", dose: "100 mg/dia oral ao deitar × 10-20 dias" },
        { name: "Recuperação pós-AVC (adjuvante)", note: "Associar a Cortagen para protocolo neuroprotetor completo", dose: "5-10 mg/dia SC × 10-20 dias" },
        { name: "Geroprotecção cognitiva preventiva", note: "Uso preventivo em protocolos de longevidade; base Khavinson", dose: "100-200 mg/dia oral × 10 dias, 2-3x/ano" },
      ],
      phases: [
        { phase: "Ciclo de ataque (10-20 dias)", dose: "100-200 mg/dia oral ou 5-10 mg/dia SC 1x/dia" },
        { phase: "Intervalo", dose: "3-6 meses sem uso entre ciclos" },
        { phase: "Ciclos de manutenção", dose: "Repetir 2-3x/ano; associar Epithalon no outono/primavera para protocolo Khavinson completo" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Forma oral (capsulas 10-20 mg): ingerir com água, sem necessidade de preparo especial",
        "Forma injetável (SC): adicionar 1 mL de água bacteriostática ao frasco liofilizado",
        "Girar suavemente até dissolução completa — solução deve ser límpida",
        "Refrigerar entre 2-8°C após reconstituição; usar em até 7 dias",
        "Forma oral preferencial para ciclos de manutenção; SC para protocolos clínicos intensivos",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Sonolência excessiva",
        "Náusea",
        "Sonhos vívidos",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Epithalon", status: "Sinérgico", note: "Epithalon (regulação epigenética/telomerase via pineal) + Pinealon (neuroproteção cortical e modulação circadiana): combinação clássica Khavinson para eixo pineal estendido e geroprotecção neurológica" },
        { name: "Cortagen", status: "Sinérgico", note: "Cortagen (bioregulador cortical, neuroproteção) + Pinealon (bioregulador pineal/cortical): combo Khavinson para protocolo neuroprotetor completo — cortex + pineal; usados juntos em recuperação pós-AVC e declínio cognitivo" },
        { name: "Cerebrolysin", status: "Compatível", note: "Cerebrolysin (mimetizador neurotrófico multiespectral, NGF/BDNF) + Pinealon (bioregulador cortical Khavinson): abordagens complementares à neuroproteção; sem antagonismo conhecido" },
        { name: "Semax", status: "Compatível", note: "Semax (ACTH-análogo, BDNF/NGF upregulation, nootrópico intranasal) + Pinealon (bioregulador epigenético pineal): alvos distintos em neuroproteção e cognição; perfis compatíveis" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 (neuroproteção, VEGF, modulação dopaminérgica) + Pinealon (cortical/pineal Khavinson): perfis neuroprotetores complementares sem interação farmacológica conhecida" },
      ],
      bundles: [
        { name: "Bioregulator Protocol", category: "Longevidade", items: ["Pinealon", "Vilon"], goal: "Longevidade Celular" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Neuroprotective effects of EDR tripeptide in aging and neurodegenerative conditions (Khavinson et al.)",
          meta: "Animals / Humans · Trabalho do grupo de Khavinson descrevendo efeitos neuroprotetores do tripeptídeo EDR (Pinealon) em modelos de envelhecimento e distúrbios neurodegenerativos",
          year: "2013",
          summary: "Descreve a atividade anti-apoptótica e neuroprotetora do Pinealon (EDR) em neurônios corticais; modulação de expressão gênica de proteínas anti-apoptóticas; dados em modelos animais e pequenas séries clínicas russas.",
        },
        {
          title: "Short peptides of the pineal gland as regulators of melatonin synthesis and circadian rhythms (Khavinson)",
          meta: "Animals · Revisão de Khavinson sobre peptídeos pineais curtos (incluindo EDR/Pinealon) como moduladores da síntese de melatonina e ritmos circadianos",
          year: "2010",
          summary: "Descreve o mecanismo de modulação da produção de melatonina pela glândula pineal via peptídeos regulatórios; base para uso de Pinealon em distúrbios de sono e cronobiologia.",
        },
        {
          title: "Peptide bioregulation of gene expression in the nervous system during aging",
          meta: "Animals / In vitro · Trabalho de Khavinson e colaboradores sobre regulação de expressão gênica no sistema nervoso por peptídeos curtos — engloba Pinealon e Cortagen",
          year: "2016",
          summary: "Demonstra interação de tripeptídeos e tetrapeptídeos bioreguladores com histonas e promotores gênicos em neurônios, modulando genes de sobrevivência neuronal.",
        },
      ],
    },
  },
  {
    slug: "pnc-27",
    name: "PNC-27",
    aliases: ["Peptide Nucleolar Cytotoxic 27", "PNC27", "Peptídeo p53-HDM2 antitumoral de Pincus", "MDM2-binding p53 apoptotic peptide"],
    tagline: "Peptídeo indutor de apoptose seletiva em células com MDM2",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~2-4 h (estimativa pré-clínica); dados farmacocinéticos humanos limitados a fase 1 em planejamento" },
      { id: "classification", label: "Classificação", value: "Peptídeo sintético de 27 aminoácidos antitumoral; contém domínio de ligação a HDM-2 de p53 fusionado a sequência de penetração celular (MRP) — indutor de necrose seletiva em células cancerosas" },
      { id: "cycle", label: "Ciclo", value: "Variável conforme protocolo" },
      { id: "route", label: "Via", value: "Subcutânea ou intravenosa" },
      { id: "dose", label: "Dose típica", value: "1–5 mg subcutâneo ou IV" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Difícil", pill: "amber" },
    ],
    about: {
      heading: "O que é PNC-27",
      prose: "PNC-27 é um peptídeo composto pelo domínio de ligação de p53 ao MDM2 fundido com um peptídeo penetrador transmembrana. Demonstrou capacidade de induzir apoptose seletiva em células que superexpressam MDM2 (tumorais e senescentes) sem afetar células normais.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "PNC-27 é um peptídeo sintético de 27 aminoácidos desenvolvido por Michael Pincus e Matthew Bowne (Stony Brook University / Memorial Sloan Kettering Cancer Center). Sua estrutura combina o domínio de ligação a HDM-2 da proteína p53 (resíduos 12-26 de p53) fusionado a uma sequência de penetração membranar (MRP — membrane residency peptide), projetado para se acumular na membrana plasmática de células tumorais.\n\nO mecanismo se baseia em uma diferença crítica entre células cancerosas e normais: em células tumorais, HDM-2 (o antagonista de p53) é superexpresso e se redistribui para a membrana plasmática; em células saudáveis, HDM-2 permanece nuclear. PNC-27 liga-se especificamente ao HDM-2 membranar de células tumorais, formando poros na membrana que induzem necrose celular rápida e seletiva, sem afetar células saudáveis com HDM-2 exclusivamente nuclear. Estudos pré-clínicos demonstraram citotoxicidade seletiva em linhagens de câncer pancreático, leucemia, glioblastoma e próstata, com ausência de toxicidade em células normais correspondentes. O peptídeo está em fase pré-clínica avançada com ensaios de fase 1 em planejamento para indicações oncológicas selecionadas.",
      points: [
        "Liga-se a HDM-2 membranar de células tumorais (superexpresso e redistribuído na membrana em células cancerosas)",
        "Formação de poros membranares em células tumorais: necrose seletiva sem afetar células saudáveis (HDM-2 nuclear)",
        "Atividade citotóxica demonstrada em linhagens de câncer pancreático, leucemia, glioblastoma e próstata",
        "Fase pré-clínica avançada; ensaios de fase 1 em planejamento — NÃO aprovado, NÃO substitui oncologia convencional",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Apoptose seletiva de células senescentes",
        "Sem toxicidade para células normais",
        "Potencial anti-câncer",
        "Eliminação de células MDM2+",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Dados pre-clinicos: citotoxicidade em linhagens tumorais in vitro em horas; dados in vivo em camundongos mostram reducao tumoral inicial" },
        { period: "Semana 3-4", text: "Modelos murinos: reducao significativa de volume tumoral em canceres pancreatico e leucemia experimental; dados humanos ausentes" },
        { period: "Mês 2-3", text: "Pre-clinico: reducao progressiva de massa tumoral em modelos animais com dosagem continuada; timeline humana nao estabelecida" },
        { period: "Mês 3+", text: "Sem dados de tratamento cronico em humanos; fase 1 planejada determinara dose, tolerabilidade e PK em pacientes oncologicos" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "1–5 mg subcutâneo ou IV" },
        { label: "Via", value: "Intravenoso" },
        { label: "Frequência", value: "Protocolo pré-clínico: doses IV em modelos animais; protocolo humano a ser definido em fase 1" },
        { label: "Duração do ciclo", value: "Variável conforme protocolo" },
        { label: "Concentração", value: "Dose pré-clínica de referência: 25-100 mg/m² IV em modelos animais; dose humana a ser estabelecida em fase 1" },
      ],
      indications: [
        { name: "Carcinoma pancreatico (pre-clinico/fase 1)", note: "Indicacao mais avancada pre-clinicamente; ensaio de fase 1 em planejamento; NAO usar fora de contexto de pesquisa supervisionada", dose: "25-100 mg/m2 IV — dose humana a ser definida em fase 1" },
        { name: "Leucemia (pre-clinico)", note: "Dados pre-clinicos promissores em linhagens leucemicas; sem ensaio clinico aprovado", dose: "Dose humana NAO estabelecida" },
        { name: "Glioblastoma (pre-clinico)", note: "Desafio adicional de penetracao de barreira hematoencefalica; em investigacao pre-clinica", dose: "Dose humana NAO estabelecida" },
        { name: "Cancer de prostata (pre-clinico)", note: "Dados de citotoxicidade seletiva em linhagens prostaticas; sem protocolo clinico estabelecido", dose: "Dose humana NAO estabelecida" },
      ],
      phases: [
        { phase: "Protocolo pre-clinico de referencia", dose: "25-100 mg/m2 IV, 2-3x/semana em modelos murinos de tumor" },
        { phase: "Fase 1 planejada", dose: "Dose, frequencia e esquema a ser determinados; desfecho primario: dose maxima tolerada e perfil de seguranca" },
        { phase: "AVISO", dose: "Uso exclusivamente em contexto de pesquisa ou ensaio clinico aprovado; NAO substitui nenhuma modalidade de tratamento oncologico convencional" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "ATENÇÃO: peptídeo oncológico experimental — uso apenas em contexto de pesquisa ou ensaio clínico supervisionado",
        "Descongelar o pó liofilizado em temperatura ambiente por 30 min protegido da luz; estoque a -80°C",
        "Reconstituir em solução salina 0,9% estéril ou PBS para concentração de 1-5 mg/mL; agitar suavemente",
        "Filtrar com membrana 0,22 µm estéril antes da administração IV; preparar apenas o volume necessário",
        "Administrar imediatamente após reconstituição; estabilidade de reconstituído limitada a 4-6 h a 2-8°C",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Dados humanos extremamente limitados",
        "Inflamação local",
        "Reações imunológicas possíveis",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Thymosin Alpha-1", status: "Compatível", note: "Thymosin Alpha-1 modula imunidade antitumoral; em contexto oncológico experimental, pode complementar ação direta de PNC-27 com suporte imunológico — apenas research-only" },
        { name: "GHK-Cu", status: "Compatível", note: "GHK-Cu tem ação de reparação tecidual pós-tratamento; potencial uso sequencial para regeneração de tecido saudável após senólise tumoral" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 promove reparo de mucosa e tecidos periféricos; potencial adjuvante para proteção de tecidos saudáveis em protocolos experimentais oncológicos" },
        { name: "P21 (CDKN1A peptídeo)", status: "Monitorar", note: "Ambos derivados da via p53; combinar peptídeos que atuam sobre HDM-2/p53/apoptose sem dados de segurança combinada representa risco imprevisível" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Bowne WB et al. Antitumor peptide PNC-27 kills cancer cells by inducing pore formation in their membranes",
          meta: "Animal/Celular · Estudo descrevendo mecanismo de ação de PNC-27 e atividade antitumoral seletiva em modelos pré-clínicos",
          year: "2008",
          summary: "PNC-27 induziu formação de poros e necrose seletiva em células cancerosas com HDM-2 membranar sem afetar células normais; atividade demonstrada em câncer pancreático, leucemia e glioblastoma.",
        },
        {
          title: "Pincus MR et al. PNC-27, a p53-derived peptide that induces cancer cell-selective membrane disruption",
          meta: "Animal/Celular · Paper de caracterização de PNC-27 pelo grupo de Michael Pincus em Stony Brook/Memorial Sloan Kettering",
          year: "2011",
          summary: "Caracterização detalhada do mecanismo de ação de PNC-27: ligação a HDM-2 membranar tumoral, formação de poros e necrose seletiva; perfil de seletividade em painel de linhagens cancerosas vs células normais.",
        },
        {
          title: "Michl J et al. PNC-27 kills pancreatic cancer cells but spares normal pancreatic ductal cells",
          meta: "Animal/Celular · Estudo de seletividade de PNC-27 em células pancreáticas cancerosas vs normais",
          year: "2006",
          summary: "PNC-27 demonstrou citotoxicidade seletiva em linhagens de adenocarcinoma pancreático e células cancerosas isoladas de tecido de pacientes, preservando células ductais pancreáticas normais.",
        },
      ],
    },
  },
  {
    slug: "prostamax",
    name: "Prostamax",
    aliases: ["Peptídeo prostático Khavinson", "Bioregulador prostático", "Ala-Glu-Asp-Gly (tetrapeptídeo prostático)", "Prostatilen (relacionado)"],
    tagline: "Biorregulador prostático para saúde urogenital masculina",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30-60 min plasmática; efeito modulador prostático persiste via regulação gênica em células epiteliais e estromais da próstata" },
      { id: "classification", label: "Classificação", value: "Tetrapeptídeo bioregulador de tecido prostático (escola Khavinson)" },
      { id: "cycle", label: "Ciclo", value: "10 dias, 2–3x ao ano" },
      { id: "route", label: "Via", value: "Oral ou subcutânea" },
      { id: "dose", label: "Dose típica", value: "5–10 mg oral ou subcutâneo, 10 dias" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Prostamax",
      prose: "Prostamax é o tetrapeptídeo biorregulador desenvolvido por Khavinson para o tecido prostático. Demonstrou efeitos benéficos em hiperplasia prostática benigna (HPB), prostatite crônica e melhora de função urinária em estudos clínicos, com ação anti-inflamatória local.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Prostamax é um tetrapeptídeo bioregulador derivado de extrato de tecido prostático bovino, desenvolvido pelo grupo de Khavinson no Instituto de Bioregulação e Gerontologia de São Petersburgo. Sua sequência peptídica — atribuída como Ala-Glu-Asp-Gly ou variante próxima — atua como sinalizador epigenético em células epiteliais e estromais da próstata, modulando genes relacionados ao controle da proliferação, resposta inflamatória e manutenção da arquitetura glandular.\n\nO mecanismo proposto envolve interação com receptores peptídicos prostáticos, modulação de vias andrógeno-dependentes hiperativas (receptor de andrógeno - AR), redução de citocinas inflamatórias (IL-6, TNF-alfa) no microambiente prostático e regulação do equilíbrio entre proliferação e apoptose em células epiteliais. Em modelos animais, demonstrou redução de hiperplasia prostática experimental e melhora de fluxo urinário. Na literatura clínica russa, ciclos de 10-20 dias foram relatados como benéficos em hiperplasia prostática benigna (HPB) moderada, prostatite crônica não-bacteriana e sintomas do trato urinário inferior (LUTS) em homens acima dos 40 anos.\n\nImportante: este bioregulador foi desenvolvido pela escola russa de Khavinson (Instituto de Bioregulação e Gerontologia de São Petersburgo) e tem extensa literatura própria, mas validação independente ocidental ainda é limitada. As doses, indicações e mecanismos descritos refletem o protocolo russo tradicional e pesquisas do grupo de origem. Considere esse contexto ao avaliar a evidência disponível.",
      points: [
        "Modulação epigenética em células epiteliais e estromais prostáticas via peptídeo tecido-específico",
        "Modulação de vias andrógeno-dependentes hiperativas (AR) e redução de citocinas inflamatórias prostáticas",
        "Controle do equilíbrio proliferação/apoptose em epitélio prostático; redução de HPB experimental",
        "Melhora de fluxo urinário e redução de LUTS em prostatite crônica e HPB moderada",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Melhora de HPB leve a moderada",
        "Redução de inflamação prostática",
        "Melhora de sintomas urinários",
        "Saúde sexual masculina",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Redução de urgência urinária e noctúria; melhora do fluxo urinário" },
        { period: "Semana 3-4", text: "Redução progressiva de desconforto perineal; melhora do jato urinário" },
        { period: "Mês 2-3", text: "Melhora sustentada de sintomas LUTS; redução de PSA em alguns casos" },
        { period: "Mês 3+", text: "Efeitos geroprotectores prostáticos cumulativos com ciclos repetidos anuais" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "5–10 mg oral ou subcutâneo, 10 dias" },
        { label: "Via", value: "Oral (cápsulas) ou Subcutâneo" },
        { label: "Frequência", value: "1-2x/dia oral; ou 1x/dia SC; ciclos de 10-20 dias, 2-3x/ano" },
        { label: "Duração do ciclo", value: "10 dias, 2–3x ao ano" },
        { label: "Concentração", value: "Oral: cápsulas 10 mg; SC: reconstituir em 1-2 mL (5-10 mg/mL)" },
      ],
      indications: [
        { name: "Hiperplasia prostática benigna (HPB) moderada", note: "Ciclos sazonais; monitorar PSA e urofluxometria a cada 6 meses; não substitui avaliação urológica", dose: "1-2 cápsulas/dia oral × 20 dias, 2-3x/ano" },
        { name: "Prostatite crônica não-bacteriana", note: "Via SC para maior biodisponibilidade em prostatite crônica; combinar com Vesugen para suporte vascular prostático", dose: "10 mg/dia SC × 20 dias" },
        { name: "LUTS em homens 40+ sem HPB confirmada", note: "Uso preventivo em sintomas urinários leves; descartar HPB significativa ou neoplasia prostática antes de iniciar", dose: "1 cápsula/dia oral × 10 dias, 2x/ano" },
        { name: "Geroprotecção prostática preventiva", note: "Uso preventivo em homens 45+ com histórico familiar de HPB; combinar com Testagen no protocolo masculino completo Khavinson", dose: "1 cápsula/dia oral × 10 dias, 2x/ano" },
      ],
      phases: [
        { phase: "Ciclo de ataque (10-20 dias)", dose: "10 mg/dia SC ou 1-2 cápsulas/dia oral, consecutivos" },
        { phase: "Intervalo", dose: "2-4 meses sem uso entre ciclos" },
        { phase: "Ciclos de manutenção", dose: "Repetir 2-3x/ano; combinar com Testagen e Vesugen no protocolo masculino completo Khavinson" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Retirar frasco da geladeira e aguardar temperatura ambiente (~10 min)",
        "Adicionar 1-2 mL de água bacteriostática ou solução salina 0,9% com seringa estéril",
        "Rodar suavemente entre os dedos até dissolução completa — NÃO agitar",
        "Solução final: 5-10 mg/mL; usar imediatamente ou refrigerar (validade 14-21 dias)",
        "Administração oral preferida (cápsulas); SC como alternativa para maior biodisponibilidade",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Geralmente bem tolerado",
        "Dados em estudos ocidentais limitados",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Testagen", status: "Sinérgico", note: "Protocolo masculino completo Khavinson: Testagen suporta função testicular enquanto Prostamax protege próstata — duo andrológico clássico" },
        { name: "Vesugen", status: "Sinérgico", note: "Vesugen suporta microvasculatura prostática; combinação com Prostamax melhora perfusão e reduz congestão em prostatite crônica" },
        { name: "Epithalon", status: "Compatível", note: "Epithalon como hub geroprotector; ciclo combinado com Prostamax para saúde prostática no envelhecimento masculino" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 tem ação anti-inflamatória sistêmica que pode complementar a redução de citocinas inflamatórias prostáticas do Prostamax" },
        { name: "Thymosin Alpha-1", status: "Compatível", note: "Thymosin Alpha-1 modula resposta imune; relevante em prostatite crônica com componente autoimune ou inflamatório persistente" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Khavinson VKh et al. Prostatic peptide bioregulator in benign prostatic hyperplasia: clinical evaluation",
          meta: "Humano · Estudo clínico russo avaliando bioregulador prostático em pacientes com HPB e prostatite crônica",
          year: "2003",
          summary: "Administração de peptídeo prostático resultou em melhora de fluxo urinário, redução de sintomas LUTS e alívio de desconforto perineal em coorte de pacientes russos.",
        },
        {
          title: "Khavinson VKh, Morozov VG. Tissue-specific peptide bioregulators: 35 years of research",
          meta: "Revisão · Revisão abrangente dos bioreguladores Khavinson incluindo peptídeo prostático e sistema genitourinário masculino",
          year: "2008",
          summary: "Sistematização das evidências com bioreguladores tecido-específicos incluindo sistema genitourinário masculino em contexto de envelhecimento.",
        },
        {
          title: "Anisimov VN, Khavinson VKh. Peptide bioregulation of aging: results and prospects",
          meta: "Animal/Humano · Revisão sobre bioreguladores Khavinson incluindo peptídeo prostático em contexto de longevidade masculina",
          year: "2010",
          summary: "Análise dos efeitos de peptídeos tecido-específicos em saúde prostática e sistema genitourinário masculino durante o envelhecimento.",
        },
      ],
    },
  },
  {
    slug: "pt-141",
    name: "PT-141",
    aliases: ["Bremelanotide", "Vyleesi", "PT-141 acetato", "[Nle4,Asp5,D-Phe7]-α-MSH(4-9)"],
    tagline: "Bremelanotida — agonista MC4R aprovado para disfunção sexual feminina",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~2.7 horas" },
      { id: "classification", label: "Classificação", value: "Agonista seletivo MC3R/MC4R (derivado do Melanotan-2, sem efeito bronzeador)" },
      { id: "cycle", label: "Ciclo", value: "Conforme necessidade (máx 1x/24h)" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "1.75 mg subcutâneo, 45 min antes da atividade sexual" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Alto", pill: "green" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é PT-141",
      prose: "PT-141 (bremelanotida) é um análogo de melanocortina aprovado pelo FDA (Vyleesi) para disfunção sexual hipoativa em mulheres. Age centralmente via MC4R no hipotálamo, aumentando desejo sexual sem efeito vascular periférico, sendo eficaz para disfunção sexual tanto em homens quanto em mulheres.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O PT-141 (Bremelanotide) é um análogo cíclico heptapeptídico do α-MSH derivado do Melanotan-2, com maior seletividade para os receptores MC3R e MC4R. Diferentemente do MT-II, tem atividade muito reduzida no MC1R dos melanócitos, eliminando praticamente o efeito bronzeador. O mecanismo de ação sexual é central: a ativação do MC4R no hipotálamo (núcleo paraventricular, área pré-óptica medial) e no sistema límbico aumenta a motivação sexual, a excitação e facilita a resposta genital tanto em mulheres quanto em homens. Diferentemente dos inibidores de PDE5 (sildenafila, tadalafila), que atuam vasodilatando perifericamente, o PT-141 atua no SNC aumentando o desejo e a excitação — permitindo uso em disfunção sexual de origem psicológica ou hormonal. O FDA aprovou o Bremelanotide (Vyleesi®) em junho de 2019 para Transtorno do Desejo Sexual Hipoativo (HSDD) em mulheres pré-menopausa. O principal efeito colateral é elevação transitória da pressão arterial (~6–7 mmHg sistólica e ~3–4 mmHg diastólica) nas 12 horas seguintes — contraindicado em hipertensão não controlada e doença cardiovascular. Limitar uso a 8 doses por mês.",
      points: [
        "Agonista seletivo MC3R/MC4R central: aumenta desejo e excitação sexual via hipotálamo e sistema límbico.",
        "Aprovado pelo FDA (2019) como Vyleesi® para HSDD em mulheres pré-menopausa.",
        "Sem efeito bronzeador (atividade MC1R mínima) — diferencial do Melanotan-2.",
        "Elevação transitória de PA (~6–7 mmHg sistólica por 12 h): contraindicado em hipertensos não controlados.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Aumento de desejo sexual (homens e mulheres)",
        "Melhora de função erétil",
        "Aprovado pelo FDA (mulheres)",
        "Ação central sem efeito vascular",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Dose 1–3 (adaptação)", text: "Náusea leve a moderada; flush facial; avaliação de resposta sexual nas primeiras doses" },
        { period: "Dose 4–8 (efeito estabelecido)", text: "Resposta sexual consistente ~45–60 min após injeção; tolerância GI melhorada" },
        { period: "Mês 2-3", text: "Uso on-demand consolidado; efeito mais previsível com experiência de dosagem pessoal" },
        { period: "Mês 3+", text: "Limitar a no máximo 8 doses/mês; avaliar PA regularmente em uso crônico" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "1.75 mg subcutâneo, 45 min antes da atividade sexual" },
        { label: "Via", value: "Subcutâneo (abdômen ou coxa)" },
        { label: "Frequência", value: "On-demand (máximo 1 dose/dia e 8 doses/mês)" },
        { label: "Duração do ciclo", value: "Conforme necessidade (máx 1x/24h)" },
        { label: "Concentração", value: "1 mL = 1.75 mg/mL (dose única)" },
      ],
      indications: [
        { name: "HSDD em mulheres (aprovado FDA)", note: "45 min antes da atividade sexual; máximo 1 dose/24 h e 8 doses/mês", dose: "1.75 mg SC on-demand" },
        { name: "Disfunção erétil em homens (off-label)", note: "45–60 min antes; pode ser combinado com baixa dose de PDE5i se necessário", dose: "1.0–1.75 mg SC on-demand" },
        { name: "Dose reduzida inicial (tolerância GI)", note: "Primeiras 2–3 doses para avaliar tolerância a náusea e resposta pressórica", dose: "1.0 mg SC" },
        { name: "Disfunção sexual psicogênica", note: "Ação central (SNC) torna o PT-141 útil quando PDE5i são insuficientes", dose: "1.75 mg SC on-demand" },
      ],
      phases: [
        { phase: "Doses 1–3 (titulação)", dose: "1.0 mg SC on-demand — avaliar tolerância" },
        { phase: "Dose padrão (aprovada FDA)", dose: "1.75 mg SC on-demand, 45 min antes" },
        { phase: "Limite mensal", dose: "Máximo 8 doses/mês; monitorar PA em uso contínuo" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 1.0 mL de água bacteriostática com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma",
        "Girar suavemente até dissolver completamente",
        "Rotular e refrigerar a 2–8°C, proteger da luz",
        "Produto aprovado (Vyleesi) vem em auto-injetor pronto para uso — sem reconstituição",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Náusea intensa",
        "Rubor facial",
        "Cefaleia",
        "Hiperpigmentação com uso regular",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Melanotan-2", status: "Monitorar", note: "Ambos ativam MC4R: não combinar; risco cumulativo de hipertensão, náusea e efeitos melanocortínicos excessivos." },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 modula vias dopaminérgicas e serotonérgicas relacionadas à função sexual; mecanismos distintos do PT-141 (MC4R)." },
        { name: "Selank", status: "Compatível", note: "Selank reduz ansiedade de performance; PT-141 atua centralmente no desejo. Compõem abordagem multifatorial de disfunção sexual." },
        { name: "Anti-hipertensivos", status: "Monitorar", note: "PT-141 eleva PA transitoriamente; combinação com anti-hipertensivos pode resultar em resposta pressórica imprevisível." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Bremelanotide (PT-141) for hypoactive sexual desire disorder in premenopausal women: RECONNECT study",
          meta: "Humans · RCT fase 3",
          year: "2019",
          summary: "Ensaio clínico fase 3 que embasou a aprovação FDA do Vyleesi: bremelanotide 1,75 mg SC aumentou significativamente desejo sexual e reduziu angústia associada vs placebo em mulheres pré-menopausa com HSDD ao longo de 24 semanas.",
        },
        {
          title: "Bremelanotide (PT-141) FDA approval 2019: clinical pharmacology and mechanism of action summary",
          meta: "Humans · revisão regulatória",
          year: "2019",
          summary: "Revisão pós-aprovação FDA descrevendo o mecanismo de ação central do bremelanotide via MC4R hipotalâmico, perfil farmacocinético, efeitos colaterais (náusea, elevação transitória de PA) e contraindicações cardiovasculares.",
        },
        {
          title: "Central melanocortin system and sexual function: MC4R as target for female and male sexual dysfunction",
          meta: "Review · revisão",
          year: "2015",
          summary: "Revisão do papel do sistema melanocortínico central, especialmente MC4R, na mediação de comportamento e função sexual em modelos animais e humanos, estabelecendo a base para o desenvolvimento do PT-141 e bremelanotide.",
        },
      ],
    },
  },
  {
    slug: "retatrutide",
    name: "Retatrutide",
    aliases: ["LY3437943", "Triple G", "Triincretina", "GLP-1/GIP/Glucagon triple agonist"],
    tagline: "Agonista triplo GLP-1/GIP/glucagon — maior eficácia já documentada",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~6 dias (estimativa fase 2)" },
      { id: "classification", label: "Classificação", value: "Agonista triplo GLP-1/GIP/Glucagon (triincretina) — Fase 3 em andamento" },
      { id: "cycle", label: "Ciclo", value: "24–52 semanas (estudos clínicos em andamento)" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "4–12 mg subcutâneo, 1x por semana" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Retatrutide",
      prose: "Retatrutide (LY3437943, Eli Lilly) é um agonista triplo dos receptores GLP-1, GIP e glucagon. No estudo de fase II publicado no NEJM (2023), demonstrou perda de peso média de ~24% do peso corporal em 48 semanas — a maior já documentada com farmacologia para obesidade.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O Retatrutide (LY3437943) é um análogo peptídico de cadeia única desenvolvido pela Eli Lilly que ativa simultaneamente os receptores de GLP-1 (peptídeo-1 semelhante ao glucagon), GIP (peptídeo insulinotrópico dependente de glicose) e glucagon — sendo por isso denominado \"triincretina\". O componente GLP-1 suprime o apetite via núcleo arqueado hipotalâmico, retarda o esvaziamento gástrico e potencializa a secreção de insulina glicose-dependente. O componente GIP amplifica os efeitos anorexígenos e a resposta insulínica. O componente glucagônico é o grande diferencial: ativa receptores GCGR em adipócitos e hepatócitos, aumentando o gasto energético basal por termogênese (ativação de tecido adiposo marrom/beige), acelerando a lipólise visceral e hepática, e reduzindo a esteatose (MASH/NAFLD). Essa sinergia tripla produz a maior perda de peso documentada em ensaio clínico de fase 2: no estudo TRIUMPH publicado no New England Journal of Medicine em 2023 (Jastreboff et al.), a dose de 12 mg/semana resultou em perda média de 24,2% do peso corporal em 48 semanas — superando semaglutida (~15%) e tirzepatida (~21%). O programa TRIUMPH fase 3 está em andamento para obesidade, T2DM e MASH. IMPORTANTE: o Retatrutide NÃO está aprovado pelo FDA, ANVISA ou qualquer agência regulatória — é composto de pesquisa clínica avançada.",
      points: [
        "Agonista triplo GLP-1/GIP/Glucagon: maior perda de peso da classe (~24% em 48 semanas — TRIUMPH, fase 2).",
        "Componente glucagônico (GCGR): aumenta gasto energético, termogênese e lipólise hepática — diferencial vs semaglutida/tirzepatida.",
        "Programa TRIUMPH fase 3 em andamento para obesidade, T2DM e MASH.",
        "NÃO aprovado FDA/ANVISA — composto de pesquisa clínica avançada.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Maior perda de peso documentada (~24%)",
        "Redução de gordura visceral e hepática",
        "Melhora de todos os marcadores metabólicos",
        "Injeção semanal",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Náusea adaptativa; redução de apetite pronunciada; gasto energético em elevação" },
        { period: "Semana 3-4", text: "Adaptação GI; perda de peso acelerada (~1-1.5 kg/semana com escalonamento correto)" },
        { period: "Mês 2-3", text: "Perda de peso expressiva com escalonamento de dose; melhora de marcadores hepáticos e metabólicos" },
        { period: "Mês 3+", text: "Perda sustentada com potencial de até ~24% do peso na dose máxima; aguardar dados fase 3" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "4–12 mg subcutâneo, 1x por semana" },
        { label: "Via", value: "Subcutâneo (abdômen, coxa ou braço)" },
        { label: "Frequência", value: "1× por semana" },
        { label: "Duração do ciclo", value: "24–52 semanas (estudos clínicos em andamento)" },
        { label: "Concentração", value: "1 mL = 6 mg/mL (estimativa; concentrações dos ensaios clínicos)" },
      ],
      indications: [
        { name: "Titulação inicial (fase 2 TRIUMPH)", note: "4 semanas para tolerância GI; escalonamento a cada 4 semanas", dose: "2 mg/semana SC" },
        { name: "Dose intermediária", note: "Após 4 semanas na dose de 2 mg", dose: "4 mg/semana SC" },
        { name: "Dose terapêutica principal", note: "Após escalonamento progressivo; maior parte da perda de peso ocorre nesta faixa", dose: "8 mg/semana SC" },
        { name: "Dose máxima (fase 2)", note: "Apenas sob supervisão médica; perda média de 24,2% em 48 semanas no TRIUMPH — VERIFICAR", dose: "12 mg/semana SC" },
      ],
      phases: [
        { phase: "Semanas 1–4", dose: "2 mg/semana" },
        { phase: "Semanas 5–8", dose: "4 mg/semana" },
        { phase: "Semanas 9–12", dose: "8 mg/semana" },
        { phase: "Semanas 13+", dose: "12 mg/semana (se tolerado — dose máxima fase 2)" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 1.0 mL de água bacteriostática com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma",
        "Girar suavemente até dissolver (não agitar)",
        "Rotular e refrigerar a 2–8°C, proteger da luz",
        "Válido por 28 dias após reconstituição; NÃO congelar",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Náusea e vômito intensos na titulação",
        "Diarreia",
        "Possível pancreatite",
        "Risco teórico de tumor de células C da tireoide",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Semaglutida", status: "Monitorar", note: "Nunca combinar dois agonistas de incretinas: risco cumulativo de vômitos incoercíveis, desidratação severa e hipoglicemia." },
        { name: "Tirzepatida", status: "Monitorar", note: "Retatrutide já incorpora os mecanismos GLP-1+GIP da tirzepatida mais glucagon. Combinação sem sentido clínico e com risco elevado." },
        { name: "AOD-9604", status: "Compatível", note: "AOD-9604 atua via β3-AR adipocitário independente de receptores de incretina; sem interação farmacológica conhecida." },
        { name: "5-Amino-1MQ", status: "Compatível", note: "Vias distintas (NNMT/NAD+ vs incretinas); podem complementar recomposição metabólica sob supervisão." },
        { name: "Insulina", status: "Monitorar", note: "Risco de hipoglicemia severa — retatrutide reduz resistência insulínica; ajuste de dose de insulina obrigatório sob supervisão médica." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Triple-Hormone-Receptor Agonist Retatrutide for Obesity — A Phase 2 Trial (TRIUMPH)",
          meta: "Humans · RCT fase 2",
          year: "2023",
          summary: "Jastreboff et al. (NEJM): 338 adultos com obesidade randomizados para retatrutide (1,5–12 mg/semana) vs placebo por 48 semanas. Dose de 12 mg produziu perda média de 24,2% do peso corporal — maior eficácia já documentada em ensaio clínico de incretinas.",
        },
        {
          title: "Retatrutide in type 2 diabetes: glycemic and weight outcomes from the TRIUMPH-DM phase 2 trial",
          meta: "Humans · RCT fase 2",
          year: "2023",
          summary: "Estudo de fase 2 paralelo avaliando retatrutide em pacientes com T2DM, demonstrando redução significativa de HbA1c e peso corporal, com perfil de segurança compatível com os dados de obesidade do TRIUMPH principal.",
        },
        {
          title: "Triple receptor agonism in obesity and MASH: rationale and early clinical evidence for GLP-1/GIP/Glucagon co-agonism",
          meta: "Review · revisão",
          year: "2024",
          summary: "Revisão do racional biológico para o agonismo triplo GLP-1/GIP/Glucagon, discutindo por que a ativação do GCGR adiciona gasto energético e lipólise hepática além do que é possível com agonismo dual GIP/GLP-1.",
        },
      ],
    },
  },
  {
    slug: "selank",
    name: "Selank",
    aliases: ["TP-7", "Selanc", "Thr-Lys-Pro-Arg-Pro-Gly-Pro", "Selank acetato"],
    tagline: "Ansiolítico nootrópico sem dependência nem sedação",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~3–4 horas (intranasal)" },
      { id: "classification", label: "Classificação", value: "Heptapeptídeo ansiolítico/nootrópico (análogo de tuftsin)" },
      { id: "cycle", label: "Ciclo", value: "4–8 semanas; fazer pausa de 2 semanas entre ciclos" },
      { id: "route", label: "Via", value: "Intranasal (forma preferencial) ou subcutânea" },
      { id: "dose", label: "Dose típica", value: "250–500 mcg/aplicação, 1–2× ao dia" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Selank",
      prose: "Selank é um peptídeo sintético heptamérico derivado da tuftsin (Thr-Lys-Pro-Arg), desenvolvido pelo Instituto de Química Bioorgânica da Academia Russa de Ciências. Combina atividade ansiolítica, nootrópica e imunomoduladora sem os efeitos sedativos e o potencial de dependência dos benzodiazepínicos.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O Selank é um heptapeptídeo sintético russo desenvolvido no Instituto de Química Molecular da Academia Russa de Ciências, derivado da sequência do tuftsin (Thr-Lys-Pro-Arg) com adição da extensão Pro-Gly-Pro que confere estabilidade metabólica. Atua como ansiolítico não-sedativo, modulando o sistema GABAérgico de forma distinta dos benzodiazepínicos — sem causar dependência física, tolerância comportamental ou sedação. O mecanismo central envolve aumento da expressão de BDNF (fator neurotrófico derivado do cérebro) no hipocampo e córtex pré-frontal, modulação dos receptores GABA-A e regulação de encefalinas endógenas (inibindo a enzima encefalinase). Estudos clínicos russos demonstraram eficácia em transtornos de ansiedade generalizada, com melhora significativa de humor, cognição, atenção e memória de trabalho, sem os efeitos cognitivos negativos dos ansiolíticos convencionais. A via intranasal é preferida: absorção rápida pelo epitélio nasal com distribuição direta ao SNC via nervo olfatório, contornando parcialmente a barreira hematoencefálica.",
      points: [
        "Modulação GABAérgica não-sedativa: ansiolítico sem dependência, tolerância ou rebote.",
        "Aumenta expressão de BDNF no hipocampo e córtex pré-frontal, favorecendo plasticidade neural.",
        "Inibe encefalinase, elevando nível de encefalinas endógenas (efeito ansiolítico e analgésico leve).",
        "Via intranasal distribui diretamente ao SNC via epitélio olfatório, com onset em ~15–30 min.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Ansiolítico eficaz sem sedação, tolerância ou dependência",
        "Melhora de memória operacional e aprendizado",
        "Aumento do BDNF (neurotrofismo e neuroplasticidade)",
        "Imunomodulação e maior resistência ao estresse oxidativo",
        "Melhora do humor e da clareza mental (sem euforia)",
        "Potencial em transtornos de ansiedade generalizada",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Redução perceptível de ansiedade aguda; melhora de humor e sono; onset em minutos via intranasal" },
        { period: "Semana 3-4", text: "Efeitos ansiolíticos consolidados; melhora de memória de trabalho e foco; ausência de sedação" },
        { period: "Mês 2-3", text: "Benefícios cognitivos sustentados; possível melhora em marcadores de neuroinflamação" },
        { period: "Mês 3+", text: "Avaliação de necessidade; ciclos de 4–8 semanas com pausas são preferidos para evitar adaptação" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "250–500 mcg/aplicação, 1–2× ao dia" },
        { label: "Via", value: "Intranasal (preferencial) ou Subcutâneo" },
        { label: "Frequência", value: "2–3× ao dia" },
        { label: "Duração do ciclo", value: "4–8 semanas; fazer pausa de 2 semanas entre ciclos" },
        { label: "Concentração", value: "1 mL = 250 mcg/gota (frasco nasal calibrado)" },
      ],
      indications: [
        { name: "Ansiedade aguda / situacional", note: "Uso pontual; onset em 15–30 min; sem sedação", dose: "250 mcg intranasal (1 gota por narina)" },
        { name: "Ansiedade crônica / TAG", note: "Ciclos de 4–8 semanas; manhã, meio-dia e noite", dose: "250–500 mcg 2–3×/dia intranasal" },
        { name: "Nootrópico / foco cognitivo", note: "Manhã e início da tarde; potencializa concentração sem estimulação excessiva", dose: "250 mcg 1–2×/dia intranasal" },
        { name: "Suporte ao sono / ansiedade noturna", note: "Via SC se intranasal não disponível; efeito mais prolongado", dose: "250–500 mcg SC antes de dormir" },
      ],
      phases: [
        { phase: "Semanas 1–4 (indução)", dose: "250 mcg 2–3×/dia" },
        { phase: "Semanas 5–8 (manutenção)", dose: "250 mcg 1–2×/dia conforme necessidade" },
        { phase: "Pausa (2–4 semanas)", dose: "Avaliar manutenção de benefícios sem o peptídeo" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 1.0 mL de água bacteriostática com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma",
        "Girar suavemente até dissolver completamente",
        "Transferir para frasco nasal com conta-gotas calibrado (250 mcg/gota é o padrão)",
        "Refrigerar a 2–8°C, proteger da luz; válido por 14 dias após reconstituição",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Tolerância possível com uso contínuo prolongado",
        "Sonolência leve (dose-dependente)",
        "Congestão ou irritação nasal com uso intranasal frequente",
        "Dados clínicos em humanos ainda limitados à literatura russa",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Semax", status: "Sinérgico", note: "Combinação clássica russa: Selank reduz ansiedade e estresse; Semax eleva BDNF/NGF e foco. Efeitos complementares sem sobreposição farmacológica." },
        { name: "Epithalon", status: "Compatível", note: "Epithalon melhora qualidade do sono via melatonina; Selank reduz ansiedade; juntos potencializam recuperação neurológica noturna." },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 modula dopamina e serotonina; Selank modula GABA e encefalinas. Vias distintas com possível complementaridade em quadros de ansiedade e recuperação." },
        { name: "Benzodiazepínicos", status: "Monitorar", note: "Selank modula receptores GABA-A: combinação com benzodiazepínicos pode resultar em sedação excessiva e potenciação imprevisível." },
      ],
      bundles: [
        { name: "Neuro Boost", category: "Cognição", items: ["Semax", "Selank"], goal: "Cognição e Nootrópico" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Selank and its analogs: anxiolytic and nootropic properties without sedation",
          meta: "Humans / Rats · ensaio clínico / pré-clínico",
          year: "2008",
          summary: "Estudo russo demonstrando eficácia ansiolítica do Selank em modelos animais e voluntários humanos com transtorno de ansiedade generalizada, sem os efeitos sedativos ou de dependência dos benzodiazepínicos.",
        },
        {
          title: "BDNF modulation by Selank: neuroprotective and cognitive-enhancing mechanisms",
          meta: "Rats · neurociência / pré-clínico",
          year: "2015",
          summary: "Demonstrou que o Selank aumenta a expressão de BDNF no hipocampo e córtex, correlacionando-se com melhora de memória espacial e resistência ao estresse em modelos murinos.",
        },
        {
          title: "Anxiolytic peptides derived from tuftsin: pharmacological profile and clinical applications",
          meta: "Review · revisão",
          year: "2012",
          summary: "Revisão do desenvolvimento de análogos ansiolíticos derivados do tuftsin, incluindo Selank, descrevendo mecanismos GABAérgicos, encefalinérgicos e neuotróficos.",
        },
      ],
    },
  },
  {
    slug: "semaglutida",
    name: "Semaglutida",
    aliases: ["Ozempic", "Wegovy", "Rybelsus", "Semaglutide"],
    tagline: "Análogo GLP-1 de ação semanal com evidência robusta",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~7 dias" },
      { id: "classification", label: "Classificação", value: "Agonista do receptor GLP-1" },
      { id: "cycle", label: "Ciclo", value: "16–68 semanas (uso contínuo para manutenção)" },
      { id: "route", label: "Via", value: "Subcutânea (semanal, mesmo dia); comprimido oral disponível para DM2" },
      { id: "dose", label: "Dose típica", value: "0,25 mg/semana (início) → titulação gradual até 2,4 mg/semana" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Alto", pill: "green" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Semaglutida",
      prose: "Semaglutida é um análogo do GLP-1 (Glucagon-like peptide-1) de ação prolongada, aprovado pelo FDA e Anvisa para diabetes tipo 2 (Ozempic®) e obesidade (Wegovy®). É o padrão-ouro atual para farmacoterapia da obesidade, com o maior volume de evidências clínicas entre os análogos de GLP-1.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "A Semaglutida é um análogo do GLP-1 (peptídeo similar ao glucagon-1) modificado para resistir à degradação pela DPP-4, conferindo meia-vida estendida de ~7 dias. Atua nos receptores GLP-1 do pâncreas (aumentando secreção de insulina glicose-dependente), hipotálamo (suprimindo apetite via núcleo arqueado), trato gastrointestinal (retardando esvaziamento gástrico) e sistema cardiovascular. Reduz HbA1c, peso corporal, eventos cardiovasculares maiores em populações de alto risco.",
      points: [
        "Agonista do receptor GLP-1 (similar ao glucagon-1).",
        "Aumenta secreção de insulina glicose-dependente.",
        "Reduz apetite via ação hipotalâmica.",
        "Retarda esvaziamento gástrico, aumentando saciedade.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Perda de peso robusta: 15–20% do peso corporal (STEP 1)",
        "Redução significativa do apetite e compulsão alimentar",
        "Controle glicêmico superior com redução de HbA1c",
        "Benefícios cardiovasculares comprovados (SUSTAIN-6, SELECT)",
        "Redução de gordura hepática (esteatose/NASH)",
        "Melhora de marcadores lipídicos e pressão arterial",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-4", text: "Náusea adaptativa; redução de apetite começa" },
        { period: "Semana 5-12", text: "Perda de peso progressiva (~1-1.5%/mês); melhora glicêmica" },
        { period: "Mês 4-6", text: "Perda de peso estabilizada (10-15% peso inicial); HbA1c reduzida significativamente" },
        { period: "Mês 12+", text: "Manutenção de perda; ajuste de dose ou retirada gradual" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "0,25 mg/semana (início) → titulação gradual até 2,4 mg/semana" },
        { label: "Via", value: "Subcutâneo (abdômen, coxa ou braço)" },
        { label: "Frequência", value: "1x por semana" },
        { label: "Duração do ciclo", value: "16–68 semanas (uso contínuo para manutenção)" },
        { label: "Concentração", value: "1 mL = 5 mg/mL (vial de 5mg)" },
      ],
      indications: [
        { name: "Início / titulação (4 semanas)", note: "Mínimo para tolerância", dose: "0.25 mg/semana" },
        { name: "Dose intermediária", note: "Após 4 semanas", dose: "0.5 mg/semana" },
        { name: "Manutenção / perda de peso", note: "Titulação a cada 4 semanas", dose: "1.0–1.7 mg/semana" },
        { name: "Dose máxima (obesidade)", note: "Apenas com supervisão médica", dose: "2.4 mg/semana" },
      ],
      phases: [
        { phase: "Semanas 1-4", dose: "0.25 mg" },
        { phase: "Semanas 5-8", dose: "0.5 mg" },
        { phase: "Semanas 9-12", dose: "1.0 mg" },
        { phase: "Semanas 13+", dose: "1.7-2.4 mg (se tolerado)" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 1.0 mL de água bacteriostática com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma",
        "Girar suavemente até dissolver (não agitar)",
        "Rotular e refrigerar a 2–8°C, proteger da luz",
        "Válido por 28-30 dias após reconstituição",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Náusea e vômito (principalmente no início da titulação)",
        "Diarreia ou constipação",
        "Dor abdominal e refluxo",
        "Risco teórico de pancreatite (monitorar)",
        "Perda de massa magra sem exercício resistido",
        "Contraindicado em histórico pessoal/familiar de carcinoma medular de tireoide",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "AOD-9604", status: "Sinérgico", note: "Mecanismos complementares de perda de gordura sem afetar massa muscular." },
        { name: "5-Amino-1MQ", status: "Compatível", note: "Vias metabólicas distintas; pode potencializar perda de gordura." },
        { name: "Tirzepatida", status: "Monitorar", note: "Não combinar dois agonistas GLP-1 — risco de desidratação severa e hipoglicemia." },
        { name: "Insulina exógena", status: "Monitorar", note: "Risco de hipoglicemia severa. Ajuste de dose obrigatório." },
      ],
      bundles: [
        { name: "Metabolic Reset", category: "Emagrecimento", items: ["Semaglutida", "AOD-9604"], goal: "Emagrecimento Avançado" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Once-Weekly Semaglutide in Adults with Overweight or Obesity (STEP 1)",
          meta: "Humans · RCT fase 3",
          year: "2021",
          summary: "Ensaio clínico randomizado com 1961 adultos demonstrou perda média de 14.9% do peso corporal com semaglutida 2.4mg/semana vs 2.4% placebo em 68 semanas.",
        },
        {
          title: "Cardiovascular Outcomes with Semaglutide in T2DM (SUSTAIN-6)",
          meta: "Humans · RCT fase 3",
          year: "2016",
          summary: "Demonstrou redução de eventos cardiovasculares maiores em pacientes com diabetes tipo 2 de alto risco usando semaglutida.",
        },
        {
          title: "Semaglutide and cardiovascular outcomes in obesity without diabetes (SELECT)",
          meta: "Humans · RCT fase 3",
          year: "2023",
          summary: "Reduziu em 20% o risco de eventos cardiovasculares maiores em adultos com obesidade e doença cardiovascular pré-existente, sem diabetes.",
        },
      ],
    },
  },
  {
    slug: "semax",
    name: "Semax",
    aliases: ["Met-Glu-His-Phe-Pro-Gly-Pro", "N-Acetyl Semax", "N-Acetyl Semax Amidate", "ACTH(4-10) analogue"],
    tagline: "Nootrópico e neuroprotetor de origem soviética",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~3–4 horas (intranasal); N-acetil: ~5–6 horas" },
      { id: "classification", label: "Classificação", value: "Heptapeptídeo nootrópico/neuroprotetor (análogo de ACTH 4-10)" },
      { id: "cycle", label: "Ciclo", value: "4–8 semanas; evitar uso após 16h para não prejudicar o sono" },
      { id: "route", label: "Via", value: "Intranasal (forma preferencial); subcutânea para efeito mais prolongado" },
      { id: "dose", label: "Dose típica", value: "200–600 mcg/aplicação, 1× ao dia (manhã)" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Semax",
      prose: "Semax é um heptapeptídeo sintético baseado no fragmento 4-10 do ACTH, desenvolvido originalmente na URSS para tratamento de AVC isquêmico e lesão cerebral. Hoje é aprovado na Rússia para uso clínico neurológico e amplamente utilizado como nootrópico e neuroprotetor de alto potencial.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O Semax é um heptapeptídeo sintético russo derivado do fragmento 4-10 do ACTH (hormônio adrenocorticotrófico), desenvolvido pelo Instituto de Biologia Molecular da Academia Russa de Ciências. Diferentemente do ACTH completo, o Semax não estimula a produção de cortisol adrenal, atuando exclusivamente no SNC como nootrópico e neuroprotetor. O mecanismo principal envolve a elevação rápida dos níveis de BDNF (fator neurotrófico derivado do cérebro) e NGF (fator de crescimento nervoso) no hipocampo e córtex pré-frontal, favorecendo plasticidade sináptica, sobrevivência neuronal e mielinização. Modula os sistemas dopaminérgico e serotonérgico, melhorando concentração, memória de trabalho, resistência ao estresse cognitivo e tempo de reação. A variante N-Acetil Semax (e N-Acetil Semax Amidate) apresenta maior lipofilia, potência e duração de ação. Aprovado na Rússia para tratamento de AVC isquêmico, lesão cerebral traumática e déficits cognitivos. A via intranasal permite distribuição eficiente ao SNC via epitélio olfatório.",
      points: [
        "Eleva BDNF e NGF no hipocampo e córtex — neuroproteção e plasticidade sináptica.",
        "Derivado de ACTH(4-10) sem efeito adrenal: não eleva cortisol.",
        "Modula dopamina e serotonina: melhora de foco, memória de trabalho e humor.",
        "N-Acetil Semax: variante mais potente e de ação mais prolongada que a forma padrão.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Aumento expressivo de BDNF e NGF no hipocampo",
        "Melhora de memória, concentração e velocidade de processamento",
        "Neuroproteção contra isquemia cerebral e estresse oxidativo",
        "Efeito adaptogênico e redutor de fadiga mental",
        "Potencial em TDAH e déficit cognitivo relacionado à idade",
        "Aprovado clinicamente na Rússia para AVCi",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Melhora de foco e clareza mental percebida nas primeiras doses; onset em 30–60 min" },
        { period: "Semana 3-4", text: "Melhora consolidada de memória de trabalho; redução de névoa mental; mais energia mental" },
        { period: "Mês 2-3", text: "Benefícios neuroprotetores acumulados; possível melhora em quadros de neuroinflamação crônica" },
        { period: "Mês 3+", text: "Ciclos de 4–8 semanas com pausas preferidos; avaliar manutenção de benefícios cognitivos" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "200–600 mcg/aplicação, 1× ao dia (manhã)" },
        { label: "Via", value: "Intranasal (preferencial) ou Subcutâneo" },
        { label: "Frequência", value: "2–3× ao dia" },
        { label: "Duração do ciclo", value: "4–8 semanas; evitar uso após 16h para não prejudicar o sono" },
        { label: "Concentração", value: "1 mL = 250 mcg/gota (frasco nasal calibrado)" },
      ],
      indications: [
        { name: "Nootrópico / foco e produtividade", note: "Manhã e início da tarde; não usar próximo ao sono pelo efeito estimulante", dose: "250–500 mcg intranasal 1–2×/dia" },
        { name: "Neuroproteção / recuperação pós-AVC", note: "Uso clínico russo; idealmente sob supervisão médica", dose: "500–1000 mcg/dia intranasal" },
        { name: "Déficit cognitivo / névoa mental", note: "Ciclos de 4–6 semanas; manhã e meio-dia", dose: "250–500 mcg 2×/dia intranasal" },
        { name: "N-Acetil Semax (variante potente)", note: "Dose menor pela maior potência; observar efeito estimulante", dose: "100–300 mcg 1–2×/dia" },
      ],
      phases: [
        { phase: "Semanas 1–6 (ciclo ativo)", dose: "250–500 mcg 2×/dia intranasal" },
        { phase: "Pausa (2–4 semanas)", dose: "Avaliar manutenção de benefícios cognitivos sem o peptídeo" },
        { phase: "Ciclo seguinte", dose: "Retomar mesma dose ou usar N-Acetil Semax em dose reduzida" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 1.0 mL de água bacteriostática com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma",
        "Girar suavemente até dissolver completamente",
        "Transferir para frasco nasal com conta-gotas calibrado (250 mcg/gota é o padrão russo)",
        "Refrigerar a 2–8°C, proteger da luz; válido por 14 dias após reconstituição",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Estimulação excessiva se usado à tarde (prejudica sono)",
        "Irritação nasal com uso intranasal prolongado",
        "Elevação leve da pressão arterial em susceptíveis",
        "Dados clínicos ocidentais ainda escassos",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Selank", status: "Sinérgico", note: "Combinação clássica: Semax eleva BDNF/NGF e foco cognitivo; Selank reduz ansiedade. Efeitos complementares sem sobreposição farmacológica — cognição + ansiedade." },
        { name: "Epithalon", status: "Compatível", note: "Epithalon melhora sono e circadiano; Semax otimiza função cognitiva diurna. Compõem stack de saúde neurológica abrangente." },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 modula vias dopaminérgicas e serotonérgicas; Semax atua em BDNF/NGF. Vias distintas com possível complementaridade em neuroproteção." },
        { name: "Cafeína", status: "Monitorar", note: "Combinação pode resultar em superestimulação do SNC; reduzir dose de cafeína e monitorar FC e PA." },
        { name: "Antidepressivos", status: "Monitorar", note: "Semax modula serotonina e dopamina; combinação com ISRS ou IRSN pode alterar perfil farmacológico; consultar médico." },
      ],
      bundles: [
        { name: "Neuro Boost", category: "Cognição", items: ["Semax", "Selank"], goal: "Cognição e Nootrópico" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Semax (ACTH 4-10 analogue) increases BDNF expression in rat brain regions",
          meta: "Rats · neurociência / pré-clínico",
          year: "2007",
          summary: "Estudo demonstrou que o Semax eleva significativamente a expressão de BDNF no hipocampo e córtex de ratos, correlacionando-se com melhora de memória e proteção contra lesão isquêmica.",
        },
        {
          title: "Neuroprotective effects of Semax in ischemic stroke: clinical evidence from Russian trials",
          meta: "Humans · ensaio clínico",
          year: "2011",
          summary: "Revisão de ensaios clínicos russos demonstrando eficácia do Semax intranasal no tratamento agudo e subagudo de AVC isquêmico, com redução de déficits neurológicos e melhora de recuperação funcional.",
        },
        {
          title: "ACTH(4-10) analogues as cognitive enhancers: mechanisms and applications",
          meta: "Review · revisão",
          year: "2014",
          summary: "Revisão dos mecanismos pelos quais o Semax e análogos do ACTH(4-10) exercem efeitos nootrópicos via modulação de BDNF, NGF, dopamina e serotonina, sem a atividade adrenocorticotrófica do ACTH completo.",
        },
      ],
    },
  },
  {
    slug: "sermorelin",
    name: "Sermorelin",
    aliases: ["Sermorelin acetato", "GRF(1-29)-NH2", "Geref", "GHRH(1-29)", "Sermorelin GHRH 29"],
    tagline: "GHRH análogo fisiológico aprovado para deficiência de GH",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~10–20 minutos" },
      { id: "classification", label: "Classificação", value: "Análogo do GHRH (primeiros 29 aminoácidos) — primeiro análogo GHRH aprovado FDA" },
      { id: "cycle", label: "Ciclo", value: "3–6 meses" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "200–500 mcg subcutâneo, ao dormir" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Alto", pill: "green" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Sermorelin",
      prose: "Sermorelin (GHRH 1-29) é um análogo sintético dos primeiros 29 aminoácidos do hormônio liberador de GH. Foi o primeiro secretagogo de GH aprovado pelo FDA e é amplamente usado off-label em adultos para otimização hormonal e rejuvenescimento por estimular GH de forma fisiológica.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "A Sermorelin é um peptídeo sintético de 29 aminoácidos correspondente ao fragmento 1-29 do GHRH humano (GRF 1-29-NH2), representando a sequência mínima necessária para atividade biológica plena no receptor GHRH-R hipofisário. Foi o primeiro análogo de GHRH aprovado pelo FDA (Geref®, 1997) para diagnóstico e tratamento de deficiência de GH em crianças com crescimento reduzido. Ao contrário do HGH exógeno, a Sermorelin não substitui o GH — ela estimula a hipófise anterior a produzir e liberar GH endógeno de forma pulsátil, preservando completamente o eixo hipotálamo-hipofisário, o feedback negativo da somatostatina e o ritmo circadiano de GH. A meia-vida muito curta (~10–20 min) imita fielmente o padrão fisiológico dos pulsos de GHRH endógeno, minimizando dessensibilização do GHRH-R. O Geref foi descontinuado nos EUA em 2008 por questões comerciais (não de segurança), mas permanece amplamente disponível em farmácias de compounding como opção fisiológica e mais acessível que o HGH exógeno. Considerada a opção entry-level mais segura para reposição de GH — a maior potência (e risco) vem com CJC-1295-DAC, Tesamorelin e o próprio HGH exógeno. Aplicação noturna (30 min antes de dormir) maximiza o efeito por coincidir com o principal pulso de GH do ciclo circadiano.",
      points: [
        "Primeiros 29 aa do GHRH: sequência mínima com atividade plena no receptor GHRH-R hipofisário.",
        "Estimula GH endógeno pulsátil — preserva eixo hipotálamo-hipofisário e ritmo circadiano.",
        "Primeiro análogo GHRH aprovado FDA (Geref®, 1997); descontinuado em 2008 por questões comerciais.",
        "Opção mais fisiológica e de menor risco que CJC-1295-DAC ou HGH exógeno para anti-aging entry-level.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Aumento fisiológico de GH",
        "Melhora da composição corporal",
        "Melhora da qualidade do sono",
        "Efeito anti-aging moderado",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Melhora da qualidade do sono e sonhos mais vívidos; sensação de recuperação noturna aumentada" },
        { period: "Semana 3-4", text: "Elevação de IGF-1 mensurável; melhora de energia e disposição; possível redução de gordura abdominal" },
        { period: "Mês 2-3", text: "Melhora de composição corporal; pele mais firme; recuperação pós-treino otimizada" },
        { period: "Mês 3+", text: "Benefícios sustentados com uso contínuo; pausas de 4 semanas a cada 12–16 semanas recomendadas" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "200–500 mcg subcutâneo, ao dormir" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "1× ao dia (30 min antes de dormir)" },
        { label: "Duração do ciclo", value: "3–6 meses" },
        { label: "Concentração", value: "2 mL = 250 mcg/mL (vial de 500 mcg ou 3 mg)" },
      ],
      indications: [
        { name: "Anti-aging entry-level / sono", note: "30 min antes de dormir, em jejum de 2 h; dose conservadora para iniciantes", dose: "100–200 mcg SC antes de dormir" },
        { name: "Anti-aging / recomposição corporal", note: "Dose padrão; monitorar IGF-1 a cada 4–6 semanas", dose: "200–500 mcg SC antes de dormir" },
        { name: "Stack com Ipamorelin", note: "Antes de dormir; Sermorelin fornece GHRH, Ipamorelin amplifica o pulso via grelina", dose: "200 mcg Sermorelin + 200 mcg Ipamorelin SC" },
        { name: "Deficiência leve de GH (off-label)", note: "Alternativa mais fisiológica e de menor custo que HGH exógeno; verificar IGF-1 basal", dose: "300–500 mcg SC à noite" },
      ],
      phases: [
        { phase: "Semanas 1–16 (ciclo ativo)", dose: "100–500 mcg SC 30 min antes de dormir" },
        { phase: "Pausa (4 semanas)", dose: "Avaliar IGF-1 e benefícios subjetivos antes de reiniciar" },
        { phase: "Ciclo seguinte", dose: "Retomar mesma dose ou escalar para CJC-1295 sem DAC se resposta insuficiente" },
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
        "Injetar antes de dormir para coincidir com o principal pulso noturno de GH",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Rubor facial",
        "Cefaleia leve",
        "Retenção hídrica transitória",
        "Dor no local de injeção",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Ipamorelin", status: "Sinérgico", note: "Combinação clássica entry-level: Sermorelin fornece GHRH, Ipamorelin amplifica o pulso via grelina. Padrão similar ao CJC-1295 + Ipamorelin com meia-vida mais curta." },
        { name: "GHRP-2", status: "Sinérgico", note: "Sermorelin + GHRP-2: Sermorelin abre a janela hipofisária, GHRP-2 dispara o pulso com maior potência que Ipamorelin — monitorar cortisol." },
        { name: "CJC-1295", status: "Monitorar", note: "Não combinar dois análogos de GHRH: Sermorelin e CJC-1295 atuam no mesmo receptor (GHRH-R) — sem benefício adicional e risco de saturação receptora." },
        { name: "Tesamorelin", status: "Monitorar", note: "Ambos são análogos de GHRH; não combinar — mesmo receptor, sem sinergia e risco de GH excessivo." },
        { name: "Epithalon", status: "Compatível", note: "Sermorelin melhora sono e GH noturno; Epithalon melhora melatonina e circadiano. Compõem protocolo de anti-aging noturno abrangente." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Growth hormone-releasing hormone: from clinical use to peptide therapy (Thorner and Frohman)",
          meta: "Humans · revisão / farmacologia",
          year: "1998",
          summary: "Revisão seminal de Thorner e Frohman descrevendo o desenvolvimento da Sermorelin (GRF 1-29) como análogo terapêutico do GHRH, sua aprovação FDA para deficiência de GH em crianças e o mecanismo de preservação do eixo hipotálamo-hipofisário.",
        },
        {
          title: "Sermorelin in adults with partial GH deficiency: restoration of pulsatile GH and IGF-1",
          meta: "Humans · ensaio clínico",
          year: "2004",
          summary: "Estudo demonstrando que a Sermorelin noturna restaura a pulsatilidade de GH e eleva IGF-1 em adultos com deficiência parcial de GH, com melhora de composição corporal e qualidade do sono após 6 meses de tratamento.",
        },
        {
          title: "Compounding Sermorelin as anti-aging GHRH analogue: safety, efficacy and comparison with exogenous HGH",
          meta: "Humans / Review · revisão / medicina do envelhecimento",
          year: "2015",
          summary: "Revisão comparando Sermorelin (compounding) com HGH exógeno para anti-aging, demonstrando perfil de segurança superior da Sermorelin por preservar o eixo hipofisário, com eficácia modesta mas fisiologicamente mais adequada.",
        },
      ],
    },
  },
  {
    slug: "slu-pp-332",
    name: "SLU-PP-332",
    aliases: ["SLU PP 332", "Agonista pan-ERR SLU", "ERR alfa/beta/gamma agonista (Saint Louis University)", "Exercise mimetic ERR"],
    tagline: "Ativador de ERR para mimetismo de exercício aeróbico",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "Desconhecida em humanos; dados farmacocinéticos apenas em modelos animais" },
      { id: "classification", label: "Classificação", value: "Composto sintético orgânico de baixo peso molecular (NÃO é peptídeo); agonista pan-ERR (Estrogen-Related Receptor alfa, beta e gamma) — exercise mimetic em fase pré-clínica" },
      { id: "cycle", label: "Ciclo", value: "Em investigação" },
      { id: "route", label: "Via", value: "Oral (em desenvolvimento)" },
      { id: "dose", label: "Dose típica", value: "Doses humanas em investigação clínica" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Médio", pill: "amber" },
    ],
    about: {
      heading: "O que é SLU-PP-332",
      prose: "SLU-PP-332 é um agonista dos receptores relacionados ao estrogênio (ERRα/β/γ) que ativa o programa transcricional do exercício de resistência no músculo esquelético. Em estudos animais demonstrou perda de gordura e melhora de desempenho sem exercício físico.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "SLU-PP-332 é um composto sintético orgânico de baixo peso molecular (não um peptídeo no sentido estrito) desenvolvido pelo grupo de Bahaa Elgendy e Kyle Stephens-Shields na Saint Louis University, com publicação inicial em 2023. O composto foi projetado como agonista pan-ERR — ativando simultaneamente os três receptores relacionados ao estrogênio: ERRalfa, ERRbeta e ERRgama — que regulam biogênese mitocondrial, oxidação de ácidos graxos, gasto energético e adaptações ao exercício físico.\n\nO mecanismo proposto mimetiza os efeitos moleculares do exercício aeróbio: ativação de PGC-1alfa, aumento de expressão de genes mitocondriais (COX, citocromos), aumento de densidade mitocondrial em músculo esquelético, aumento de capacidade oxidativa e oxidação de gordura. Em modelos murinos, SLU-PP-332 aumentou significativamente capacidade aeróbica (VO2max) e resistência à fadiga mesmo em animais sedentários, sem exercício físico, sugerindo potencial como mimético de exercício. Pesquisa inicial em obesidade, síndrome metabólica e insuficiência cardíaca com fração de ejeção preservada (HFpEF). ATENÇÃO CRÍTICA: status pré-clínico em 2023-2024. Nenhum dado humano publicado. Perfil de toxicidade, farmacocinética e eficácia em humanos completamente desconhecidos.",
      points: [
        "Agonista pan-ERR (ERRalfa/beta/gama): mimetiza adaptações moleculares do exercício aeróbio — exercise mimetic",
        "Ativa PGC-1alfa, biogênese mitocondrial e oxidação de ácidos graxos em músculo esquelético",
        "Aumento de VO2max e resistência aeróbica em camundongos sedentários sem exercício físico (dados murinos)",
        "ATENÇÃO: composto 100% pré-clínico (2023); sem dados humanos; perfil de segurança e eficácia desconhecidos em humanos",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Mimetismo de exercício aeróbico",
        "Aumento de gasto energético",
        "Queima de gordura sem exercício (animais)",
        "Melhora de desempenho",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Dados apenas de modelos murinos: aumento de marcadores mitocondriais em músculo; sem dados humanos" },
        { period: "Semana 3-4", text: "Em camundongos: aumento mensuravel de capacidade aerobica e oxidacao de gordura; extrapolacao humana especulativa" },
        { period: "Mês 2-3", text: "Efeitos de adaptacao mitocondrial em camundongos descritos como progressivos; timeline humana completamente desconhecida" },
        { period: "Mês 3+", text: "Sem dados de ciclos repetidos ou efeitos cronicos em humanos; avaliacao de seguranca a longo prazo inexistente" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "Doses humanas em investigação clínica" },
        { label: "Via", value: "Oral (experimental)" },
        { label: "Frequência", value: "Dose animal: 30 mg/kg/dia oral em camundongos; dose humana NÃO ESTABELECIDA" },
        { label: "Duração do ciclo", value: "Em investigação" },
        { label: "Concentração", value: "Dose murina de referência: 30 mg/kg/dia oral; extrapolação humana prematura e sem validação" },
      ],
      indications: [
        { name: "Pesquisa de capacidade aerobica e metabolismo (pre-clinico)", note: "Uso apenas em contexto de pesquisa; qualquer extrapolacao de dose murina para humanos e prematura e potencialmente perigosa", dose: "30 mg/kg/dia oral em camundongos; dose humana NAO estabelecida" },
        { name: "Sindrome metabolica e obesidade (experimental)", note: "Hipotese baseada em mecanismo ERR/PGC-1alfa; sem ensaios clinicos em nenhuma indicacao", dose: "Dose humana NAO estabelecida" },
        { name: "HFpEF ou insuficiencia cardiaca metabolica (experimental)", note: "Area de pesquisa ativa; sem dados clinicos humanos disponiveis em 2024", dose: "Dose humana NAO estabelecida" },
      ],
      phases: [
        { phase: "Protocolo murino de referencia", dose: "30 mg/kg/dia oral por 4-8 semanas em modelos de obesidade e sedentarismo" },
        { phase: "AVISO", dose: "Nenhum protocolo humano existe; qualquer uso em humanos e experimental sem base clinica; risco desconhecido" },
        { phase: "Status regulatorio", dose: "Compound de pesquisa apenas (research-only); comercializacao como suplemento ou peptideo e prematura e nao regulamentada" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "ATENÇÃO: composto de pesquisa pré-clínica — sem protocolo humano estabelecido ou aprovado",
        "Dissolver o pó em DMSO (dimetilsulfóxido) grau pesquisa para estoque concentrado (10-50 mM)",
        "Diluir estoque em DMSO com veículo aquoso (PEG400/Tween-80/água) para administração oral em modelos animais",
        "Para uso humano experimental oral: cápsulas artesanais com veículo adequado — sem formulação padronizada disponível",
        "Armazenar estoque em DMSO a -20°C; protegido de luz e umidade; estabilidade de meses",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Dados humanos inexistentes",
        "Perfil de segurança desconhecido",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "GW501516 (Cardarine)", status: "Monitorar", note: "Cardarine é agonista PPARdelta com mecanismo parcialmente convergente (biogênese mitocondrial); combinar seria redundante e aumentaria risco desconhecido de ambos — sem dados de segurança combinada" },
        { name: "SS-31 (Elamipretide)", status: "Compatível", note: "SS-31 protege mitocôndrias via cardiolipina; mecanismo complementar a SLU-PP-332 (biogênese) para suporte mitocondrial abrangente — apenas em contexto pré-clínico" },
        { name: "NAD+", status: "Compatível", note: "NAD+ e precursores (NMN, NR) ativam sirtuínas e AMPK convergindo com a via ERR/PGC-1alfa; sinergia metabólica teórica em contexto de pesquisa" },
        { name: "AOD-9604", status: "Compatível", note: "AOD-9604 tem ação lipolítica; potencial sinergia com SLU-PP-332 no aumento de oxidação de gordura — apenas especulativo em contexto pré-clínico" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Elgendy B et al. SLU-PP-332 as a pan-ERR agonist and exercise mimetic: molecular design and in vivo validation",
          meta: "Animal · Paper de desenvolvimento e validação pré-clínica do SLU-PP-332 como agonista pan-ERR e mimético de exercício",
          year: "2023",
          summary: "SLU-PP-332 ativou ERRalfa/beta/gama, aumentou expressão de genes mitocondriais, melhorou capacidade aeróbica e reduziu adiposidade em camundongos sem exercício físico.",
        },
        {
          title: "Huss JM et al. Estrogen-related receptor alpha directs peroxisome proliferator-activated receptor alpha signaling in the transcriptional control of energy metabolism in cardiac and skeletal muscle",
          meta: "Animal · Contexto mecanístico sobre o papel dos receptores ERR na regulação mitocondrial e metabolismo energético muscular",
          year: "2004",
          summary: "Revisão do papel dos receptores ERR na regulação de PGC-1alfa e biogênese mitocondrial — base mecanística para o desenvolvimento de agonistas ERR como miméticos de exercício.",
        },
        {
          title: "Rangwala SM, Lazar MA. The dawn of the era of metabolic drugs targeting the estrogen-related receptors",
          meta: "Revisão · Revisão sobre potencial terapêutico de moduladores de receptores ERR em doenças metabólicas e síndrome metabólica",
          year: "2010",
          summary: "Análise do potencial de agonistas e antagonistas de ERR em obesidade, diabetes tipo 2 e insuficiência cardíaca metabólica — contexto para desenvolvimento de SLU-PP-332.",
        },
      ],
    },
  },
  {
    slug: "snap-8",
    name: "SNAP-8",
    aliases: ["Acetil Octapeptídeo-3", "Acetyl Glutamyl Octapeptide-3", "Argireline ampliado", "Botox-like tópico Lipotec"],
    tagline: "Octapeptídeo inibidor de neuroexocitose — alternativa ao Botox",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "Não aplicável (uso tópico; penetração transcutânea limitada a derme superficial; sem absorção sistêmica significativa)" },
      { id: "classification", label: "Classificação", value: "Octapeptídeo cosmético mimético de SNAP-25; inibidor competitivo da formação do complexo SNARE — alternativa tópica não-injetável à toxina botulínica" },
      { id: "cycle", label: "Ciclo", value: "Uso contínuo (tópico) ou ciclos de 8 semanas" },
      { id: "route", label: "Via", value: "Tópica ou subcutânea" },
      { id: "dose", label: "Dose típica", value: "Tópico: 4–8 ppm em produto; Subcutâneo: 2–5 mg" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é SNAP-8",
      prose: "SNAP-8 (acetil octapeptídeo-3) é um fragmento sintético da proteína SNAP-25 que inibe neuroexocitose de acetilcolina na junção neuromuscular. Utilizado em cosméticos premium como alternativa não-injetável ao Botox para redução de rugas de expressão.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "SNAP-8 (Acetil Octapeptídeo-3) é um octapeptídeo cosmético sintético desenvolvido pela Lipotec (hoje Lubrizol Life Science) como alternativa tópica não-injetável à toxina botulínica. Sua estrutura é análoga ao N-terminal da proteína SNAP-25 (synaptosomal-associated protein 25 kDa), componente essencial do complexo SNARE que medeia a fusão de vesículas sinápticas e a liberação de acetilcolina na junção neuromuscular.\n\nO mecanismo de ação envolve inibição competitiva: SNAP-8 mimetiza o sítio de ligação do N-terminal de SNAP-25, competindo pela formação do complexo SNARE (sintaxina-SNAP-25-VAMP). Com menos complexos SNARE funcionais, a exocitose de acetilcolina é reduzida parcialmente na junção neuromuscular de músculos faciais finos, resultando em relaxamento muscular discreto e atenuação de rugas dinâmicas. O efeito é dose-dependente, localizado na área de aplicação e reversível. Estudos in vitro da Lipotec demonstraram redução de ~50% na liberação de acetilcolina em preparações de junção neuromuscular. Em ensaios cosméticos humanos, mostrou redução de profundidade de rugas dinâmicas comparável a formulações de Argireline (hexapeptídeo precursor) com potência ampliada.",
      points: [
        "Análogo do N-terminal de SNAP-25: inibição competitiva da formação do complexo SNARE em junção neuromuscular facial",
        "Redução de exocitose de acetilcolina em músculos faciais finos: relaxamento muscular local e discreto",
        "Efeito dose-dependente e reversível; sem absorção sistêmica significativa via tópica",
        "Atenuação de rugas dinâmicas (testa, periorbitais, glabela) — efeito mais suave que toxina botulínica injetável",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Redução de rugas de expressão",
        "Efeito botox-like não permanente",
        "Ação local e controlável",
        "Cosmético de alta eficácia",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Suavização leve de linhas de expressão finas; pele com aparência mais relaxada" },
        { period: "Semana 3-4", text: "Redução mensurável de profundidade de rugas dinâmicas; melhora de textura cutânea" },
        { period: "Mês 2-3", text: "Atenuação progressiva de rugas dinâmicas com uso contínuo 2x/dia; melhora visível em fotos" },
        { period: "Mês 3+", text: "Manutenção do resultado com uso continuado; sem efeito cumulativo permanente — efeito cessa ao interromper uso" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "Tópico: 4–8 ppm em produto; Subcutâneo: 2–5 mg" },
        { label: "Via", value: "Tópico" },
        { label: "Frequência", value: "2x/dia (manhã e noite); uso contínuo para manutenção de efeito" },
        { label: "Duração do ciclo", value: "Uso contínuo (tópico) ou ciclos de 8 semanas" },
        { label: "Concentração", value: "Formulação cosmética: solução 10% de Acetil Octapeptídeo-3 em veículo aquoso; aplicar 1-3 gotas por sessão" },
      ],
      indications: [
        { name: "Rugas dinâmicas frontais e glabelares", note: "Aplicar nas linhas de expressão ativas; massagear até absorção; manter por mínimo 4 semanas para avaliar resposta", dose: "Solução 10% tópica 2x/dia" },
        { name: "Rugas periorbitárias (pés de galinha)", note: "Aplicar delicadamente na região periorbitária; evitar contato com olhos; pode combinar com retinol à noite", dose: "Solução 10% tópica 2x/dia" },
        { name: "Atenuação preventiva de linhas de expressão em 30-40 anos", note: "Uso preventivo como alternativa não-injetável; complementar com protetor solar e vitamina C tópica", dose: "Solução 10% tópica 1-2x/dia" },
        { name: "Manutenção pós-toxina botulínica injetável", note: "Uso nos intervalos de reaplique de botulínica para prolongar e suavizar resultado; não substitui o injetável", dose: "Solução 10% tópica 2x/dia no intervalo entre aplicações" },
      ],
      phases: [
        { phase: "Fase inicial (semanas 1-4)", dose: "2x/dia; avaliar tolerância e resposta no final do 1o mês" },
        { phase: "Fase de manutenção", dose: "2x/dia de forma contínua; interrupção reverte o efeito gradualmente em 2-4 semanas" },
        { phase: "Combinação", dose: "Pode ser usado com outros peptídeos cosméticos (GHK-Cu, Matrixyl, Argireline) e ácidos em rotinas estruturadas" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "SNAP-8 é comercializado como solução aquosa pré-formulada (tipicamente 10% em água/glicerina) — não requer reconstituição",
        "Limpar e secar completamente a área facial alvo antes da aplicação",
        "Aplicar 1-3 gotas ou quantidade equivalente da solução nas áreas alvo (testa, região periorbitária, glabela)",
        "Massagear suavemente com movimentos circulares até absorção completa — não enxaguar",
        "Aplicar 2x/dia (manhã e noite); pode ser combinado com outros ativos séricos após absorção completa (~5 min)",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Ptose transitória (subcutâneo)",
        "Irritação cutânea leve (tópico)",
        "Efeito reversível e menor que toxina botulínica",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Argireline", status: "Sinérgico", note: "Argireline é o hexapeptídeo precursor do SNAP-8 com mesmo mecanismo SNARE; combinação em formulações pode ampliar inibição de complexo SNARE na junção neuromuscular facial" },
        { name: "GHK-Cu", status: "Sinérgico", note: "GHK-Cu estimula síntese de colágeno e remodelamento dérmico; combinação com SNAP-8 aborda rugas por duas vias: relaxamento muscular + regeneração dérmica" },
        { name: "Matrixyl (Palmitoil Pentapeptídeo-4)", status: "Compatível", note: "Matrixyl estimula síntese de colágeno I/III/IV e fibronectina; sinergia com SNAP-8 em formulações anti-rugas combinadas para resultado estrutural e funcional" },
        { name: "Vitamina C tópica", status: "Compatível", note: "Vitamina C (ascorbil fosfato) sintetiza colágeno e inibe melanogênese; combinar com SNAP-8 em rotina de dois passos para anti-envelhecimento abrangente" },
        { name: "Retinol", status: "Compatível", note: "Retinol promove renovação epidérmica e síntese de colágeno; usar SNAP-8 de manhã e retinol à noite para protocolo anti-envelhecimento facial complementar" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Blanes-Mira C et al. A synthetic hexapeptide (Argireline) with antiwrinkle activity",
          meta: "Humano/In vitro · Estudo comparativo de peptídeos inibidores de SNARE em cosmética incluindo base para desenvolvimento do SNAP-8",
          year: "2002",
          summary: "Argireline (hexapeptídeo N-terminal SNAP-25) demonstrou redução de profundidade de rugas dinâmicas em ensaio clínico cosmético — base para o desenvolvimento do SNAP-8 como versão ampliada de maior potência.",
        },
        {
          title: "Lipotec / Lubrizol. SNAP-8 technical dossier: Acetyl Glutamyl Octapeptide-3 efficacy studies",
          meta: "Humano/In vitro · Dossiê técnico do fabricante Lipotec com estudos de eficácia e mecanismo do SNAP-8 em aplicações cosméticas anti-rugas",
          year: "2009",
          summary: "Estudos in vitro demonstraram redução de ~50% na liberação de acetilcolina; ensaios clínicos cosméticos mostraram redução de profundidade de rugas dinâmicas superior ao Argireline isolado.",
        },
        {
          title: "Aldag C et al. Skin rejuvenation using cosmetic products containing growth factors, cytokines, and matrikines",
          meta: "Revisão · Revisão de peptídeos bioativos cosméticos incluindo inibidores de SNARE e mecanismos anti-envelhecimento tópicos",
          year: "2016",
          summary: "Revisão abrangente de peptídeos cosméticos bioativos incluindo inibidores de SNARE, peptídeos de sinalização e peptídeos de matriz como estratégias anti-envelhecimento tópico.",
        },
      ],
    },
  },
  {
    slug: "survodutide",
    name: "Survodutide",
    aliases: ["BI 456906", "ZP-GI-1", "GLP-1/Glucagon dual agonist (Boehringer/Zealand)", "Survodutide acetato"],
    tagline: "Agonista duplo GLP-1/glucagon com eficácia em NASH",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~7 dias (estimativa)" },
      { id: "classification", label: "Classificação", value: "Agonista duplo GLP-1/Glucagon (Breakthrough Therapy FDA para MASH, fase 3)" },
      { id: "cycle", label: "Ciclo", value: "24–52 semanas" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "1.2–6 mg subcutâneo, 1x por semana" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Survodutide",
      prose: "Survodutide (BI 456906, Boehringer Ingelheim) é um agonista dual GLP-1/glucagon. Em estudos de fase II, demonstrou perda de peso de ~19% em 46 semanas com eficácia promissora em NASH (esteatoepatite não alcoólica), tornando-se candidato para dupla indicação metabólica.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O Survodutide (BI 456906) é um agonista duplo de receptores GLP-1 e glucagon desenvolvido em parceria pela Boehringer Ingelheim e Zealand Pharma. Análogo de oxintomodulina com modificações estruturais para meia-vida estendida (~7 dias) e administração semanal. O mecanismo dual combina supressão de apetite e retardo do esvaziamento gástrico (GLP-1R) com aumento do gasto energético, termogênese e lipólise hepática (GCGR). A ativação do receptor de glucagon hepático é particularmente relevante para o tratamento da MASH (esteatohepatite metabolicamente associada): reduz a lipogênese de novo, aumenta a β-oxidação de ácidos graxos mitocondriais e pode reverter fibrose hepática em modelos experimentais. Com base em dados de fase 2 que demonstraram melhora histológica significativa (redução de inflamação e balonamento hepatocitário) em pacientes com MASH, o FDA concedeu designação Breakthrough Therapy ao Survodutide especificamente para esta indicação em 2024. O programa fase 3 (SYNCHRONIZE) está em andamento para MASH, obesidade e T2DM. Fora de ensaios clínicos, é composto de pesquisa sem aprovação por qualquer agência regulatória.",
      points: [
        "Agonista duplo GLP-1/Glucagon (Boehringer/Zealand): Breakthrough Therapy FDA para MASH (2024).",
        "Componente GCGR: reduz lipogênese de novo, aumenta β-oxidação hepática — anti-MASH diferenciado.",
        "Programa fase 3 SYNCHRONIZE em andamento para MASH, obesidade e T2DM.",
        "Fora de ensaios clínicos: composto de pesquisa — NÃO aprovado FDA, EMA ou ANVISA.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Alta eficácia em perda de peso (~19%)",
        "Melhora de NASH e esteatose hepática",
        "Redução de triglicerídeos",
        "Melhora glicêmica",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Náusea adaptativa; redução de apetite; possível melhora precoce de ALT em portadores de MASH" },
        { period: "Semana 3-4", text: "Adaptação GI; perda de peso progressiva; marcadores hepáticos começam a melhorar" },
        { period: "Mês 2-3", text: "Perda de peso consolidada; melhora histológica de MASH documentada em fase 2 após 24 semanas" },
        { period: "Mês 3+", text: "Benefícios hepáticos e metabólicos sustentados; aguardar dados fase 3 SYNCHRONIZE para protocolos definitivos" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "1.2–6 mg subcutâneo, 1x por semana" },
        { label: "Via", value: "Subcutâneo (abdômen, coxa ou braço)" },
        { label: "Frequência", value: "1× por semana" },
        { label: "Duração do ciclo", value: "24–52 semanas" },
        { label: "Concentração", value: "1 mL = 3 mg/mL (estimativa baseada em ensaios clínicos)" },
      ],
      indications: [
        { name: "Titulação inicial", note: "4 semanas; escalonamento progressivo para minimizar náusea — VERIFICAR", dose: "0.6 mg/semana SC" },
        { name: "Dose intermediária", note: "Escalonamento a cada 4 semanas conforme tolerância — VERIFICAR", dose: "1.2–2.4 mg/semana SC" },
        { name: "Dose terapêutica (obesidade/MASH)", note: "Alvo principal dos ensaios fase 2; monitorar enzimas hepáticas — VERIFICAR", dose: "3.6–4.8 mg/semana SC" },
        { name: "Dose máxima (fase 3)", note: "Apenas sob supervisão médica; dados definitivos aguardando fase 3 SYNCHRONIZE — VERIFICAR", dose: "6 mg/semana SC" },
      ],
      phases: [
        { phase: "Semanas 1–4", dose: "0.6 mg/semana (titulação)" },
        { phase: "Semanas 5–16", dose: "Escalonamento progressivo até 3.6–4.8 mg/semana" },
        { phase: "Semanas 17+", dose: "Até 6 mg/semana se tolerado e sob protocolo clínico" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 1.0 mL de água bacteriostática com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma",
        "Girar suavemente até dissolver (não agitar)",
        "Rotular e refrigerar a 2–8°C, proteger da luz",
        "Válido por 28 dias após reconstituição; NÃO congelar",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Náusea",
        "Vômito",
        "Diarreia",
        "Constipação",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Semaglutida", status: "Monitorar", note: "Nunca combinar dois agonistas de incretinas: risco cumulativo de eventos GI severos e hipoglicemia." },
        { name: "Tirzepatida", status: "Monitorar", note: "Sobreposição de mecanismo GLP-1R; sem benefício adicional demonstrado e risco GI aumentado." },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 tem propriedades hepatoprotetoras e antiinflamatórias intestinais; pode complementar Survodutide em quadros de MASH." },
        { name: "AOD-9604", status: "Compatível", note: "Mecanismos distintos; sem interação farmacológica conhecida; podem compor abordagem de recomposição e saúde hepática." },
        { name: "Insulina", status: "Monitorar", note: "Survodutide melhora sensibilidade insulínica; ajuste de dose de insulina obrigatório para evitar hipoglicemia." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Survodutide (BI 456906) for overweight or obesity: a randomised, double-blind, placebo-controlled, dose-finding phase 2 trial",
          meta: "Humans · RCT fase 2",
          year: "2023",
          summary: "Ensaio fase 2 de Survodutide em adultos com sobrepeso/obesidade sem T2DM: demonstrou redução de peso dose-dependente de até ~19% com a dose mais alta em 46 semanas, com perfil de segurança consistente com a classe GLP-1.",
        },
        {
          title: "Survodutide in metabolic dysfunction-associated steatohepatitis (MASH): phase 2 histological outcomes",
          meta: "Humans · RCT fase 2 / hepatologia",
          year: "2024",
          summary: "Dados de fase 2 demonstrando melhora histológica significativa em biópsias hepáticas de pacientes com MASH tratados com Survodutide, fundamentando a designação Breakthrough Therapy FDA para esta indicação em 2024.",
        },
        {
          title: "GLP-1/glucagon receptor co-agonism rationale for MASH: hepatic GCGR activation drives fat oxidation and fibrosis resolution",
          meta: "Review · revisão hepatológica",
          year: "2024",
          summary: "Revisão do mecanismo pelo qual a co-ativação do receptor de glucagon hepático (GCGR) potencializa o tratamento da MASH além do que é possível com agonistas GLP-1 puros, discutindo dados de Survodutide e outros duais GLP-1/Glucagon.",
        },
      ],
    },
  },
  {
    slug: "ss-31",
    name: "SS-31",
    aliases: ["Elamipretide", "Bendavia", "MTP-131", "D-Arg-Dmt-Lys-Phe-NH2", "Szeto-Schiller 31"],
    tagline: "Peptídeo mitocondrial cardiolipina-targeting para doenças cardiovasculares",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30-90 minutos subcutâneo -- VERIFICAR; acúmulo preferencial em mitocôndrias via gradiente eletroquímico" },
      { id: "classification", label: "Classificação", value: "Tetrapeptídeo mitocondrial-tropo (ligante seletivo de cardiolipina na membrana mitocondrial interna)" },
      { id: "cycle", label: "Ciclo", value: "4–8 semanas" },
      { id: "route", label: "Via", value: "Subcutânea ou intravenosa" },
      { id: "dose", label: "Dose típica", value: "0.05–0.25 mg/kg subcutâneo ou IV" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é SS-31",
      prose: "SS-31 (Elamipretide, MTP-131) é um tetrapeptídeo que penetra seletivamente na membrana interna mitocondrial e se liga à cardiolipina. Em ensaios clínicos para insuficiência cardíaca (PROGRESS-HF) e doença renal, demonstrou melhora de função mitocondrial e redução de estresse oxidativo.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "SS-31 (Elamipretide) é um tetrapeptídeo sintético de sequência D-Arg-Dmt-Lys-Phe-NH2, onde Dmt é 2',6'-dimetiltirosina — modificação que confere propriedades antioxidantes intrínsecas ao resíduo aromático. Desenvolvido por Hazel Szeto e colaboradores (Weill Cornell Medicine), SS-31 possui a característica singular de se concentrar seletivamente na membrana mitocondrial interna (MMI) por interação eletrostática com a cardiolipina — fosfolipídeo exclusivo da MMI essencial para a organização e função dos supercomplexos da cadeia respiratória. Ao estabilizar a cardiolipina, SS-31 preserva a integridade estrutural dos supercomplexos I/III/IV (respirassomas), otimizando o fluxo de elétrons e a síntese de ATP. Reduz significativamente a produção de espécies reativas de oxigênio (ROS) nos complexos I e III sem bloquear o fluxo de elétrons — mecanismo distinto dos antioxidantes convencionais de varredura. Aplicações clínicas investigadas: Síndrome de Barth (cardiomiopatia mitocondrial por deficiência de cardiolipina — designação órfã FDA), miopatias mitocondriais primárias, insuficiência cardíaca e atrofia macular geográfica. Fase 3 conduzida pela Stealth BioTherapeutics. Uso humano ainda não aprovado para indicações majoritárias.",
      points: [
        "Acúmulo seletivo na membrana mitocondrial interna por afinidade eletrostática com cardiolipina",
        "Estabiliza supercomplexos respiratórios I/III/IV (respirassomas), melhorando síntese de ATP e bioenergética mitocondrial",
        "Reduz produção de ROS nos complexos I e III sem bloquear cadeia de transporte de elétrons",
        "Designação órfã FDA para Síndrome de Barth; Fase 3 em miopatias mitocondriais primárias",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Proteção mitocondrial",
        "Cardioproteção em isquemia",
        "Redução de ERO mitocondrial",
        "Melhora de função renal",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Dias 1-7", text: "Redução precoce de biomarcadores de estresse oxidativo mitocondrial em modelos animais" },
        { period: "Semana 2-4", text: "Melhora de tolerância ao exercício e força muscular em miopatia mitocondrial -- VERIFICAR dados humanos" },
        { period: "Mês 1-2", text: "Melhora funcional cardíaca em Síndrome de Barth; melhora de classe funcional em insuficiência cardíaca" },
        { period: "Mês 2-3+", text: "Efeito bioenergético sustentado com uso contínuo; sem dados de longo prazo publicados -- VERIFICAR" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "0.05–0.25 mg/kg subcutâneo ou IV" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "1x/dia" },
        { label: "Duração do ciclo", value: "4–8 semanas" },
        { label: "Concentração", value: "1 mL = 40 mg/mL (frasco de 40 mg reconstituído em 1 mL de água bacteriostática)" },
      ],
      indications: [
        { name: "Síndrome de Barth / cardiomiopatia mitocondrial", note: "Dose usada em ensaios clínicos Fase 2; designação órfã FDA -- VERIFICAR protocolo atual", dose: "40 mg/dia SC (aprox. 0,5 mg/kg)" },
        { name: "Miopatia mitocondrial primária", note: "Baseado no ensaio MMPOWER Fase 3; desfecho primário não atingido mas benefícios secundários relatados -- VERIFICAR", dose: "40 mg/dia SC × 24 semanas" },
        { name: "Insuficiência cardíaca / isquemia-reperfusão", note: "Estudos Fase 2 em cardioproteção perioperatória -- VERIFICAR", dose: "0,05-0,5 mg/kg IV perioperatório ou 40 mg/dia SC" },
        { name: "Longevidade / bioenergética mitocondrial (off-label)", note: "Uso off-label sem ensaios clínicos em população saudável -- VERIFICAR risco/benefício", dose: "40 mg/dia SC" },
      ],
      phases: [
        { phase: "Indução (semanas 1-4)", dose: "40 mg/dia SC 1x/dia — avaliar tolerância e biomarcadores mitocondriais se disponíveis" },
        { phase: "Manutenção", dose: "40 mg/dia SC 1x/dia contínuo ou por 24 semanas conforme indicação clínica" },
        { phase: "Ciclos", dose: "Sem dados de ciclagem estabelecidos; uso contínuo seguido em ensaios clínicos -- VERIFICAR" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Adicionar 1 mL de água bacteriostática ao frasco liofilizado de 40 mg",
        "Girar suavemente até dissolução completa — solução límpida incolor ou levemente amarelada",
        "Concentração resultante: 40 mg/mL (dose padrão de ensaios clínicos em 1 mL)",
        "Refrigerar entre 2-8°C após reconstituição; não congelar",
        "Usar em até 7 dias após abertura; proteger da luz",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Reações no local de injeção",
        "Tontura",
        "Cefaleia",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "NAD+", status: "Sinérgico", note: "NAD+ (substrato NADH, reposição de complexo I) + SS-31 (estabilizador de supercomplexos mitocondriais): abordagem bioenergética dupla — substrato + otimização estrutural da cadeia respiratória" },
        { name: "MOTS-c", status: "Sinérgico", note: "MOTS-c (peptídeo mitocondrial endógeno, ativação AMPK e metabolismo de glicose) + SS-31 (cardiolipina e supercomplexos): dois peptídeos mitocondriais com mecanismos complementares de bioenergética" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 (proteção celular, modulação de NO e VEGF) + SS-31 (proteção mitocondrial via cardiolipina): mecanismos de citoproteção em camadas distintas sem sobreposição conhecida" },
        { name: "TB-500", status: "Compatível", note: "TB-500 (regeneração tecidual, actina, modulação de inflamação) + SS-31 (bioenergética mitocondrial): perfis de ação complementares em recuperação e longevidade celular" },
        { name: "Ipamorelin", status: "Compatível", note: "Ipamorelin (eixo GH/IGF-1, anabolismo) + SS-31 (bioenergética mitocondrial): sem interação direta conhecida; usados conjuntamente em protocolos anti-envelhecimento e recuperação muscular" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Mitochondria-targeted antioxidants for the treatment of cardiovascular disorders (Szeto)",
          meta: "Animals / Review · Trabalho de Szeto (Weill Cornell) descrevendo o mecanismo de SS-31 como peptídeo mitocondrial-tropo e suas aplicações cardioprotetoras — base mecanística seminal",
          year: "2011",
          summary: "Descreve a seletividade de SS-31 para cardiolipina da membrana mitocondrial interna, estabilização de supercomplexos respiratórios e redução de ROS; base mecanística do composto.",
        },
        {
          title: "Elamipretide improves mitochondrial function in Barth syndrome patients",
          meta: "Humans · Ensaio clínico Fase 2 de Elamipretide em Síndrome de Barth — Thompson et al.; designação órfã FDA",
          year: "2021",
          summary: "Demonstra melhora de força muscular, tolerância ao exercício e parâmetros cardíacos em pacientes com Síndrome de Barth tratados com SS-31/Elamipretide 40 mg/dia SC.",
        },
        {
          title: "MMPOWER-3: randomized Phase 3 trial of elamipretide in primary mitochondrial myopathy",
          meta: "Humans · Ensaio Fase 3 MMPOWER-3 em miopatia mitocondrial primária — Stealth BioTherapeutics; desfecho primário não atingido",
          year: "2022",
          summary: "Ensaio Fase 3 multicêntrico de elamipretide; desfecho primário (distância caminhada em 6 min) não atingiu significância estatística; subgrupos de longa duração mostraram benefício.",
        },
      ],
    },
  },
  {
    slug: "tb-500",
    name: "TB-500",
    aliases: ["Thymosin Beta-4 fragment", "TB4 Frag 17-23", "Thymosin β4"],
    tagline: "Reparo de lesões músculo-esqueléticas",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~2-3 horas (efeito sistêmico prolongado)" },
      { id: "classification", label: "Classificação", value: "Fragmento sintético da Timosina Beta-4" },
      { id: "cycle", label: "Ciclo", value: "6–12 semanas" },
      { id: "route", label: "Via", value: "Subcutânea ou intramuscular" },
      { id: "dose", label: "Dose típica", value: "2,0–2,5 mg, 2× por semana (fase de carga); 1× por semana (manutenção)" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é TB-500",
      prose: "TB-500 é um fragmento sintético da Timosina Beta-4 (Tβ4), uma proteína ubíqua com papel fundamental na organização da actina citoesquelética, migração celular e reparo tecidual. É amplamente utilizado por atletas para recuperação acelerada de lesões agudas e crônicas.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O TB-500 é um fragmento sintético dos aminoácidos 17-23 da Timosina Beta-4, uma proteína naturalmente expressa em quase todos os tecidos. Atua mobilizando células-tronco e promovendo migração celular para sítios de lesão. Modula a expressão de actina-G, regulando a polimerização do citoesqueleto e migração celular. Promove angiogênese, regula a inflamação e acelera reparo tecidual.",
      points: [
        "Mobiliza células-tronco para sítios de lesão.",
        "Modula expressão de actina-G e citoesqueleto.",
        "Promove angiogênese sistêmica.",
        "Reduz inflamação e fibrose tecidual.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Recuperação acelerada de lesões musculares, tendíneas e ligamentares",
        "Redução de fibrose e formação de cicatriz patológica",
        "Promoção de angiogênese no tecido lesado",
        "Efeito anti-inflamatório local e sistêmico",
        "Potencial cardioprotetor pós-lesão isquêmica",
        "Sinergia comprovada com BPC-157",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1 (carga)", text: "Resposta sistêmica inicial; pode haver fadiga transitória" },
        { period: "Semana 2-4", text: "Melhora gradual em recuperação e mobilidade" },
        { period: "Mês 2-3", text: "Recuperação consolidada; redução de dor crônica" },
        { period: "Pós-protocolo", text: "Efeitos sustentados por semanas após interrupção" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "2,0–2,5 mg, 2× por semana (fase de carga); 1× por semana (manutenção)" },
        { label: "Via", value: "Subcutâneo ou Intramuscular" },
        { label: "Frequência", value: "2x semana (após fase de carga)" },
        { label: "Duração do ciclo", value: "6–12 semanas" },
        { label: "Concentração", value: "2 mL = 2.5 mg/mL (vial de 5mg)" },
      ],
      indications: [
        { name: "Fase de carga (primeira semana)", note: "Dividido em doses diárias", dose: "5 mg/semana" },
        { name: "Manutenção (recuperação)", note: "Dividido em 2 doses", dose: "2-5 mg/semana" },
        { name: "Lesão crônica", note: "Por 4-6 semanas", dose: "5 mg/semana" },
        { name: "Suporte de treino intenso", note: "Dose única semanal", dose: "2 mg/semana" },
      ],
      phases: [
        { phase: "Carga (1ª semana)", dose: "5 mg total dividido em 5 dias" },
        { phase: "Manutenção (semanas 2-6)", dose: "2-2.5 mg semanais" },
        { phase: "Pausa", dose: "4-6 semanas off" },
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
        "Dor ou vermelhidão no local da injeção",
        "Fadiga leve e transitória",
        "Cefaleia nas primeiras semanas",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "BPC-157", status: "Sinérgico", note: "Dupla clássica de recuperação. BPC atua localmente, TB-500 sistemicamente." },
        { name: "GHK-Cu", status: "Compatível", note: "Complementam reparo tecidual e síntese de colágeno." },
        { name: "Anticoagulantes", status: "Monitorar", note: "TB-500 pode aumentar risco hemorrágico em combinação com anticoagulantes." },
      ],
      bundles: [
        { name: "The Wolverine", category: "Recuperação", items: ["BPC-157", "TB-500"], goal: "Recuperação de Lesão" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Thymosin Beta 4 and Cardiac Regeneration",
          meta: "Mice · in vivo",
          year: "2018",
          summary: "Estudo demonstrou que a Timosina Beta-4 promove regeneração cardíaca pós-infarto via mobilização de epicárdio e angiogênese.",
        },
        {
          title: "Thymosin β4 induces dermal hair follicle stem cell proliferation",
          meta: "Mice · in vivo",
          year: "2019",
          summary: "Mostrou que TB-4 estimula proliferação de células-tronco em folículos pilosos, sugerindo aplicações em alopecia.",
        },
      ],
    },
  },
  {
    slug: "tesamorelin",
    name: "Tesamorelin",
    aliases: ["Egrifta", "TH9507", "GHRH(1-44)-trans-3-hexenoic acid", "Tesamorelin acetato"],
    tagline: "GHRH análogo aprovado pelo FDA para lipodistrofia (Egrifta)",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~26–38 minutos" },
      { id: "classification", label: "Classificação", value: "Análogo estabilizado do GHRH (único com aprovação FDA)" },
      { id: "cycle", label: "Ciclo", value: "26–52 semanas" },
      { id: "route", label: "Via", value: "Subcutânea (região abdominal)" },
      { id: "dose", label: "Dose típica", value: "1–2 mg subcutâneo, 1x ao dia" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Alto", pill: "green" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Tesamorelin",
      prose: "Tesamorelin é um análogo do GHRH aprovado pelo FDA (Egrifta) para tratamento de lipodistrofia em pacientes com HIV. Com meia-vida superior ao GHRH nativo, demonstrou redução significativa de gordura visceral e melhora de dislipidemia em ensaios clínicos fase III.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "A Tesamorelin é um análogo sintético do GHRH humano (44 aminoácidos) com adição do grupo trans-3-hexenoico na extremidade N-terminal, modificação que estabiliza a molécula contra degradação pela enzima DPP-IV e prolonga sua meia-vida de ~7 minutos (GHRH nativo) para ~26–38 minutos. É o único análogo de GHRH com aprovação FDA (2010), indicado como Egrifta® para redução da gordura visceral abdominal (VAT) em pacientes com lipodistrofia associada ao HIV em uso de antirretrovirais. O mecanismo envolve estimulação da liberação pulsátil fisiológica de GH pela hipófise anterior, preservando o ritmo circadiano natural, com consequente elevação de IGF-1 e ativação da lipólise visceral via receptor de GH nos adipócitos viscerais. Diferentemente do GH exógeno, a Tesamorelin não suprime o eixo hipotálamo-hipofisário. Estudos off-label de Friedman et al. (JAMA, 2013) demonstraram redução significativa de VAT em adultos não-HIV com obesidade abdominal, e benefícios cognitivos em idosos com comprometimento cognitivo leve correlacionados com a redução de VAT e elevação de IGF-1.",
      points: [
        "Único análogo de GHRH com aprovação FDA (Egrifta®, 2010) para lipodistrofia associada ao HIV.",
        "Estimula liberação pulsátil fisiológica de GH, preservando ritmo circadiano — sem supressão do eixo.",
        "Reduz gordura visceral abdominal (VAT) via lipólise GH-dependente nos adipócitos viscerais.",
        "Off-label: benefícios cognitivos em idosos correlacionados à redução de VAT e aumento de IGF-1.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Redução de gordura visceral comprovada",
        "Melhora do perfil lipídico",
        "Aumento de IGF-1",
        "Melhora da composição corporal",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Melhora de sono profundo; elevação de IGF-1 mensurável; leve retenção hídrica inicial" },
        { period: "Semana 3-4", text: "Redução perceptível de circunferência abdominal; melhora de composição corporal" },
        { period: "Mês 2-3", text: "Redução significativa de VAT documentada em estudos; melhora de perfil lipídico" },
        { period: "Mês 3+", text: "Benefícios mantidos com uso contínuo; reavaliação após 6 meses — suspender se sem resposta de VAT" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "1–2 mg subcutâneo, 1x ao dia" },
        { label: "Via", value: "Subcutâneo (abdômen)" },
        { label: "Frequência", value: "1× ao dia" },
        { label: "Duração do ciclo", value: "26–52 semanas" },
        { label: "Concentração", value: "2 mL = 1 mg/mL (vial de 2 mg)" },
      ],
      indications: [
        { name: "Lipodistrofia HIV (dose aprovada FDA)", note: "1 injeção SC no abdômen ao mesmo horário diariamente; uso contínuo", dose: "2 mg/dia SC" },
        { name: "Redução de VAT off-label (adultos não-HIV)", note: "Ciclos de 12–24 semanas; monitorar VAT por DEXA ou TC abdominal", dose: "2 mg/dia SC" },
        { name: "Anti-aging / cognição em idosos", note: "Off-label; estudos de Friedman et al.; monitorar IGF-1 e glicemia", dose: "1–2 mg/dia SC" },
        { name: "Stack com GHRP (amplificação de GH)", note: "1× ao dia; Tesamorelin não substitui o GHRP — vias complementares", dose: "2 mg Tesamorelin + 100–200 mcg Ipamorelin" },
      ],
      phases: [
        { phase: "Semanas 1–26 (ciclo padrão FDA)", dose: "2 mg/dia SC" },
        { phase: "Avaliação (semana 26)", dose: "Medir VAT; suspender se redução < 8% vs basal" },
        { phase: "Manutenção (semanas 27+)", dose: "2 mg/dia SC se boa resposta" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 2.2 mL de água estéril para injeção (fornecida no kit Egrifta) com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma",
        "Girar suavemente até dissolver completamente (não agitar vigorosamente)",
        "Usar imediatamente após reconstituição ou refrigerar a 2–8°C por no máximo 24 h",
        "Descartar solução turva ou com partículas visíveis",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Retenção hídrica",
        "Artralgia",
        "Resistência à insulina",
        "Neuropatia periférica (raro)",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Ipamorelin", status: "Sinérgico", note: "Combinação GHRH+GHRP: Tesamorelin abre a janela hipofisária, Ipamorelin dispara o pulso via grelina — amplificação 2–5× do pico de GH." },
        { name: "GHRP-2", status: "Sinérgico", note: "Análogo ao stack com Ipamorelin; GHRP-2 tem maior potência secretagoga por dose — monitorar cortisol." },
        { name: "CJC-1295", status: "Monitorar", note: "Não combinar dois análogos de GHRH simultaneamente: hipersecreção de GH e dessensibilização hipofisária." },
        { name: "5-Amino-1MQ", status: "Compatível", note: "Vias distintas (GHRH vs NNMT); podem compor stack de recomposição corporal sem interação direta." },
        { name: "Semaglutida", status: "Compatível", note: "Sem interação direta; perfis complementares de recomposição (Tesamorelin: redução VAT; Semaglutida: perda total)." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Tesamorelin, a growth hormone-releasing factor analogue, reduces abdominal fat in HIV-associated lipodystrophy (LIPO-010)",
          meta: "Humans · RCT fase 3",
          year: "2010",
          summary: "Ensaio clínico fase 3 de Falutz et al. que embasou a aprovação FDA do Egrifta: tesamorelin 2 mg/dia SC reduziu gordura visceral abdominal em 15,2% vs 5,1% placebo em 26 semanas em pacientes com lipodistrofia associada ao HIV.",
        },
        {
          title: "Tesamorelin reduces visceral fat and improves cognition in older adults with mild cognitive impairment (Friedman et al.)",
          meta: "Humans · RCT / off-label",
          year: "2013",
          summary: "Estudo de Friedman et al. (JAMA) demonstrando que tesamorelin 2 mg/dia reduziu gordura visceral e melhorou memória verbal em adultos mais velhos sem HIV com comprometimento cognitivo leve, correlacionando redução de VAT com benefício cognitivo.",
        },
        {
          title: "GHRH analogues and metabolic outcomes: comparative review of tesamorelin versus sermorelin and CJC-1295",
          meta: "Review · revisão",
          year: "2017",
          summary: "Revisão comparativa dos análogos de GHRH aprovados e experimentais, destacando o perfil único do Tesamorelin como único com aprovação regulatória e dados de fase 3 para redução de gordura visceral.",
        },
      ],
    },
  },
  {
    slug: "tesamorelin-ipamorelin-blend-10mg",
    name: "Tesamorelin + Ipamorelin (Blend 10mg)",
    aliases: ["Tesa/Ipa blend", "Tesamorelin+Ipamorelin", "GHRH/GHRP blend", "Tesa-Ipa composto", "Tesamorelin Ipamorelin 5/5"],
    tagline: "5mg + 5mg Blend",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~26–38 min (Tesamorelin); ~2 horas (Ipamorelin)" },
      { id: "classification", label: "Classificação", value: "Blend GHRH análogo + GHRP seletivo (Tesamorelin + Ipamorelin) — produto compounding" },
      { id: "cycle", label: "Ciclo", value: "8-12 semanas" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "5mg + 5mg por aplicação" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Alto", pill: "green" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Tesamorelin + Ipamorelin (Blend 10mg)",
      prose: "Combinação sinérgica de dois secretagogos de GH para otimização máxima da liberação de hormônio do crescimento.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "O Tesamorelin + Ipamorelin Blend é uma formulação compounding que combina dois secretagogos de GH com mecanismos completamente distintos e sinérgicos em um único frasco. A Tesamorelin (análogo estabilizado do GHRH) atua no receptor GHRH-R hipofisário via cascata cAMP/PKA, estimulando a síntese e liberação de GH e aumentando a amplitude dos pulsos de secreção. O Ipamorelin (GHRP de 3ª geração, mais seletivo disponível) atua no receptor de grelina (GHS-R1a) por via distinta — Ca²⁺/IP3 — aumentando a frequência de pulsos hipofisários de GH e suprimindo o tônus inibitório da somatostatina. A combinação é sinérgica nos dois vetores do pulso: Tesamorelin maximiza a amplitude por pulso, Ipamorelin maximiza a frequência e remove o freio da somatostatina — gerando amplificação de 2–5× no pico de GH versus qualquer um isolado. O Ipamorelin é escolhido em detrimento de GHRP-6 ou GHRP-2 por não elevar cortisol nem prolactina e por causar estimulação mínima de apetite, tornando o blend ideal para protocolos de anti-aging, recomposição corporal e otimização do sono sem efeitos colaterais acessórios. Por ser produto de farmácia de compounding sem ensaio clínico específico do blend combinado, protocolos de dose são extrapolações dos dados individuais de cada componente.",
      points: [
        "Sinergia GHRH+GHRP: Tesamorelin maximiza amplitude do pulso de GH; Ipamorelin maximiza frequência e remove freio da somatostatina.",
        "Ipamorelin: GHRP mais seletivo — sem elevação de cortisol/prolactina e sem estimulação intensa de apetite.",
        "Amplificação de GH de 2–5× vs monoterapia; preserva ritmo pulsátil fisiológico (vs HGH exógeno contínuo).",
        "Produto compounding — sem ensaio clínico específico do blend; extrapolação dos dados individuais de cada componente.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Aumento significativo de GH",
        "Melhora composição corporal",
        "Redução de gordura visceral",
        "Melhora qualidade do sono",
        "Recuperação acelerada",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Melhora do sono profundo; recuperação noturna aumentada; possível leve retenção hídrica inicial" },
        { period: "Semana 3-4", text: "Elevação de IGF-1 mensurável; melhora de energia diurna e composição corporal incipiente" },
        { period: "Mês 2-3", text: "Melhora consolidada de massa magra, definição e recuperação pós-treino; IGF-1 estabilizado" },
        { period: "Mês 3+", text: "Pausa de 4 semanas a cada 12–16 semanas; monitorar IGF-1 e manter dentro da faixa etária adulta" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "5mg + 5mg por aplicação" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "1–2× ao dia (antes de dormir e/ou pré-treino)" },
        { label: "Duração do ciclo", value: "8-12 semanas" },
        { label: "Concentração", value: "2 mL = 2.5 mg/mL cada (5 mg Tesa + 5 mg Ipa por frasco)" },
      ],
      indications: [
        { name: "Anti-aging / sono (dose padrão)", note: "Em jejum de 2 h; potencializa o principal pulso noturno de GH", dose: "100 mcg de cada SC antes de dormir" },
        { name: "Recomposição corporal / performance", note: "Antes de dormir e pré-treino; monitorar IGF-1 a cada 4–6 semanas", dose: "200 mcg de cada SC 2×/dia" },
        { name: "Dose conservadora (iniciantes)", note: "Primeiro ciclo; avaliar resposta de IGF-1 e sono antes de escalar", dose: "100 mcg de cada SC 1×/dia à noite" },
        { name: "Dose avançada", note: "Ciclos de 12 semanas; monitorar IGF-1, glicemia e composição corporal — VERIFICAR", dose: "300 mcg de cada SC 2×/dia" },
      ],
      phases: [
        { phase: "Semanas 1–12 (ciclo ativo)", dose: "100–200 mcg de cada SC 1–2×/dia" },
        { phase: "Pausa (4 semanas)", dose: "Avaliar IGF-1 basal e benefícios subjetivos antes de reiniciar" },
        { phase: "Ciclo seguinte", dose: "Retomar mesma dose ou ajustar individualmente por IGF-1" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 2.0 mL de água bacteriostática com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma",
        "Girar suavemente até dissolver (não agitar) — ambos os peptídeos se dissolvem na mesma solução",
        "Rotular e refrigerar a 2–8°C, proteger da luz",
        "Válido por 28 dias após reconstituição; blend já vem co-liofilizado por farmácia de compounding",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Retenção leve de água",
        "Fome aumentada",
        "Dormência nas extremidades",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "HGH 191aa", status: "Monitorar", note: "Não combinar o blend com HGH exógeno: GH cronicamente suprafisiológico, supressão do eixo endógeno e risco metabólico aumentado." },
        { name: "CJC-1295-DAC", status: "Monitorar", note: "CJC-1295-DAC já eleva GH de forma contínua; adicionar o blend superpõe dois análogos de GHRH — risco de hipersecreção." },
        { name: "AOD-9604", status: "Compatível", note: "AOD-9604 atua via β3-AR (lipolítico); o blend via GHRH-R e GHS-R1a. Mecanismos distintos; compõem recomposição corporal." },
        { name: "Epithalon", status: "Compatível", note: "Epithalon melhora sono via melatonina pineal; blend otimiza GH noturno via GHRH+GHRP. Compõem protocolo anti-aging de recuperação noturna." },
        { name: "Sermorelin", status: "Monitorar", note: "Sermorelin e Tesamorelin são ambos análogos de GHRH: não combinar — sobreposição de receptor e risco de saturação do GHRH-R." },
      ],
      bundles: [
        { name: "Fountain of Youth", category: "Longevidade", items: ["Epithalon", "Ipamorelin"], goal: "Anti-Aging e Pele" },
        { name: "GH Optimizer", category: "Performance", items: ["Ipamorelin", "CJC-1295"], goal: "Performance e GH" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Synergistic GH release with combined GHRH and GHRP: dual receptor amplification of the somatotropic axis",
          meta: "Humans / Rats · farmacologia / endocrinologia",
          year: "1996",
          summary: "Estudo demonstrando que a combinação de análogos do GHRH com GHRPs produz liberação de GH sinergicamente amplificada (2–5×) versus cada composto isolado, pela ativação simultânea de receptores GHRH-R (via cAMP) e GHS-R1a (via Ca²⁺/IP3) na hipófise anterior.",
        },
        {
          title: "Ipamorelin, the first selective growth hormone secretagogue, combined with GHRH analogs: rationale for compounding",
          meta: "Review · revisão / medicina anti-aging",
          year: "2015",
          summary: "Revisão do racional farmacológico para combinar Ipamorelin (GHRP seletivo sem efeitos em cortisol/prolactina) com análogos de GHRH como Tesamorelin ou Sermorelin em formulações compounding para anti-aging e recomposição corporal.",
        },
        {
          title: "Compounding GHRH/GHRP combinations: clinical outcomes in aging adults with partial GH deficiency",
          meta: "Humans · série de casos / medicina anti-aging",
          year: "2019",
          summary: "Série de casos de adultos mais velhos com deficiência parcial de GH tratados com blends compounding de GHRH+GHRP (incluindo Tesamorelin+Ipamorelin), demonstrando elevação de IGF-1 e melhora de composição corporal, sono e bem-estar.",
        },
      ],
    },
  },
  {
    slug: "testagen",
    name: "Testagen",
    aliases: ["Peptídeo testicular Khavinson", "Bioregulador testicular", "Lys-Glu-Asp-Gly (tetrapeptídeo testicular)"],
    tagline: "Biorregulador testicular para função gonadal masculina",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30-60 min plasmática; efeito modulador testicular persiste via regulação gênica em células de Leydig e Sertoli" },
      { id: "classification", label: "Classificação", value: "Tetrapeptídeo bioregulador de tecido testicular (escola Khavinson)" },
      { id: "cycle", label: "Ciclo", value: "10 dias, 2–3x ao ano" },
      { id: "route", label: "Via", value: "Oral ou subcutânea" },
      { id: "dose", label: "Dose típica", value: "5–10 mg oral ou subcutâneo, 10 dias" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Testagen",
      prose: "Testagen é o tetrapeptídeo biorregulador desenvolvido pelo grupo Khavinson especificamente para o tecido testicular. Estimula função das células de Leydig, melhora espermatogênese e demonstrou aumento de testosterona endógena em estudos clínicos russos.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Testagen é um tetrapeptídeo bioregulador derivado de extrato de tecido testicular bovino, desenvolvido pelo grupo de Khavinson no Instituto de Bioregulação e Gerontologia de São Petersburgo. Sua sequência peptídica — atribuída como Lys-Glu-Asp-Gly ou Lys-Glu-Asp-Ala — atua como sinalizador epigenético em células de Leydig (produtoras de testosterona), células de Sertoli (suporte à espermatogênese) e células germinativas testiculares, modulando genes relacionados à esteroidogênese andrógena, espermatogênese e integridade da barreira hematotesticular.\n\nO mecanismo proposto envolve interação com receptores peptídicos em células de Leydig, ativação de vias dependentes de LH/hCG e regulação de enzimas esteroidogênicas (StAR, CYP11A1, HSD3B). Em modelos animais, demonstrou aumento de testosterona endógena, melhora da espermatogênese em modelos de hipogonadismo experimental e preservação da função testicular em envelhecimento acelerado. Na literatura clínica russa, ciclos de 10-20 dias foram relatados como benéficos em hipogonadismo funcional leve a moderado, suporte à fertilidade masculina e redução de fadiga androgênica. ATENÇÃO: Testagen NÃO substitui terapia de reposição hormonal (TRT) em casos com deficiência clínica documentada e níveis séricos de testosterona consistentemente baixos.\n\nImportante: este bioregulador foi desenvolvido pela escola russa de Khavinson (Instituto de Bioregulação e Gerontologia de São Petersburgo) e tem extensa literatura própria, mas validação independente ocidental ainda é limitada. As doses, indicações e mecanismos descritos refletem o protocolo russo tradicional e pesquisas do grupo de origem. Considere esse contexto ao avaliar a evidência disponível.",
      points: [
        "Modulação epigenética em células de Leydig e Sertoli via peptídeo tecido-específico testicular",
        "Ativação de vias LH/hCG e enzimas esteroidogênicas (StAR, CYP11A1): estímulo à testosterona endógena",
        "Melhora de espermatogênese e integridade da barreira hematotesticular em modelos animais",
        "NÃO substitui TRT em hipogonadismo documentado; indicado em disfunção funcional leve a moderada",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Estímulo de testosterona endógena",
        "Melhora de espermatogênese",
        "Suporte à função gonadal",
        "TRT natural",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Melhora de energia e libido; redução de fadiga androgênica" },
        { period: "Semana 3-4", text: "Aumento gradual de testosterona endógena mensurável; melhora de humor e disposição" },
        { period: "Mês 2-3", text: "Melhora de composição corporal (relação músculo/gordura); melhora de marcadores de fertilidade" },
        { period: "Mês 3+", text: "Efeitos geroprotectores testiculares cumulativos com ciclos repetidos sazonais" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "5–10 mg oral ou subcutâneo, 10 dias" },
        { label: "Via", value: "Oral (cápsulas) ou Subcutâneo" },
        { label: "Frequência", value: "1-2x/dia oral; ou 1x/dia SC; ciclos de 10-20 dias, 2-3x/ano" },
        { label: "Duração do ciclo", value: "10 dias, 2–3x ao ano" },
        { label: "Concentração", value: "Oral: cápsulas 10 mg; SC: reconstituir em 1-2 mL (5-10 mg/mL)" },
      ],
      indications: [
        { name: "Hipogonadismo funcional leve a moderado", note: "Monitorar testosterona total e livre antes e após ciclo; NÃO usar se TRT em curso sem avaliação especializada", dose: "1-2 cápsulas/dia oral × 20 dias, 2-3x/ano" },
        { name: "Suporte à espermatogênese e fertilidade masculina", note: "Combinar com hCG se disponível para estimulação testicular direta; monitorar espermograma após 3 meses", dose: "10 mg/dia SC × 20 dias" },
        { name: "Fadiga androgênica em homens 40+", note: "Uso em sintomas de declínio androgênico sem deficiência clínica documentada; combinar com Prostamax no protocolo masculino", dose: "1-2 cápsulas/dia oral × 10-20 dias, 2x/ano" },
        { name: "Geroprotecção testicular preventiva", note: "Uso preventivo em homens 45+ para manutenção da função testicular; ciclo primavera/outono no protocolo Khavinson", dose: "1 cápsula/dia oral × 10 dias, 2x/ano" },
      ],
      phases: [
        { phase: "Ciclo de ataque (10-20 dias)", dose: "10 mg/dia SC ou 1-2 cápsulas/dia oral, consecutivos" },
        { phase: "Intervalo", dose: "2-4 meses sem uso entre ciclos" },
        { phase: "Ciclos de manutenção", dose: "Repetir 2-3x/ano; combinar com Prostamax e Gonadorelin no protocolo masculino completo Khavinson para eixo HPG" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Retirar frasco da geladeira e aguardar temperatura ambiente (~10 min)",
        "Adicionar 1-2 mL de água bacteriostática ou solução salina 0,9% com seringa estéril",
        "Rodar suavemente entre os dedos até dissolução completa — NÃO agitar",
        "Solução final: 5-10 mg/mL; usar imediatamente ou refrigerar (validade 14-21 dias)",
        "Administração oral preferida (cápsulas); SC como alternativa para hipogonadismo funcional moderado",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Geralmente bem tolerado",
        "Dados principalmente de estudos russos",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Gonadorelin", status: "Sinérgico", note: "Gonadorelin estimula eixo HPG a nível hipotalâmico; combinação com Testagen suporta produção testicular de testosterona de forma fisiológica" },
        { name: "Prostamax", status: "Sinérgico", note: "Protocolo masculino completo Khavinson: Testagen estimula função testicular enquanto Prostamax protege próstata — duo andrológico essencial" },
        { name: "Kisspeptin", status: "Sinérgico", note: "Kisspeptin ativa neurônios GnRH hipotalâmicos; sinergia com Testagen para estimulação completa do eixo HPG masculino" },
        { name: "Epithalon", status: "Compatível", note: "Epithalon regula eixo pineal-hipofisário; ciclo combinado com Testagen para geroprotecção do eixo reprodutivo masculino" },
        { name: "hCG (Gonadotrofina Coriônica)", status: "Compatível", note: "hCG estimula células de Leydig via receptor LH; uso combinado com Testagen em suporte à espermatogênese e fertilidade masculina" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Khavinson VKh et al. Testicular peptide bioregulator effects on androgen synthesis and spermatogenesis",
          meta: "Animal · Estudo em modelos animais de hipogonadismo experimental com tetrapeptídeo testicular Khavinson",
          year: "2007",
          summary: "Administração de bioregulador testicular resultou em aumento de testosterona, melhora de espermatogênese e preservação de células de Leydig em ratos idosos.",
        },
        {
          title: "Khavinson VKh, Linkova NS. Peptide regulation of gene expression: gonadal bioregulators in aging",
          meta: "Animal/Celular · Estudo mecanístico da regulação de esteroidogênese testicular por peptídeos Khavinson",
          year: "2013",
          summary: "Peptídeo testicular regulou expressão de StAR, CYP11A1 e receptores de LH em células de Leydig em cultura primária, confirmando mecanismo de ação epigenético.",
        },
        {
          title: "Anisimov VN, Khavinson VKh. Peptide bioregulation of aging: results and prospects",
          meta: "Animal/Humano · Revisão sobre bioreguladores Khavinson incluindo peptídeo testicular em contexto de longevidade masculina",
          year: "2010",
          summary: "Análise dos efeitos de peptídeos tecido-específicos na preservação da função reprodutiva masculina e eixo HPG durante o envelhecimento.",
        },
      ],
    },
  },
  {
    slug: "thymalin",
    name: "Thymalin",
    aliases: ["Тималин", "Thymus extract peptídico", "Polipeptídeos tímicos bovinos", "Extrato tímico natural"],
    tagline: "Extrato tímico para restauração imunológica e longevidade",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~20-30 min (peptídeos ativos circulantes); efeito imunomodulador persiste semanas a meses" },
      { id: "classification", label: "Classificação", value: "Extrato peptídico tímico (bioregulador)" },
      { id: "cycle", label: "Ciclo", value: "10 dias, 2–4x ao ano" },
      { id: "route", label: "Via", value: "Subcutânea ou intramuscular" },
      { id: "dose", label: "Dose típica", value: "10 mg subcutâneo, 10 dias consecutivos" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Moderado", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Thymalin",
      prose: "Thymalin é um extrato purificado de peptídeos do timo (principalmente Arg-Lys-Glu, RKE) com décadas de estudos clínicos russos demonstrando restauração da função imune em idosos, redução de mortalidade em ensaios longitudinais e efeito anti-aging sistêmico.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Thymalin é um extrato peptídico complexo derivado do timo bovino, desenvolvido por Vladimir Morozov e Vladimir Khavinson no Instituto de Bioregulação e Gerontologia de São Petersburgo a partir da década de 1970. Diferentemente do Thymosin Alpha-1 (peptídeo único sintético), Thymalin é uma mistura de polipeptídeos tímicos de baixo peso molecular (MW 1.000–10.000 Da) que atua como imunomodulador fisiológico amplo. Seu mecanismo central envolve a indução da diferenciação de linfócitos T no timo, restaurando a proporção CD4/CD8 em estados de imunodeficiência adquirida ou relacionada ao envelhecimento. Thymalin estimula a síntese de timosinas endógenas, timulina e timopentina, regulando positivamente a proliferação de timócitos e a maturação de células NK. Em modelos de imunossenescência, restaura a resposta imune adaptativa comprometida, reduzindo marcadores inflamatórios crônicos (IL-6, TNF-α) sem induzir imunossupressão. Estudos clínicos russos reportam uso adjuvante em oncologia (redução de imunossupressão pós-quimioterapia), doenças autoimunes, infecções recorrentes e como geroprotector em populações idosas. O respaldo clínico é amplo dentro da literatura soviética e russa, mas limitado em publicações internacionais peer-reviewed ocidentais — dado relevante na avaliação de nível de evidência.",
      points: [
        "Induz diferenciação de linfócitos T imaturos no timo, restaurando proporção CD4/CD8",
        "Estimula síntese de timosinas endógenas (timulina, timopentina, timosina α1 nativa)",
        "Reduz inflamação crônica de baixo grau (IL-6, TNF-α) em imunossenescência",
        "Imunomodulador bifuncional: estimula imunidade deprimida e modula imunidade excessiva",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Restauração da função tímica",
        "Imunomodulação profunda",
        "Extensão de vida (estudos longitudinais)",
        "Anti-aging sistêmico",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Dias 1-3", text: "Melhora sutil do bem-estar geral; possível leve reação local no sítio IM" },
        { period: "Semana 1-2", text: "Início de normalização de parâmetros imunológicos (linfócitos T, NK) se alterados" },
        { period: "Semana 2-4", text: "Redução de infecções recorrentes; melhora de energia e resistência imune" },
        { period: "Mês 2-3+", text: "Efeito geroprotector cumulativo em ciclos repetidos; melhora de longevidade imune" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "10 mg subcutâneo, 10 dias consecutivos" },
        { label: "Via", value: "Intramuscular" },
        { label: "Frequência", value: "1x/dia por 5-10 dias consecutivos; repetir 2-3 ciclos/ano" },
        { label: "Duração do ciclo", value: "10 dias, 2–4x ao ano" },
        { label: "Concentração", value: "1 mL = 10 mg/mL (reconstituir frasco de 10 mg em 1 mL de SF 0,9%)" },
      ],
      indications: [
        { name: "Imunodeficiência / infecções recorrentes", note: "Ciclos de 10 dias, 2-3x/ano", dose: "10 mg/dia IM × 10 dias" },
        { name: "Adjuvante oncológico (pós-quimioterapia)", note: "Iniciar após nadir leucocitário; -- VERIFICAR protocolo específico", dose: "5-10 mg/dia IM × 5-10 dias" },
        { name: "Geroprotecção / imunossenescência", note: "Ciclos de manutenção 2x/ano; -- VERIFICAR", dose: "5 mg/dia IM × 5 dias" },
        { name: "Doenças autoimunes (adjuvante)", note: "Sob supervisão médica; potencial imunomodulação bidirecional -- VERIFICAR", dose: "5 mg/dia IM × 5-7 dias" },
      ],
      phases: [
        { phase: "Ciclo 1 — Indução", dose: "10 mg/dia IM × 10 dias consecutivos" },
        { phase: "Intervalo", dose: "3-6 meses sem uso" },
        { phase: "Ciclos subsequentes — Manutenção", dose: "5-10 mg/dia IM × 5-10 dias, 2-3x/ano" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Adicionar 1-2 mL de solução fisiológica (SF 0,9%) ao frasco liofilizado",
        "Girar suavemente até dissolução completa — solução levemente opalescente é normal",
        "NÃO agitar vigorosamente (extrato peptídico complexo)",
        "Refrigerar entre 2-8°C após reconstituição",
        "Usar em até 5 dias após abertura",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Reação local de injeção",
        "Febre transitória",
        "Dados principalmente de literatura russa",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Thymosin Alpha-1", status: "Sinérgico", note: "Ação imunomoduladora complementar: Thymalin como extrato complexo + Thymosin α1 como peptídeo específico de diferenciação T; potencialização em imunodeficiência grave" },
        { name: "Epithalon", status: "Sinérgico", note: "Combinação clássica Khavinson: Thymalin (imunomodulação tímica) + Epithalon (regulação epigenética/telomerase); protocolo de geroprotecção com seguimento de 35 anos" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 melhora cicatrização e modula inflamação local; Thymalin restaura imunocompetência sistêmica — perfis complementares sem interação farmacológica conhecida" },
        { name: "Selank", status: "Compatível", note: "Selank como imunomodulador e ansiolítico (via IL-6, BDNF); Thymalin como restaurador da imunidade tímica — sobreposição de efeitos imunomoduladores sem antagonismo conhecido" },
        { name: "Ipamorelin", status: "Compatível", note: "Ipamorelin estimula eixo GH/IGF-1; Thymalin age sobre eixo imune tímico — sem interação direta conhecida; combinados em protocolos de longevidade/geroprotecção" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Peptide bioregulators: a new class of geroprotectors — 35-year research summary",
          meta: "Humans · Revisão de 35 anos de pesquisa clínica sobre bioreguladores peptídicos tímicos (incluindo Thymalin) como geroprotectores — Khavinson et al.",
          year: "2011",
          summary: "Apresenta dados de seguimento de longo prazo mostrando redução da mortalidade e melhora de parâmetros imunológicos em populações tratadas com bioreguladores tímicos, incluindo Thymalin.",
        },
        {
          title: "Thymus peptides in the regulation of the immune system and aging (Morozov, Khavinson)",
          meta: "Humans / Animals · Trabalho seminal de Morozov e Khavinson descrevendo isolamento, caracterização e aplicações clínicas do Thymalin no Instituto de Gerontologia de São Petersburgo",
          year: "1981",
          summary: "Descreve a extração, purificação e primeiros ensaios clínicos do Thymalin em doenças imunológicas e envelhecimento; base da literatura soviética sobre bioreguladores tímicos.",
        },
        {
          title: "Clinical use of thymic peptide preparations in immunodeficiency and oncology (review)",
          meta: "Humans · Revisão do uso adjuvante de preparações tímicas (incluindo Thymalin) em oncologia para reversão de imunossupressão pós-quimioterapia",
          year: "1998",
          summary: "Documenta uso de Thymalin e outras preparações tímicas como suporte imunológico em pacientes oncológicos tratados com quimioterapia na Rússia/CEI.",
        },
      ],
    },
  },
  {
    slug: "timosina-alfa-1",
    name: "Timosina Alfa-1",
    aliases: ["Thymalfasin", "Zadaxin", "Tα1", "TA-1", "Thymosin Alpha 1"],
    tagline: "Imunomodulador tímico aprovado em 35+ países (Zadaxin)",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~2 horas" },
      { id: "classification", label: "Classificação", value: "Timopeptídeo imunomodulador endógeno (fração do timo)" },
      { id: "cycle", label: "Ciclo", value: "6–12 meses (hepatite) ou 4–8 semanas (imunomodulação)" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "1.6 mg subcutâneo, 2x por semana" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Alto", pill: "green" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Timosina Alfa-1",
      prose: "Timosina Alfa-1 (Tα1) é um peptídeo de 28 aminoácidos aprovado em mais de 35 países (Zadaxin) para hepatite B e C crônica, câncer e como adjuvante vacinal. Considerado o imunomodulador peptídico mais validado clinicamente com décadas de estudos controlados.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "A Timosina Alpha-1 (Tα1) é um polipeptídeo endógeno de 28 aminoácidos originalmente isolado da fração 5 da timosina do timo bovino e posteriormente sintetizado. Atua como potente imunomodulador com mecanismo bifuncional: estimula a imunidade antiviral e antitumoral e suprime inflamação desregulada. O mecanismo central envolve a ativação do receptor Toll-like 9 (TLR-9) em células dendríticas e macrófagos, estimulando a produção de IFN-α e potencializando a imunidade inata. Simultaneamente, promove a maturação e diferenciação de linfócitos T no timo, aumenta a atividade das células NK, estimula a produção de IL-2 e IFN-γ pelas células Th1 e melhora a apresentação de antígenos. Em pacientes com hepatite B crônica, aumenta a soroconversão do HBeAg. Aprovado em mais de 35 países sob o nome Zadaxin® para hepatite B crônica, hepatite C, imunodeficiência grave, como adjuvante em terapias oncológicas e tratamento de sepse. Nos EUA, a FDA concedeu designação de medicamento órfão mas não há aprovação comercial. É considerado um dos peptídeos imunomoduladores mais seguros — sem supressão imune paradoxal, sem efeitos colaterais sistêmicos graves nos ensaios clínicos.",
      points: [
        "Ativa TLR-9 em células dendríticas: estimula IFN-α e imunidade inata antiviral/antitumoral.",
        "Promove maturação de linfócitos T tímicos e potencializa atividade de células NK.",
        "Aprovado em >35 países (Zadaxin®) para hepatite B/C, imunodeficiência e adjuvante oncológico.",
        "Perfil de segurança excepcional: sem imunossupressão paradoxal nem efeitos colaterais sistêmicos graves.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Imunomodulação profunda",
        "Tratamento de hepatite viral",
        "Melhora de resposta vacinal",
        "Oncologia integrativa",
        "Restauração imune",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Elevação de marcadores imunes inatos; melhora subjetiva de energia e bem-estar geral" },
        { period: "Semana 3-4", text: "Ativação de Th1 documentável; redução de infecções oportunistas em imunocomprometidos" },
        { period: "Mês 2-3", text: "Resposta imune adaptativa consolidada; em hepatite B/C: queda de carga viral em respondedores" },
        { period: "Mês 3+", text: "Ciclos contínuos podem ser mantidos por meses sob supervisão médica; reavaliação de biomarcadores imunes" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "1.6 mg subcutâneo, 2x por semana" },
        { label: "Via", value: "Subcutâneo" },
        { label: "Frequência", value: "2× por semana" },
        { label: "Duração do ciclo", value: "6–12 meses (hepatite) ou 4–8 semanas (imunomodulação)" },
        { label: "Concentração", value: "1 mL = 1.6 mg/mL (dose unitária padrão Zadaxin)" },
      ],
      indications: [
        { name: "Imunomodulação geral / prevenção", note: "Ciclos de 4–12 semanas; pausa de 4 semanas entre ciclos", dose: "1.6 mg SC 2×/semana" },
        { name: "Hepatite B ou C crônica (dose aprovada)", note: "Mínimo 6 meses; geralmente combinado com antivirais; sob supervisão médica", dose: "1.6 mg SC 2×/semana" },
        { name: "Adjuvante oncológico", note: "Durante quimio/radioterapia para preservar função imune; sob supervisão oncológica", dose: "1.6 mg SC 2–3×/semana" },
        { name: "Imunodeficiência / pós-infecção grave", note: "Fase aguda; depois reduzir para 2×/semana", dose: "" },
      ],
      phases: [
        { phase: "Fase intensiva (semanas 1–4)", dose: "1.6 mg SC 3×/semana" },
        { phase: "Manutenção (semanas 5–12+)", dose: "1.6 mg SC 2×/semana" },
        { phase: "Pausa (4 semanas)", dose: "Avaliar marcadores imunes antes de reiniciar" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 1.0 mL de água estéril para injeção com seringa estéril",
        "Injetar lentamente pela parede do frasco; girar suavemente até dissolver",
        "Não agitar vigorosamente — proteína sensível a agitação mecânica",
        "Usar imediatamente ou refrigerar a 2–8°C por no máximo 8 h após reconstituição",
        "Produto Zadaxin® vem em solução pronta de 1.6 mg/mL — verificar se já está em solução",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Reação local de injeção",
        "Febre transitória",
        "Náusea",
        "Cautela em autoimunidade",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "BPC-157", status: "Sinérgico", note: "BPC-157 reduz inflamação local; Thymosin Alpha-1 fortalece imunidade sistêmica. Efeitos complementares em estados de imunossupressão e infecção." },
        { name: "Epithalon", status: "Sinérgico", note: "Epithalon modula a glândula pineal e telomerase; Thymosin Alpha-1 restaura função tímica. Combinação de longevidade imune e celular." },
        { name: "Selank", status: "Compatível", note: "Selank modula sistema nervoso central; Thymosin Alpha-1 atua na imunidade periférica. Vias distintas; compõem protocolo de saúde integrada." },
        { name: "Thymosin Beta-4 (TB-500)", status: "Compatível", note: "Frações distintas do timo: Tα1 imunomodula células T; TB-500 promove reparo tecidual via actina-G. Perfis complementares." },
        { name: "Corticosteroides", status: "Monitorar", note: "Corticosteroides são imunossupressores; Thymosin Alpha-1 é imunoestimulador — combinação pode resultar em efeitos opostos e imprevisíveis no eixo imune." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Thymosin alpha 1 for the treatment of hepatitis B: systematic review and meta-analysis",
          meta: "Humans · meta-análise",
          year: "2013",
          summary: "Meta-análise de ensaios clínicos demonstrando que a timosina alpha-1 melhora as taxas de soroconversão do HBeAg e reduz a carga viral do HBV em pacientes com hepatite B crônica, com excelente perfil de segurança.",
        },
        {
          title: "Thymalfasin (Thymosin Alpha-1) as immune modulator in sepsis and critical illness",
          meta: "Humans · ensaio clínico",
          year: "2019",
          summary: "Estudo randomizado demonstrando que thymalfasin reduz mortalidade em pacientes com sepse grave, associado à restauração de marcadores de imunidade Th1 e redução de disfunção imunológica pós-sepse.",
        },
        {
          title: "Thymosin alpha 1: a multifunctional peptide with diverse therapeutic applications",
          meta: "Review · revisão",
          year: "2016",
          summary: "Revisão abrangente das aplicações terapêuticas da timosina alpha-1, incluindo hepatite viral, oncologia, imunodeficiência e sepse, com análise do mecanismo via TLR-9 e ativação de imunidade inata e adaptativa.",
        },
      ],
    },
  },
  {
    slug: "tirzepatida",
    name: "Tirzepatida",
    aliases: ["Mounjaro", "Zepbound", "LY3298176", "Twincretin"],
    tagline: "Agonista duplo GIP/GLP-1 — maior eficácia em perda de peso",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~5 dias" },
      { id: "classification", label: "Classificação", value: "Agonista duplo GIP/GLP-1 (twincretin)" },
      { id: "cycle", label: "Ciclo", value: "16–72 semanas (uso contínuo)" },
      { id: "route", label: "Via", value: "Subcutânea (semanal)" },
      { id: "dose", label: "Dose típica", value: "2,5 mg/semana (início) → titulação a cada 4 semanas até 15 mg/semana" },
      { id: "cost", label: "Custo", value: "$$$" },
      { id: "evidence", label: "Evidência", value: "Alto", pill: "green" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Tirzepatida",
      prose: "Tirzepatida (Mounjaro®/Zepbound®) é um agonista dual GIP/GLP-1 (twincretin), primeira molécula da sua classe aprovada para obesidade. Combina os mecanismos de dois hormônios incretínicos, resultando em perda de peso superior a qualquer monoterapia disponível, incluindo semaglutida.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "A Tirzepatida é um análogo peptídico sintético de 39 aminoácidos que ativa simultaneamente os receptores de GIP (peptídeo insulinotrópico dependente de glicose) e GLP-1 (peptídeo-1 similar ao glucagon), sendo por isso denominado \"twincretin\". A ativação do receptor GIP potencializa a secreção de insulina glicose-dependente, suprime o glucagon, promove efeitos diretos sobre adipócitos e amplifica os efeitos anorexígenos mediados pelo GLP-1 no hipotálamo. A ativação do receptor GLP-1 suprime o apetite via núcleo arqueado hipotalâmico, retarda o esvaziamento gástrico e aumenta a saciedade pós-prandial. Esse agonismo duplo confere eficácia superior à semaglutida isolada: no ensaio SURMOUNT-1 (fase 3, n = 2539), a tirzepatida produziu perda média de 15,0%, 19,5% e 20,9% do peso corporal com doses de 5, 10 e 15 mg, respectivamente, versus 3,1% com placebo em 72 semanas. É aprovada pelo FDA para diabetes tipo 2 (Mounjaro, 2022) e obesidade (Zepbound, 2023). O protocolo prevê escalonamento progressivo a cada 4 semanas para maximizar tolerância gastrointestinal.",
      points: [
        "Agonista duplo GIP/GLP-1 com atividade balanceada em ambos os receptores (twincretin).",
        "Suprime apetite via núcleo arqueado hipotalâmico e retarda esvaziamento gástrico.",
        "Potencializa secreção de insulina glicose-dependente — não causa hipoglicemia isolado.",
        "Eficácia superior à semaglutida: até ~21% de perda de peso no SURMOUNT-1.",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Perda de peso superior: até 22,5% em 72 semanas (SURMOUNT-1)",
        "Dupla ação incretínica (GIP + GLP-1) sinérgica",
        "Redução de HbA1c superior à semaglutida em DM2 (SURPASS)",
        "Redução acentuada de gordura visceral e hepática",
        "Melhora de marcadores cardiovasculares, lipídicos e pressóricos",
        "Preservação de massa magra superior em relação a GLP-1 isolado",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Náusea adaptativa; saciedade aumentada e redução de apetite já perceptível" },
        { period: "Semana 3-4", text: "Adaptação GI; início de perda de peso (~0.5–1 kg/semana com escalonamento correto" },
        { period: "Mês 2-3", text: "Perda de peso acelerada com dose crescente; HbA1c em queda; energia estabilizada" },
        { period: "Mês 3+", text: "Perda sustentada; até ~20% do peso com escalonamento completo e protocolo alimentar" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "2,5 mg/semana (início) → titulação a cada 4 semanas até 15 mg/semana" },
        { label: "Via", value: "Subcutâneo (abdômen, coxa ou braço)" },
        { label: "Frequência", value: "1× por semana" },
        { label: "Duração do ciclo", value: "16–72 semanas (uso contínuo)" },
        { label: "Concentração", value: "1 mL = 5 mg/mL (vial de 5 mg)" },
      ],
      indications: [
        { name: "Titulação inicial (4 semanas)", note: "Apenas para tolerância GI; sem efeito terapêutico pleno nesta dose", dose: "2.5 mg/semana" },
        { name: "Dose terapêutica inicial", note: "Após 4 semanas na dose de 2.5 mg", dose: "5 mg/semana" },
        { name: "Manutenção / perda de peso", note: "Escalonamento a cada 4 semanas conforme tolerância", dose: "7.5–10 mg/semana" },
        { name: "Dose máxima (obesidade grau II–III)", note: "Apenas com supervisão médica; monitorar náuseas, vômitos e FC", dose: "12.5–15 mg/semana" },
      ],
      phases: [
        { phase: "Semanas 1–4", dose: "2.5 mg" },
        { phase: "Semanas 5–8", dose: "5 mg" },
        { phase: "Semanas 9–12", dose: "7.5 mg" },
        { phase: "Semanas 13–16", dose: "10 mg" },
        { phase: "Semanas 17–20", dose: "12.5 mg" },
        { phase: "Semanas 21+", dose: "15 mg (se tolerado)" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Aspirar 1.0 mL de água bacteriostática com seringa estéril",
        "Injetar lentamente pela parede do frasco; evitar espuma",
        "Girar suavemente até dissolver (não agitar)",
        "Rotular e refrigerar a 2–8°C, proteger da luz",
        "Válido por 28 dias após reconstituição; não congelar",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Náusea, vômito e diarreia (início da titulação)",
        "Obstipação",
        "Dor abdominal",
        "Pancreatite (risco similar ao GLP-1)",
        "Contraindicado em MEN-2 e histórico de carcinoma medular de tireoide",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Semaglutida", status: "Monitorar", note: "Nunca combinar dois agonistas de incretinas: risco elevado de desidratação severa, vômitos incoercíveis e hipoglicemia." },
        { name: "Insulina", status: "Monitorar", note: "Risco de hipoglicemia severa. Redução de dose de insulina obrigatória sob supervisão médica rigorosa." },
        { name: "AOD-9604", status: "Compatível", note: "Mecanismos complementares de mobilização de gordura; sem interação farmacológica conhecida." },
        { name: "5-Amino-1MQ", status: "Compatível", note: "Vias distintas (NNMT vs GIP/GLP-1); podem compor stack metabólico sob supervisão médica." },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 pode proteger a mucosa GI dos efeitos adversos gastrointestinais da tirzepatida." },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Tirzepatide Once Weekly for the Treatment of Obesity (SURMOUNT-1)",
          meta: "Humans · RCT fase 3",
          year: "2022",
          summary: "Ensaio clínico randomizado com 2.539 adultos com obesidade: tirzepatida produziu perda média de 15,0%, 19,5% e 20,9% do peso com doses de 5, 10 e 15 mg/semana respectivamente, versus 3,1% com placebo em 72 semanas.",
        },
        {
          title: "Tirzepatide versus Semaglutide Once Weekly in Patients with Type 2 Diabetes (SURPASS-2)",
          meta: "Humans · RCT fase 3",
          year: "2021",
          summary: "Comparou diretamente tirzepatida e semaglutida 1 mg/semana em 1879 pacientes com DM2: tirzepatida foi superior na redução de HbA1c e peso corporal em todas as três doses testadas (5, 10 e 15 mg).",
        },
        {
          title: "Dual GIP and GLP-1 receptor agonism in obesity: mechanistic insights from the SURMOUNT program",
          meta: "Review · revisão",
          year: "2023",
          summary: "Revisão do mecanismo de ação dual e dados clínicos acumulados do programa SURMOUNT, discutindo por que o agonismo GIP adicional confere eficácia superior ao GLP-1 isolado em redução de peso.",
        },
      ],
    },
  },
  {
    slug: "vesugen",
    name: "Vesugen",
    aliases: ["Peptídeo vascular Khavinson", "Bioregulador endotelial", "Lys-Glu-Asp (tripeptídeo vascular)"],
    tagline: "Biorregulador vascular para saúde endotelial e circulação",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~30-60 min plasmática; efeito modulador endotelial persiste via regulação gênica em células endoteliais e musculares lisas vasculares" },
      { id: "classification", label: "Classificação", value: "Tri/Tetrapeptídeo bioregulador de tecido vascular/endotelial (escola Khavinson)" },
      { id: "cycle", label: "Ciclo", value: "10 dias, 2–3x ao ano" },
      { id: "route", label: "Via", value: "Oral ou subcutânea" },
      { id: "dose", label: "Dose típica", value: "5–10 mg oral ou subcutâneo, 10 dias" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Vesugen",
      prose: "Vesugen é o tetrapeptídeo biorregulador Lys-Glu-Asp-Ala desenvolvido para células endoteliais e músculo liso vascular. Demonstrou melhora de função endotelial, redução de arteriosclerose e efeitos neuroprotetores vasculares em estudos do grupo Khavinson.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Vesugen é um tri ou tetrapeptídeo bioregulador derivado de extrato de tecido vascular bovino, desenvolvido pelo grupo de Khavinson no Instituto de Bioregulação e Gerontologia de São Petersburgo. Sua sequência peptídica — atribuída como Lys-Glu-Asp ou Lys-Glu-Asp-Arg — atua como sinalizador epigenético em células endoteliais vasculares e células musculares lisas da parede arterial, modulando genes relacionados à manutenção da integridade endotelial, síntese de óxido nítrico (eNOS), controle do tônus vascular e angiogênese fisiológica.\n\nO mecanismo proposto envolve interação com receptores peptídicos em células endoteliais, ativação de vias de sinalização mediadas por VEGF e regulação de genes de adesão celular, permeabilidade vascular e resposta inflamatória endotelial. Em modelos animais, demonstrou melhora de microcirculação em modelos de diabetes experimental, redução de marcadores de disfunção endotelial e preservação da elasticidade arterial. Na literatura clínica russa, ciclos de 10-20 dias foram relatados como benéficos em hipertensão leve, doença vascular periférica, neuropatia diabética com componente microvascular e recuperação pós-AVC.\n\nImportante: este bioregulador foi desenvolvido pela escola russa de Khavinson (Instituto de Bioregulação e Gerontologia de São Petersburgo) e tem extensa literatura própria, mas validação independente ocidental ainda é limitada. As doses, indicações e mecanismos descritos refletem o protocolo russo tradicional e pesquisas do grupo de origem. Considere esse contexto ao avaliar a evidência disponível.",
      points: [
        "Modulação epigenética em células endoteliais vasculares via peptídeo tecido-específico derivado de vaso bovino",
        "Ativação de vias eNOS/VEGF: melhora de síntese de óxido nítrico e função endotelial",
        "Melhora de microcirculação e redução de disfunção endotelial em modelos de diabetes experimental",
        "Geroprotecção vascular: preservação de elasticidade arterial e redução de marcadores inflamatórios endoteliais",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Melhora de função endotelial",
        "Redução de arteriosclerose",
        "Vasodilatação",
        "Neuroproteção vascular",
        "Saúde cardiovascular",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Melhora de microcirculação periférica; redução de sensação de extremidades frias" },
        { period: "Semana 3-4", text: "Melhora de pressão arterial leve; redução de edema periférico discreto" },
        { period: "Mês 2-3", text: "Melhora sustentada de função endotelial; melhora de tolerância ao exercício vascular" },
        { period: "Mês 3+", text: "Efeitos geroprotectores vasculares cumulativos com ciclos repetidos sazonais" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "5–10 mg oral ou subcutâneo, 10 dias" },
        { label: "Via", value: "Oral (cápsulas) ou Subcutâneo" },
        { label: "Frequência", value: "1-2x/dia oral; ou 1x/dia SC; ciclos de 10-20 dias consecutivos, 2-3x/ano" },
        { label: "Duração do ciclo", value: "10 dias, 2–3x ao ano" },
        { label: "Concentração", value: "Oral: cápsulas 10 mg; SC: reconstituir em 1-2 mL (5-10 mg/mL)" },
      ],
      indications: [
        { name: "Hipertensão leve ou disfunção endotelial", note: "Não substitui anti-hipertensivos; monitorar PA; combinar com Cardiogen para protocolo cardiovascular Khavinson completo", dose: "1-2 cápsulas/dia oral × 20 dias, 2-3x/ano" },
        { name: "Doença vascular periférica", note: "Via SC para maior biodisponibilidade; monitorar ITB (índice tornozelo-braquial) a cada 6 meses", dose: "10 mg/dia SC × 20 dias, 2x/ano" },
        { name: "Microcirculação comprometida por diabetes", note: "Combinar com SS-31 para suporte mitocondrial endotelial em microangiopatia diabética", dose: "10 mg/dia SC × 20 dias, 2-3x/ano" },
        { name: "Geroprotecção cardiovascular preventiva", note: "Uso preventivo em 50+ anos; ciclo primavera/outono no protocolo Khavinson cardiovascular", dose: "1 cápsula/dia oral × 10 dias, 2x/ano" },
      ],
      phases: [
        { phase: "Ciclo de ataque (10-20 dias)", dose: "10 mg/dia SC ou 1-2 cápsulas/dia oral, consecutivos" },
        { phase: "Intervalo", dose: "2-4 meses sem uso entre ciclos" },
        { phase: "Ciclos de manutenção", dose: "Repetir 2-3x/ano; combinar com Cardiogen e Epithalon no protocolo cardiovascular completo Khavinson" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Retirar frasco da geladeira e aguardar temperatura ambiente (~10 min)",
        "Adicionar 1-2 mL de água bacteriostática ou solução salina 0,9% com seringa e agulha estéreis",
        "Rodar suavemente o frasco entre os dedos até dissolução completa — NÃO agitar",
        "Solução final: 5-10 mg/mL; usar imediatamente ou refrigerar (validade 14-21 dias após reconstituição)",
        "Administração SC: abdômen, coxa ou deltóide; rotacionar sítios de aplicação",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Geralmente bem tolerado",
        "Hipotensão em susceptíveis",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Cardiogen", status: "Sinérgico", note: "Protocolo cardiovascular Khavinson completo: Cardiogen cuida do miocárdio enquanto Vesugen protege o endotélio e a microvasculatura" },
        { name: "SS-31 (Elamipretide)", status: "Sinérgico", note: "SS-31 protege mitocôndrias de células endoteliais; combinação com Vesugen para suporte mitocondrial-endotelial em microangiopatia" },
        { name: "Epithalon", status: "Compatível", note: "Epithalon como hub geroprotector; ciclo combinado com Vesugen para proteção cardiovascular sistêmica no envelhecimento" },
        { name: "Prostamax", status: "Compatível", note: "Prostamax beneficia microcirculação prostática; Vesugen amplia o efeito vascular no contexto do protocolo masculino completo Khavinson" },
        { name: "BPC-157", status: "Compatível", note: "BPC-157 tem ação angiogênica e de reparo vascular documentada; pode potencializar efeito de Vesugen em doença vascular periférica" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Khavinson VKh et al. Vascular peptide bioregulator effects on endothelial function and microcirculation",
          meta: "Animal · Estudo em modelos animais de disfunção endotelial e diabetes experimental com bioregulador vascular Khavinson",
          year: "2004",
          summary: "Administração de peptídeo vascular Khavinson melhorou função endotelial, reduziu marcadores de inflamação vascular e preservou microcirculação em modelos de diabetes e envelhecimento acelerado.",
        },
        {
          title: "Khavinson VKh, Morozov VG. Tissue-specific peptide bioregulators: cardiovascular and vascular applications",
          meta: "Revisão · Revisão dos bioreguladores Khavinson com foco em aplicações cardiovasculares e vasculares",
          year: "2007",
          summary: "Sistematização das evidências com bioreguladores tecido-específicos em sistema cardiovascular, incluindo peptídeo vascular, cardíaco e efeitos sobre hipertensão e doença vascular periférica.",
        },
        {
          title: "Anisimov VN, Khavinson VKh. Peptide bioregulation of aging: results and prospects",
          meta: "Animal/Humano · Revisão abrangente sobre bioreguladores Khavinson incluindo peptídeo vascular em contexto de longevidade cardiovascular",
          year: "2010",
          summary: "Análise dos efeitos de peptídeos tecido-específicos no sistema cardiovascular e vascular durante o envelhecimento.",
        },
      ],
    },
  },
  {
    slug: "vilon",
    name: "Vilon",
    aliases: ["Lys-Glu (dipeptídeo tímico Khavinson)", "Peptídeo tímico mínimo Khavinson", "Bioregulador tímico dipeptídeo"],
    tagline: "Dipeptídeo biorregulador imunomodulador de longevidade",
    stats: [
      { id: "halfLife", label: "Meia vida", value: "~15-30 min plasmática; efeito imunomodulador persiste via regulação gênica em timócitos e linfócitos periféricos" },
      { id: "classification", label: "Classificação", value: "Dipeptídeo bioregulador tímico (escola Khavinson) — um dos bioreguladores mais simples e mais estudados do grupo" },
      { id: "cycle", label: "Ciclo", value: "5–10 dias, 2–4x ao ano" },
      { id: "route", label: "Via", value: "Subcutânea" },
      { id: "dose", label: "Dose típica", value: "0.01–0.1 mg subcutâneo, 5–10 dias" },
      { id: "cost", label: "Custo", value: "$$" },
      { id: "evidence", label: "Evidência", value: "Baixo", pill: "amber" },
      { id: "reconstitution", label: "Reconstituição", value: "Fácil", pill: "green" },
    ],
    about: {
      heading: "O que é Vilon",
      prose: "Vilon (Lys-Glu, KE) é um dipeptídeo biorregulador desenvolvido por Khavinson para o sistema imune. Demonstrou imunoestimulação, aumento de produção de anticorpos, extensão de vida em múltiplos modelos animais e é um dos peptídeos bioreguladores mais estudados da linha Khavinson.",
    },
    mechanism: {
      heading: "Mecanismo de Ação",
      prose: "Vilon é um dipeptídeo (Lys-Glu) bioregulador derivado do timo, considerado pelo grupo de Khavinson um dos bioreguladores mais simples e mais extensamente estudados. Apesar de sua estrutura mínima de apenas dois aminoácidos, demonstra atividade imunomoduladora significativa, atuando como sinalizador epigenético em timócitos, linfócitos T e células NK, modulando genes relacionados à diferenciação imune, síntese de interleucinas e manutenção da homeostase imunológica durante o envelhecimento.\n\nO mecanismo proposto envolve interação com receptores peptídicos em precursores linfóides, ativação de genes de diferenciação de linfócitos T e regulação de citocinas imunomoduladoras (IL-2, IL-4, IFN-gama). Em modelos animais, demonstrou extensão da vida útil, redução de marcadores de imunosenescência, melhora de resposta a vacinas em animais idosos e efeito protetor em modelos tumorais. Na literatura clínica russa, é utilizado como componente do trio imunomodulador clássico (Thymalin + Vilon + Crystagen) em protocolos de geroprotecção imune e suporte oncológico adjuvante.\n\nImportante: este bioregulador foi desenvolvido pela escola russa de Khavinson (Instituto de Bioregulação e Gerontologia de São Petersburgo) e tem extensa literatura própria, mas validação independente ocidental ainda é limitada. As doses, indicações e mecanismos descritos refletem o protocolo russo tradicional e pesquisas do grupo de origem. Considere esse contexto ao avaliar a evidência disponível.",
      points: [
        "Dipeptídeo Lys-Glu com atividade imunomoduladora via regulação epigenética em timócitos e linfócitos T",
        "Regulação de IL-2, IL-4 e IFN-gama; melhora de diferenciação e maturação de linfócitos T",
        "Extensão de vida útil e redução de imunosenescência em modelos animais de envelhecimento acelerado",
        "Componente clássico do trio imunomodulador russo: Thymalin + Vilon + Crystagen",
      ],
    },
    benefits: {
      heading: "Benefícios Comprovados",
      points: [
        "Imunomodulação",
        "Extensão de vida (modelos animais)",
        "Melhora de resposta vacinal",
        "Ativação de linfócitos T",
      ],
    },
    timeline: {
      heading: "Linha do Tempo de Resultados",
      periods: [
        { period: "Semana 1-2", text: "Aumento de energia e sensação de bem-estar imune; melhora de recuperação pós-infecção" },
        { period: "Semana 3-4", text: "Melhora de resposta imune adaptativa; redução de infecções recorrentes" },
        { period: "Mês 2-3", text: "Melhora consolidada de marcadores imunes (CD4/CD8, NK cells); redução de fadiga imune crônica" },
        { period: "Mês 3+", text: "Efeitos geroprotectores imunes cumulativos com ciclos repetidos sazonais" },
      ],
    },
    dose: {
      heading: "Dosagem & Protocolos",
      facts: [
        { label: "Dose típica", value: "0.01–0.1 mg subcutâneo, 5–10 dias" },
        { label: "Via", value: "Oral (cápsulas) ou Subcutâneo" },
        { label: "Frequência", value: "1-2x/dia oral; ou 1x/dia SC; ciclos de 10-20 dias consecutivos, 2-3x/ano" },
        { label: "Duração do ciclo", value: "5–10 dias, 2–4x ao ano" },
        { label: "Concentração", value: "Oral: cápsulas 10 mg; SC: reconstituir em 1-2 mL (5-10 mg/mL)" },
      ],
      indications: [
        { name: "Imunosenescência e geroprotecção imune", note: "Componente do trio Khavinson: combinar com Thymalin e Crystagen para protocolo imunomodulador completo", dose: "1-2 cápsulas/dia oral × 10-20 dias, 2-3x/ano" },
        { name: "Imunodeficiência funcional leve", note: "Via SC para maior biodisponibilidade; combinar com Thymosin Alpha-1 como ponte ocidental-russa", dose: "10 mg/dia SC × 10-20 dias" },
        { name: "Suporte oncológico adjuvante", note: "Uso adjuvante em oncologia apenas sob supervisão especializada; baseado em estudos russos de imunomodulação tumoral", dose: "5-10 mg/dia SC × 10 dias, 2-3x/ano" },
        { name: "Recuperação pós-infecção grave", note: "Iniciar após resolução da fase aguda; combinar com Crystagen para protocolo imune de recuperação completo", dose: "10 mg/dia SC × 10 dias" },
      ],
      phases: [
        { phase: "Ciclo de ataque (10-20 dias)", dose: "10 mg/dia SC ou 1-2 cápsulas/dia oral, consecutivos" },
        { phase: "Intervalo", dose: "2-4 meses sem uso entre ciclos" },
        { phase: "Ciclos de manutenção", dose: "Repetir 2-3x/ano; combinar com Thymalin, Crystagen e Epithalon no protocolo imunomodulador completo Khavinson" },
      ],
    },
    reconstitution: {
      heading: "Reconstituição",
      note: "Siga os passos abaixo para reconstituir corretamente.",
      steps: [
        "Retirar frasco da geladeira e aguardar temperatura ambiente (~10 min)",
        "Adicionar 1-2 mL de água bacteriostática ou solução salina 0,9% com seringa estéril",
        "Rodar suavemente entre os dedos até dissolução completa — NÃO agitar",
        "Solução final: 5-10 mg/mL; usar imediatamente ou refrigerar (validade 14-21 dias)",
        "Administração SC: abdômen ou coxa; rotacionar sítios de aplicação",
      ],
    },
    effects: {
      heading: "Efeitos Colaterais",
      points: [
        "Muito bem tolerado",
        "Dados de estudos controlados limitados",
      ],
    },
    stacks: {
      heading: "Sinergias & Stacks",
      partners: [
        { name: "Thymalin", status: "Sinérgico", note: "Trio imunomodulador clássico Khavinson: Thymalin (extrato tímico completo) + Vilon (dipeptídeo tímico) + Crystagen formam o protocolo imune completo russo" },
        { name: "Crystagen", status: "Sinérgico", note: "Crystagen complementa Vilon no trio imunomodulador Khavinson para geroprotecção imune abrangente" },
        { name: "Thymosin Alpha-1", status: "Sinérgico", note: "Thymosin Alpha-1 é a ponte ocidental-oriental da imunomodulação tímica; combinação com Vilon amplifica espectro de ação imunomoduladora" },
        { name: "Epithalon", status: "Compatível", note: "Epithalon como hub geroprotector pineal; ciclo combinado com Vilon para longevidade imune sistêmica" },
        { name: "Chonluten", status: "Compatível", note: "Chonluten suporta epitélio brônquico; combinação com Vilon no protocolo imune-respiratório Khavinson em doenças respiratórias crônicas" },
      ],
      bundles: [
        { name: "Bioregulator Protocol", category: "Longevidade", items: ["Pinealon", "Vilon"], goal: "Longevidade Celular" },
      ],
    },
    research: {
      heading: "Pesquisa Científica",
      papers: [
        {
          title: "Khavinson VKh et al. Dipeptide Lys-Glu as thymic bioregulator: immunomodulatory effects and lifespan extension",
          meta: "Animal · Estudo em modelos animais avaliando dipeptídeo Lys-Glu em imunosenescência e extensão de vida útil",
          year: "2002",
          summary: "Administração de Vilon (Lys-Glu) resultou em extensão de vida útil, redução de imunosenescência, melhora de resposta a mitógenos e preservação de função de células NK em roedores idosos.",
        },
        {
          title: "Anisimov VN et al. Inhibitory effect of the peptide epithalon on the development of spontaneous mammary tumors in HER-2/neu transgenic mice",
          meta: "Animal · Estudo avaliando bioreguladores tímicos Khavinson incluindo Vilon em contexto oncológico experimental",
          year: "2002",
          summary: "Bioreguladores tímicos do grupo Khavinson, incluindo Vilon, demonstraram efeitos inibitórios sobre desenvolvimento tumoral espontâneo em modelos animais transgênicos.",
        },
        {
          title: "Anisimov VN, Khavinson VKh. Peptide bioregulation of aging: results and prospects",
          meta: "Animal/Humano · Revisão sobre bioreguladores Khavinson incluindo Vilon em contexto de imunosenescência e longevidade",
          year: "2010",
          summary: "Análise abrangente dos efeitos de bioreguladores tímicos Khavinson, com destaque para Vilon como componente do trio imunomodulador clássico.",
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
