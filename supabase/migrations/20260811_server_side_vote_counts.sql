-- File: supabase/migrations/20260811_server_side_vote_counts.sql - 공개 집계 RPC를 서버 전용 API 방식으로 전환한다.
-- 공개 SECURITY DEFINER 집계 RPC를 서버 전용 집계 API로 대체한다.
drop function if exists public.get_vote_counts(uuid);

-- 자동 RLS 이벤트 트리거는 함수 소유자 권한으로 계속 동작한다.
-- 브라우저 역할의 직접 RPC 실행 권한만 제거한다.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
