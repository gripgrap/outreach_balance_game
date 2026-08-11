import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// body: { title: string, is_test: boolean }
// 새 세션을 만들고 is_current로 지정한다. 기존 세션은 is_current=false로 내려간다.
// (이전 세션의 질문/투표 데이터는 삭제하지 않고 그대로 보존된다 — 나중에 필요하면 조회 가능)
export async function POST(req: NextRequest) {
  const authError = requireAdmin();
  if (authError) return authError;

  const { title, is_test } = (await req.json()) as { title?: string; is_test?: boolean };

  const db = getSupabaseAdmin();

  await db.from("sessions").update({ is_current: false }).eq("is_current", true);

  const { data, error } = await db
    .from("sessions")
    .insert({
      title: title || "수련회 밸런스 게임",
      is_current: true,
      is_test: !!is_test,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}
