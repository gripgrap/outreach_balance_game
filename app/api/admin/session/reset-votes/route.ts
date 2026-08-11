import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// body: { session_id: string }
export async function POST(req: NextRequest) {
  const authError = requireAdmin();
  if (authError) return authError;

  const { session_id } = (await req.json()) as { session_id: string };
  if (!session_id) {
    return NextResponse.json({ error: "session_id가 필요합니다." }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  const { data: questions } = await db
    .from("questions")
    .select("id")
    .eq("session_id", session_id);

  const ids = (questions ?? []).map((q) => q.id);

  if (ids.length > 0) {
    await db.from("votes").delete().in("question_id", ids);
    await Promise.all(
      (questions ?? []).map(async (question) => {
        const { data: current } = await db
          .from("questions")
          .select("reset_version")
          .eq("id", question.id)
          .single();
        return db
          .from("questions")
          .update({
            status: "draft",
            started_at: null,
            ended_at: null,
            reset_version: (current?.reset_version ?? 0) + 1,
          })
          .eq("id", question.id);
      })
    );
  }

  return NextResponse.json({ ok: true });
}
