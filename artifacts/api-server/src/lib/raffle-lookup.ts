export type RaffleLookupTarget = {
  phone: string;
  cpf: string;
};

/** Telefone (8+ dígitos) e, com 11 dígitos, também o CPF. A tela manda só os dígitos. */
export function resolveRaffleLookupQuery(input: {
  query?: string;
  phone?: string;
  cpf?: string;
}): RaffleLookupTarget {
  const queryDigits = String(input.query || "").replace(/\D/g, "");
  const phone = String(input.phone || "").replace(/\D/g, "");
  const cpf = String(input.cpf || "").replace(/\D/g, "");
  const hasExplicitPhone = phone.length > 0;
  const hasExplicitCpf = cpf.length > 0;

  const lookupPhone = hasExplicitPhone
    ? phone
    : (!hasExplicitCpf && queryDigits.length >= 8 ? queryDigits : "");
  const lookupCpf = hasExplicitCpf
    ? cpf
    : (!hasExplicitPhone && queryDigits.length === 11 ? queryDigits : "");

  return { phone: lookupPhone, cpf: lookupCpf };
}
