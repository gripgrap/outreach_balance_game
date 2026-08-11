/**
 * File: app/api/final/route.ts
 * 최종 발표 화면에 질문별 집계와 하이라이트를 제공하는 API다.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getSupabaseAdmin();

  const { data: session } = await db
    .from("sessions")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();

  if (!session) {
    return NextResponse.json(
      { session: null, questions: [], totalParticipants: 0 },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const { data: questions } = await db
    .from("questions")
    .select("*")
    .eq("session_id", session.id)
    .order("order_index", { ascending: true });

  const questionIds = (questions ?? []).map((q) => q.id);

  let votes: { question_id: string; choice: string; client_token: string }[] = [];
  if (questionIds.length > 0) {
    const { data } = await db
      .from("votes")
      .select("question_id, choice, client_token")
      .in("question_id", questionIds);
    votes = data ?? [];
  }

  const questionsWithResults = (questions ?? []).map((q) => {
    const qVotes = votes.filter((v) => v.question_id === q.id);
    const a = qVotes.filter((v) => v.choice === "A").length;
    const b = qVotes.filter((v) => v.choice === "B").length;
    const total = a + b;
    const aPct = total > 0 ? Math.round((a / total) * 100) : 0;
    const bPct = total > 0 ? 100 - aPct : 0;
    return { ...q, counts: { a, b, total }, aPct, bPct, gap: Math.abs(aPct - bPct) };
  });

  // 최종 발표에는 실제 투표가 있는 질문만 포함해 초안·미진행 질문이 섞이지 않게 한다.
  const finalQuestions = questionsWithResults.filter((q) => q.counts.total > 0);
  const finalQuestionIds = new Set(finalQuestions.map((question) => question.id));
  const uniqueParticipants = new Set(
    votes
      .filter((vote) => finalQuestionIds.has(vote.question_id))
      .map((vote) => vote.client_token)
  ).size;
  const mostLopsided = finalQuestions.length
    ? finalQuestions.reduce((max, q) => (q.gap > max.gap ? q : max))
    : null;
  const closest = finalQuestions.length
    ? finalQuestions.reduce((min, q) => (q.gap < min.gap ? q : min))
    : null;

  return NextResponse.json(
    {
      session,
      questions: finalQuestions,
      totalParticipants: uniqueParticipants,
      mostLopsided,
      closest,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
