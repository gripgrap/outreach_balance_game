/**
 * File: lib/supabaseAdmin.ts
 * 서버 전용 비밀 키로 관리자 Supabase 클라이언트를 생성한다.
 */

import { createClient } from "@supabase/supabase-js";

// 이 파일은 서버(Route Handler)에서만 import 해야 한다.
// SUPABASE_SERVICE_ROLE_KEY는 절대 클라이언트로 노출되면 안 되므로
// NEXT_PUBLIC_ 접두사를 붙이지 않은 환경변수로만 사용한다.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다."
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
