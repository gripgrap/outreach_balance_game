/**
 * File: lib/clientState.ts
 * 참가자 브라우저의 닉네임과 질문별 투표 여부를 로컬에 저장한다.
 */

"use client";

const TOKEN_KEY = "bg_client_token";
const NICKNAME_KEY = "bg_nickname";
const VOTED_PREFIX = "bg_voted_"; // bg_voted_<question_id> -> "<reset_version>:A|B"

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* localStorage unavailable (private mode etc.) — fail silently */
  }
}

/** 이 브라우저를 식별하는 임의 토큰. 최초 1회 생성 후 재사용. */
export function getClientToken(): string {
  let token = safeGet(TOKEN_KEY);
  if (!token) {
    token =
      "c_" +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36);
    safeSet(TOKEN_KEY, token);
  }
  return token;
}

export function getNickname(): string {
  return safeGet(NICKNAME_KEY) || "";
}

export function setNickname(nickname: string) {
  safeSet(NICKNAME_KEY, nickname);
}

/** 특정 질문에 이미 투표했는지 + 어떤 선택을 했는지 확인 (질문 단위로 저장, 세션 초기화 걱정 없음) */
export function getVotedChoice(questionId: string, resetVersion = 0): "A" | "B" | null {
  const v = safeGet(VOTED_PREFIX + questionId);
  if (v === "A" || v === "B") return resetVersion === 0 ? v : null;
  const [version, choice] = (v ?? "").split(":");
  return Number(version) === resetVersion && (choice === "A" || choice === "B")
    ? choice
    : null;
}

export function setVotedChoice(questionId: string, resetVersion: number, choice: "A" | "B") {
  safeSet(VOTED_PREFIX + questionId, `${resetVersion}:${choice}`);
}
