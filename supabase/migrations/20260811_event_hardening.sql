-- File: supabase/migrations/20260811_event_hardening.sql - 기존 프로젝트에 행사 안정성·보안 수정을 적용한다.
-- 기존 Supabase 프로젝트에 행사 안정성/보안 수정 적용
-- Supabase Dashboard > SQL Editor에서 한 번 실행하세요.

alter table questions
  add column if not exists reset_version int not null default 0;

create unique index if not exists uq_sessions_one_current
  on sessions ((is_current)) where is_current = true;

drop policy if exists "public read participants" on participants;
drop policy if exists "public read votes" on votes;
drop policy if exists "public insert votes" on votes;
drop policy if exists "public insert participants" on participants;

drop function if exists public.get_vote_counts(uuid);
