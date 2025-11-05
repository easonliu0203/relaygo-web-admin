// src/lib/database.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 在後台 API route 用，不需要持久化 session
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

// 需要時可匯出型別
export type SupabaseClient = typeof supabase;