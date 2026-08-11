/**
 * File: app/api/admin/logout/route.ts
 * 관리자 로그인 쿠키를 제거하는 API다.
 */

import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/adminAuth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
