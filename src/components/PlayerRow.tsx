import React from 'react';

interface PlayerRowProps {
  player: {
    id: string;
    name: string;
    handicap: number;
  };
  isBanker: boolean;
  score: number | null;
  pressed: boolean;
  wager: number;
  onPress: (playerId: string) => void;
  onScoreChange: (playerId: string, score: number) => void;
  onSetBanker: (playerId: string) => void;
}

export default function PlayerRow({
  player,
  isBanker,
  score,
  pressed,
  wager,
  onPress,
  onScoreChange,
  onSetBanker
}: PlayerRowProps) {
  return (
    <div className="player-row">
      <div className="player-name">{player.name}</div>
      <div className="player-handicap">{player.handicap}</div>
      <div className="player-wager">{wager}</div>
      <div className="player-pressed">{pressed ? 'Pressed' : ''}</div>
      <div className="player-score">
        <input
          type="number"
          value={score ?? ''}
          onChange={(e) => onScoreChange(player.id, parseInt(e.target.value) || 0)}
        />
      </div>
      <button onClick={() => onSetBanker(player.id)} disabled={isBanker}>
        {isBanker ? 'Banker' : 'Set Banker'}
      </button>
      <button onClick={() => onPress(player.id)}>
        {pressed ? 'Pressed' : 'Press'}
      </button>
    </div>
  );
}
