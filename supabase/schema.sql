-- ============================================================
-- 청년 수련회 A/B 밸런스 게임 — Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에서 전체 실행하세요.
-- ============================================================

create extension if not exists "pgcrypto";

-- 세션(테스트 세션 / 실제 세션 구분)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null default '수련회 밸런스 게임',
  is_current boolean not null default false,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_sessions_one_current
  on sessions ((is_current)) where is_current = true;

-- 질문(밸런스 게임 문항)
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  order_index int not null default 0,
  option_a_text text not null,
  option_a_emoji text,
  option_b_text text not null,
  option_b_emoji text,
  status text not null default 'draft' check (status in ('draft','active','ended')),
  time_limit_sec int not null default 30,
  started_at timestamptz,
  ended_at timestamptz,
  reset_version int not null default 0,
  created_at timestamptz not null default now()
);

-- 기존 설치본을 다시 실행해도 초기화 버전 컬럼이 추가되도록 한다.
alter table questions add column if not exists reset_version int not null default 0;

create index if not exists idx_questions_session on questions(session_id);
create index if not exists idx_questions_status on questions(status);

-- 참가자(닉네임, 선택 기능)
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  nickname text not null,
  client_token text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_participants_session on participants(session_id);

-- 투표
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  choice text not null check (choice in ('A','B')),
  nickname text,
  client_token text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_votes_question on votes(question_id);
-- 같은 브라우저(client_token)는 같은 질문에 한 번만 투표 가능 (서버 측 이중 안전장치)
create unique index if not exists uq_votes_question_client on votes(question_id, client_token);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table sessions enable row level security;
alter table questions enable row level security;
alter table participants enable row level security;
alter table votes enable row level security;

-- 참가자/결과화면: 전체 읽기 허용 (로그인 없는 공개 서비스이므로)
create policy "public read sessions" on sessions for select using (true);
create policy "public read questions" on questions for select using (true);
drop policy if exists "public read participants" on participants;
drop policy if exists "public read votes" on votes;

-- 투표 쓰기는 검증 로직이 있는 /api/vote 서버 라우트로만 허용한다.
drop policy if exists "public insert votes" on votes;
drop policy if exists "public insert participants" on participants;

-- 득표 집계는 service-role을 사용하는 /api/counts 서버 라우트에서 수행한다.
drop function if exists public.get_vote_counts(uuid);

-- 프로젝트 생성 시 만들어진 RLS 자동 활성화 함수는 트리거 내부에서만 사용하며
-- Data API 역할이 직접 실행할 필요가 없다.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;

-- sessions/questions 의 write(관리자 기능)는 anon key로 직접 열지 않고
-- 아래 "관리자 전용" 정책을 사용한다. anon 사용자는 write 불가 (정책 없음 = 기본 거부).
-- 관리자 화면은 SUPABASE_SERVICE_ROLE_KEY를 사용하는 서버 라우트(app/api/admin/*)를 통해서만
-- write 하도록 구현되어 있으므로, RLS insert/update/delete 정책을 별도로 추가하지 않는다.
-- ============================================================
