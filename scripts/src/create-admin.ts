// Cria um admin no banco.
// Exige ADMIN_USERNAME e ADMIN_PASSWORD no ambiente. Não há usuário nem senha padrão.

import { createAdminPasswordHash, generateAdminSalt, readRequiredAdminCredential } from "../../artifacts/api-server/src/lib/admin-password";
import crypto from "crypto";

async function main() {
  const credential = readRequiredAdminCredential(process.env);
  if (!credential.ok) {
    console.error(credential.message);
    process.exit(1);
  }

  const { db, adminUsersTable } = await import("../../lib/db/src/index");
  const salt = generateAdminSalt();
  const passwordHash = createAdminPasswordHash(credential.password, salt);
  const id = crypto.randomBytes(8).toString("hex");

  await db.insert(adminUsersTable).values({
    id,
    username: credential.username,
    passwordHash,
    salt,
    isPrimary: true,
    createdBy: null,
    createdAt: new Date(),
  });
  console.log("Usuário admin criado.");
}

main().catch((err) => {
  console.error("Erro ao criar admin:", err);
  process.exit(1);
});
