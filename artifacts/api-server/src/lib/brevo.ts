import { db, customerUsersTable, ordersTable } from "@workspace/db";
import { eq, inArray, isNotNull } from "drizzle-orm";

interface BrevoContact {
  email: string;
  attributes: {
    FIRSTNAME?: string;
    LASTNAME?: string;
  };
  listIds?: number[];
}

interface BrevoSyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

async function getSettingValue(key: string): Promise<string> {
  try {
    const { siteSettingsTable } = await import("@workspace/db");
    const rows = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
    return String(rows[0]?.value || "").trim();
  } catch {
    return "";
  }
}

export async function syncCustomersToBrevo(listId?: number): Promise<BrevoSyncResult> {
  const apiKey = await getSettingValue("brevo_api_key");
  if (!apiKey) {
    return { synced: 0, failed: 0, errors: ["Brevo API key not configured"] };
  }

  try {
    // Fetch all customers who have made purchases
    const customers = await db
      .selectDistinct({
        id: customerUsersTable.id,
        name: customerUsersTable.name,
        email: customerUsersTable.email,
      })
      .from(customerUsersTable)
      .innerJoin(ordersTable, eq(customerUsersTable.id, ordersTable.userId))
      .where(isNotNull(ordersTable.userId));

    if (customers.length === 0) {
      return { synced: 0, failed: 0, errors: ["No customers with purchases found"] };
    }

    const contacts: BrevoContact[] = customers.map((c) => ({
      email: c.email,
      attributes: {
        FIRSTNAME: (c.name || "").split(" ")[0] || "",
        LASTNAME: (c.name || "").split(" ").slice(1).join(" ") || "",
      },
      ...(listId ? { listIds: [listId] } : {}),
    }));

    // Sync in batches (Brevo allows max 300 contacts per request)
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < contacts.length; i += 300) {
      const batch = contacts.slice(i, i + 300);

      try {
        const response = await fetch("https://api.brevo.com/v3/contacts/batch", {
          method: "POST",
          headers: {
            "api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contacts: batch,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const msg = `Batch sync failed: ${response.status} ${JSON.stringify(errorData)}`;
          errors.push(msg);
          failed += batch.length;
          console.error(`[BREVO] ${msg}`);
        } else {
          synced += batch.length;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown_error";
        errors.push(msg);
        failed += batch.length;
        console.error(`[BREVO] Batch sync error:`, err);
      }
    }

    console.log(`[BREVO] Sync completed: ${synced} synced, ${failed} failed`);
    return { synced, failed, errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unexpected_error";
    console.error(`[BREVO] Sync error:`, err);
    return { synced: 0, failed: 0, errors: [message] };
  }
}

export async function testBrevoConnection(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.brevo.com/v3/account", {
      method: "GET",
      headers: {
        "api-key": apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: `HTTP ${response.status}: ${JSON.stringify(errorData)}`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "connection_failed",
    };
  }
}
