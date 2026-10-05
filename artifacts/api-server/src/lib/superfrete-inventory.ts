import { ordersTable } from "@workspace/db";
import { isInventoryExitUnlocked } from "./inventory-exit-access";
import { inventoryExitPasswordApplies } from "./inventory-exit-access-logic";
import {
  ensureOrderInventoryDebited,
  inventoryPoolLabel,
} from "./order-inventory-debit";
import {
  ensurePackageInventoryDebited,
  getOrderShipment,
  listOrderShipments,
  mapOrderShipmentPublic,
  rollupOrderFromPackages,
} from "./order-shipments";
import {
  planSuperfreteLabelDebit,
  type SuperfreteDebitPool,
} from "./superfrete-inventory-plan";

export type SuperfreteLabelDebitResult = {
  inventoryReserved: boolean;
  inventoryAlreadyReserved: boolean;
  inventoryPool: SuperfreteDebitPool | null;
  inventoryPoolLabel: string | null;
  passwordRequired: boolean;
  inventoryWarning: string | null;
  packages?: ReturnType<typeof mapOrderShipmentPublic>[];
};

const POOL_WARNING = "Etiqueta pronta. Escolha Foz Guaçu, Motoboy ou Minas e clique Dar baixa agora.";

function quiet(partial?: Partial<SuperfreteLabelDebitResult>): SuperfreteLabelDebitResult {
  return {
    inventoryReserved: false,
    inventoryAlreadyReserved: false,
    inventoryPool: null,
    inventoryPoolLabel: null,
    passwordRequired: false,
    inventoryWarning: null,
    ...partial,
  };
}

/**
 * Baixa o depósito já escolhido quando a etiqueta Super Frete está paga ou postada.
 * Não marca Enviado. Sem saldo ou sem depósito, devolve aviso e não falha a etiqueta.
 * Motoboy/Minas com janela fechada devolvem passwordRequired para o card pedir a senha.
 */
export async function debitSuperfreteLabelInventory(input: {
  order: typeof ordersTable.$inferSelect;
  packageId?: string | null;
  status: string | null | undefined;
}): Promise<SuperfreteLabelDebitResult> {
  const packageId = String(input.packageId || "").trim();
  const pkg = packageId ? await getOrderShipment(input.order.id, packageId) : null;
  if (packageId && !pkg) {
    return quiet({ inventoryWarning: "Pacote não encontrado para dar baixa." });
  }

  const inventoryReserved = pkg ? !!pkg.inventoryReserved : !!input.order.inventoryReserved;
  const inventoryPool = pkg ? pkg.inventoryPool : input.order.inventoryPool;
  const needsUnlock = inventoryExitPasswordApplies(inventoryPool);
  const unlocked = needsUnlock ? await isInventoryExitUnlocked() : true;
  const plan = planSuperfreteLabelDebit({
    status: input.status,
    inventoryReserved,
    inventoryPool,
    unlocked,
  });

  if (plan.action === "skip") {
    if (plan.reason === "already") {
      return quiet({
        inventoryReserved: true,
        inventoryAlreadyReserved: true,
        inventoryPool: (inventoryPool === "loja" || inventoryPool === "motoboy" || inventoryPool === "minas")
          ? inventoryPool
          : null,
        inventoryPoolLabel: inventoryPool === "loja" || inventoryPool === "motoboy" || inventoryPool === "minas"
          ? inventoryPoolLabel(inventoryPool)
          : null,
      });
    }
    if (plan.reason === "pool") return quiet({ inventoryWarning: POOL_WARNING });
    return quiet();
  }

  if (plan.action === "password") {
    return quiet({
      inventoryPool: plan.pool,
      inventoryPoolLabel: inventoryPoolLabel(plan.pool),
      passwordRequired: true,
    });
  }

  const reason = `Saída ${inventoryPoolLabel(plan.pool)} etiqueta SuperFrete`;
  if (pkg) {
    const debit = await ensurePackageInventoryDebited(input.order, pkg, {
      forcePool: plan.pool,
      reason,
    });
    if (!debit.ok) {
      return quiet({
        inventoryPool: plan.pool,
        inventoryPoolLabel: inventoryPoolLabel(plan.pool),
        inventoryWarning: debit.details
          ? `Estoque ${inventoryPoolLabel(plan.pool)} insuficiente para dar baixa: ${debit.details}.`
          : `Estoque ${inventoryPoolLabel(plan.pool)} insuficiente para dar baixa.`,
      });
    }
    const packages = (await rollupOrderFromPackages(input.order.id)).map(mapOrderShipmentPublic);
    return {
      inventoryReserved: true,
      inventoryAlreadyReserved: debit.alreadyReserved,
      inventoryPool: plan.pool,
      inventoryPoolLabel: inventoryPoolLabel(plan.pool),
      passwordRequired: false,
      inventoryWarning: null,
      packages,
    };
  }

  const debit = await ensureOrderInventoryDebited(input.order, {
    forcePool: plan.pool,
    reason,
  });
  if (!debit.ok) {
    return quiet({
      inventoryPool: plan.pool,
      inventoryPoolLabel: inventoryPoolLabel(plan.pool),
      inventoryWarning: debit.details
        ? `Estoque ${inventoryPoolLabel(plan.pool)} insuficiente para dar baixa: ${debit.details}.`
        : `Estoque ${inventoryPoolLabel(plan.pool)} insuficiente para dar baixa.`,
    });
  }
  const packages = (await listOrderShipments(input.order.id)).map(mapOrderShipmentPublic);
  return {
    inventoryReserved: true,
    inventoryAlreadyReserved: debit.alreadyReserved,
    inventoryPool: debit.pool,
    inventoryPoolLabel: inventoryPoolLabel(debit.pool),
    passwordRequired: false,
    inventoryWarning: null,
    ...(packages.length > 0 ? { packages } : {}),
  };
}
