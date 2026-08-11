import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "bg_admin_session";

export function createAdminSessionToken(password: string): string {
  return createHmac("sha256", password).update("balance-game-admin-session-v1").digest("hex");
}

/** 비밀번호 원문 대신 서명값을 httpOnly 쿠키에 저장한다. */
export function isAdminAuthed(): boolean {
  const cookieStore = cookies();
  const value = cookieStore.get(ADMIN_COOKIE)?.value;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  if (!value) return false;
  const actual = Buffer.from(value);
  const expectedToken = Buffer.from(createAdminSessionToken(expected));
  return actual.length === expectedToken.length && timingSafeEqual(actual, expectedToken);
}
