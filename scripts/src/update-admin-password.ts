// Atualiza a senha de um admin já existente.
// Exige ADMIN_USERNAME e ADMIN_PASSWORD no ambiente. Não há senha padrão.

import { createAdminPasswordHash, generateAdminSalt, readRequiredAdminCredential } from "../../artifacts/api-server/src/lib/admin-password";
import { sql } from "drizzle-orm";

async function main() {
  const credential = readRequiredAdminCredential(process.env);
  if (!credential.ok) {
    console.error(credential.message);
    process.exit(1);
  }

  const { db, adminUsersTable } = await import("../../lib/db/src/index");
  const salt = generateAdminSalt();
  const passwordHash = createAdminPasswordHash(credential.password, salt);

  const [user] = await db.select().from(adminUsersTable)
    .where(sql`LOWER(TRIM(${adminUsersTable.username})) = LOWER(TRIM(${credential.username}))`).limit(1);

  if (!user) {
    console.error("Usuário não encontrado para atualizar.");
    process.exit(1);
  }

  await db.update(adminUsersTable)
    .set({ passwordHash, salt })
    .where(sql`id = ${user.id}`);

  console.log("Senha do admin atualizada.");
}

main().catch((err) => {
  console.error("Erro ao atualizar senha:", err);
  process.exit(1);
});
