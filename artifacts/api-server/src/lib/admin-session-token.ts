export function adminQueryTokenAllowed(raw: string | undefined | null): boolean {
  return String(raw ?? "").trim().toLowerCase() === "true";
}

export function selectAdminSessionToken(input: {
  authorizationHeader?: string | null;
  cookieToken?: string | null;
  queryToken?: string | null;
  allowQueryToken: boolean;
}): string {
  const authorization = String(input.authorizationHeader || "");
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (bearer) return bearer;

  const cookieToken = String(input.cookieToken || "").trim();
  if (cookieToken) return cookieToken;

  if (!input.allowQueryToken) return "";
  return String(input.queryToken || "").trim();
}
