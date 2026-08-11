import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// body: { orderedIds: string[] }  -- 원하는 순서대로 나열된 question id 배열
export async function POST(req: NextRequest) {
  const authError = requireAdmin();
  if (authError) return authError;

  const { orderedIds } = (await req.json()) as { orderedIds: string[] };
  if (!Array.isArray(orderedIds)) {
    return NextResponse.json({ error: "orderedIds가 필요합니다." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  await Promise.all(
    orderedIds.map((id, index) =>
      db.from("questions").update({ order_index: index }).eq("id", id)
    )
  );

  return NextResponse.json({ ok: true });
}
