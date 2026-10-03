import { useEffect, useState } from "react";

export const STORE_THEME_SETTING_KEY = "store_theme_preset";
export const PHARMA_COMPACT_THEME = "pharma_compact";

export type StoreTheme = typeof PHARMA_COMPACT_THEME | "default";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function normalizeStoreTheme(raw: unknown): StoreTheme {
  return String(raw ?? "").trim() === PHARMA_COMPACT_THEME ? PHARMA_COMPACT_THEME : "default";
}

export function readCachedStoreTheme(): StoreTheme {
  if (typeof window === "undefined") return "default";
  try {
    const data = JSON.parse(localStorage.getItem("siteSettings") || "{}") as Record<string, unknown>;
    return normalizeStoreTheme(data[STORE_THEME_SETTING_KEY]);
  } catch {
    return "default";
  }
}

export function applyStoreThemeAttribute(theme: StoreTheme): void {
  if (typeof document === "undefined") return;
  if (theme === PHARMA_COMPACT_THEME) {
    document.documentElement.setAttribute("data-store-theme", PHARMA_COMPACT_THEME);
    return;
  }
  document.documentElement.removeAttribute("data-store-theme");
}

const listeners = new Set<(theme: StoreTheme) => void>();
let currentTheme = readCachedStoreTheme();
let refreshStarted = false;

function emitTheme(theme: StoreTheme): void {
  currentTheme = theme;
  applyStoreThemeAttribute(theme);
  listeners.forEach((listener) => listener(theme));
}

async function refreshStoreTheme(): Promise<void> {
  const res = await fetch(`${BASE}/api/settings`, { cache: "no-store" });
  if (!res.ok) return;
  const data = (await res.json()) as Record<string, string>;
  try {
    localStorage.setItem("siteSettings", JSON.stringify(data));
  } catch {
    // Storage cheio ou bloqueado: o atributo ainda segue a resposta.
  }
  emitTheme(normalizeStoreTheme(data[STORE_THEME_SETTING_KEY]));
}

export function useStoreTheme(): StoreTheme {
  const [theme, setTheme] = useState<StoreTheme>(() => readCachedStoreTheme());

  useEffect(() => {
    listeners.add(setTheme);
    setTheme(currentTheme);
    if (!refreshStarted) {
      refreshStarted = true;
      refreshStoreTheme().catch(() => {});
    }
    return () => {
      listeners.delete(setTheme);
    };
  }, []);

  return theme;
}

export function isPharmaCompactTheme(theme: StoreTheme): boolean {
  return theme === PHARMA_COMPACT_THEME;
}
