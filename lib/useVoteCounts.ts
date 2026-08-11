"use client";

import { useEffect, useRef, useState } from "react";
import type { VoteCounts } from "./types";

/**
 * 특정 질문의 A/B 득표수를 실시간으로 추적한다.
 * 원본 votes 행은 공개하지 않고 서버 집계 API만 호출한다.
 * 행사 중 INSERT/DELETE/초기화가 모두 확실히 반영되도록 3초마다 재조회한다.
 */
export function useVoteCounts(questionId: string | null): {
  counts: VoteCounts;
  isLive: boolean;
} {
  const [counts, setCounts] = useState<VoteCounts>({ a: 0, b: 0, total: 0 });
  const [isLive, setIsLive] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!questionId) {
      setCounts({ a: 0, b: 0, total: 0 });
      return;
    }

    const activeQuestionId = questionId;
    let cancelled = false;

    async function fetchCounts() {
      const response = await fetch(
        `/api/counts?question_id=${encodeURIComponent(activeQuestionId)}`,
        { cache: "no-store" }
      );
      if (cancelled) return;
      if (!response.ok) {
        setIsLive(false);
        return;
      }
      const data = (await response.json()) as VoteCounts;
      setCounts({
        a: Number(data.a ?? 0),
        b: Number(data.b ?? 0),
        total: Number(data.total ?? 0),
      });
      setIsLive(true);
    }

    fetchCounts();

    pollRef.current = setInterval(fetchCounts, 3000);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [questionId]);

  return { counts, isLive };
}
