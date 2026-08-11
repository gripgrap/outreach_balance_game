/**
 * File: app/api/admin/state/route.ts
 * 관리자 화면에 현재 세션·질문·집계 상태를 제공하는 API다.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const authError = requireAdmin();
  if (authError) return authError;

  const db = getSupabaseAdmin();

  const { data: session } = await db
    .from("sessions")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ session: null, questions: [] });
  }

  const { data: questions } = await db
    .from("questions")
    .select("*")
    .eq("session_id", session.id)
    .order("order_index", { ascending: true });

  const questionIds = (questions ?? []).map((q) => q.id);

  let counts: Record<string, { a: number; b: number }> = {};
  if (questionIds.length > 0) {
    const { data: votes } = await db
      .from("votes")
      .select("question_id, choice")
      .in("question_id", questionIds);

    counts = questionIds.reduce((acc, id) => {
      acc[id] = { a: 0, b: 0 };
      return acc;
    }, {} as Record<string, { a: number; b: number }>);

    (votes ?? []).forEach((v) => {
      if (v.choice === "A") counts[v.question_id].a += 1;
      else counts[v.question_id].b += 1;
    });
  }

  const questionsWithCounts = (questions ?? []).map((q) => ({
    ...q,
    counts: {
      a: counts[q.id]?.a ?? 0,
      b: counts[q.id]?.b ?? 0,
      total: (counts[q.id]?.a ?? 0) + (counts[q.id]?.b ?? 0),
    },
  }));

  return NextResponse.json({ session, questions: questionsWithCounts });
}
