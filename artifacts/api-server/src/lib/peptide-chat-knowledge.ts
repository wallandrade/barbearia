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
    slug: "aod-9604",
    name: "AOD-9604",
    aliases: ["AOD9604", "AOD 9604", "Anti-Obesity Drug 9604", "hGH fragment 176-191", "Tyr-hGH(177-191)", "fragmento 176-191"],
    body: `Fragmento lipolítico do GH para emagrecimento, sem efeito diabetogênico.
Também conhecido como: AOD9604, Anti-Obesity Drug 9604, hGH fragment 176-191, Tyr-hGH(177-191).
Meia-vida: ~30 minutos. Classificação: fragmento C-terminal do hGH (aa 176–191) com tirosina N-terminal. Ciclo: 12–16 semanas. Via: SC 30 min antes do café (em jejum). Dose típica: 300 mcg/dia manhã em jejum. Evidência: moderada. Reconstituição: fácil.

O que é: fragmento modificado do hormônio do crescimento (hGH aa 176-191). Desenvolvido na Monash University / Metabolic Pharmaceuticals (Austrália) para obesidade. Atua no tecido adiposo sem os efeitos diabetogênicos do GH completo. NÃO eleva IGF-1, NÃO estimula crescimento ósseo/muscular, NÃO causa hiperglicemia.

Mecanismo: lipólise via receptor beta-3-adrenérgico (β3-AR) nos adipócitos; inibe lipogênese. Sem mediação pelo receptor de GH (GHR) nem IGF-1. Em animais, lipólise comparável ao hGH completo (visceral e subcutânea). Programa clínico oral chegou à fase 2b para obesidade e NÃO mostrou eficácia significativa vs placebo — o desenvolvimento para essa indicação foi interrompido. Uso off-label atual: lipólise localizada (SC peri-adiposo) e protocolos de cartilagem/articulação (mecanismo articular ainda não totalmente elucidado).

Benefícios citados na ficha: lipólise seletiva sem elevar IGF-1; redução de gordura abdominal/visceral; sem impacto negativo em glicemia/insulina; potencial regenerativo em cartilagem; perfil de segurança citado como favorável; complemento de protocolos GLP-1. Eficácia isolada modesta — responde melhor em combinação com dieta/déficit.

Linha do tempo: sem 1-2 lipólise perceptível em gordura localizada com dieta e exercício; sem 3-4 redução de medidas na área aplicada e mais definição; mês 2-3 composição corporal mais consolidada; articular: possível redução de dor em protocolo de cartilagem; mês 3+ ciclo 8–12 sem com pausa e reavaliação (DEXA ou bioimpedância).

Dosagem: 300 mcg/dia SC manhã em jejum (30–60 min). Frequência 1x/dia. Ciclo 12–16 semanas. Concentração ficha: 2 mL = 250 mcg/mL (vial 500 mcg). Via peri-adiposo para efeito localizado.
Indicações (ficha): lipólise corporal 250–500 mcg SC 1x/dia em jejum no abdômen ou área-alvo + déficit calórico; lipólise localizada 250 mcg SC direto na área; regeneração articular/cartilagem off-label 250–500 mcg SC 1x/dia (8–12 sem); junto com semaglutida/tirzepatida 250 mcg SC 1x/dia (mecanismos distintos; sem interação conhecida na ficha).
Fases SC: sem 1–12 = 250–500 mcg SC 1x/dia em jejum; pausa 4 semanas = avaliar composição antes de reiniciar; ciclo seguinte = mesma dose ou ajustar pelo resultado.

Reconstituição: aspirar 2,0 mL água bacteriostática; injetar pela parede do frasco (evitar espuma); girar suavemente até dissolver (não agitar); rotular; refrigerar 2–8°C; proteger da luz; injetar em jejum 30–60 min.

Efeitos: dor discreta no local da injeção; leve fadiga nas primeiras semanas; eficácia isolada modesta (melhor em combinação). Sem o perfil de hiperglicemia/retenção hídrica típico do GH completo, segundo a ficha.

Stacks: Semaglutida COMPATÍVEL (GLP-1 perda total + AOD lipólise localizada); Tirzepatida COMPATÍVEL (GIP/GLP-1 sistêmico + AOD composição); BPC-157 COMPATÍVEL (articular/tecido + lipólise); 5-Amino-1MQ SINÉRGICO (β3-AR vs NNMT/NAD+, vias complementares); Ipamorelin COMPATÍVEL (GH endógeno anabólico vs AOD lipolítico). HGH Fragment 176-191 MONITORAR — mesmo mecanismo; não juntar (escolher um). Stack citado: Metabolic Reset = Semaglutida + AOD-9604.

Pesquisa: Heffernan/Ng 2001 — AOD-9604 reduz adiposidade em roedores obesos sem efeitos tipo GH (IGF-1/glicemia). Fase 2 2006 (oral, adultos obesos) — redução de gordura visceral em subgrupos; fase 2b oral não significativa vs placebo, programa descontinuado. 2014 — evidência pré-clínica/in vitro de potencial em cartilagem.`,
  },
  {
    slug: "dsip",
    name: "DSIP",
    aliases: ["Delta Sleep-Inducing Peptide", "DSIP nonapeptídeo", "delta-sleep peptide", "Trp-Ala-Gly-Gly-Asp-Ala-Ser-Gly-Glu"],
    body: `Peptídeo indutor de sono delta, com efeito ansiolítico e adaptogênico. Categoria ficha: imunidade / sono.
Também conhecido como: Delta Sleep-Inducing Peptide, DSIP nonapeptídeo, Trp-Ala-Gly-Gly-Asp-Ala-Ser-Gly-Glu.
Meia-vida: ~7–15 min no plasma; efeito clínico pode durar horas (mecanismo indireto). Classificação: nonapeptídeo indutor de sono delta (NREM3); regulador do eixo HPA. Ciclo: 2–4 semanas (ficha); fases citam 1–6 sem. Via: SC ou intranasal. Dose típica: 100–500 mcg SC ou nasal, ao dormir. Evidência: baixa. Reconstituição: fácil.

O que é: nonapeptídeo isolado de coelhos em sono profundo (Monnier e Schoenenberger, Basel, 1977). Além de sono delta de ondas lentas, a ficha cita ansiólise, antioxidante, analgesia e regulação de cortisol (adaptógeno peptídico). Detectado em hipotálamo, hipófise, plasma e pâncreas humanos. IMPORTANTE: evidência clínica humana limitada; estudos principais das décadas de 1970–1990; estudos modernos controlados são escassos — VERIFICAR.

Mecanismo: indução de NREM3 não totalmente elucidada — ritmos circadianos hipotalâmicos, potencialização GABA-A e sistema opioide endógeno. Eixo HPA: em roedores, reduz resposta de corticosterona ao estresse. Também pesquisados: analgesia (opioide), anticonvulsivante, termorregulação. Paradoxo: meia-vida plasmática curta vs efeito por horas → ação indireta via neurotransmissores.

Benefícios citados na ficha (evidência baixa): melhora de sono delta profundo; ansiólise; redução de cortisol; analgesia; regulação de GH e ACTH. Sempre avisar que dados humanos são antigos e fracos.

Linha do tempo: sem 1-2 qualidade de sono e mais NREM3; onset 30–60 min; sem 3-4 menos despertar noturno; recuperação muscular/cognitiva associada ao sono profundo; mês 2-3 cortisol noturno e adaptação ao estresse só anedótico — VERIFICAR; mês 3+ ciclos 4–8 sem com pausa; avaliar por diário ou polissonografia — VERIFICAR.

Dosagem: 100–500 mcg SC ou intranasal ao dormir. Via típica ficha: SC. Frequência 1x/dia, 30–60 min antes de dormir. Ciclo 2–4 semanas. Concentração ficha: 2 mL = 100 mcg/mL (vial 200 mcg).
Indicações (ficha): insônia/sono profundo 100–300 mcg SC 30–60 min antes de dormir (resposta variável — VERIFICAR); cortisol/adaptógeno 100–200 mcg SC à noite (sem protocolo padronizado — VERIFICAR); dor crônica/analgesia adjuvante 100–200 mcg SC (evidência limitada — VERIFICAR); com Epithalon 100 mcg DSIP + 5 mg Epithalon SC antes de dormir — VERIFICAR.
Fases SC: sem 1–6 = 100–200 mcg SC 30–60 min antes de dormir; pausa 2–4 semanas = avaliar sono e cortisol; ciclo seguinte = mesma dose ou ajustar; polissonografia para objetivar efeito.

Reconstituição: aspirar 2,0 mL água bacteriostática; injetar pela parede do frasco (evitar espuma); girar suavemente (não agitar); rotular; refrigerar 2–8°C; proteger da luz; aplicar 30–60 min antes de dormir.

Efeitos: tolerância rápida; cefaleia; sonhos vívidos; dados humanos limitados.

Stacks: Epithalon SINÉRGICO (DSIP = NREM3; Epithalon = melatonina/circadiano); Selank COMPATÍVEL (ansiedade diurna vs sono noturno); Semax COMPATÍVEL (cognitivo de manhã vs DSIP à noite — não sobrepor horário); Ipamorelin COMPATÍVEL (pulso de GH no sono delta). Benzodiazepínicos MONITORAR: DSIP potencializa GABA; junto pode ter sedação excessiva e risco de depressão respiratória — VERIFICAR. NÃO usar com benzo sem médico.

Pesquisa: Monnier/Schoenenberger 1977 — isolamento do DSIP no liquor de coelhos e indução de sono delta. Schoenenberger 1984 — revisão (sono, HPA, analgesia, termorregulação). 1989 — DSIP em liquor/plasma humanos e correlação com resposta de corticosterona ao estresse.`,
  },
  {
    slug: "ghk-cu",
    name: "GHK-Cu",
    aliases: ["Copper peptide", "GHK", "Glycyl-L-histidyl-L-lysine copper", "Cu-GHK", "GHK cobre", "peptídeo de cobre"],
    body: `Complexo cobre-peptídeo para pele, cabelo e regeneração. Categoria ficha: estética.
Também conhecido como: Copper peptide, GHK, Glycyl-L-histidyl-L-lysine copper, Cu-GHK.
Meia-vida: ~30 min SC; tópico tem efeito depot mais longo. Classificação: tripeptídeo endógeno quelante de Cu²⁺. Ciclo: 8–16 semanas. Via: SC ou tópica. Dose típica: 1–2 mg SC 3–5x/semana ou uso tópico. Evidência: moderada. Reconstituição: média. Solução reconstituída deve ficar azul-celeste.

O que é: tripeptídeo Gly-His-Lys naturalmente no plasma; cai com a idade (~200 ng/mL em jovens → ~80 ng/mL após 60 anos). Descoberto por Loren Pickart em 1973. A ficha cita >40 anos de pesquisa: remodelação de colágeno, cabelo, cicatrização e proteção neural (tópico e sistêmico). Sem o cobre (GHK livre) a atividade cai muito — o Cu²⁺ é cofator essencial.

Mecanismo: ativa fibroblastos para colágeno I e III, elastina e glicosaminoglicanos (hialuronano). Transcriptômica (Pickart): modula >4.000 genes (reparo de DNA, anti-inflamação, antioxidação, angiogênese, apoptose). SC: migração de queratinócitos, VEGF, cicatrização. Tópico: penetra a barreira e atua em fotoenvelhecimento.

Benefícios citados: síntese de colágeno e elastina; regeneração capilar; cicatrização mais rápida; neuroproteção; antioxidante.

Linha do tempo: sem 1-2 tópico = textura/hidratação; SC = inflamação inicial mínima; sem 3-4 menos linhas finas; SC acelera cicatrização de lesões; mês 2-3 elasticidade, tônus e uniformidade; mês 3+ cumulativo; tópico contínuo mais pronunciado na ficha.

Dosagem: 1–2 mg SC 3–5x/semana ou tópico. Frequência tópico 1–2x/dia; SC 2–3x/semana na tabela de protocolos. Ciclo 8–16 semanas. Concentração: tópico 1–5%; SC 1 mL = 1 mg/mL.
Indicações (ficha): rejuvenescimento tópico 1–5% após limpeza 1–2x/dia; cicatrização 2–5% em curativo oclusivo (troca diária); anti-aging SC 1–2 mg 2–3x/semana (8 sem on / 4 sem off); alopecia tópico 2–3% no couro cabeludo à noite, avaliar em 90 dias.
Fases SC: sem 1–8 = 1–2 mg SC 2–3x/semana ou tópico 1–2x/dia; pausa 4 semanas = tópico de manutenção se quiser; ciclo seguinte = retomar conforme objetivo.

Reconstituição: aspirar 1,0 mL água bacteriostática; injetar pela parede (evitar espuma e calor); girar até dissolver — solução azul-celeste; tópico: diluir em salina ou gel a 1–5%; refrigerar 2–8°C; proteger da luz; válido 21 dias após reconstituição.

Efeitos: irritação tópica em pele sensível; pigmentação transitória; acúmulo de cobre se uso excessivo.

Stacks: BPC-157 SINÉRGICO (matriz/colágeno vs angiogênese/cicatrização); TB-500 SINÉRGICO (células-tronco sistêmicas vs remodelação local); Ipamorelin COMPATÍVEL (GH/IGF-1 amplifica colágeno). Retinoides MONITORAR: irritação e eritema cumulativos no tópico — dias alternados e ir aumentando.

Pesquisa: Pickart 1985 — fibroblastos humanos: mais colágeno, elastina e GAGs. Pickart et al. 2018 — revisão (estresse oxidativo/envelhecimento; transcriptômica >4.000 genes). 2015 — vias de matriz, angiogênese e reparo de DNA em pele (rejuvenescimento e feridas).`,
  },
  {
    slug: "hgh-fragment-176-191",
    name: "HGH Fragment 176-191",
    aliases: ["HGH Frag 176-191", "Fragment 176-191", "GH Frag", "hGH C-terminal fragment", "GH fragment lipolytic", "Frag 176-191"],
    body: `Fragmento lipolítico do GH sem efeitos anabólicos. Categoria ficha: emagrecimento.
Também conhecido como: HGH Frag 176-191, Fragment 176-191, GH Frag, hGH C-terminal fragment.
Meia-vida: ~30 minutos. Classificação: fragmento C-terminal do hGH (aa 176–191) SEM tirosina N-terminal — diferente do AOD-9604. Ciclo: 12–16 semanas. Via: SC. Dose típica: 250–500 mcg 1–2x/dia em jejum. Evidência: moderada (pré-clínico; sem fase 2/3 próprias). Reconstituição: fácil.

O que é: fragmento C-terminal do GH (aa 176-191). Mecanismo lipolítico igual ao AOD-9604, mas SEM a tirosina extra na ponta N (AOD-9604 é mais estável). NÃO eleva IGF-1, NÃO hiperglicemia, NÃO crescimento ósseo/muscular. Mais barato e comum no mercado research. A ficha de capa às vezes chama de “também AOD-9604” — NÃO são idênticos. Sem estudos clínicos fase 2/3 próprios; dados vêm do programa do fragmento nativo que antecedeu o AOD-9604.

Mecanismo: ativa β3-AR nos adipócitos (lipólise, inibe lipogênese) sem GHR clássico. Sem tirosina, estabilidade/meia-vida efetiva pode ser um pouco menor que AOD-9604 (comparativos diretos escassos). Indicação off-label: lipólise visceral/subcutânea (abdômen) + déficit calórico e exercício.

Benefícios citados: lipólise (sobretudo visceral); sem anabolismo indesejado do GH; possível melhora da sensibilidade à insulina; preservação de massa muscular na ficha.

Linha do tempo: sem 1-2 lipólise localizada com déficit calórico; sem 3-4 redução de medidas e mais definição; mês 2-3 composição mais consolidada com dieta; mês 3+ ciclos 8–12 sem com pausa e reavaliação.

Dosagem: 250–500 mcg SC 1–2x/dia em jejum (30–60 min). Frequência da tabela: 1x/dia em jejum. Ciclo 12–16 semanas. Concentração ficha: 2 mL = 250 mcg/mL (vial 500 mcg). Via peri-adiposo para efeito localizado.
Indicações (ficha): lipólise corporal 250–500 mcg SC 1x/dia em jejum + déficit e exercício; localizada 250 mcg SC na área; manutenção pós-cutting 250 mcg SC 3–4x/semana; com semaglutida/tirzepatida 250 mcg SC 1x/dia (sem interação conhecida na ficha).
Fases SC: sem 1–12 = 250–500 mcg SC 1x/dia em jejum; pausa 4 semanas = avaliar composição; ciclo seguinte = mesma dose; se quiser mais estabilidade, a ficha sugere considerar AOD-9604 no lugar — não os dois juntos.

Reconstituição: aspirar 2,0 mL água bacteriostática; injetar pela parede (evitar espuma); girar (não agitar); rotular; refrigerar 2–8°C; proteger da luz; aplicar em jejum 30–60 min.

Efeitos: hipoglicemia leve; anticorpos neutralizantes com uso prolongado.

Stacks: AOD-9604 MONITORAR — mesmo mecanismo (β3-AR); juntar é redundante; escolher só um. Semaglutida COMPATÍVEL; Tirzepatida COMPATÍVEL; 5-Amino-1MQ SINÉRGICO (β3-AR vs NNMT); Ipamorelin COMPATÍVEL (GH anabólico vs frag lipolítico).

Pesquisa: Ng et al. 1997 — fragmento 176-191 lipolítico em adipócitos/roedores, sem crescimento/insulinogênico. 2001 — lipólise sem GHR, sem IGF-1, sem alterar glicemia. 2008 — revisão comparando frag nativo vs AOD-9604 (tirosina aumenta estabilidade, mecanismo lipolítico parecido).`,
  },
  {
    slug: "slu-pp-332",
    name: "SLU-PP-332",
    aliases: ["SLU PP 332", "Agonista pan-ERR SLU", "ERR alfa/beta/gamma agonista", "Exercise mimetic ERR", "Saint Louis University ERR"],
    body: `Ativador de ERR para mimetismo de exercício aeróbico. Categoria ficha: emagrecimento.
Também conhecido como: SLU PP 332, agonista pan-ERR (Saint Louis University), exercise mimetic ERR.
Meia-vida: desconhecida em humanos (só modelos animais). Classificação: composto sintético de baixo peso — NÃO é peptídeo; agonista pan-ERR (alfa, beta e gama); exercise mimetic PRÉ-CLÍNICO. Ciclo: em investigação. Via: oral (em desenvolvimento). Dose típica: dose humana NÃO estabelecida. Evidência: baixa. Reconstituição: média (pesquisa).

O que é: agonista dos receptores relacionados ao estrogênio (ERRα/β/γ) que liga o programa transcricional de exercício de resistência no músculo. Grupo Elgendy / Stephens-Shields, Saint Louis University; paper 2023. Em camundongos: perda de gordura e mais desempenho SEM exercício. ATENÇÃO: 100% pré-clínico (2023–2024). Nenhum dado humano publicado. Toxicidade, PK e eficácia em humanos desconhecidas. Research-only; vender/usar como suplemento é prematuro e sem regulamentação.

Mecanismo: pan-ERR → PGC-1α, genes mitocondriais (COX, citocromos), densidade mitocondrial, oxidação de gordura, gasto energético. Murinos sedentários: ↑ VO2máx e resistência à fadiga. Pesquisa inicial: obesidade, síndrome metabólica, HFpEF.

Benefícios citados (SÓ animais): mimetismo de exercício aeróbico; mais gasto energético; queima de gordura sem treino (murino); desempenho. NÃO comprovado em humano.

Linha do tempo: sem 1-2 só murino (marcadores mitocondriais); sem 3-4 murino ↑ aeróbico e oxidação de gordura — extrapolação humana especulativa; mês 2-3 adaptação mitocondrial murina; mês 3+ sem dado crônico humano. Timeline humana desconhecida.

Dosagem: dose humana NÃO estabelecida. Referência murina: 30 mg/kg/dia oral. Frequência/ciclo: em investigação. Qualquer extrapolar rato → humano é prematuro e potencialmente perigoso.
Indicações (ficha): pesquisa aeróbica/metabolismo — só pesquisa, 30 mg/kg/dia oral em camundongos; síndrome metabólica/obesidade — hipótese, sem ensaio clínico; HFpEF — pesquisa ativa, sem dado humano em 2024.
Fases SC: protocolo murino 4–8 semanas 30 mg/kg/dia oral; AVISO = nenhum protocolo humano existe; status = research-only.

Reconstituição (pesquisa): sem protocolo humano aprovado. Pó em DMSO grau pesquisa (estoque 10–50 mM); diluir com PEG400/Tween-80/água para oral em animais; cápsulas artesanais humanas = sem formulação padronizada. Estoque DMSO a −20°C, luz/umidade; estabilidade de meses.

Efeitos: dados humanos inexistentes; perfil de segurança desconhecido.

Stacks: GW501516 (Cardarine) MONITORAR — PPARδ parcialmente convergente; redundante e risco desconhecido. SS-31 COMPATÍVEL só pré-clínico (cardiolipina vs biogênese). NAD+/NMN/NR COMPATÍVEL teórico (sirtuínas/AMPK vs ERR/PGC-1α). AOD-9604 COMPATÍVEL especulativo (lipólise vs oxidação). AICAR também é exercise mimetic (AMPK), não peptídeo — não tratar SLU como peptídeo.

Pesquisa: Elgendy et al. 2023 — design e validação in vivo (ERR, genes mitocondriais, aeróbico, adiposidade em camundongos). Huss et al. 2004 — ERRα / PPARα / metabolismo muscular e cardíaco. Rangwala/Lazar 2010 — revisão ERR em doença metabólica.`,
  },
  {
    slug: "tesamorelin",
    name: "Tesamorelin",
    aliases: ["Egrifta", "TH9507", "GHRH(1-44)-trans-3-hexenoic acid", "Tesamorelin acetato", "Tesamorelina"],
    body: `Análogo de GHRH aprovado pelo FDA para lipodistrofia (Egrifta). Categoria ficha: performance.
Também conhecido como: Egrifta, TH9507, Tesamorelin acetato.
Meia-vida: ~26–38 min (GHRH nativo ~7 min). Classificação: análogo estabilizado de GHRH; único com aprovação FDA. Ciclo: 26–52 semanas. Via: SC abdômen. Dose típica: 1–2 mg SC 1x/dia. Evidência: alta. Reconstituição: fácil.

O que é: análogo sintético do GHRH (44 aa) com grupo trans-3-hexenoico na N-terminal — resiste à DPP-IV. FDA 2010 (Egrifta) para gordura visceral abdominal (VAT) na lipodistrofia por HIV + antirretrovirais. Estimula pulso fisiológico de GH (não suprime o eixo, ao contrário do GH exógeno). Off-label: Friedman et al. JAMA 2013 — VAT e cognição em idosos sem HIV com comprometimento cognitivo leve.

Mecanismo: pulso de GH na hipófise → IGF-1 e lipólise visceral (receptor de GH nos adipócitos viscerais). Preserva ritmo circadiano.

Benefícios (ensaios): redução de gordura visceral; perfil lipídico; ↑ IGF-1; composição corporal.

Linha do tempo: sem 1-2 sono profundo, IGF-1 mensurável, leve retenção hídrica; sem 3-4 circunferência abdominal e composição; mês 2-3 VAT e lipídios nos estudos; mês 3+ contínuo; reavaliar aos 6 meses — suspender se VAT não responder.

Dosagem: 1–2 mg SC 1x/dia no abdômen, mesmo horário. Ciclo 26–52 semanas. Concentração ficha: 2 mL = 1 mg/mL (vial 2 mg).
Indicações (ficha): lipodistrofia HIV (FDA) 2 mg/dia SC contínuo; VAT off-label não-HIV 2 mg/dia, ciclos 12–24 sem, DEXA ou TC; anti-aging/cognição idosos 1–2 mg/dia, monitorar IGF-1 e glicemia; com GHRP 2 mg Tesamorelin + 100–200 mcg Ipamorelin (vias complementares).
Fases SC: sem 1–26 = 2 mg/dia SC (padrão FDA); semana 26 = medir VAT, suspender se redução < 8% vs basal; semana 27+ = 2 mg/dia se boa resposta.

Reconstituição: aspirar 2,2 mL água estéril para injeção (kit Egrifta); injetar pela parede (evitar espuma); girar (não agitar); usar na hora ou refrigerar 2–8°C no máximo 24 h; descartar se turva ou com partículas.

Efeitos: retenção hídrica; artralgia; resistência à insulina; neuropatia periférica (rara).

Stacks: Ipamorelin SINÉRGICO (GHRH abre janela + GHRP/grelina = pico de GH 2–5×). GHRP-2 SINÉRGICO (mais potente; monitorar cortisol). CJC-1295 MONITORAR — NÃO juntar dois GHRH (hipersecreção e dessensibilização). 5-Amino-1MQ COMPATÍVEL. Semaglutida COMPATÍVEL (VAT vs perda total).

Pesquisa: Falutz et al. LIPO-010 fase 3 2010 — tesamorelin 2 mg/dia SC: VAT −15,2% vs −5,1% placebo em 26 sem (HIV lipodistrofia) → FDA. Friedman et al. JAMA 2013 — VAT e memória verbal em idosos sem HIV com CCL. Revisão 2017 — tesamorelin vs sermorelin/CJC-1295: único com aprovação e fase 3 de VAT.`,
  },
  {
    slug: "mots-c",
    name: "MOTS-C",
    aliases: ["MOTS-c", "MOTS-c peptide", "Mitochondrial ORF of 12S rRNA type-c", "Mitokine MOTS-c", "MOTSC"],
    body: `Peptídeo mitocondrial regulador de metabolismo e longevidade. Categoria ficha: longevidade.
Também conhecido como: MOTS-c peptide, Mitochondrial ORF of 12S rRNA type-c, mitokine MOTS-c.
Meia-vida: ~4–6 h (estimativa; dados humanos limitados). Classificação: peptídeo de 16 aa codificado pelo mtDNA (12S rRNA); mitokine metabólica. Ciclo: 8–12 semanas. Via: SC. Dose típica citada: 5–10 mg SC 3x/semana. Evidência: baixa. Reconstituição: fácil. Pesquisa de fronteira — sem protocolo clínico estabelecido.

O que é: ORF pequena no 12S rRNA mitocondrial; descoberto por Changhan David Lee (USC, 2015). Age como hormônio sistêmico: AMPK, homeostase metabólica; em animais, extensão de vida e menos obesidade/resistência à insulina mesmo sedentários. Em humanos, polimorfismos de mtDNA ligados a centenários japoneses; MOTS-c sérico cai com idade e obesidade e sobe com HIIT. IMPORTANTE: ensaios clínicos controlados em humanos ainda muito escassos.

Mecanismo: ativa AMPK no músculo e fígado → mais sensibilidade à insulina, oxidação de ácidos graxos, glicemia. Lee et al. Cell Metabolism 2015: mimetiza exercício metabólico em camundongos.

Benefícios citados (maioria animal/anedótico): sensibilidade à insulina; longevidade em modelos; composição corporal; proteção metabólica. Sempre dizer que evidência humana é baixa.

Linha do tempo: sem 1-2 energia e insulina só anedótico; sem 3-4 glicemia/jejum e sensibilidade — VERIFICAR; mês 2-3 marcadores de resistência/inflamação nos animais; mês 3+ sem dado humano longo; ciclos 8–12 sem até haver mais evidência.

Dosagem: 5–10 mg SC 3x/semana (experimental). Ciclo 8–12 semanas. Concentração ficha: 2 mL = 5 mg/mL (vial 10 mg).
Indicações (ficha): metabolismo/insulina 5 mg SC 3x/sem — VERIFICAR; longevidade 5–10 mg SC 3x/sem + exercício para AMPK; no dia de HIIT 5 mg SC (sinal natural sobe com treino) — VERIFICAR; teto anedótico 10 mg SC 3x/sem sem safety robusta — VERIFICAR.
Fases SC: 8–12 sem = 5–10 mg SC 3x/sem; pausa 4–8 sem = glicemia, insulina, HOMA-IR; ciclo seguinte = mesma dose se resposta, aguardar evidência clínica.

Reconstituição: aspirar 2,0 mL água bacteriostática; parede do frasco (evitar espuma); girar (não agitar); rotular; 2–8°C; proteger da luz. Pesquisa — protocolos clínicos ainda não padronizados.

Efeitos: dados humanos limitados; estudos iniciais relatam boa tolerância.

Stacks: 5-Amino-1MQ SINÉRGICO (AMPK vs NNMT/NAD+). Ipamorelin COMPATÍVEL (GH vs AMPK). Epithalon COMPATÍVEL (telômero/circadiano vs mitocôndria). Metformina MONITORAR — AMPK dupla, hipoglicemia. Semaglutida MONITORAR — insulina/glicemia em excesso; ajustar e medir glicemia.

Pesquisa: Lee et al. Cell Metabolism 2015 — MOTS-c, AMPK, obesidade e insulina em camundongos. 2019 — mtDNA/centenários japoneses; MOTS-c sérico cai com idade/obesidade. 2021 — HIIT eleva MOTS-c circulante em humanos.`,
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

export function listPeptideChatProducts(): Array<{ slug: string; name: string }> {
  return PEPTIDE_CHAT_ENTRIES.map((entry) => ({ slug: entry.slug, name: entry.name }));
}

export const PEPTIDE_GUIDE_TOPICS = [
  { id: "about", label: "O que é" },
  { id: "dose", label: "Dose e ciclo" },
  { id: "reconstitute", label: "Reconstituição" },
  { id: "effects", label: "Efeitos e cuidados" },
  { id: "stacks", label: "Pode juntar com" },
  { id: "research", label: "Pesquisa" },
] as const;

export type PeptideGuideTopicId = (typeof PEPTIDE_GUIDE_TOPICS)[number]["id"];

function topicFromHeading(line: string): PeptideGuideTopicId | "skip" | null {
  const l = line.trim();
  if (!l) return null;
  if (/^o que é/i.test(l)) return "about";
  if (/^mecanismo/i.test(l)) return "about";
  if (/^benef/i.test(l)) return "about";
  if (/^linha do tempo/i.test(l)) return "dose";
  if (/^dosagem/i.test(l)) return "dose";
  if (/^indica/i.test(l)) return "dose";
  if (/^fases sc/i.test(l)) return "dose";
  if (/^titula/i.test(l)) return "dose";
  if (/^reconstitui/i.test(l)) return "reconstitute";
  if (/^efeitos/i.test(l)) return "effects";
  if (/^stacks/i.test(l)) return "stacks";
  if (/^pesquisa/i.test(l)) return "research";
  if (/^tamb[eé]m conhecido/i.test(l)) return "skip";
  return null;
}

function splitGuideSections(body: string): Record<PeptideGuideTopicId, string> {
  const buckets: Record<PeptideGuideTopicId, string[]> = {
    about: [],
    dose: [],
    reconstitute: [],
    effects: [],
    stacks: [],
    research: [],
  };
  let current: PeptideGuideTopicId = "about";
  for (const raw of body.split("\n")) {
    const heading = topicFromHeading(raw);
    if (heading === "skip") {
      continue;
    }
    if (heading) {
      current = heading;
    }
    if (raw.trim()) buckets[current].push(raw.trim());
  }
  return {
    about: buckets.about.join("\n"),
    dose: buckets.dose.join("\n"),
    reconstitute: buckets.reconstitute.join("\n"),
    effects: buckets.effects.join("\n"),
    stacks: buckets.stacks.join("\n"),
    research: buckets.research.join("\n"),
  };
}

export type PeptideGuideBlock = { title: string; items: string[] };

const DISCLAIMER = "Informativo — não substitui médico ou endocrinologista.";

function tidyClause(value: string): string {
  return value.replace(/\s+/g, " ").replace(/^[-–•]\s*/, "").trim();
}

function splitBySemicolon(body: string): string[] {
  return body.split(";").map(tidyClause).filter((item) => item.length > 1);
}

function splitSentences(body: string): string[] {
  return body
    .split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÃÕÂÊÔÀ0-9])/)
    .map(tidyClause)
    .filter((item) => item.length > 1);
}

function splitTitration(body: string): string[] {
  const items: string[] = [];
  const leftover: string[] = [];
  for (const part of splitBySemicolon(body)) {
    const match = part.match(/^(?:sem(?:anas?)?\s*)?(.+?)\s*=\s*(.+)$/i);
    if (!match) {
      leftover.push(part);
      continue;
    }
    const weeks = match[1].replace(/^sem(?:anas?)?\s*/i, "").trim();
    let dose = match[2].trim();
    const extraSentences = dose.split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÃÕÂÊÔÀ0-9])/);
    if (extraSentences.length > 1) {
      dose = extraSentences[0].trim();
      leftover.push(...extraSentences.slice(1).map(tidyClause).filter(Boolean));
    }
    if (/^\d+(?:[.,]\d+)?$/.test(dose.replace(/\.$/, ""))) dose = `${dose.replace(/\.$/, "")} mg`;
    else dose = dose.replace(/^(\d+(?:[.,]\d+)?)\s+(?!mg)/i, "$1 mg ");
    items.push(`Semanas ${weeks}: ${dose}`);
  }
  return [...items, ...leftover];
}

function extractLabeledLine(line: string): { title: string; rest: string } | null {
  const patterns: Array<[RegExp, string]> = [
    [/^o que é(?:\s*\([^)]+\))?\s*:?\s*/i, "O que é"],
    [/^mecanismo(?:\s*\([^)]+\))?\s*:?\s*/i, "Mecanismo"],
    [/^benef[ií]cios[^:]*:\s*/i, "Benefícios"],
    [/^linha do tempo:\s*/i, "Linha do tempo"],
    [/^indica(?:ções)?[^:]*:\s*/i, "Indicações"],
    [/^fases sc:\s*/i, "Fases"],
    [/^titula[cç][aã]o:\s*/i, "Titulação"],
    [/^reconstitui[cç][aã]o[^:]*:\s*/i, "Reconstituição"],
    [/^efeitos[^:]*:\s*/i, "Efeitos e cuidados"],
    [/^stacks:\s*/i, "Pode juntar com"],
    [/^pesquisa:\s*/i, "Pesquisa"],
    [/^dosagem\b\s*/i, "Dosagem"],
  ];
  for (const [pattern, title] of patterns) {
    if (pattern.test(line)) {
      return { title, rest: line.replace(pattern, "").replace(/^:\s*/, "").trim() };
    }
  }
  return null;
}

function itemsForBlock(title: string, raw: string): string[] {
  const body = tidyClause(raw);
  if (!body) return [];
  if (title === "Titulação") return splitTitration(body);
  if (
    title === "Linha do tempo"
    || title === "Pode juntar com"
    || title === "Efeitos e cuidados"
    || title === "Indicações"
    || title === "Fases"
    || title === "Reconstituição"
  ) {
    const items = splitBySemicolon(body);
    if (title === "Linha do tempo") {
      return items.map((item) => item
        .replace(/^sem(?:anas?)?\s+/i, "Semanas ")
        .replace(/^m[eê]s\s+/i, "Mês "));
    }
    return items;
  }
  return splitSentences(body);
}

export function formatGuideBlocks(raw: string): PeptideGuideBlock[] {
  const blocks: PeptideGuideBlock[] = [];
  let currentTitle = "Resumo";
  let buffer: string[] = [];

  const flush = () => {
    const items = itemsForBlock(currentTitle, buffer.join(" "));
    if (items.length) blocks.push({ title: currentTitle, items });
    buffer = [];
  };

  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const labeled = extractLabeledLine(line);
    if (labeled) {
      flush();
      currentTitle = labeled.title;
      if (labeled.rest) buffer.push(labeled.rest);
      continue;
    }
    buffer.push(line);
  }
  flush();
  return blocks;
}

function blocksToPlainText(blocks: PeptideGuideBlock[]): string {
  return blocks
    .map((block) => `${block.title}\n${block.items.map((item) => `• ${item}`).join("\n")}`)
    .join("\n\n");
}

export function getPeptideGuideSection(slug: string, topicId: string): {
  name: string;
  topicLabel: string;
  disclaimer: string;
  blocks: PeptideGuideBlock[];
  text: string;
} | null {
  const entry = PEPTIDE_CHAT_ENTRIES.find((item) => item.slug === slug);
  const topic = PEPTIDE_GUIDE_TOPICS.find((item) => item.id === topicId);
  if (!entry || !topic) return null;
  const sections = splitGuideSections(entry.body);
  const raw = sections[topic.id]?.trim() || "Não há esse trecho nesta ficha.";
  const blocks = formatGuideBlocks(raw);
  const text = `${DISCLAIMER}\n\n${blocksToPlainText(blocks) || raw}`;
  return {
    name: entry.name,
    topicLabel: topic.label,
    disclaimer: DISCLAIMER,
    blocks,
    text,
  };
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
