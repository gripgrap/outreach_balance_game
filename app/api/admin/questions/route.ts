import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const authError = requireAdmin();
  if (authError) return authError;

  const body = await req.json();
  const {
    session_id,
    option_a_text,
    option_a_emoji,
    option_b_text,
    option_b_emoji,
    time_limit_sec,
  } = body;

  if (!session_id || !option_a_text || !option_b_text) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  const { count } = await db
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("session_id", session_id);

  const { data, error } = await db
    .from("questions")
    .insert({
      session_id,
      order_index: count ?? 0,
      option_a_text,
      option_a_emoji: option_a_emoji ?? null,
      option_b_text,
      option_b_emoji: option_b_emoji ?? null,
      time_limit_sec: time_limit_sec ?? 30,
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question: data });
}
