import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// body: { question_id: string }
export async function POST(req: NextRequest) {
  const authError = requireAdmin();
  if (authError) return authError;

  const { question_id } = (await req.json()) as { question_id: string };
  if (!question_id) {
    return NextResponse.json({ error: "question_id가 필요합니다." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: current } = await db
    .from("questions")
    .select("reset_version")
    .eq("id", question_id)
    .single();
  await db.from("votes").delete().eq("question_id", question_id);
  const { data, error } = await db
    .from("questions")
    .update({
      status: "draft",
      started_at: null,
      ended_at: null,
      reset_version: (current?.reset_version ?? 0) + 1,
    })
    .eq("id", question_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question: data });
}
