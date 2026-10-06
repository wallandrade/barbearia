import { useEffect, useState } from "react";

export const STORE_THEME_SETTING_KEY = "store_theme_preset";
export const STORE_THEME_COLOR_KEY = "store_theme_color";
export const DEFAULT_PHARMA_GREEN = "#22c55e";
export const PHARMA_COMPACT_THEME = "pharma_compact";

export type StoreTheme = typeof PHARMA_COMPACT_THEME | "default";

const BASE = String(import.meta.env?.BASE_URL ?? "/").replace(/\/$/, "");

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

export function normalizeThemeColor(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  const full = /^#?([0-9a-fA-F]{6})$/.exec(value);
  if (full) return `#${full[1].toLowerCase()}`;
  const short = /^#?([0-9a-fA-F]{3})$/.exec(value);
  if (!short) return null;
  const [r, g, b] = short[1].split("");
  return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: (h / 6) * 360, s, l };
}

export function pharmaColorVars(hex: string): Record<string, string> {
  const { r, g, b } = hexToRgb(hex);
  const { h, s } = rgbToHsl(r, g, b);
  const hue = Math.round(h);
  const sat = Math.round(s * 100);
  const softS = Math.max(20, Math.min(42, sat));
  const inkS = Math.max(35, Math.min(75, sat));
  return {
    "--pharma-green": hex,
    "--pharma-green-strong": `hsl(${hue} ${Math.min(sat, 78)}% 36%)`,
    "--pharma-green-soft": `hsl(${hue} ${softS}% 94%)`,
    "--pharma-green-ink": `hsl(${hue} ${inkS}% 26%)`,
  };
}

const PHARMA_COLOR_VARS = ["--pharma-green", "--pharma-green-strong", "--pharma-green-soft", "--pharma-green-ink"] as const;

export function readCachedThemeColor(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const data = JSON.parse(localStorage.getItem("siteSettings") || "{}") as Record<string, unknown>;
    return normalizeThemeColor(data[STORE_THEME_COLOR_KEY]);
  } catch {
    return null;
  }
}

export function applyPharmaThemeColor(raw: unknown): void {
  if (typeof document === "undefined") return;
  const color = normalizeThemeColor(raw);
  const root = document.documentElement;
  if (!color || color === DEFAULT_PHARMA_GREEN) {
    for (const key of PHARMA_COLOR_VARS) root.style.removeProperty(key);
    return;
  }
  const vars = pharmaColorVars(color);
  for (const key of PHARMA_COLOR_VARS) root.style.setProperty(key, vars[key]);
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
  applyPharmaThemeColor(data[STORE_THEME_COLOR_KEY]);
}

applyPharmaThemeColor(readCachedThemeColor());

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
