import crypto from "crypto";
import mysql from "mysql2/promise";
import { createAdminPasswordHash, generateAdminSalt, readRequiredAdminCredential } from "./artifacts/api-server/src/lib/admin-password";

async function createAdmin() {
  const credential = readRequiredAdminCredential(process.env);
  if (!credential.ok) {
    console.error(credential.message);
    process.exit(1);
  }

  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  if (!databaseUrl) {
    console.error("Defina DATABASE_URL. Este script não tem conexão padrão.");
    process.exit(1);
  }

  const connection = await mysql.createConnection(databaseUrl);
  const salt = generateAdminSalt();
  const passwordHash = createAdminPasswordHash(credential.password, salt);
  const id = crypto.randomBytes(8).toString("hex");

  await connection.query(
    "INSERT IGNORE INTO admin_users (id, username, password_hash, salt, is_primary) VALUES (?, ?, ?, ?, ?)",
    [id, credential.username, passwordHash, salt, false],
  );

  console.log("Admin criado.");
  await connection.end();
}

createAdmin().catch((err) => {
  console.error("Erro ao criar admin:", err);
  process.exit(1);
});
