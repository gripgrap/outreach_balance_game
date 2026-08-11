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

create or replace function public.get_vote_counts(target_question_id uuid)
returns table(a bigint, b bigint, total bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    count(*) filter (where choice = 'A') as a,
    count(*) filter (where choice = 'B') as b,
    count(*) as total
  from votes
  where question_id = target_question_id;
$$;

revoke all on function public.get_vote_counts(uuid) from public;
grant execute on function public.get_vote_counts(uuid) to anon, authenticated;
