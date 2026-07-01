import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Normalizes the configured project URL. `supabase-js` expects the base URL
// (e.g. https://xyz.supabase.co) and appends its own paths, so a value that
// includes the REST path (…/rest/v1) or a trailing slash would break every
// request. We strip those so a common misconfiguration still works.
function normalizeSupabaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/, '')
    .replace(/\/+$/, '');
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabaseUrl = rawUrl ? normalizeSupabaseUrl(rawUrl) : undefined;

// The anon (publishable) key is meant to be public and is protected by RLS.
// A secret key must never ship to the browser — it bypasses RLS and would be
// exposed in the bundle. Warn loudly if one is configured by mistake.
if (supabaseAnonKey?.startsWith('sb_secret_')) {
  console.error(
    'VITE_SUPABASE_ANON_KEY looks like a Supabase SECRET key. Use the ' +
      'publishable (anon) key instead — a secret key exposed in the browser ' +
      'lets anyone bypass row-level security.'
  );
}

// The live-share feature is optional: if the Supabase env vars are not
// configured, `supabase` is null and the app falls back to local-only behavior.
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isLiveShareEnabled = supabase !== null;

export const SHARED_SCORECARDS_TABLE = 'shared_scorecards';
