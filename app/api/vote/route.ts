import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { randomUUID } from "crypto";

const VOTER_COOKIE = "bg_voter_id";

export async function POST(req: NextRequest) {
  const { question_id, choice, nickname } = await req.json();
  const existingVoterId = req.cookies.get(VOTER_COOKIE)?.value;
  const voterId = existingVoterId || randomUUID();

  if (!question_id || !choice || !["A", "B"].includes(choice)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  const { data: question, error: qError } = await db
    .from("questions")
    .select("id, session_id, status, ended_at")
    .eq("id", question_id)
    .single();

  if (qError || !question) {
    return NextResponse.json({ error: "존재하지 않는 질문입니다." }, { status: 404 });
  }

  const { data: session } = await db
    .from("sessions")
    .select("is_current")
    .eq("id", question.session_id)
    .single();
  if (!session?.is_current) {
    return NextResponse.json({ error: "현재 세션의 질문이 아닙니다." }, { status: 409 });
  }

  if (question.status !== "active") {
    return NextResponse.json({ error: "지금은 투표할 수 없는 질문입니다." }, { status: 409 });
  }

  if (question.ended_at && new Date(question.ended_at).getTime() < Date.now()) {
    // 서버 기준으로 이미 마감된 경우 — 화면 표시를 최신 상태로 맞추기 위해 상태도 갱신
    await db
      .from("questions")
      .update({ status: "ended" })
      .eq("id", question_id)
      .eq("status", "active");
    return NextResponse.json({ error: "투표 시간이 종료되었습니다." }, { status: 409 });
  }

  const { error: insertError } = await db.from("votes").insert({
    question_id,
    choice,
    nickname: typeof nickname === "string" ? nickname.trim().slice(0, 12) || null : null,
    client_token: voterId,
  });

  if (insertError) {
    // unique(question_id, client_token) 위반 = 이미 투표한 브라우저
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "이미 투표한 질문입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  if (!existingVoterId) {
    response.cookies.set(VOTER_COOKIE, voterId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return response;
}
