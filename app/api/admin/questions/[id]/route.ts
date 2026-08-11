/**
 * File: app/api/admin/questions/[id]/route.ts
 * 질문과 해당 질문의 투표를 삭제하는 관리자 API다.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireAdmin();
  if (authError) return authError;

  const body = await req.json();
  const allowed = [
    "option_a_text",
    "option_a_emoji",
    "option_b_text",
    "option_b_emoji",
    "time_limit_sec",
    "order_index",
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("questions")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireAdmin();
  if (authError) return authError;

  const db = getSupabaseAdmin();
  const { error } = await db.from("questions").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
