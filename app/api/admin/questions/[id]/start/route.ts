/**
 * File: app/api/admin/questions/[id]/start/route.ts
 * 선택한 질문을 시작하고 기존 진행 질문을 종료하는 관리자 API다.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireAdmin();
  if (authError) return authError;

  const db = getSupabaseAdmin();

  const { data: question, error: fetchError } = await db
    .from("questions")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchError || !question) {
    return NextResponse.json({ error: "질문을 찾을 수 없습니다." }, { status: 404 });
  }

  // 같은 세션에서 이미 진행 중인 다른 질문이 있다면 먼저 종료 처리한다.
  await db
    .from("questions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("session_id", question.session_id)
    .eq("status", "active");

  const now = new Date();
  const endsAt = new Date(now.getTime() + question.time_limit_sec * 1000);

  const { data, error } = await db
    .from("questions")
    .update({
      status: "active",
      started_at: now.toISOString(),
      ended_at: endsAt.toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question: data });
}
