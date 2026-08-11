"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Question } from "./types";

const FALLBACK_POLL_MS = 6000;

function isQuestion(value: unknown): value is Question {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Question>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.session_id === "string" &&
    ["draft", "active", "ended"].includes(candidate.status ?? "")
  );
}

/**
 * Realtime 이벤트의 행 데이터를 바로 반영한다.
 * Realtime 장애 중에만 6초 폴링을 사용해 대규모 동시 접속에서
 * 질문 전환마다 모든 브라우저가 DB를 다시 조회하는 부하를 피한다.
 */
export function useActiveQuestion() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let currentSessionId: string | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let fetchSequence = 0;

    async function fetchLatest() {
      const sequence = ++fetchSequence;
      const { data: session } = await supabase
        .from("sessions")
        .select("id")
        .eq("is_current", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || sequence !== fetchSequence) return;

      if (!session) {
        currentSessionId = null;
        setQuestion(null);
        setLoading(false);
        return;
      }

      currentSessionId = session.id;
      const { data } = await supabase
        .from("questions")
        .select("*")
        .eq("session_id", session.id)
        .in("status", ["active", "ended"])
        .order("started_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || sequence !== fetchSequence) return;
      setQuestion((data as Question) ?? null);
      setLoading(false);
    }

    function startFallbackPolling() {
      if (pollTimer) return;
      pollTimer = setInterval(() => void fetchLatest(), FALLBACK_POLL_MS);
    }

    function stopFallbackPolling() {
      if (!pollTimer) return;
      clearInterval(pollTimer);
      pollTimer = null;
    }

    void fetchLatest();
    startFallbackPolling();

    const channel = supabase
      .channel("game-state-watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => void fetchLatest()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            void fetchLatest();
            return;
          }

          if (!isQuestion(payload.new)) {
            void fetchLatest();
            return;
          }

          const changed = payload.new;
          if (!currentSessionId) {
            void fetchLatest();
            return;
          }
          if (changed.session_id !== currentSessionId) return;

          setQuestion((current) => {
            if (changed.status === "active") return changed;
            if (current?.id === changed.id) {
              return changed.status === "ended" ? changed : null;
            }
            return current;
          });
          setLoading(false);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          stopFallbackPolling();
          return;
        }
        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          void fetchLatest();
          startFallbackPolling();
        }
      });

    return () => {
      cancelled = true;
      stopFallbackPolling();
      void supabase.removeChannel(channel);
    };
  }, []);

  return { question, loading };
}
