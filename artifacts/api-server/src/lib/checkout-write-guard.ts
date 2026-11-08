export function bearerTokenFromAuthorization(header: string | undefined | null): string {
  const authorization = String(header || "");
  if (!authorization.startsWith("Bearer ")) return "";
  return authorization.slice(7).trim();
}

export async function sensitivePostCredentialBypass(input: {
  authorizationHeader?: string | null;
  customerTokenValid: (token: string) => boolean;
  adminTokenValid: (token: string) => Promise<boolean>;
}): Promise<boolean> {
  const token = bearerTokenFromAuthorization(input.authorizationHeader);
  if (!token) return false;
  if (input.customerTokenValid(token)) return true;
  return input.adminTokenValid(token);
}
