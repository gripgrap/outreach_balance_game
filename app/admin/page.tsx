"use client";

import { useEffect, useState, useCallback } from "react";
import type { QuestionWithResults, Session } from "@/lib/types";
import { BrandHeader } from "@/components/BrandHeader";

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
    if (!confirm("현재 세션의 모든 질문과 투표를 초기화할까요? 되돌릴 수 없습니다.")) return;
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
      <div className="max-w-3xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <BrandHeader />
          <div className="flex gap-3 text-sm">
            <a href="/results" target="_blank" className="text-sage underline">
              결과화면 열기
            </a>
            <a href="/final" target="_blank" className="text-sage underline">
              엔딩화면 열기
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

        {!session ? (
          <section className="bg-bg-card border border-sage/30 rounded-2xl p-6">
            <p className="text-ivory mb-4">진행 중인 세션이 없습니다. 새 세션을 시작하세요.</p>
            <input
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              className="w-full bg-bg border border-sage/40 rounded-xl px-4 py-3 text-ivory mb-3"
            />
            <button
              onClick={handleCreateSession}
              className="bg-gold text-bg font-bold rounded-xl px-5 py-3"
            >
              세션 시작
            </button>
          </section>
        ) : (
          <>
            <section className="forest-panel rounded-2xl p-6 mb-6 flex flex-wrap gap-4 justify-between items-center">
              <div>
                <p className="text-ivory font-bold">{session.title}</p>
                <p className="text-sage text-sm">질문 {questions.length}개</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleNewSession}
                  className="text-gold border border-gold/40 rounded-xl px-4 py-2 text-sm"
                >
                  새 세션
                </button>
                <button
                  onClick={handleResetAll}
                  className="text-red-300 border border-red-400/40 rounded-xl px-4 py-2 text-sm"
                >
                  전체 투표 초기화
                </button>
              </div>
            </section>

            <section className="bg-bg-card border border-sage/30 rounded-2xl p-6 mb-6">
              <p className="text-ivory font-bold mb-4">질문 추가</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  value={newAEmoji}
                  onChange={(e) => setNewAEmoji(e.target.value)}
                  placeholder="A 이모지 (선택)"
                  className="bg-bg border border-sage/40 rounded-xl px-3 py-2 text-ivory text-sm"
                />
                <input
                  value={newBEmoji}
                  onChange={(e) => setNewBEmoji(e.target.value)}
                  placeholder="B 이모지 (선택)"
                  className="bg-bg border border-sage/40 rounded-xl px-3 py-2 text-ivory text-sm"
                />
                <input
                  value={newA}
                  onChange={(e) => setNewA(e.target.value)}
                  placeholder="A 선택지 (예: 평생 여름)"
                  className="bg-bg border border-sage/40 rounded-xl px-3 py-2 text-ivory text-sm"
                />
                <input
                  value={newB}
                  onChange={(e) => setNewB(e.target.value)}
                  placeholder="B 선택지 (예: 평생 겨울)"
                  className="bg-bg border border-sage/40 rounded-xl px-3 py-2 text-ivory text-sm"
                />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <label className="text-sage text-sm">제한시간(초)</label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(Number(e.target.value))}
                  className="bg-bg border border-sage/40 rounded-xl px-3 py-2 text-ivory text-sm"
                >
                  <option value={30}>30초</option>
                  <option value={60}>60초</option>
                  <option value={90}>90초</option>
                </select>
              </div>
              <button
                onClick={handleAddQuestion}
                className="bg-gold text-bg font-bold rounded-xl px-5 py-2.5 text-sm"
              >
                질문 추가
              </button>
            </section>

            <section className="flex flex-col gap-3">
              {questions.map((q, i) => (
                <div
                  key={q.id}
                  className="bg-bg-card border border-sage/30 rounded-2xl p-5"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
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
                    <div className="flex flex-col gap-1 items-end text-xs text-sage">
                      <button onClick={() => handleReorder(q.id, -1)} disabled={i === 0}>
                        ▲ 위로
                      </button>
                      <button
                        onClick={() => handleReorder(q.id, 1)}
                        disabled={i === questions.length - 1}
                      >
                        ▼ 아래로
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm mb-3">
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
                        className="bg-gold text-bg font-bold rounded-full px-4 py-1.5 text-xs"
                      >
                        투표 시작
                      </button>
                    )}
                    {q.status === "active" && (
                      <button
                        onClick={() => handleEnd(q.id)}
                        className="bg-optionB text-bg font-bold rounded-full px-4 py-1.5 text-xs"
                      >
                        지금 종료
                      </button>
                    )}
                    <button
                      onClick={() => handleResetQuestion(q.id)}
                      className="border border-sage/40 text-sage rounded-full px-4 py-1.5 text-xs"
                    >
                      초기화
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="border border-red-400/40 text-red-300 rounded-full px-4 py-1.5 text-xs"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-sage text-center py-8">아직 등록된 질문이 없습니다.</p>
              )}
            </section>
          </>
        )}
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
