"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Question } from "./types";

/**
 * 현재 진행 중(active)이거나 가장 최근에 시작된 질문을 실시간으로 추적한다.
 * questions 테이블 변경(INSERT/UPDATE)을 구독하여 상태 전환(draft->active->ended)에 즉시 반응한다.
 */
export function useActiveQuestion() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLatest() {
      const { data: session } = await supabase
        .from("sessions")
        .select("id")
        .eq("is_current", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!session) {
        if (!cancelled) {
          setQuestion(null);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase
        .from("questions")
        .select("*")
        .eq("session_id", session.id)
        .in("status", ["active", "ended"])
        .order("started_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setQuestion((data as Question) ?? null);
        setLoading(false);
      }
    }

    fetchLatest();

    const channel = supabase
      .channel("questions-watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions" },
        () => {
          fetchLatest();
        }
      )
      .subscribe();

    const pollBackup = setInterval(fetchLatest, 6000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(pollBackup);
    };
  }, []);

  return { question, loading };
}
