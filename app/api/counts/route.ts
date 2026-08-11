import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const questionId = req.nextUrl.searchParams.get("question_id");

  if (!questionId) {
    return NextResponse.json({ error: "question_id가 필요합니다." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const [aResult, bResult] = await Promise.all([
    db
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("question_id", questionId)
      .eq("choice", "A"),
    db
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("question_id", questionId)
      .eq("choice", "B"),
  ]);

  if (aResult.error || bResult.error) {
    return NextResponse.json({ error: "득표수를 불러오지 못했습니다." }, { status: 500 });
  }

  const a = aResult.count ?? 0;
  const b = bResult.count ?? 0;

  return NextResponse.json(
    { a, b, total: a + b },
    { headers: { "Cache-Control": "no-store" } }
  );
}
