# Padrões de código — Yuri Import

> **Última atualização:** 2026-08-11

Convenções **observadas no repo** + anti-padrões + **manutenção da memória viva**.

## Changelog

| Data | O quê | Impacto | O que NÃO mudou |
|------|--------|---------|-----------------|
| 2026-08-11 | Baseline de padrões + política de memória | Guia para agentes | Sem refactor de app |

## Precedência

1. Código-fonte atual  
2. Memória viva (`.contexto-yuri-imports/`)  
3. Tipagens/gerados e suposições do agente  

Se memória ≠ código → seguir o código e **atualizar a memória na mesma tarefa**.

## Frontend (`artifacts/ka-imports`)

- React 19 + Vite; rotas com **Wouter**; estado de carrinho com **Zustand** (+ persist).
- Dados remotos: **TanStack Query** (client gerado em `lib/api-client-react` quando aplicável).
- UI: Tailwind 4 + componentes estilo Radix/shadcn em `src/components`.
- Páginas em `src/pages`; store em `src/store`; hooks/lib em `src/hooks`, `src/lib`.
- Lazy routes / chunks manuais no Vite quando já existirem — preservar o padrão local.
- Nome do package e tags SW (`ka-imports-admin`) são legado; UI fala **Yury**.

## Backend (`artifacts/api-server`)

- Um arquivo de rota por domínio em `src/routes/`; agregação em `routes/index.ts`.
- Lógica compartilhada em `src/lib/`; middlewares em `src/middlewares/`.
- Respostas de erro costumam ser JSON `{ error, message }`; handler global em `app.ts`.
- Timezone de runtime: `America/Sao_Paulo` nos scripts start/dev.
- Preferir estender rotas/schemas existentes a inventar camadas novas (Nest, etc.).

## Banco / schema

- Drizzle + **MySQL** apenas (`mysqlTable`, `drizzle-orm/mysql2`).
- Schemas em `lib/db/src/schema/`; export barrel em `schema/index.ts`.
- **Não** introduzir Postgres/Prisma “por hábito”.
- Migrations/push: configs em `drizzle.config.ts` e `lib/db/drizzle.config.ts`.

## Codegen

- OpenAPI em `lib/api-spec/openapi.yaml` → Orval → `lib/api-zod` + `lib/api-client-react`.
- Ao mudar contrato público: atualizar spec e regenerar; não editar gerados à mão sem necessidade.

## Anti-padrões (não repetir)

- Assumir Postgres / Google Sheets porque `replit.md` diz — **código é MySQL + DB de produtos**.
- Inventar domínio “barbearia”, agendamento de salão, ou copiar termos de outro produto (ex. tenant_loja1 genérico) sem evidência.
- Tratar Service Worker como PWA offline completo — é **só notificação**.
- Polling no gateway APPCNPay para confirmar PIX — confirmação via **webhook** + status no BD.
- Ler `Admin.tsx` inteiro ou zips/backups em toda tarefa.
- Commit automático sem pedido explícito do humano.
- Inventar stack (Next/Nest/Prisma) sem evidência neste repo.

## Manutenção da memória viva (obrigatória)

**Objetivo:** contexto alinhado ao código, organizado, evitando repetir erros.

Após **qualquer mudança relevante** no código (feature, bugfix com regra nova, auth, integração, schema, deploy, padrão, anti-padrão descoberto), o agente deve **incrementar** os `.md` certos em `.contexto-yuri-imports/`:

1. Atualizar `> Última atualização:` (AAAA-MM-DD)
2. Nova linha no **Changelog** (data | o quê | impacto | o que NÃO mudou)
3. Ajustar o corpo com fatos do código
4. Anti-padrão novo → documentar aqui (ou no arquivo de domínio adequado)

**Exceção (não atualizar):** typo cosmético, formatação, comentário trivial, rename local sem efeito de contexto. Na resposta final declarar: `memória viva: sem update (sem impacto)`.

Nesta pasta vivem os fatos do produto; Cursor Rules mandam consultar e incrementar. Commits da memória: **só com pedido explícito**.
