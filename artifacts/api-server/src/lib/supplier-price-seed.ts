import { eq } from "drizzle-orm";
import { db, supplierProductMapsTable, supplierSitesTable } from "@workspace/db";

const PRODUCT = "TG 15mg 4 frascos";
const PHOTO = "https://farma.fit/wp-content/uploads/2025/07/tg-15mg-tirzepatida-4-ampolas-0517.jpg";

const SITES = [
  { id: "atacadoparaguai", name: "Atacado Paraguai", baseUrl: "https://atacadoparaguai.com.py", parserType: "woocommerce_store", active: true },
  { id: "bypharmacon", name: "ByPharmacon", baseUrl: "https://bypharmacon.com", parserType: "bypharmacon_catalog", active: true },
  { id: "atacadobrasilpy", name: "Atacado Brasil PY", baseUrl: "https://atacadobrasilpy.com", parserType: "atacadobrasil_html", active: true },
  { id: "dilifarma", name: "Dili Farma", baseUrl: "https://www.dilifarma.com", parserType: "json_ld", active: true },
  { id: "farmafit", name: "Farma.fit", baseUrl: "https://farma.fit", parserType: "woocommerce_store", active: true },
  { id: "santarita", name: "Farmácia Santa Rita Paraguai", baseUrl: "https://farmaciasantaritaparaguai.com.br", parserType: "json_ld", active: true },
  { id: "columbiafarmacias", name: "Columbia Farmácias", baseUrl: "https://columbiafarmacias.com", parserType: "unsupported", active: false },
] as const;

const MAPS = [
  { id: "tg-atacadoparaguai", site: "atacadoparaguai", url: "https://atacadoparaguai.com.py/produto/tirzepatide-t-g-15mg-05ml/", sku: "TIRZEPATIDE15MG", units: 1, active: false },
  { id: "tg-bypharmacon", site: "bypharmacon", url: "https://bypharmacon.com/produtos/tg-15mg-85", sku: "24", units: 4, active: true },
  { id: "tg-atacadobrasilpy", site: "atacadobrasilpy", url: "https://atacadobrasilpy.com/produto/tirzepatida-tg-15mg-0-5ml-04-vial-60mg-15", sku: "3068", units: 4, active: true },
  { id: "tg-dilifarma", site: "dilifarma", url: "https://www.dilifarma.com/produto/tg-15mg-indufar", sku: null, units: 4, active: true },
  { id: "tg-farmafit", site: "farmafit", url: "https://farma.fit/emagrecimento/tg-15mg-tirzepatida/", sku: "SKU-GEN15821", units: 4, active: true },
  { id: "tg-santarita", site: "santarita", url: "https://farmaciasantaritaparaguai.com.br/p/tg-15mg-4-ampolas-nova-apresentacao", sku: "652", units: 4, active: true },
] as const;

/** Insere os 7 fornecedores e o kit TG só se o id ainda não existe. Não reativa o que o admin desligou. */
export async function seedSupplierPrices(): Promise<void> {
  for (const site of SITES) {
    const [existing] = await db.select({ id: supplierSitesTable.id }).from(supplierSitesTable).where(eq(supplierSitesTable.id, site.id)).limit(1);
    if (existing) continue;
    await db.insert(supplierSitesTable).values({
      id: site.id,
      name: site.name,
      baseUrl: site.baseUrl,
      parserType: site.parserType,
      active: site.active,
    });
  }
  for (const map of MAPS) {
    const [existing] = await db.select({ id: supplierProductMapsTable.id }).from(supplierProductMapsTable).where(eq(supplierProductMapsTable.id, map.id)).limit(1);
    if (existing) continue;
    await db.insert(supplierProductMapsTable).values({
      id: map.id,
      displayName: PRODUCT,
      imageUrl: PHOTO,
      supplierSiteId: map.site,
      externalUrl: map.url,
      externalSku: map.sku,
      unitsPerPack: map.units,
      active: map.active,
    });
  }
}
