import { useCallback, useMemo, useState, type ReactNode } from "react";

import { AdminDebouncedSearchInput } from "@/components/AdminDebouncedSearchInput";
import {
  filterAdminChargesBySearch,
  filterAdminOrdersBySearch,
  type AdminSearchCharge,
  type AdminSearchOrder,
} from "@/lib/admin-list-search";
import { filterAdminOrdersByKind, type AdminOrdersKind } from "@/lib/admin-orders-kind";

type AdminOrdersChargesSearchShellProps<TOrder extends AdminSearchOrder, TCharge extends AdminSearchCharge> = {
  seedSearch?: string;
  onSeedConsumed?: () => void;
  orders: TOrder[];
  charges: TCharge[];
  tab: "orders" | "charges";
  ordersKind: AdminOrdersKind;
  setOrdersKind: (kind: AdminOrdersKind) => void;
  filterControls: ReactNode;
  children: (data: {
    search: string;
    filteredOrders: TOrder[];
    filteredCharges: TCharge[];
    normalOrders: TOrder[];
    reshipmentOrders: TOrder[];
  }) => ReactNode;
};

export function AdminOrdersChargesSearchShell<TOrder extends AdminSearchOrder, TCharge extends AdminSearchCharge>({
  seedSearch = "",
  onSeedConsumed,
  orders,
  charges,
  tab,
  ordersKind,
  setOrdersKind,
  filterControls,
  children,
}: AdminOrdersChargesSearchShellProps<TOrder, TCharge>) {
  const [appliedSearch, setAppliedSearch] = useState(seedSearch);

  const applySearch = useCallback((value: string) => {
    setAppliedSearch(value);
  }, []);

  const searchedOrders = useMemo(
    () => filterAdminOrdersBySearch(orders, appliedSearch),
    [orders, appliedSearch],
  );
  const normalOrders = useMemo(
    () => filterAdminOrdersByKind(searchedOrders, "normal"),
    [searchedOrders],
  );
  const reshipmentOrders = useMemo(
    () => filterAdminOrdersByKind(searchedOrders, "reenvio"),
    [searchedOrders],
  );
  const filteredOrders = ordersKind === "reenvio" ? reshipmentOrders : normalOrders;
  const filteredCharges = useMemo(
    () => filterAdminChargesBySearch(charges, appliedSearch),
    [charges, appliedSearch],
  );

  return (
    <>
      {tab === "orders" && (
        <div className="flex items-center gap-2 mb-4">
          {([
            { key: "normal" as const, label: "Pedido normal", count: normalOrders.length },
            { key: "reenvio" as const, label: "Pedido reenvio", count: reshipmentOrders.length },
          ]).map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setOrdersKind(key)}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold border-2 transition-colors ${
                ordersKind === key
                  ? key === "reenvio"
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-primary bg-primary/5 text-primary"
                  : "border-border bg-white text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                ordersKind === key
                  ? key === "reenvio"
                    ? "bg-red-100 text-red-800"
                    : "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <AdminDebouncedSearchInput
          seedSearch={seedSearch}
          onSeedConsumed={onSeedConsumed}
          onAppliedChange={applySearch}
          placeholder="Buscar por nome, e-mail, celular, CEP, nº pedido ou produto..."
        />
        {filterControls}
      </div>

      {children({
        search: appliedSearch,
        filteredOrders,
        filteredCharges,
        normalOrders,
        reshipmentOrders,
      })}
    </>
  );
}
