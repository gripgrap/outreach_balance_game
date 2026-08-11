/**
 * File: app/results/page.tsx
 * 프로젝터에서 현재 질문의 카운트다운과 종료 결과를 표시하는 화면이다.
 */

"use client";

import { useEffect, useState } from "react";
import { useActiveQuestion } from "@/lib/useActiveQuestion";
import { useVoteCounts } from "@/lib/useVoteCounts";
import { BrandHeader } from "@/components/BrandHeader";

function useCountdown(endsAt: string | null) {
  const [remaining, setRemaining] = useState<number>(0);
  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }
    const target = new Date(endsAt).getTime();
    const tick = () => setRemaining(Math.max(0, Math.round((target - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  return remaining;
}

export default function ResultsScreen() {
  const { question, loading } = useActiveQuestion();
  const { counts } = useVoteCounts(question?.id ?? null);
  const remaining = useCountdown(question?.status === "active" ? question.ended_at : null);

  const isEnded = question?.status === "ended" || (question?.status === "active" && remaining <= 0);
  const revealResults = isEnded; // 투표 중엔 숨김, 종료 후 공개 (기본 정책)

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-transparent">
        <p className="text-sage text-2xl animate-pulse">불러오는 중...</p>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="grain-overlay min-h-screen flex flex-col items-center justify-center bg-transparent">
        <BrandHeader large />
        <p className="text-sage text-2xl">진행자가 곧 첫 질문을 시작합니다</p>
      </main>
    );
  }

  const total = counts.total;
  const aPct = total > 0 ? Math.round((counts.a / total) * 100) : 0;
  const bPct = total > 0 ? 100 - aPct : 0;

  return (
    <main className="grain-overlay min-h-screen flex flex-col bg-transparent px-16 py-12 overflow-hidden">
      <div className="text-center mb-10">
        <BrandHeader />
        <p className="text-ivory text-4xl font-bold">
          {question.option_a_text} <span className="text-sage">VS</span> {question.option_b_text}
        </p>
      </div>

      {!revealResults ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <p className="font-display text-9xl text-gold text-glow">
            {String(Math.floor(remaining / 60)).padStart(2, "0")}:
            {String(remaining % 60).padStart(2, "0")}
          </p>
          <p className="text-sage text-3xl">투표가 진행 중입니다...</p>
          <p className="text-ivory/70 text-2xl">현재 {total}명 참여</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-10 items-center">
          <BigResult
            emoji={question.option_a_emoji}
            text={question.option_a_text}
            pct={aPct}
            votes={counts.a}
            color="text-optionA"
            barColor="bg-optionA"
            winner={aPct >= bPct}
          />
          <BigResult
            emoji={question.option_b_emoji}
            text={question.option_b_text}
            pct={bPct}
            votes={counts.b}
            color="text-optionB"
            barColor="bg-optionB"
            winner={bPct > aPct}
          />
        </div>
      )}

      <p className="text-center text-sage text-2xl mt-10">총 {total}명 참여</p>
    </main>
  );
}

function BigResult({
  emoji,
  text,
  pct,
  votes,
  color,
  barColor,
  winner,
}: {
  emoji: string | null;
  text: string;
  pct: number;
  votes: number;
  color: string;
  barColor: string;
  winner: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center animate-popIn ${winner ? "scale-105" : "opacity-90"}`}
    >
      {emoji && <span className="text-7xl mb-4">{emoji}</span>}
      <p className="text-ivory text-3xl font-bold mb-4 text-center">{text}</p>
      <p className={`font-display text-[9rem] leading-none ${color} text-glow`}>{pct}%</p>
      <div className="w-full h-8 bg-bg-soft rounded-full overflow-hidden mt-6">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sage text-2xl mt-3">{votes}표</p>
    </div>
  );
}
