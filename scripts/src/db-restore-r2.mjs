#!/usr/bin/env node
// Download a MySQL backup from Cloudflare R2 and, only when asked, apply it
// to a database whose name contains "test".
//
// Download only:
//   BACKUP_OBJECT_KEY=mysql/2026-11-13_0300.sql.gz \
//   BACKUP_OUTPUT_FILE=/tmp/backup.sql.gz \
//   node scripts/src/db-restore-r2.mjs
//
// Apply to a test database (refuses any database name without "test"):
//   RESTORE_DATABASE_URL=mysql://user:pass@host:3306/yuri_test \
//   BACKUP_OBJECT_KEY=mysql/2026-11-13_0300.sql.gz \
//   node scripts/src/db-restore-r2.mjs
//
// A local file skips R2: BACKUP_INPUT_FILE=/tmp/backup.sql.gz

import { createWriteStream, readFileSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { gunzipSync } from "node:zlib";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import mysql from "mysql2/promise";

const log = (...a) => console.log(`[db-restore] ${new Date().toISOString()}`, ...a);
const fail = (msg) => {
  throw new Error(msg);
};
const env = (k, required = true) => {
  const v = process.env[k];
  if (required && !v) fail(`Missing env var ${k}`);
  return v;
};

function r2Client() {
  const endpoint =
    process.env.BACKUP_S3_ENDPOINT || `https://${env("CLOUDFLARE_R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;
  return new S3Client({
    region: process.env.BACKUP_S3_REGION || "auto",
    endpoint,
    forcePathStyle: Boolean(process.env.BACKUP_S3_ENDPOINT),
    credentials: {
      accessKeyId: env("BACKUP_R2_ACCESS_KEY_ID"),
      secretAccessKey: env("BACKUP_R2_SECRET_ACCESS_KEY"),
    },
  });
}

async function downloadToFile(dest) {
  const key = env("BACKUP_OBJECT_KEY");
  const bucket = env("BACKUP_R2_BUCKET");
  log(`downloading ${bucket}/${key}`);
  const res = await r2Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) fail("R2 returned an empty body");
  await pipeline(res.Body, createWriteStream(dest));
  log(`saved ${dest}`);
}

function connectionOptions(raw) {
  const url = new URL(raw);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!/test/i.test(database)) {
    fail(`Refusing to restore into "${database}". The database name must contain "test".`);
  }
  const sslMode = (url.searchParams.get("ssl-mode") || url.searchParams.get("sslmode") || "").toUpperCase();
  const ca = process.env.DATABASE_CA_CERT;
  let ssl;
  if (ca) ssl = { ca, rejectUnauthorized: true };
  else if (sslMode && sslMode !== "DISABLED") ssl = { rejectUnauthorized: false };
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    ssl,
    multipleStatements: true,
    charset: "utf8mb4",
  };
}

function sqlWithoutDelimiter(sql) {
  return sql
    .split("\n")
    .filter((line) => !/^\s*DELIMITER\s+/i.test(line))
    .join("\n")
    .replace(/;;\s*$/gm, ";");
}

async function applyFile(gzPath, targetUrl) {
  const options = connectionOptions(targetUrl);
  const sql = sqlWithoutDelimiter(gunzipSync(readFileSync(gzPath)).toString("utf8"));
  const conn = await mysql.createConnection(options);
  try {
    await conn.query(sql);
    log(`applied dump to test database ${options.database}`);
  } finally {
    await conn.end();
  }
}

async function main() {
  const input = process.env.BACKUP_INPUT_FILE;
  const dest = process.env.BACKUP_OUTPUT_FILE || input || "/tmp/yuri-db-backup.sql.gz";
  if (!input) await downloadToFile(dest);
  else log(`using local file ${input}`);

  const target = process.env.RESTORE_DATABASE_URL;
  if (!target) {
    log("download only. To apply, set RESTORE_DATABASE_URL to a database whose name contains \"test\".");
    log(`gunzip -c ${dest} | mysql -h HOST -P PORT -u USER -p DBNAME_TEST`);
    return;
  }
  await applyFile(input || dest, target);
}

process.exitCode = 1;
main().then(
  () => process.exit(0),
  (err) => {
    console.error(`[db-restore] FAILED: ${err?.stack || err}`);
    process.exit(1);
  },
);
