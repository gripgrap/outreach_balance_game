export type QuestionStatus = "draft" | "active" | "ended";

export interface Session {
  id: string;
  title: string;
  is_current: boolean;
  is_test: boolean;
  created_at: string;
}

export interface Question {
  id: string;
  session_id: string;
  order_index: number;
  option_a_text: string;
  option_a_emoji: string | null;
  option_b_text: string;
  option_b_emoji: string | null;
  status: QuestionStatus;
  time_limit_sec: number;
  started_at: string | null;
  ended_at: string | null;
  reset_version: number;
  created_at: string;
}

export interface Vote {
  id: string;
  question_id: string;
  choice: "A" | "B";
  nickname: string | null;
  client_token: string;
  created_at: string;
}

export interface VoteCounts {
  a: number;
  b: number;
  total: number;
}

export interface QuestionWithResults extends Question {
  counts: VoteCounts;
}
