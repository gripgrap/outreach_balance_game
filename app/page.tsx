"use client";

import { useEffect, useState } from "react";
import { useActiveQuestion } from "@/lib/useActiveQuestion";
import { useVoteCounts } from "@/lib/useVoteCounts";
import {
  getNickname,
  setNickname as saveNickname,
  getVotedChoice,
  setVotedChoice,
} from "@/lib/clientState";
import { BrandHeader } from "@/components/BrandHeader";

function useCountdown(endsAt: string | null) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }
    const target = new Date(endsAt).getTime();
    const tick = () => {
      const diff = Math.max(0, Math.round((target - Date.now()) / 1000));
      setRemaining(diff);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  return remaining;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ParticipantPage() {
  const [nicknameInput, setNicknameInput] = useState("");
  const [nickname, setNicknameState] = useState<string | null>(null);
  const [skippedNickname, setSkippedNickname] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [votedChoice, setVotedChoiceState] = useState<"A" | "B" | null>(null);

  const { question, loading } = useActiveQuestion();
  const { counts } = useVoteCounts(question?.id ?? null);
  const remaining = useCountdown(question?.status === "active" ? question.ended_at : null);

  useEffect(() => {
    const existing = getNickname();
    if (existing) setNicknameState(existing);
  }, []);

  useEffect(() => {
    if (!question) {
      setVotedChoiceState(null);
      return;
    }
    setVotedChoiceState(getVotedChoice(question.id, question.reset_version));
  }, [question]);

  const isEnded = question?.status === "ended" || (question?.status === "active" && remaining <= 0);
  const showResults = Boolean(votedChoice) || isEnded;

  async function handleVote(choice: "A" | "B") {
    if (!question || submitting || votedChoice) return;
    setSubmitting(true);
    setVoteError(null);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: question.id,
          choice,
          nickname: nickname || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVoteError(data.error || "투표에 실패했습니다.");
        return;
      }
      setVotedChoice(question.id, question.reset_version, choice);
      setVotedChoiceState(choice);
    } catch {
      setVoteError("네트워크 오류로 투표하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const displayVotedChoice = votedChoice;

  // ---- 1) 닉네임 입력 전 ----
  if (nickname === null && !skippedNickname) {
    return (
      <main className="grain-overlay min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <BrandHeader />
        <p className="font-display text-3xl text-gold text-glow mb-2 animate-fadeUp">
          반가워요!
        </p>
        <p className="text-sage mb-8 animate-fadeUp" style={{ animationDelay: "0.1s" }}>
          이번 게임에서 사용할 닉네임을 정해주세요
        </p>
        <input
          value={nicknameInput}
          onChange={(e) => setNicknameInput(e.target.value)}
          placeholder="예: 민수, 초코송이"
          maxLength={12}
          className="forest-panel w-full max-w-xs rounded-2xl px-5 py-4 text-center text-lg text-ivory placeholder:text-sage/50 focus:outline-none focus:border-gold mb-4 mt-6 animate-fadeUp"
          style={{ animationDelay: "0.15s" }}
        />
        <button
          onClick={() => {
            const trimmed = nicknameInput.trim();
            if (trimmed) saveNickname(trimmed);
            setNicknameState(trimmed || "");
          }}
          className="w-full max-w-xs bg-gold text-bg font-bold rounded-full py-4 text-lg mb-3 active:scale-95 transition-transform animate-fadeUp"
          style={{ animationDelay: "0.2s" }}
        >
          시작하기
        </button>
        <button
          onClick={() => setSkippedNickname(true)}
          className="text-sage text-sm underline underline-offset-4 animate-fadeUp"
          style={{ animationDelay: "0.25s" }}
        >
          닉네임 없이 계속하기
        </button>
      </main>
    );
  }

  // ---- 2) 로딩 ----
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sage animate-pulse">불러오는 중...</p>
      </main>
    );
  }

  // ---- 3) 대기 화면 (활성 질문 없음) ----
  if (!question) {
    return (
      <main className="grain-overlay min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <BrandHeader />
        <p className="text-ivory text-lg mb-1">
          {nickname ? `${nickname}님, ` : ""}곧 첫 질문이 시작돼요
        </p>
        <p className="text-sage text-sm">진행자가 화면을 시작하면 여기에 질문이 나타납니다</p>
        <div className="mt-10 flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          <span
            className="w-2 h-2 rounded-full bg-gold animate-pulse"
            style={{ animationDelay: "0.2s" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-gold animate-pulse"
            style={{ animationDelay: "0.4s" }}
          />
        </div>
      </main>
    );
  }

  const total = counts.total;
  const aPct = total > 0 ? Math.round((counts.a / total) * 100) : 50;
  const bPct = total > 0 ? 100 - aPct : 50;

  // ---- 4) 투표 완료 / 종료 -> 결과 보기 ----
  if (showResults) {
    return (
      <main className="grain-overlay min-h-screen flex flex-col px-6 py-10">
        <div className="text-center mb-8 animate-fadeUp">
          <BrandHeader />
          <p className="font-display text-xl text-gold text-glow mt-6">
            {isEnded && !displayVotedChoice ? "투표 종료!" : "투표 완료!"}
          </p>
          {displayVotedChoice && (
            <p className="text-ivory mt-2">
              {nickname ? `${nickname}님은 ` : "회원님은 "}
              <span className="text-gold font-bold">
                {displayVotedChoice === "A"
                  ? `${question.option_a_emoji ?? ""} ${question.option_a_text}`
                  : `${question.option_b_emoji ?? ""} ${question.option_b_text}`}
              </span>
              을(를) 선택했습니다
            </p>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-center gap-5 max-w-md mx-auto w-full">
          <ResultBar
            label={`${question.option_a_emoji ?? ""} ${question.option_a_text}`}
            pct={aPct}
            votes={counts.a}
            color="bg-optionA"
            highlighted={displayVotedChoice === "A"}
          />
          <ResultBar
            label={`${question.option_b_emoji ?? ""} ${question.option_b_text}`}
            pct={bPct}
            votes={counts.b}
            color="bg-optionB"
            highlighted={displayVotedChoice === "B"}
          />
        </div>

        <div className="text-center mt-8 animate-fadeUp">
          <p className="text-sage text-sm">총 {total}명 참여</p>
          {!isEnded && (
            <p className="text-ivory mt-2">
              다음 결과 공개까지 <span className="text-gold font-bold">{formatTime(remaining)}</span>
            </p>
          )}
          {isEnded && <p className="text-sage text-sm mt-2">다음 질문을 기다려주세요</p>}
        </div>
      </main>
    );
  }

  // ---- 5) 투표 화면 ----
  return (
    <main className="grain-overlay min-h-screen flex flex-col px-6 py-8">
      <div className="text-center mb-2 animate-fadeUp">
        <BrandHeader />
      </div>
      <p className="text-center text-ivory/90 text-base mb-6 animate-fadeUp" style={{ animationDelay: "0.05s" }}>
        Q. {question.option_a_text} VS {question.option_b_text}
      </p>

      <div className="flex-1 flex flex-col gap-4 max-w-md mx-auto w-full justify-center">
        <OptionCard
          label="A"
          text={question.option_a_text}
          emoji={question.option_a_emoji}
          onClick={() => handleVote("A")}
          disabled={submitting}
          color="border-optionA"
        />
        <p className="text-center text-sage font-display text-sm">VS</p>
        <OptionCard
          label="B"
          text={question.option_b_text}
          emoji={question.option_b_emoji}
          onClick={() => handleVote("B")}
          disabled={submitting}
          color="border-optionB"
        />
      </div>

      {voteError && (
        <p className="text-center text-red-300 text-sm mt-4 animate-fadeUp">{voteError}</p>
      )}

      <div className="text-center mt-8">
        <p className="text-sage text-sm mb-1">투표 마감까지</p>
        <p className="font-display text-3xl text-gold text-glow">{formatTime(remaining)}</p>
      </div>
    </main>
  );
}

function OptionCard({
  label,
  text,
  emoji,
  onClick,
  disabled,
  color,
}: {
  label: string;
  text: string;
  emoji: string | null;
  onClick: () => void;
  disabled: boolean;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`forest-panel border-2 ${color} rounded-3xl py-8 px-4 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60 animate-popIn`}
    >
      <span className="text-sage text-sm font-bold">{label}</span>
      {emoji && <span className="text-4xl">{emoji}</span>}
      <span className="text-ivory text-xl font-bold text-center">{text}</span>
    </button>
  );
}

function ResultBar({
  label,
  pct,
  votes,
  color,
  highlighted,
}: {
  label: string;
  pct: number;
  votes: number;
  color: string;
  highlighted: boolean;
}) {
  return (
    <div className={`animate-fadeUp ${highlighted ? "" : "opacity-80"}`}>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className={`font-bold ${highlighted ? "text-gold" : "text-ivory"}`}>{label}</span>
        <span className="text-ivory font-display text-lg">{pct}%</span>
      </div>
      <div className="w-full h-4 bg-bg-soft rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sage text-xs mt-1">{votes}표</p>
    </div>
  );
}
