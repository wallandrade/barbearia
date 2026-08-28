export type PeptideChatEntry = {
  slug: string;
  name: string;
  aliases: string[];
  body: string;
};

export const PEPTIDE_CHAT_ENTRIES: PeptideChatEntry[] = [
  {
    slug: "5-amino-1mq",
    name: "5-Amino-1MQ",
    aliases: ["5A1MQ", "5-Amino-1-methylquinoline", "NNMT Inhibitor", "5-Amino-1-metilquinolínio"],
    body: `Inibidor de NNMT para queima de gordura celular.
Também conhecido como: 5-Amino-1-methylquinoline, 5A1MQ, NNMT Inhibitor.
Meia-vida: ~6-8 horas (oral). Classificação: inibidor enzimático de pequena molécula. Ciclo: 8–12 semanas. Via: oral ou subcutânea.
Dose típica: 50–100 mg oral ou 5–10 mg subcutâneo, 1x ao dia. Evidência: baixa. Reconstituição: fácil.

O que é: 5-Amino-1-metilquinolínio inibe a enzima nicotinamida N-metiltransferase (NNMT), que regula metabolismo energético no tecido adiposo. Ao inibir NNMT, aumenta NAD+ e SAM intracelular, acelerando lipólise sem estimulação do SNC.

Mecanismo: NNMT metila nicotinamida e consome SAM. Em adiposo de obesos, NNMT é superexpressa, reduzindo SAM e NAD+. 5-Amino-1MQ inibe seletivamente a enzima, restaura SAM/NAD+, ativa sirtuínas (SIRT1), oxidação de ácidos graxos, biogênese mitocondrial e termogênese. Diferencia-se de termogênicos por não catabolizar músculo via SNC.

Benefícios citados: queima de gordura sem estimulação do SNC; melhora da sensibilidade à insulina; preservação de massa muscular; aumento de NAD+ celular.

Linha do tempo: sem 1-2 efeitos mínimos; sem 3-4 energia/humor e possível início de perda de peso; mês 2-3 perda mais pronunciada; mês 3-6 otimização contínua. Evidência humana limitada.

Dosagem: 50–100 mg oral ou 5–10 mg SC 1x/dia. Frequência 1–2x/dia. Ciclo 8–12 semanas. Concentração exemplo: 2 mL = 5 mg/mL.
Indicações (ficha): perda de gordura 2,5–5 mg/dia manhã em jejum; quebra de platô 5,0–7,5 mg/dia (ex. 25+25 mg oral); anti-envelhecimento 2,5 mg/dia 5 ON / 2 OFF; finalizador 7,5 mg/dia.
Fases SC: dias 1–2 = 2,5 mg 1x; dias 3–4 = 5 mg 1x; alternativa BID 2,5 mg 2x.

Reconstituição: aspirar 2,0 mL água bacteriostática; injetar pela parede do frasco; girar suavemente (não agitar); refrigerar 2–8°C, proteger da luz.

Efeitos: dados humanos limitados; possível interação com metabolismo de metionina.

Stacks: BPC-157 sinérgico; MOTS-c sinérgico; NAD+ compatível; metformina MONITORAR (hipoglicemia); insulina MONITORAR.

Pesquisa: estudos em camundongos 2018–2019 (inibição NNMT, redução de obesidade induzida por dieta, gasto energético). Evidência humana baixa.`,
  },
  {
    slug: "adamax",
    name: "Adamax",
    aliases: ["Adamax blend", "Stack androgênico underground", "Blend peptídico androgênico"],
    body: `Nootrópico peptídico (marketing) / blend androgênico underground de composição variável.
Também conhecido como: Adamax blend, stack androgênico underground.
Meia-vida: desconhecida — composição variável; sem dados farmacocinéticos do blend. Classificação: blend/stack comercial NÃO padronizado; SEM literatura científica formal do produto; SEM aprovação regulatória. Ciclo citado: 4–8 semanas. Via: oral na ficha de capa; reconstituição descreve SC/IM. Dose típica citada: 10–30 mg oral 1–2x/dia. Evidência: baixa.

O que é (capa): nootrópico para foco, memória de trabalho e velocidade de processamento, estrutura adamantana, BHE.
Mecanismo (ficha detalhada — prevalece para segurança): Adamax é stack/blend de compounding underground. Composição varia por fornecedor/lote. Típico: Gonadorelin + Kisspeptin-10 + variantes de IGF-1 e outros. Marketing: estimular eixo HPG para testosterona endógena. IMPORTANTE: sem padronização não há protocolo seguro, dose eficaz nem perfil de risco do blend. NÃO existe literatura publicada sobre Adamax como produto. Componentes isolados têm literatura própria. Recomendação: usar componentes individuais (Gonadorelin, Kisspeptin, Testagen) em vez do blend opaco.

Benefícios de capa (foco/atenção/neuroproteção) NÃO são comprovados para o blend; a ficha de mecanismo contradiz. Sempre avisar isso.

Linha do tempo: variável; se tiver Kisspeptin/Gonadorelin, possível LH/FSH; sem dados do blend; uso crônico não recomendado.

Dosagem: sem protocolo padronizado. Ver CoA. Alternativa recomendada: Gonadorelin 100 mcg SC 2x/semana + Kisspeptin ou Testagen. Fertilidade: hCG + FSH ou Gonadorelin com urologista. Libido: avaliar T total/livre primeiro.

Reconstituição: verificar CoA; descongelar pó ~15 min; água bacteriostática conforme fornecedor; SC ou IM; refrigerar 14–21 dias máx.

Efeitos citados: cefaleia leve; irritabilidade em doses altas. Risco real: composição desconhecida.

Stacks: Gonadorelin/Kisspeptin sinérgicos (preferir isolados); Testagen e hCG compatíveis como alternativas; IGF-1 LR3 MONITORAR (hipoglicemia).

Pesquisa: NÃO há paper do blend Adamax. Referências são de TRT, Kisspeptin-10 em homens (George 2011) e revisões de eixo HPG.`,
  },
  {
    slug: "aicar",
    name: "AICAR",
    aliases: ["Acadesina", "AICA Ribonucleotídeo", "5-AICAR", "AICAr", "Ativador AMPK", "ZMP"],
    body: `Ativador de AMPK para resistência e metabolismo energético. NÃO é peptídeo — análogo de nucleotídeo.
Também conhecido como: Acadesina, AICA ribonucleotídeo, 5-AICAR, AICAr.
Meia-vida: ~30-60 min IV em animais; PK humana limitada. Classificação: análogo nucleotídeo; exercise mimetic pré-clínico; PROIBIDO WADA (S4) desde 2009. Ciclo citado underground: 4–6 semanas. Via: SC ou IV. Dose típica citada: 25–50 mg SC 1x/dia. Evidência: moderada (mecanismo/animais; performance humana não validada). Custo $$$.

O que é: AICAR (5-aminoimidazole-4-carboxamide ribonucleotide) ativa AMPK; apelido "exercício em uma seringa". Mimetiza adaptações aeróbicas.

Mecanismo: fosforilado a ZMP, mimetiza AMP, ativa AMPK. Inibe vias anabólicas, ativa oxidação de gordura, glicólise, biogênese mitocondrial. Narkar/Evans Cell 2008: camundongos sedentários 500 mg/kg/dia oral 4 semanas → +44% resistência, fibras oxidativas. Uso clínico aprovado (Europa): cardioproteção em bypass (Acadesina IV). Performance humana experimental, sem protocolo validado.

Benefícios citados (pré-clínico): resistência aeróbica, biogênese mitocondrial, oxidação de gordura, sensibilização à insulina.

Linha do tempo: dados humanos de performance escassos; pico murino ~4 semanas; longo prazo humano não caracterizado.

Dosagem: ficha 25–50 mg SC/dia NÃO é protocolo humano validado. Murino 500 mg/kg/dia. Extrapolação ~500 mg–1 g/dia (custo alto). Cardioplegia: 0,1 mg/kg/min IV hospitalar. Atleta testado: NÃO usar (WADA S4).

Reconstituição: research-only; pó -20°C; reconstituição salina 0,9% ou PBS 50–100 mg/mL; filtro 0,22 µm; 2–8°C 7–14 dias; proteger da luz.

Efeitos: hipoglicemia; lactacidose em doses altas; proibido WADA.

Stacks: SLU-PP-332, SS-31, NAD+ compatíveis em pesquisa; metformina MONITORAR (AMPK excessiva).

Pesquisa: Narkar Cell 2008; Hardie AMPK 2012; Mangano 1993 acadesina em cirurgia cardíaca.`,
  },
  {
    slug: "tirzepatida",
    name: "Tirzepatida",
    aliases: ["Tirzepatide", "Mounjaro", "Zepbound", "LY3298176", "Twincretin", "tirzepatida", "Tirzec"],
    body: `Agonista duplo GIP/GLP-1 — maior eficácia entre incretinas aprovadas para perda de peso (vs semaglutida).
Também conhecido como: Mounjaro, Zepbound, LY3298176, twincretin.
Meia-vida: ~5 dias. Classificação: twincretin. Ciclo: 16–72 semanas (uso contínuo). Via: SC semanal. Dose: 2,5 mg/semana início → titulação a cada 4 semanas até 15 mg/semana. Evidência: alta. Reconstituição de vial: fácil.

O que é: análogo de 39 aa; FDA DM2 (Mounjaro 2022) e obesidade (Zepbound 2023).

Mecanismo: ativa GIP e GLP-1. GIP: insulina glicose-dependente, glucagon, adipócitos. GLP-1: apetite (núcleo arqueado), esvaziamento gástrico, saciedade. SURMOUNT-1 n=2539, 72 sem: 15,0% / 19,5% / 20,9% com 5/10/15 mg vs 3,1% placebo. Titular a cada 4 semanas por tolerância GI.

Benefícios: perda de peso até ~21–22,5% em 72 sem; HbA1c (SURPASS) superior à semaglutida; gordura visceral/hepática; CV/lipídios/PA; preservação de magra vs GLP-1 isolado.

Linha do tempo: sem 1-2 náusea e saciedade; sem 3-4 adaptação GI ~0,5–1 kg/sem; mês 2-3 aceleração; mês 3+ sustentado com dieta.

Dosagem SC abdômen/coxa/braço 1x/semana. Concentração ficha vial: 1 mL = 5 mg/mL (vial 5 mg). Distinguir caneta de farmácia vs reconstituição de frasco.
Titulação: sem 1–4 = 2,5 mg; 5–8 = 5; 9–12 = 7,5; 13–16 = 10; 17–20 = 12,5; 21+ = 15 se tolerado.
2,5 mg é só tolerância GI, sem efeito pleno.

Reconstituição vial: 1,0 mL água bacteriostática; parede do frasco; girar sem agitar; 2–8°C; 28 dias; não congelar.

Efeitos: náusea, vômito, diarreia na titulação; obstipação; dor abdominal; pancreatite (classe GLP-1). CONTRAINDICADO em MEN-2 e histórico de carcinoma medular de tireoide.

Stacks: NUNCA combinar com semaglutida (dois incretínicos). Insulina MONITORAR — reduzir dose sob médico. AOD-9604, 5-Amino-1MQ, BPC-157 compatíveis na ficha (BPC-157 por mucosa GI).

Pesquisa: SURMOUNT-1 2022; SURPASS-2 vs semaglutida 2021; revisão dual GIP/GLP-1 2023.`,
  },
  {
    slug: "retatrutide",
    name: "Retatrutide",
    aliases: ["LY3437943", "Triple G", "Triincretina", "Retatutide", "GLP-1/GIP/Glucagon"],
    body: `Agonista triplo GLP-1/GIP/glucagon — maior perda de peso documentada em fase 2.
Também conhecido como: LY3437943, Triple G, triincretina.
Meia-vida: ~6 dias (fase 2). Classificação: triincretina; fase 3 em andamento. Ciclo estudos: 24–52 semanas. Via: SC semanal. Dose típica: 4–12 mg 1x/semana. Evidência: moderada. NÃO aprovado FDA/ANVISA.

O que é: Eli Lilly; Jastreboff NEJM 2023 fase 2 ~24% peso em 48 semanas na dose 12 mg.

Mecanismo: GLP-1 (apetite, esvaziamento gástrico, insulina); GIP (anorexia/insulina); glucagon/GCGR (gasto energético, termogênese, lipólise hepática/visceral, MASH). TRIUMPH fase 2: 12 mg/sem → 24,2% em 48 sem, acima de semaglutida (~15%) e tirzepatida (~21%). Fase 3 TRIUMPH em andamento (obesidade, T2DM, MASH). Pesquisa clínica avançada, não bula.

Benefícios citados: maior perda documentada ~24%; visceral/hepática; marcadores metabólicos; semanal.

Linha do tempo: sem 1-2 náusea e apetite; sem 3-4 ~1–1,5 kg/sem; mês 2-3 expressivo; mês 3+ até ~24% na máxima — aguardar fase 3.

Dosagem: 4–12 mg SC 1x/sem. Titulação TRIUMPH: sem 1–4 = 2 mg; 5–8 = 4; 9–12 = 8; 13+ = 12 se tolerado. Concentração ficha estimada 1 mL = 6 mg/mL.

Reconstituição vial (ficha research): 1,0 mL bac water; parede; girar; 2–8°C; 28 dias; não congelar.

Efeitos: náusea/vômito intensos na titulação; diarreia; pancreatite possível; risco teórico tumor células C tireoide.

Stacks: NUNCA com semaglutida nem tirzepatida (já inclui GIP+GLP-1 + glucagon). Insulina MONITORAR. AOD-9604 e 5-Amino-1MQ compatíveis na ficha.

Pesquisa: TRIUMPH fase 2 NEJM 2023 (n=338); fase 2 T2DM; revisões 2024 do agonismo triplo.`,
  },
];

export function buildPeptideChatKnowledgeBlock(): string {
  return PEPTIDE_CHAT_ENTRIES.map((entry) => {
    const aliases = entry.aliases.length ? `Apelidos: ${entry.aliases.join(", ")}` : "";
    return `### ${entry.name}\n${aliases}\n\n${entry.body}`.trim();
  }).join("\n\n---\n\n");
}

export function listPeptideChatNames(): string[] {
  return PEPTIDE_CHAT_ENTRIES.map((entry) => entry.name);
}

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function termsOf(entry: PeptideChatEntry): string[] {
  return [entry.name, entry.slug, ...entry.aliases]
    .map(fold)
    .filter((term) => term.length >= 4);
}

export function matchPeptideChatEntries(question: string): PeptideChatEntry[] {
  const q = ` ${fold(question)} `;
  const scored = PEPTIDE_CHAT_ENTRIES.map((entry) => {
    let score = 0;
    for (const term of termsOf(entry)) {
      if (q.includes(` ${term} `) || q.includes(term)) {
        score = Math.max(score, term.length);
      }
    }
    return { entry, score };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map((row) => row.entry);
}

export function answerFromPeptideKnowledge(question: string): string {
  const q = fold(question);
  const names = listPeptideChatNames().join(", ");
  const disclaimer = "Informativo — não substitui médico ou endocrinologista.";
  const looksLikeOrder = /\b(pedido|pix|rastreio|rastrear|senha|reenvio|entregue|pagamento|boleto)\b/.test(q);
  const matches = matchPeptideChatEntries(question);

  if (looksLikeOrder && matches.length === 0) {
    return "Pedido, PIX, rastreio e senha não são função deste assistente. Veja em Minha conta → Meus pedidos, ou fale no suporte do pedido / WhatsApp da loja.";
  }

  if (matches.length === 0) {
    return `Não tenho ficha disso ainda. Hoje consigo falar de: ${names}. Se for outro composto, fale no WhatsApp/suporte da loja.`;
  }

  const blocks = matches.map((entry) => `### ${entry.name}\n${entry.body.trim()}`);
  return `${disclaimer}\n\n${blocks.join("\n\n---\n\n")}`;
}
