/**
 * Modo de manutenção da loja (front na Vercel).
 * Ligado por padrão. Para desligar: troque MAINTENANCE_MODE_DEFAULT para false, ou defina VITE_MAINTENANCE=0 no build da Vercel, e republique.
 * VITE_MAINTENANCE=0 desliga mesmo com a constante true. VITE_MAINTENANCE=1 liga mesmo com a constante false.
 */
export const MAINTENANCE_MODE_DEFAULT = true;

export const MAINTENANCE_MODE: boolean = (() => {
  const env = import.meta.env.VITE_MAINTENANCE;
  if (env === "0") return false;
  if (env === "1") return true;
  return MAINTENANCE_MODE_DEFAULT;
})();

export function isMaintenanceExemptPath(pathname: string): boolean {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  return path === "/admin" || path.startsWith("/admin/");
}

export function shouldShowMaintenancePage(pathname?: string): boolean {
  const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  return MAINTENANCE_MODE && !isMaintenanceExemptPath(path);
}
