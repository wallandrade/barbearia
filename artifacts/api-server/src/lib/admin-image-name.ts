/** Nome visível na aba Imagem. Tira a extensão e o excesso de espaço. */
export function adminImageName(raw: unknown, fallback = "Imagem"): string {
  const cleaned = String(raw || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .trim()
    .slice(0, 120);
  return cleaned || fallback;
}
