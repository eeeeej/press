import { Course, Game } from '../types';
import { supabase, SHARED_SCORECARDS_TABLE } from './supabase';

const SHARE_MAP_KEY = 'banker-live-share-map';

// Maps a local game id -> its public share id, so repeated updates to the same
// game keep syncing to the same shared row (and the link stays stable).
type ShareMap = { [gameId: string]: string };

function readShareMap(): ShareMap {
  try {
    const raw = window.localStorage.getItem(SHARE_MAP_KEY);
    return raw ? (JSON.parse(raw) as ShareMap) : {};
  } catch {
    return {};
  }
}

export function getShareId(gameId: string): string | null {
  return readShareMap()[gameId] ?? null;
}

export function rememberShareId(gameId: string, shareId: string): void {
  try {
    const map = readShareMap();
    map[gameId] = shareId;
    window.localStorage.setItem(SHARE_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore persistence errors
  }
}

function generateShareId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function buildShareUrl(shareId: string): string {
  return `${window.location.origin}/view/${shareId}`;
}

// Parses the current location for a live-view share id (/view/<id>).
export function getViewShareId(): string | null {
  const match = window.location.pathname.match(/^\/view\/([A-Za-z0-9]+)\/?$/);
  return match ? match[1] : null;
}

// Pushes the current game + course state to the shared row. Creates the share
// id on first call for a given game. Returns the share id, or null if live
// sharing is not configured.
export async function pushScorecard(game: Game, course: Course): Promise<string | null> {
  if (!supabase) return null;

  let shareId = getShareId(game.id);
  if (!shareId) {
    shareId = generateShareId();
  }

  const { error } = await supabase.from(SHARED_SCORECARDS_TABLE).upsert({
    id: shareId,
    game,
    course,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to push scorecard to live share:', error);
    return null;
  }

  rememberShareId(game.id, shareId);
  return shareId;
}

export interface SharedScorecard {
  game: Game;
  course: Course;
  updatedAt: string | null;
}

export async function fetchScorecard(shareId: string): Promise<SharedScorecard | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(SHARED_SCORECARDS_TABLE)
    .select('game, course, updated_at')
    .eq('id', shareId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Failed to fetch shared scorecard:', error);
    return null;
  }
  return { game: data.game as Game, course: data.course as Course, updatedAt: data.updated_at as string | null };
}

// Subscribes to realtime updates for a shared scorecard. Returns an unsubscribe
// function. The callback fires whenever the row changes.
export function subscribeScorecard(
  shareId: string,
  onChange: (row: SharedScorecard) => void
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`shared_scorecards:${shareId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: SHARED_SCORECARDS_TABLE,
        filter: `id=eq.${shareId}`,
      },
      (payload) => {
        const row = payload.new as { game: Game; course: Course; updated_at: string | null };
        if (row && row.game && row.course) {
          onChange({ game: row.game, course: row.course, updatedAt: row.updated_at });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
