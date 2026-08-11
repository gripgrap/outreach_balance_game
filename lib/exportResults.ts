/**
 * File: lib/exportResults.ts
 * 관리자 화면에서 질문별 최종 결과를 복사용 문장과 Excel 호환 CSV로 변환한다.
 */

import type { QuestionWithResults, Session } from "./types";

function percent(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function statusLabel(status: string) {
  return { draft: "대기", active: "진행 중", ended: "종료" }[status] ?? status;
}

function winnerLabel(question: QuestionWithResults) {
  if (question.counts.total === 0) return "투표 없음";
  if (question.counts.a === question.counts.b) return "동률";
  return question.counts.a > question.counts.b ? "A 선택" : "B 선택";
}

function spreadsheetSafe(value: string | number) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildResultCopyText(session: Session, questions: QuestionWithResults[]) {
  const lines = [`[${session.title}] 밸런스 게임 최종 결과`, ""];

  questions.forEach((question, index) => {
    const { a, b, total } = question.counts;
    lines.push(`${index + 1}. ${question.option_a_text} VS ${question.option_b_text}`);
    lines.push(
      `A ${a}표 (${percent(a, total).toFixed(1)}%) / B ${b}표 (${percent(b, total).toFixed(1)}%) / 총 ${total}명`
    );
    lines.push(`결과: ${winnerLabel(question)}`, "");
  });

  return lines.join("\n").trim();
}

export function buildResultCsv(session: Session, questions: QuestionWithResults[]) {
  const header = [
    "행사명",
    "순번",
    "상태",
    "A 선택지",
    "B 선택지",
    "A 표",
    "B 표",
    "총 투표",
    "A 비율(%)",
    "B 비율(%)",
    "결과",
  ];

  const rows = questions.map((question, index) => {
    const { a, b, total } = question.counts;
    return [
      session.title,
      index + 1,
      statusLabel(question.status),
      question.option_a_text,
      question.option_b_text,
      a,
      b,
      total,
      percent(a, total).toFixed(1),
      percent(b, total).toFixed(1),
      winnerLabel(question),
    ];
  });

  return `\uFEFF${[header, ...rows]
    .map((row) => row.map(spreadsheetSafe).join(","))
    .join("\r\n")}`;
}

export function resultFilename(session: Session) {
  const safeTitle = session.title
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 50);
  const date = new Date().toISOString().slice(0, 10);
  return `${safeTitle || "balance-game"}-results-${date}.csv`;
}
