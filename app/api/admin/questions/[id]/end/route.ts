/**
 * File: app/api/admin/questions/[id]/end/route.ts
 * 진행 중인 질문을 즉시 종료하는 관리자 API다.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireAdmin();
  if (authError) return authError;

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("questions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question: data });
}
