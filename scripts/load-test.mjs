/**
 * File: scripts/load-test.mjs
 * 활성 질문에 지정 인원의 가상 투표를 보내 성공률과 응답 시간을 측정한다.
 */

import { createClient } from "@supabase/supabase-js";

function readOption(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

const baseUrl = readOption("base-url", "https://outreach-balance-game-live.vercel.app").replace(/\/$/, "");
const users = Number(readOption("users", "150"));
const rampMs = Number(readOption("ramp-ms", "5000"));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(".env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY가 필요합니다.");
}
if (!Number.isInteger(users) || users < 1 || users > 500) {
  throw new Error("--users는 1~500 사이의 정수여야 합니다.");
}
if (!Number.isFinite(rampMs) || rampMs < 0 || rampMs > 60000) {
  throw new Error("--ramp-ms는 0~60000 사이여야 합니다.");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: session, error: sessionError } = await supabase
  .from("sessions")
  .select("id, title")
  .eq("is_current", true)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (sessionError || !session) {
  throw new Error(`현재 세션을 찾지 못했습니다: ${sessionError?.message ?? "세션 없음"}`);
}

const { data: question, error: questionError } = await supabase
  .from("questions")
  .select("id, option_a_text, option_b_text")
  .eq("session_id", session.id)
  .eq("status", "active")
  .limit(1)
  .maybeSingle();

if (questionError || !question) {
  throw new Error(`진행 중인 질문을 찾지 못했습니다: ${questionError?.message ?? "활성 질문 없음"}`);
}

console.log(`대상: ${baseUrl}`);
console.log(`세션: ${session.title}`);
console.log(`질문: ${question.option_a_text} / ${question.option_b_text}`);
console.log(`가상 참가자: ${users}명, 진입 시간: ${rampMs}ms`);
console.log("주의: 실제 투표 데이터가 생성됩니다. 완료 후 관리자 화면에서 전체 투표 초기화를 실행하세요.\n");

const startedAt = performance.now();
const requests = Array.from({ length: users }, (_, index) =>
  new Promise((resolve) =>
    setTimeout(resolve, users === 1 ? 0 : (rampMs * index) / (users - 1))
  ).then(async () => {
    const requestStartedAt = performance.now();
    try {
      const response = await fetch(`${baseUrl}/api/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: question.id,
          choice: index % 2 === 0 ? "A" : "B",
          nickname: `load-${index + 1}`,
        }),
        signal: AbortSignal.timeout(15000),
      });
      return { ok: response.ok, status: response.status, ms: performance.now() - requestStartedAt };
    } catch (error) {
      return {
        ok: false,
        status: "network-error",
        ms: performance.now() - requestStartedAt,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  })
);

const results = await Promise.all(requests);
const latencies = results.map((result) => result.ms).sort((a, b) => a - b);
const percentile = (value) =>
  latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * value) - 1)];
const statusCounts = results.reduce((counts, result) => {
  counts[result.status] = (counts[result.status] ?? 0) + 1;
  return counts;
}, {});
const passed = results.filter((result) => result.ok).length;
const passRate = (passed / users) * 100;

console.log(`성공: ${passed}/${users} (${passRate.toFixed(1)}%)`);
console.log(`상태 코드: ${JSON.stringify(statusCounts)}`);
console.log(
  `응답 시간: p50 ${percentile(0.5).toFixed(0)}ms / p95 ${percentile(0.95).toFixed(0)}ms / 최대 ${latencies.at(-1).toFixed(0)}ms`
);
console.log(`전체 소요: ${(performance.now() - startedAt).toFixed(0)}ms`);

if (passRate < 99) {
  process.exitCode = 1;
  console.error("실패율이 1%를 넘었습니다. Vercel 함수 로그와 Supabase API/Database 로그를 확인하세요.");
}
