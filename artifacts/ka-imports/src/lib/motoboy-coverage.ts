export type MotoboyCoverageMatch = {
  source: "neighborhood" | "distance" | "cep_range";
  id: string;
  price: number;
  label: string;
  notes: string | null;
  km: number | null;
};

export type MotoboyCoverageResult = {
  match: MotoboyCoverageMatch | null;
  consult: boolean;
};

export type MotoboyShippingOption = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sortOrder: number;
  isActive: boolean;
};

export function coverageToShippingOption(
  match: MotoboyCoverageMatch,
  neighborhoodFallback: string,
): MotoboyShippingOption {
  return {
    id: `motoboy_${match.id}`,
    name: "Motoboy",
    description: match.notes ?? `Entrega em ${neighborhoodFallback || match.label}`,
    price: match.price,
    sortOrder: 999,
    isActive: true,
  };
}

export async function fetchMotoboyCoverage(
  base: string,
  input: { cep: string; bairro?: string; cidade?: string },
): Promise<MotoboyCoverageResult> {
  const params = new URLSearchParams();
  params.set("cep", input.cep);
  if (input.bairro) params.set("bairro", input.bairro);
  if (input.cidade) params.set("cidade", input.cidade);
  const res = await fetch(`${base}/api/motoboy-coverage/lookup?${params.toString()}`);
  if (!res.ok) return { match: null, consult: false };
  const data = await res.json() as MotoboyCoverageResult;
  return {
    match: data.match ?? null,
    consult: Boolean(data.consult),
  };
}
