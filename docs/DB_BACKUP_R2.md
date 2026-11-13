# Backup diário do MySQL para o Cloudflare R2

`scripts/src/db-backup-r2.mjs` faz um dump lógico do banco inteiro (tabelas, dados, views e triggers) num snapshot consistente, comprime com gzip e envia em partes de 8 MiB para o R2. A memória fica limitada. Qualquer erro sai com código 1 e aborta o upload incompleto. No fim o script lê o tamanho do objeto e falha se não bater com o arquivo enviado.

A chave do arquivo é `mysql/YYYY-MM-DD_HHmm.sql.gz`, no fuso `America/Sao_Paulo`.

Linha de sucesso:

```
[db-backup] ... OK yuri-imports-db-backups/mysql/2026-11-13_0300.sql.gz: N tables, ... gzip X MiB, sha256 ..., Ns
```

## Variáveis

Obrigatórias para enviar ao R2:

- `DATABASE_URL` — `mysql://user:pass@host:port/db`
- `BACKUP_R2_BUCKET` — bucket sugerido: `yuri-imports-db-backups` (privado, sem domínio público)
- `BACKUP_R2_ACCESS_KEY_ID` — token da conta Cloudflare, Object Read & Write, só nesse bucket
- `BACKUP_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_ACCOUNT_ID` — monta o endpoint `https://<id>.r2.cloudflarestorage.com`

Opcionais, iguais ao script da Ka:

- `BACKUP_S3_ENDPOINT` — se existir, substitui o endpoint montado com o account id (qualquer S3 compatível)
- `BACKUP_S3_REGION` — padrão `auto`
- `DATABASE_CA_CERT` — PEM. Com ele o TLS do banco é verificado. Sem ele a conexão segue criptografada, sem verificar o certificado
- `BACKUP_KEY_PREFIX` — padrão `mysql/`
- `BACKUP_TIME_ZONE` — padrão `TZ` ou `America/Sao_Paulo`
- `BACKUP_OUTPUT_FILE` — grava o `.sql.gz` nesse caminho e não envia ao R2

O token do R2 tem que ser um Account API token com Object Read & Write limitado ao bucket `yuri-imports-db-backups`.

## Job agendado no DigitalOcean App Platform

App `yuri-imports`, componente `db-backup-r2`, tamanho `apps-s-1vcpu-1gb`.

```yaml
jobs:
  - name: db-backup-r2
    kind: SCHEDULED
    schedule:
      cron: "0 3 * * *"
      time_zone: America/Sao_Paulo
    github:
      repo: wallandrade/yuri-imports
      branch: main
      deploy_on_push: true
    source_dir: /
    environment_slug: node-js
    build_command: CI=true pnpm install --frozen-lockfile --prod=false
    run_command: node --max-old-space-size=192 scripts/src/db-backup-r2.mjs
    instance_size_slug: apps-s-1vcpu-1gb
    instance_count: 1
    envs:
      - key: DATABASE_URL
        value: ${db.DATABASE_URL}
        scope: RUN_TIME
      - key: BACKUP_R2_BUCKET
        value: yuri-imports-db-backups
        scope: RUN_TIME
        type: SECRET
      - key: BACKUP_R2_ACCESS_KEY_ID
        value: <R2 Access Key ID>
        scope: RUN_TIME
        type: SECRET
      - key: BACKUP_R2_SECRET_ACCESS_KEY
        value: <R2 Secret Access Key>
        scope: RUN_TIME
        type: SECRET
      - key: CLOUDFLARE_R2_ACCOUNT_ID
        value: <account id>
        scope: RUN_TIME
        type: SECRET
```

`DATABASE_URL` fica ligado ao componente do banco MySQL do app (`${db.DATABASE_URL}`: troque `db` pelo nome real do componente). As chaves do R2 e o account id entram como SECRET. O horário `0 3 * * *` com `America/Sao_Paulo` roda todo dia às 3h da manhã.

No painel: App `yuri-imports` → Create Resources → Job → Scheduled Job. Nome `db-backup-r2`. Repositório `wallandrade/yuri-imports`, branch `main`, source directory `/`. Build `CI=true pnpm install --frozen-lockfile --prod=false`. Run command exatamente `node --max-old-space-size=192 scripts/src/db-backup-r2.mjs`. Instance size `apps-s-1vcpu-1gb`. Cron `0 3 * * *`, time zone `America/Sao_Paulo`.

Uma regra de ciclo de vida no bucket (apagar objetos depois de 30 dias e uploads multipart incompletos depois de 7) fica no painel do R2, não neste script.

## Rodar na mão

```
pnpm --filter @workspace/scripts backup:db:r2
node --max-old-space-size=192 scripts/src/db-backup-r2.mjs
BACKUP_OUTPUT_FILE=/tmp/db.sql.gz node --max-old-space-size=192 scripts/src/db-backup-r2.mjs
```

O primeiro e o segundo enviam ao R2. O terceiro só grava o arquivo local e não precisa das chaves do R2.

## Restaurar num banco de teste

O dump dá `DROP TABLE` e recria cada tabela. Não aplique em produção.

Baixar do R2:

```
BACKUP_OBJECT_KEY=mysql/2026-11-13_0300.sql.gz \
BACKUP_OUTPUT_FILE=/tmp/yuri.sql.gz \
node scripts/src/db-restore-r2.mjs
```

Aplicar só se o nome do banco contiver `test`:

```
BACKUP_INPUT_FILE=/tmp/yuri.sql.gz \
RESTORE_DATABASE_URL='mysql://user:pass@host:3306/yuri_test' \
node scripts/src/db-restore-r2.mjs
```

O script recusa qualquer banco cujo nome não tenha `test`. O comando manual equivalente:

```
gunzip -c /tmp/yuri.sql.gz | mysql -h HOST -P PORT -u USER -p yuri_test
```

Procedures e functions não entram no dump. Se existirem, o backup avisa e segue.
