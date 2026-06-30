import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// The live-share feature is optional: if the Supabase env vars are not
// configured, `supabase` is null and the app falls back to local-only behavior.
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isLiveShareEnabled = supabase !== null;

export const SHARED_SCORECARDS_TABLE = 'shared_scorecards';
