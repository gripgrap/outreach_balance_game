import { NextResponse } from "next/server";
import { isAdminAuthed } from "./adminAuth";

/** 관리자 인증 실패 시 401 응답을 반환하고, 성공 시 null을 반환한다. */
export function requireAdmin(): NextResponse | null {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }
  return null;
}
