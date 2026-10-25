import { timingSafeEqual } from "node:crypto";

// Simple shared-password check. The browser sends the password in the
// "x-app-password" header; it is compared with APP_PASSWORD on the server.
export function isAuthorized(request: Request): boolean {
  const expected = process.env.APP_PASSWORD;
  const given = request.headers.get("x-app-password") ?? "";
  if (!expected) return false;

  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
