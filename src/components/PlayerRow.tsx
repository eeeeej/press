

interface PlayerRowProps {
  player: {
    id: string;
    name: string;
    handicap: number;
  };
  isBanker: boolean;
  score: number | null;
  pressed: boolean;
  wager: number;  // This is the initial wager amount
  onPress: (playerId: string) => void;
  onScoreChange: (playerId: string, score: number) => void;
  onSetBanker: (playerId: string) => void;
}

export default function PlayerRow({
  player,
  isBanker,
  score,
  pressed,
  wager,  // Initial wager amount
  onPress,
  onScoreChange,
  onSetBanker
}: PlayerRowProps) {
  // Calculate the current bet amount based on press state
  const currentBetAmount = pressed ? wager * 2 : wager;
  return (
    <div className="player-row">
      <div className="player-name">
        {player.name}
        {isBanker && <span className="banker-badge">(Banker)</span>}
      </div>
      <div className="player-handicap">{player.handicap}</div>
      <div className="player-wager">
        ${currentBetAmount}
        {pressed && <span className="pressed-indicator">(Pressed)</span>}
      </div>
      <div className="player-score">
        <input
          type="number"
          value={score || ''}
          onChange={(e) => onScoreChange(player.id, parseInt(e.target.value) || 0)}
          min="1"
          max="20"
          className="score-input"
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
