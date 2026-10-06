export type PeptideCategory =
  | "Emagrecimento"
  | "Cognição"
  | "Performance"
  | "Recuperação"
  | "Longevidade"
  | "Imunidade"
  | "Estética";

export type PeptideCard = {
  name: string;
  category: PeptideCategory;
  summary: string;
};

export const PEPTIDE_CARDS: PeptideCard[] = [
  { name: "5-Amino-1MQ", category: "Emagrecimento", summary: "Inibidor de NNMT para queima de gordura celular" },
  { name: "Adamax", category: "Cognição", summary: "Nootrópico peptídico para foco e processamento cognitivo" },
  { name: "AICAR", category: "Performance", summary: "Ativador de AMPK para resistência e metabolismo energético" },
  { name: "AOD-9604", category: "Emagrecimento", summary: "Fragmento lipolítico do GH sem efeito diabetogênico" },
  { name: "Ara-290", category: "Recuperação", summary: "Peptídeo neuroprotetor derivado da eritropoietina" },
  { name: "BPC-157", category: "Recuperação", summary: "Regeneração sistêmica de tecidos moles" },
  { name: "Cardiogen", category: "Longevidade", summary: "Biorregulador cardíaco para proteção e função miocárdica" },
  { name: "Cartalax", category: "Longevidade", summary: "Biorregulador cartilaginoso para articulações e regeneração" },
  { name: "Cerebrolysin", category: "Cognição", summary: "Hidrolisado de proteínas cerebrais para neuroproteção e Alzheimer" },
  { name: "Chonluten", category: "Longevidade", summary: "Biorregulador pulmonar para proteção e função respiratória" },
  { name: "CJC-1295", category: "Performance", summary: "Análogo de GHRH com meia-vida ultraestendida" },
  { name: "CJC-1295 DAC", category: "Performance", summary: "GHRH de longa ação — injeção 1–2x por semana" },
  { name: "Cortagen", category: "Cognição", summary: "Biorregulador do córtex cerebral para função cognitiva" },
  { name: "Crystagen", category: "Imunidade", summary: "Biorregulador tímico para imunoestimulação e anti-aging imune" },
  { name: "Dihexa", category: "Cognição", summary: "Nootrópico com potência 10⁷x superior ao BDNF em modelos animais" },
  { name: "DSIP", category: "Imunidade", summary: "Peptídeo indutor de sono delta com efeito ansiolítico e adaptogênico" },
  { name: "Epithalon", category: "Longevidade", summary: "Peptídeo epifisário para longevidade e ativação de telomerase" },
  { name: "Follistatin 344", category: "Performance", summary: "Inibidor de miostatina para hipertrofia muscular máxima" },
  { name: "FOXO4-DRI", category: "Longevidade", summary: "Peptídeo senolítico para eliminação seletiva de células senescentes" },
  { name: "GHK-Cu", category: "Estética", summary: "Complexo cobre-peptídeo para pele, cabelo e regeneração" },
  { name: "GHRP-2", category: "Performance", summary: "Secretagogo de GH de segunda geração com alta potência" },
  { name: "GHRP-6", category: "Performance", summary: "Secretagogo de GH com efeito pronunciado no apetite" },
  { name: "Glutationa", category: "Imunidade", summary: "Antioxidante master tripeptídeo para detoxificação e longevidade" },
  { name: "Gonadorelin", category: "Performance", summary: "GnRH sintético para manutenção do eixo hipotálamo-hipofisário" },
  { name: "HCG", category: "Performance", summary: "Gonadotrofina coriônica humana para estimulação testicular" },
  { name: "Hexarelin", category: "Performance", summary: "GHRP com efeito cardioprotetor adicional" },
  { name: "HGH 191AA", category: "Performance", summary: "Hormônio de crescimento humano recombinante com 191 aminoácidos" },
  { name: "HGH Fragment 176-191", category: "Emagrecimento", summary: "Fragmento lipolítico do GH sem efeitos anabólicos" },
  { name: "HMG", category: "Performance", summary: "Gonadotrofina menopáusica com FSH e LH para fertilidade masculina" },
  { name: "IGF-1 DES", category: "Performance", summary: "Variante truncada de IGF-1 com potência local aumentada 10x" },
  { name: "IGF-1 LR3", category: "Performance", summary: "IGF-1 de longa ação — meia-vida 20x superior ao nativo" },
  { name: "Ipamorelin", category: "Performance", summary: "Secretagogo seletivo de GH sem efeitos colaterais sistêmicos" },
  { name: "Kisspeptin", category: "Performance", summary: "Neuropeptídeo regulador do eixo reprodutivo e libido" },
  { name: "KLOW", category: "Recuperação", summary: "Peptídeo de cicatrização e regeneração tecidual" },
  { name: "KPV", category: "Recuperação", summary: "Tripeptídeo anti-inflamatório derivado da alfa-MSH" },
  { name: "L-Carnitina Injetável", category: "Emagrecimento", summary: "Transportador de ácidos graxos para oxidação mitocondrial" },
  { name: "Livagen", category: "Longevidade", summary: "Biorregulador hepatoportal para função hepática e GI" },
  { name: "LL-37", category: "Imunidade", summary: "Catelicidina humana antimicrobiana de amplo espectro" },
  { name: "Mazdutide", category: "Emagrecimento", summary: "Agonista duplo GLP-1/glucagon de nova geração" },
  { name: "Melanotan II", category: "Estética", summary: "Agonista de melanocortina para bronzeado, libido e apetite" },
  { name: "MGF", category: "Recuperação", summary: "Fator de crescimento mecânico para regeneração muscular" },
  { name: "MOTS-C", category: "Longevidade", summary: "Peptídeo mitocondrial regulador de metabolismo e longevidade" },
  { name: "NAD+ Injetável", category: "Longevidade", summary: "Coenzima mestre para metabolismo energético e longevidade celular" },
  { name: "Noopept", category: "Cognição", summary: "Nootrópico dipeptídeo 1000x mais potente que o Piracetam" },
  { name: "Ocitocina", category: "Performance", summary: "Hormônio de vínculo social, recuperação e bem-estar" },
  { name: "Ovagen", category: "Longevidade", summary: "Biorregulador hepático para proteção e regeneração do fígado" },
  { name: "P21", category: "Cognição", summary: "Peptídeo derivado de CNTF para neuroproteção e neurogênese" },
  { name: "PE-22-28", category: "Cognição", summary: "Peptídeo antidepressivo de ação rápida via receptores AMPA" },
  { name: "Pinealon", category: "Cognição", summary: "Biorregulador pineal para ritmo circadiano e neuroproteção" },
  { name: "PNC-27", category: "Longevidade", summary: "Peptídeo indutor de apoptose seletiva em células com MDM2" },
  { name: "Prostamax", category: "Imunidade", summary: "Biorregulador prostático para saúde urogenital masculina" },
  { name: "PT-141", category: "Estética", summary: "Bremelanotida — agonista MC4R aprovado para disfunção sexual feminina" },
  { name: "Retatrutide", category: "Emagrecimento", summary: "Agonista triplo GLP-1/GIP/glucagon — maior eficácia já documentada" },
  { name: "Selank", category: "Cognição", summary: "Ansiolítico nootrópico sem dependência nem sedação" },
  { name: "Semaglutida", category: "Emagrecimento", summary: "Análogo GLP-1 de ação semanal com evidência robusta" },
  { name: "Semax", category: "Cognição", summary: "Nootrópico e neuroprotetor de origem soviética" },
  { name: "Sermorelin", category: "Performance", summary: "GHRH análogo fisiológico aprovado para deficiência de GH" },
  { name: "SLU-PP-332", category: "Emagrecimento", summary: "Ativador de ERR para mimetismo de exercício aeróbico" },
  { name: "SNAP-8", category: "Estética", summary: "Octapeptídeo inibidor de neuroexocitose — alternativa ao Botox" },
  { name: "SS-31", category: "Longevidade", summary: "Peptídeo mitocondrial cardiolipina-targeting para doenças cardiovasculares" },
  { name: "Survodutide", category: "Emagrecimento", summary: "Agonista duplo GLP-1/glucagon com eficácia em NASH" },
  { name: "TB-500", category: "Recuperação", summary: "Reparo de lesões músculo-esqueléticas" },
  { name: "Tesamorelin", category: "Performance", summary: "GHRH análogo aprovado pelo FDA para lipodistrofia (Egrifta)" },
  { name: "Tesamorelin + Ipamorelin (Blend 10mg)", category: "Performance", summary: "5mg + 5mg Blend" },
  { name: "Testagen", category: "Performance", summary: "Biorregulador testicular para função gonadal masculina" },
  { name: "Thymalin", category: "Imunidade", summary: "Extrato tímico para restauração imunológica e longevidade" },
  { name: "Timosina Alfa-1", category: "Imunidade", summary: "Imunomodulador tímico aprovado em 35+ países (Zadaxin)" },
  { name: "Tirzepatida", category: "Emagrecimento", summary: "Agonista duplo GIP/GLP-1 — maior eficácia em perda de peso" },
  { name: "Vesugen", category: "Longevidade", summary: "Biorregulador vascular para saúde endotelial e circulação" },
  { name: "Vilon", category: "Longevidade", summary: "Dipeptídeo biorregulador imunomodulador de longevidade" },
];

export const PEPTIDE_CATEGORIES: PeptideCategory[] = [
  "Emagrecimento",
  "Cognição",
  "Performance",
  "Recuperação",
  "Longevidade",
  "Imunidade",
  "Estética",
];

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function filterPeptideCards(items: PeptideCard[], query: string, category: string): PeptideCard[] {
  const needle = fold(query.trim());
  return items.filter((item) => {
    if (category && item.category !== category) return false;
    if (!needle) return true;
    return fold(`${item.name} ${item.summary} ${item.category}`).includes(needle);
  });
}
