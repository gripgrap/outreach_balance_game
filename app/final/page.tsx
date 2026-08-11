"use client";

import { useEffect, useState, useCallback } from "react";
import { BrandHeader } from "@/components/BrandHeader";

interface QuestionResult {
  id: string;
  option_a_text: string;
  option_a_emoji: string | null;
  option_b_text: string;
  option_b_emoji: string | null;
  counts: { a: number; b: number; total: number };
  aPct: number;
  bPct: number;
  gap: number;
}

interface FinalData {
  session: { title: string } | null;
  questions: QuestionResult[];
  totalParticipants: number;
  mostLopsided: QuestionResult | null;
  closest: QuestionResult | null;
}

export default function FinalDashboard() {
  const [data, setData] = useState<FinalData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [slide, setSlide] = useState(0); // 0 = intro, 1..n = questions, n+1 = highlights, n+2 = summary

  useEffect(() => {
    fetch("/api/final")
      .then((r) => {
        if (!r.ok) throw new Error("final results request failed");
        return r.json();
      })
      .then(setData)
      .catch(() => setLoadError(true));
  }, []);

  const totalSlides = data ? data.questions.length + 3 : 1; // intro + questions + highlights + summary

  const next = useCallback(() => setSlide((s) => Math.min(s + 1, totalSlides - 1)), [totalSlides]);
  const prev = useCallback(() => setSlide((s) => Math.max(s - 1, 0)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  if (loadError) {
    return (
      <main className="grain-overlay min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <BrandHeader large />
        <p className="text-ivory text-2xl mt-8">결과를 불러오지 못했습니다</p>
        <p className="text-sage mt-3">잠시 후 화면을 새로고침해주세요</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-transparent">
        <p className="text-sage text-2xl animate-pulse">불러오는 중...</p>
      </main>
    );
  }

  if (!data.session) {
    return (
      <main className="grain-overlay min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <BrandHeader large />
        <p className="font-display text-5xl text-gold text-glow mt-8">FINAL RESULTS</p>
        <p className="text-ivory text-2xl mt-8">아직 집계할 결과가 없습니다</p>
        <p className="text-sage mt-3">세션이 시작되면 이 화면에 결과가 표시됩니다</p>
      </main>
    );
  }

  const questionIndex = slide - 1; // 1-based slides map to question array

  return (
    <main
      className="grain-overlay min-h-screen bg-transparent overflow-hidden relative flex flex-col items-center justify-center px-16 py-12 cursor-pointer select-none"
      onClick={next}
    >
      {/* 인트로 */}
      {slide === 0 && (
        <div className="text-center animate-fadeUp">
          <BrandHeader large />
          <p className="font-display text-7xl text-gold text-glow mb-8">FINAL RESULTS</p>
          <p className="text-ivory text-2xl">오늘 우리는 이렇게 선택했습니다</p>
        </div>
      )}

      {/* 질문별 결과 */}
      {questionIndex >= 0 && questionIndex < data.questions.length && (
        <QuestionSlide q={data.questions[questionIndex]} index={questionIndex} />
      )}

      {/* 하이라이트 */}
      {slide === data.questions.length + 1 && (
        <div className="w-full max-w-4xl flex flex-col gap-14 animate-fadeUp">
          {data.mostLopsided && (
            <HighlightCard
              emoji="🔥"
              label="가장 압도적인 선택"
              question={data.mostLopsided}
            />
          )}
          {data.closest && (
            <HighlightCard emoji="⚡" label="가장 팽팽했던 선택" question={data.closest} />
          )}
        </div>
      )}

      {/* 마무리 요약 */}
      {slide === data.questions.length + 2 && (
        <div className="text-center animate-fadeUp">
          <p className="font-display text-2xl text-sage tracking-[0.3em] mb-8">
            오늘의 밸런스는...
          </p>
          <div className="flex gap-16 justify-center mb-10">
            <div>
              <p className="font-display text-7xl text-gold text-glow">
                {data.questions.length}
              </p>
              <p className="text-ivory text-xl mt-2">개의 질문</p>
            </div>
            <div>
              <p className="font-display text-7xl text-gold text-glow">
                {data.totalParticipants}
              </p>
              <p className="text-ivory text-xl mt-2">명 참여</p>
            </div>
          </div>
          <p className="text-sage text-lg">함께해줘서 고마워요 🌿</p>
        </div>
      )}

      {/* 진행 인디케이터 */}
      <div className="absolute bottom-8 flex gap-2">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === slide ? "w-8 bg-gold" : "w-1.5 bg-sage/40"
            }`}
          />
        ))}
      </div>
    </main>
  );
}

function QuestionSlide({ q, index }: { q: QuestionResult; index: number }) {
  return (
    <div className="w-full max-w-4xl text-center animate-fadeUp">
      <p className="text-sage text-xl mb-8">Q{index + 1}.</p>
      <p className="text-ivory text-3xl font-bold mb-10">
        {q.option_a_emoji} {q.option_a_text}{" "}
        <span className="text-sage font-normal">VS</span> {q.option_b_emoji} {q.option_b_text}
      </p>
      <div className="flex justify-center items-end gap-20">
        <div className="flex flex-col items-center animate-popIn">
          <p className="font-display text-8xl text-optionA text-glow">{q.aPct}%</p>
          <p className="text-ivory text-lg mt-3">
            {q.option_a_emoji} {q.option_a_text}
          </p>
        </div>
        <div
          className="flex flex-col items-center animate-popIn"
          style={{ animationDelay: "0.15s" }}
        >
          <p className="font-display text-8xl text-optionB text-glow">{q.bPct}%</p>
          <p className="text-ivory text-lg mt-3">
            {q.option_b_emoji} {q.option_b_text}
          </p>
        </div>
      </div>
      <p className="text-sage text-base mt-10">{q.counts.total}명 참여</p>
    </div>
  );
}

function HighlightCard({
  emoji,
  label,
  question,
}: {
  emoji: string;
  label: string;
  question: QuestionResult;
}) {
  return (
    <div className="text-center">
      <p className="text-2xl mb-2">
        {emoji} <span className="text-gold font-bold">{label}</span>
      </p>
      <p className="text-ivory text-2xl font-bold mb-3">
        &ldquo;{question.option_a_text} VS {question.option_b_text}&rdquo;
      </p>
      <p className="font-display text-4xl text-ivory">
        {question.aPct}% <span className="text-sage text-2xl">VS</span> {question.bPct}%
      </p>
    </div>
  );
}
