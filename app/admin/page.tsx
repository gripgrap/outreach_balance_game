/**
 * File: app/admin/page.tsx
 * 행사 담당자가 세션·질문·투표·결과 내보내기를 관리하는 관리자 화면이다.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import type { QuestionWithResults, Session } from "@/lib/types";
import { BrandHeader } from "@/components/BrandHeader";
import { AdminGuide } from "@/components/AdminGuide";
import { buildResultCopyText, buildResultCsv, resultFilename } from "@/lib/exportResults";

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "요청에 실패했습니다.");
  return data;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<QuestionWithResults[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const [newA, setNewA] = useState("");
  const [newAEmoji, setNewAEmoji] = useState("");
  const [newB, setNewB] = useState("");
  const [newBEmoji, setNewBEmoji] = useState("");
  const [newTime, setNewTime] = useState(30);

  const [newSessionTitle, setNewSessionTitle] = useState("수련회 밸런스 게임");

  const loadState = useCallback(async () => {
    try {
      const data = await api("/api/admin/state");
      setSession(data.session);
      setQuestions(data.questions || []);
      setAuthed(true);
    } catch {
      setAuthed(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    if (!authed) return;
    const id = setInterval(loadState, 3000);
    return () => clearInterval(id);
  }, [authed, loadState]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    try {
      await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) });
      await loadState();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "로그인 실패");
    }
  }

  async function handleLogout() {
    await api("/api/admin/logout", { method: "POST" });
    setAuthed(false);
  }

  async function handleCreateSession() {
    try {
      await api("/api/admin/session/new", {
        method: "POST",
        body: JSON.stringify({ title: newSessionTitle, is_test: false }),
      });
      await loadState();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "세션 생성 실패");
    }
  }

  async function handleNewSession() {
    if (!confirm("새 세션을 시작할까요? 기존 세션의 질문과 투표는 보존됩니다.")) return;
    await handleCreateSession();
  }

  async function handleAddQuestion() {
    if (!session || !newA.trim() || !newB.trim()) return;
    try {
      await api("/api/admin/questions", {
        method: "POST",
        body: JSON.stringify({
          session_id: session.id,
          option_a_text: newA.trim(),
          option_a_emoji: newAEmoji.trim() || null,
          option_b_text: newB.trim(),
          option_b_emoji: newBEmoji.trim() || null,
          time_limit_sec: newTime,
        }),
      });
      setNewA("");
      setNewAEmoji("");
      setNewB("");
      setNewBEmoji("");
      await loadState();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "질문 추가 실패");
    }
  }

  async function handleStart(id: string) {
    const target = questions.find((question) => question.id === id);
    const current = questions.find((question) => question.status === "active");
    if (
      target &&
      current &&
      current.id !== target.id &&
      !confirm(
        `현재 진행 중인 ‘${current.option_a_text} VS ${current.option_b_text}’를 종료하고 이 질문을 시작할까요?`
      )
    ) {
      return;
    }
    try {
      await api(`/api/admin/questions/${id}/start`, { method: "POST" });
      await loadState();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "시작 실패");
    }
  }

  async function handleEnd(id: string) {
    try {
      await api(`/api/admin/questions/${id}/end`, { method: "POST" });
      await loadState();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "종료 실패");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 질문을 삭제할까요? 관련 투표도 함께 삭제됩니다.")) return;
    try {
      await api(`/api/admin/questions/${id}`, { method: "DELETE" });
      await loadState();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  async function handleResetQuestion(id: string) {
    if (!confirm("이 질문의 투표를 초기화할까요?")) return;
    try {
      await api("/api/admin/session/reset-question", {
        method: "POST",
        body: JSON.stringify({ question_id: id }),
      });
      await loadState();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "초기화 실패");
    }
  }

  async function handleResetAll() {
    if (!session) return;
    const confirmation = prompt(
      "현재 세션의 모든 투표가 삭제되고 질문이 대기 상태로 돌아갑니다. 계속하려면 ‘전체 초기화’를 입력하세요."
    );
    if (confirmation?.trim() !== "전체 초기화") return;
    try {
      await api("/api/admin/session/reset-votes", {
        method: "POST",
        body: JSON.stringify({ session_id: session.id }),
      });
      await loadState();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "초기화 실패");
    }
  }

  async function handleReorder(id: string, direction: -1 | 1) {
    const idx = questions.findIndex((q) => q.id === id);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const reordered = [...questions];
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
    setQuestions(reordered);
    try {
      await api("/api/admin/questions/reorder", {
        method: "POST",
        body: JSON.stringify({ orderedIds: reordered.map((q) => q.id) }),
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "순서 변경 실패");
      await loadState();
    }
  }

  async function handleCopyResults() {
    if (!session) return;
    setExportNotice(null);
    try {
      await navigator.clipboard.writeText(buildResultCopyText(session, questions));
      setExportNotice("결과를 클립보드에 복사했습니다.");
    } catch {
      setExportNotice("복사하지 못했습니다. Excel용 CSV 다운로드를 사용해 주세요.");
    }
  }

  function handleDownloadResults() {
    if (!session) return;
    const blob = new Blob([buildResultCsv(session, questions)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = resultFilename(session);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportNotice("Excel용 CSV 파일을 저장했습니다.");
  }

  const activeQuestion = questions.find((question) => question.status === "active") ?? null;
  const nextDraftQuestion = questions.find((question) => question.status === "draft") ?? null;
  const latestEndedQuestion =
    [...questions].reverse().find((question) => question.status === "ended") ?? null;
  const activeQuestionIndex = activeQuestion
    ? questions.findIndex((question) => question.id === activeQuestion.id)
    : -1;
  const nextDraftQuestionIndex = nextDraftQuestion
    ? questions.findIndex((question) => question.id === nextDraftQuestion.id)
    : -1;
  const latestEndedQuestionIndex = latestEndedQuestion
    ? questions.findIndex((question) => question.id === latestEndedQuestion.id)
    : -1;
  const hasVotes = questions.some((question) => question.counts.total > 0);

  if (authed === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg">
        <p className="text-sage animate-pulse">확인 중...</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="grain-overlay min-h-screen flex items-center justify-center bg-transparent px-6">
        <form
          onSubmit={handleLogin}
          className="forest-panel rounded-2xl p-8 w-full max-w-sm"
        >
          <BrandHeader />
          <p className="text-sage text-xs tracking-[0.3em] mb-6 mt-5 text-center">CONTROL ROOM</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="관리자 비밀번호"
            className="w-full bg-bg border border-sage/40 rounded-xl px-4 py-3 text-ivory mb-4 focus:outline-none focus:border-gold"
          />
          {loginError && <p className="text-red-300 text-sm mb-4">{loginError}</p>}
          <button
            type="submit"
            className="w-full bg-gold text-bg font-bold rounded-xl py-3"
          >
            로그인
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="grain-overlay min-h-screen bg-transparent px-4 py-8 md:px-10">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col gap-5 items-center mb-8 sm:flex-row sm:justify-between">
          <BrandHeader />
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm sm:justify-end">
            <a href="/results" target="_blank" rel="noreferrer" className="text-sage underline">
              행사 진행 화면
            </a>
            <a href="/final" target="_blank" rel="noreferrer" className="text-sage underline">
              최종 결과 발표
            </a>
            <button onClick={handleLogout} className="text-sage underline">
              로그아웃
            </button>
          </div>
        </header>

        {actionError && (
          <p className="bg-red-900/30 border border-red-500/40 text-red-200 rounded-xl px-4 py-2 mb-6 text-sm">
            {actionError}
          </p>
        )}

        <div className="lg:hidden">
          <AdminGuide collapsible />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div>
        {!session ? (
          <section className="bg-bg-card border border-sage/30 rounded-2xl p-5 sm:p-6">
            <p className="text-ivory mb-4">진행 중인 세션이 없습니다. 새 세션을 시작하세요.</p>
            <label className="block text-sage text-sm mb-3">
              행사·세션 이름
              <input
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                className="mt-1.5 w-full bg-bg border border-sage/40 rounded-xl px-4 py-3 text-ivory"
              />
            </label>
            <button
              onClick={handleCreateSession}
              className="bg-gold text-bg font-bold rounded-xl px-5 py-3"
            >
              세션 시작
            </button>
          </section>
        ) : (
          <>
            <section className="forest-panel rounded-2xl p-5 sm:p-6 mb-6 flex flex-wrap gap-4 justify-between items-center">
              <div>
                <p className="text-xs tracking-[0.18em] text-gold mb-1">현재 세션</p>
                <p className="text-ivory font-bold">{session.title}</p>
                <p className="text-sage text-sm">질문 {questions.length}개</p>
              </div>
              <span className="rounded-full border border-sage/30 px-3 py-1.5 text-xs text-sage">
                행사 운영 중에는 이 세션을 유지하세요
              </span>
            </section>

            <section
              className="bg-bg-card border-2 border-gold/35 rounded-2xl p-5 sm:p-6 mb-6"
              aria-live="polite"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs tracking-[0.18em] text-gold mb-2">지금 할 일</p>
                  {activeQuestion ? (
                    <>
                      <p className="text-gold font-bold text-xl">Q{activeQuestionIndex + 1} 투표 진행 중</p>
                      <p className="text-ivory mt-1">
                        {activeQuestion.option_a_text} <span className="text-sage">VS</span>{" "}
                        {activeQuestion.option_b_text}
                      </p>
                      <p className="text-sage text-sm mt-2">현재 {activeQuestion.counts.total}명 참여</p>
                    </>
                  ) : nextDraftQuestion ? (
                    <>
                      <p className="text-ivory font-bold text-xl">
                        {latestEndedQuestion ? `Q${latestEndedQuestionIndex + 1} 결과 공개 완료` : "첫 질문 시작 전"}
                      </p>
                      <p className="text-sage text-sm mt-2">
                        다음은 Q{nextDraftQuestionIndex + 1} · {nextDraftQuestion.option_a_text} VS{" "}
                        {nextDraftQuestion.option_b_text}
                      </p>
                    </>
                  ) : questions.length === 0 ? (
                    <>
                      <p className="text-ivory font-bold text-xl">질문을 먼저 준비하세요</p>
                      <p className="text-sage text-sm mt-2">아래 ‘행사 전 질문 준비’를 열어 질문을 등록합니다.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gold font-bold text-xl">모든 질문 진행 완료</p>
                      <p className="text-sage text-sm mt-2">최종 결과 발표를 열고 질문별 결과를 넘겨주세요.</p>
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:min-w-48">
                  {activeQuestion && (
                    <button
                      onClick={() => handleEnd(activeQuestion.id)}
                      className="min-h-12 bg-optionB text-bg font-bold rounded-xl px-5 py-3"
                    >
                      Q{activeQuestionIndex + 1} 지금 종료
                    </button>
                  )}
                  {!activeQuestion && nextDraftQuestion && (
                    <button
                      onClick={() => handleStart(nextDraftQuestion.id)}
                      className="min-h-12 bg-gold text-bg font-bold rounded-xl px-5 py-3"
                    >
                      Q{nextDraftQuestionIndex + 1} 투표 시작
                    </button>
                  )}
                  {!activeQuestion && !nextDraftQuestion && questions.length > 0 && (
                    <a
                      href="/final"
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-12 bg-gold text-bg font-bold rounded-xl px-5 py-3 flex items-center justify-center"
                    >
                      최종 결과 발표 열기
                    </a>
                  )}
                  <a
                    href="/results"
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-11 border border-sage/35 text-sage rounded-xl px-4 py-2 flex items-center justify-center text-sm"
                  >
                    행사 진행 화면 확인
                  </a>
                </div>
              </div>
            </section>

            <details
              className="bg-bg-card border border-sage/30 rounded-2xl p-5 sm:p-6 mb-6"
              open={questions.length === 0 ? true : undefined}
            >
              <summary className="cursor-pointer min-h-11 flex items-center justify-between font-bold text-ivory">
                <span>행사 전 질문 준비</span>
                <span className="text-sage text-sm font-normal">질문 추가·제한시간 설정</span>
              </summary>
              <div className="pt-5 mt-2 border-t border-sage/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <fieldset className="rounded-xl border border-optionA/35 p-4">
                    <legend className="px-2 text-optionA font-bold">A 선택지</legend>
                    <label className="block text-sage text-sm mb-3">
                      선택지 문구
                      <input
                        value={newA}
                        onChange={(e) => setNewA(e.target.value)}
                        placeholder="예: 평생 여름"
                        className="mt-1.5 w-full bg-bg border border-sage/40 rounded-xl px-3 py-2.5 text-ivory"
                      />
                    </label>
                    <label className="block text-sage text-sm">
                      이모지 (선택)
                      <input
                        value={newAEmoji}
                        onChange={(e) => setNewAEmoji(e.target.value)}
                        placeholder="예: ☀️"
                        className="mt-1.5 w-full bg-bg border border-sage/40 rounded-xl px-3 py-2.5 text-ivory"
                      />
                    </label>
                  </fieldset>

                  <fieldset className="rounded-xl border border-optionB/35 p-4">
                    <legend className="px-2 text-optionB font-bold">B 선택지</legend>
                    <label className="block text-sage text-sm mb-3">
                      선택지 문구
                      <input
                        value={newB}
                        onChange={(e) => setNewB(e.target.value)}
                        placeholder="예: 평생 겨울"
                        className="mt-1.5 w-full bg-bg border border-sage/40 rounded-xl px-3 py-2.5 text-ivory"
                      />
                    </label>
                    <label className="block text-sage text-sm">
                      이모지 (선택)
                      <input
                        value={newBEmoji}
                        onChange={(e) => setNewBEmoji(e.target.value)}
                        placeholder="예: ❄️"
                        className="mt-1.5 w-full bg-bg border border-sage/40 rounded-xl px-3 py-2.5 text-ivory"
                      />
                    </label>
                  </fieldset>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <label className="text-sage text-sm">
                    투표 제한시간
                    <select
                      value={newTime}
                      onChange={(e) => setNewTime(Number(e.target.value))}
                      className="mt-1.5 block bg-bg border border-sage/40 rounded-xl px-3 py-2.5 text-ivory"
                    >
                      <option value={30}>30초</option>
                      <option value={60}>60초</option>
                      <option value={90}>90초</option>
                    </select>
                  </label>
                  <button
                    onClick={handleAddQuestion}
                    disabled={!newA.trim() || !newB.trim()}
                    className="min-h-11 bg-gold text-bg font-bold rounded-xl px-5 py-2.5 text-sm disabled:opacity-40"
                  >
                    질문 추가
                  </button>
                </div>
              </div>
            </details>

            <section className="flex flex-col gap-3">
              {questions.map((q, i) => (
                <div
                  key={q.id}
                  className={`bg-bg-card border rounded-2xl p-5 ${
                    q.status === "active" ? "border-gold/70 ring-1 ring-gold/20" : "border-sage/30"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-sage text-xs mb-1">
                        Q{i + 1} · {q.time_limit_sec}초 ·{" "}
                        <StatusBadge status={q.status} />
                      </p>
                      <p className="text-ivory font-bold">
                        {q.option_a_emoji} {q.option_a_text}{" "}
                        <span className="text-sage font-normal">VS</span> {q.option_b_emoji}{" "}
                        {q.option_b_text}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-between items-center gap-2 text-sm mb-3">
                    <span className="text-optionA">
                      A {q.counts.a}표 (
                      {q.counts.total ? Math.round((q.counts.a / q.counts.total) * 100) : 0}%)
                    </span>
                    <span className="text-optionB">
                      B {q.counts.b}표 (
                      {q.counts.total ? Math.round((q.counts.b / q.counts.total) * 100) : 0}%)
                    </span>
                    <span className="text-sage">총 {q.counts.total}명</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {q.status === "draft" && (
                      <button
                        onClick={() => handleStart(q.id)}
                        className="min-h-11 w-full bg-gold text-bg font-bold rounded-xl px-4 py-2 text-sm sm:w-auto sm:rounded-full"
                      >
                        Q{i + 1} 투표 시작
                      </button>
                    )}
                    {q.status === "active" && (
                      <button
                        onClick={() => handleEnd(q.id)}
                        className="min-h-11 w-full bg-optionB text-bg font-bold rounded-xl px-4 py-2 text-sm sm:w-auto sm:rounded-full"
                      >
                        Q{i + 1} 지금 종료
                      </button>
                    )}
                  </div>

                  <details className="mt-3 border-t border-sage/15 pt-3">
                    <summary className="cursor-pointer min-h-10 flex items-center justify-between text-xs text-sage">
                      <span>질문 관리</span>
                      <span>순서 변경 · 투표 지우기 · 삭제</span>
                    </summary>
                    <div className="grid grid-cols-2 gap-2 pt-3 sm:flex sm:flex-wrap">
                      <button
                        onClick={() => handleReorder(q.id, -1)}
                        disabled={i === 0}
                        className="min-h-10 border border-sage/30 text-sage rounded-xl px-3 py-2 text-xs disabled:opacity-30"
                      >
                        ▲ 위로 이동
                      </button>
                      <button
                        onClick={() => handleReorder(q.id, 1)}
                        disabled={i === questions.length - 1}
                        className="min-h-10 border border-sage/30 text-sage rounded-xl px-3 py-2 text-xs disabled:opacity-30"
                      >
                        ▼ 아래로 이동
                      </button>
                      <button
                        onClick={() => handleResetQuestion(q.id)}
                        className="min-h-10 border border-sage/40 text-sage rounded-xl px-3 py-2 text-xs"
                      >
                        이 질문 투표 지우기
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="min-h-10 border border-red-400/40 text-red-300 rounded-xl px-3 py-2 text-xs"
                      >
                        질문 삭제
                      </button>
                    </div>
                  </details>
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-sage text-center py-8">아직 등록된 질문이 없습니다.</p>
              )}
            </section>

            <section className="bg-bg-card border border-sage/30 rounded-2xl p-5 sm:p-6 mt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-ivory font-bold">행사 종료 후 결과 보관</p>
                  <p className="text-sage text-sm mt-1">
                    질문별 표와 비율을 복사하거나 Excel용 파일로 저장합니다.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <button
                    onClick={handleCopyResults}
                    disabled={!hasVotes}
                    className="min-h-11 border border-gold/40 text-gold rounded-xl px-4 py-2 text-sm disabled:opacity-40"
                  >
                    결과 복사
                  </button>
                  <button
                    onClick={handleDownloadResults}
                    disabled={!hasVotes}
                    className="min-h-11 bg-gold text-bg font-bold rounded-xl px-4 py-2 text-sm disabled:opacity-40"
                  >
                    Excel용 CSV
                  </button>
                </div>
              </div>
              {!hasVotes && <p className="text-sage/70 text-xs mt-3">투표 결과가 생기면 버튼이 활성화됩니다.</p>}
              {exportNotice && <p className="text-sage text-sm mt-3" role="status">{exportNotice}</p>}
            </section>

            <details className="rounded-2xl border border-red-400/25 bg-red-950/10 p-5 mt-6">
              <summary className="cursor-pointer min-h-11 flex items-center justify-between text-red-200 font-bold">
                <span>행사 준비·관리</span>
                <span className="text-xs font-normal text-red-100/70">행사 중에는 열지 마세요</span>
              </summary>
              <div className="pt-4 mt-2 border-t border-red-400/20">
                <p className="text-red-100/75 text-sm mb-4">
                  새 세션 시작과 전체 투표 초기화는 현재 행사 흐름을 바꿉니다. 리허설 직후나 담당자 확인 후에만 사용하세요.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={handleNewSession}
                    className="min-h-11 text-gold border border-gold/40 rounded-xl px-4 py-2 text-sm"
                  >
                    새 세션 시작
                  </button>
                  <button
                    onClick={handleResetAll}
                    className="min-h-11 text-red-200 border border-red-400/40 rounded-xl px-4 py-2 text-sm"
                  >
                    현재 세션 전체 투표 초기화
                  </button>
                </div>
              </div>
            </details>
          </>
        )}
          </div>
          <div className="hidden lg:block lg:sticky lg:top-6">
            <AdminGuide />
          </div>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    draft: { label: "대기", color: "text-sage" },
    active: { label: "진행중", color: "text-gold" },
    ended: { label: "종료", color: "text-optionB" },
  };
  const s = map[status] ?? map.draft;
  return <span className={s.color}>{s.label}</span>;
}
