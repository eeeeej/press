import { useEffect, useState } from 'react';
import { Loader2, Radio, AlertCircle } from 'lucide-react';
import { Game, Course, GameSummary } from '../types';
import { fetchScorecard, subscribeScorecard } from '../lib/liveShare';
import { isLiveShareEnabled } from '../lib/supabase';
import ScoreCard from './ScoreCard';

interface LiveScoreCardViewProps {
  shareId: string;
}

function computeSummaries(game: Game): GameSummary[] {
  const summaries: { [playerId: string]: GameSummary } = {};
  game.players.forEach((player) => {
    summaries[player.id] = { playerId: player.id, totalWinnings: 0, holesWon: 0, holesLost: 0 };
  });
  game.holeScores.forEach((holeScore) => {
    holeScore.matches.forEach((match) => {
      if (match.result > 0) {
        summaries[match.bankerId].totalWinnings += match.result;
        summaries[match.bankerId].holesWon += 1;
        summaries[match.playerId].totalWinnings -= match.result;
        summaries[match.playerId].holesLost += 1;
      } else if (match.result < 0) {
        summaries[match.playerId].totalWinnings += Math.abs(match.result);
        summaries[match.playerId].holesWon += 1;
        summaries[match.bankerId].totalWinnings -= Math.abs(match.result);
        summaries[match.bankerId].holesLost += 1;
      }
    });
  });
  return Object.values(summaries);
}

export default function LiveScoreCardView({ shareId }: LiveScoreCardViewProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound' | 'disabled'>('loading');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (!isLiveShareEnabled) {
      setStatus('disabled');
      return;
    }

    let cancelled = false;

    fetchScorecard(shareId).then((row) => {
      if (cancelled) return;
      if (!row) {
        setStatus('notfound');
        return;
      }
      setGame(row.game);
      setCourse(row.course);
      setLastUpdated(row.updatedAt);
      setStatus('ready');
    });

    const unsubscribe = subscribeScorecard(shareId, (row) => {
      if (cancelled) return;
      setGame(row.game);
      setCourse(row.course);
      setLastUpdated(row.updatedAt);
      setStatus('ready');
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [shareId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-600">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p>Loading live scorecard…</p>
      </div>
    );
  }

  if (status === 'disabled' || status === 'notfound') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6 text-center">
        <AlertCircle className="w-10 h-10 text-gray-400 mb-3" />
        <h1 className="text-lg font-bold text-gray-800 mb-1">Scorecard unavailable</h1>
        <p className="text-gray-600 max-w-sm">
          {status === 'disabled'
            ? 'Live sharing is not configured for this site.'
            : "This live scorecard link is invalid or hasn't been shared yet."}
        </p>
      </div>
    );
  }

  if (!game || !course) return null;

  const summaries = computeSummaries(game);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-center mb-6 border-b pb-4">
            <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-semibold uppercase tracking-wide mb-1">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Live{game.status === 'completed' ? ' · Final' : ''}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">{course.name}</h1>
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <div>Holes: {game.holeScores.length} / {course.holes.length}</div>
              <div>Players: {game.players.length}</div>
              <div>Game Type: {game.gameType}</div>
            </div>
          </div>

          <ScoreCard game={game} course={course} summaries={summaries} showHeader={true} readOnly={true} />

          {lastUpdated && (
            <p className="text-center text-xs text-gray-400 mt-4">
              Updates automatically · last change {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
