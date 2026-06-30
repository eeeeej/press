// Utilities for parsing a GHIN "Handicap Calculator" snapshot (screenshot/photo)
// into a list of players. The expected layout (per golfer) is:
//
//   Eric Johnson                 White
//   H.I.      C.H.      P.H.      S.O.
//   8.9       10        10        0
//
// We extract the player's name and the Course Handicap (the value under the
// "C.H." heading). OCR output is noisy, so the parser is intentionally lenient
// and the caller is expected to let the user review/edit the result.

export interface ParsedGhinPlayer {
  name: string;
  handicap: number;
}

// Tee names that may trail a player's name on the GHIN calculator row.
const TEE_WORDS = new Set([
  'white',
  'blue',
  'black',
  'red',
  'gold',
  'green',
  'silver',
  'yellow',
  'orange',
  'purple',
  'gray',
  'grey',
  'combo',
  'tips',
  'championship',
  'senior',
  'forward',
  'middle',
  'back',
]);

// The stat column headings shown on a GHIN row, normalized (dots/spaces removed).
const STAT_LABELS = new Set(['hi', 'ch', 'ph', 'so', 'wd']);

const normalizeLabel = (token: string): string =>
  token.toLowerCase().replace(/[^a-z]/g, '');

const isStatLabelToken = (token: string): boolean =>
  STAT_LABELS.has(normalizeLabel(token));

// A heading line is one made up (mostly) of stat-label tokens, e.g. "H.I. C.H. P.H. S.O.".
const splitHeadingLabels = (line: string): string[] | null => {
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const labels = tokens.map(normalizeLabel).filter((t) => t.length > 0);
  if (labels.length === 0) return null;
  const matches = labels.filter((t) => STAT_LABELS.has(t)).length;
  // Treat as a heading line when the majority of tokens are known stat labels
  // and the C.H. column is present.
  if (matches >= 2 && matches >= labels.length - 1 && labels.includes('ch')) {
    return labels;
  }
  return null;
};

// Parse a handicap token into a number. Plus handicaps ("+2") are better than
// scratch and are represented as negative values, matching golf convention.
const parseHandicapToken = (raw: string): number | null => {
  const cleaned = raw.replace(/[^0-9+]/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('+')) {
    const n = parseInt(cleaned.slice(1), 10);
    return Number.isFinite(n) ? -n : null;
  }
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
};

// Extract numeric tokens (course handicaps are whole numbers, possibly "+N").
const extractValueTokens = (line: string): string[] =>
  line.split(/\s+/).filter((t) => /^\+?\d+$/.test(t.replace(/[^0-9+]/g, '')) && /\d/.test(t));

const isValuesLine = (line: string): boolean => {
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const numeric = tokens.filter((t) => /\d/.test(t) && /^\+?[\d.]+$/.test(t));
  return numeric.length >= 2 && numeric.length >= tokens.length - 1;
};

// Clean a candidate name line: strip trailing tee name, dropdown artifacts, and
// stray punctuation while keeping the golfer's name (incl. "Last, First").
const cleanNameLine = (line: string): string => {
  let tokens = line.split(/\s+/).filter(Boolean);
  // Drop tee color tokens (usually the last token, possibly followed by a chevron).
  tokens = tokens.filter((t) => !TEE_WORDS.has(t.toLowerCase().replace(/[^a-z]/g, '')));
  const cleaned = tokens
    .join(' ')
    .replace(/[^A-Za-z',.\- ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
};

// A name line should contain alphabetic content and not be a heading/values line.
const looksLikeName = (line: string): boolean => {
  if (splitHeadingLabels(line)) return false;
  const letters = (line.match(/[A-Za-z]/g) || []).length;
  if (letters < 2) return false;
  const cleaned = cleanNameLine(line);
  if (!cleaned) return false;
  // Reject lines that are just a stat label or a single tee word.
  if (isStatLabelToken(cleaned)) return false;
  return /[A-Za-z]{2,}/.test(cleaned);
};

// Lines that are part of the page chrome rather than golfer data.
const isChromeLine = (line: string): boolean => {
  const l = line.toLowerCase();
  return (
    l.includes('handicap calculator') ||
    l.includes('handicap allowance') ||
    l.includes('add golfer') ||
    l.includes('remove all') ||
    l.includes('play with') ||
    /\b\d{1,3}%/.test(l)
  );
};

/**
 * Parse OCR text from a GHIN Handicap Calculator snapshot into players.
 * Names are paired with the value under the "C.H." (Course Handicap) heading.
 */
export function parseGhinSnapshot(rawText: string): ParsedGhinPlayer[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/\u00a0/g, ' ').trim())
    .filter((l) => l.length > 0 && !isChromeLine(l));

  const players: ParsedGhinPlayer[] = [];
  let pendingName: string | null = null;
  let chIndex: number | null = null;

  for (const line of lines) {
    const headingLabels = splitHeadingLabels(line);
    if (headingLabels) {
      chIndex = headingLabels.indexOf('ch');
      continue;
    }

    if (isValuesLine(line) && pendingName) {
      const values = extractValueTokens(line);
      if (values.length > 0) {
        const idx = chIndex !== null && chIndex >= 0 && chIndex < values.length ? chIndex : Math.min(1, values.length - 1);
        const handicap = parseHandicapToken(values[idx]);
        if (handicap !== null) {
          players.push({ name: pendingName, handicap });
        }
      }
      pendingName = null;
      chIndex = null;
      continue;
    }

    if (looksLikeName(line)) {
      pendingName = cleanNameLine(line);
    }
  }

  return players;
}

// Derive a short display name from a full name ("Last, First" or "First Last").
export function deriveDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  if (trimmed.includes(',')) {
    const first = trimmed.split(',')[1]?.trim().split(/\s+/)[0];
    if (first) return first;
  }
  return trimmed.split(/\s+/)[0];
}
