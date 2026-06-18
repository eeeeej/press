

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
    <div className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm mb-1.5 w-full text-sm">
      <div className="flex-1 min-w-0 flex items-center space-x-2">
        <span className="font-medium text-gray-900 truncate">{player.name}</span>
        <div className="flex items-center space-x-1.5">
          {isBanker && (
            <span className="bg-amber-100 text-amber-800 text-[11px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap">
              Banker
            </span>
          )}
          {pressed && (
            <span className="bg-blue-100 text-blue-800 text-[11px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap">
              Pressed
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-1.5 ml-2">
        <span className="text-xs text-gray-500 w-8 text-right">{player.handicap}</span>
        <span className="text-sm font-medium text-green-600 w-10 text-right">${currentBetAmount}</span>
        
        <div className="relative">
          <input
            type="number"
            value={score || ''}
            onChange={(e) => onScoreChange(player.id, parseInt(e.target.value) || 0)}
            min="1"
            max="20"
            className="w-10 h-7 text-center text-sm font-medium border border-gray-300 rounded-sm focus:ring-1 focus:ring-emerald-500 focus:border-transparent px-0"
            inputMode="numeric"
            aria-label="Score input"
          />
        </div>
        
        <div className="flex space-x-1">
          <button 
            onClick={() => onSetBanker(player.id)} 
            disabled={isBanker}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
              isBanker 
                ? 'bg-amber-100 text-amber-700 cursor-default' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
            }`}
            aria-label={isBanker ? 'Current banker' : 'Set as banker'}
          >
            <span className="text-sm">👑</span>
          </button>
          
          <button 
            onClick={() => onPress(player.id)}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
              pressed 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
            }`}
            aria-label={pressed ? 'Pressed' : 'Press'}
          >
            <span className="text-sm">{pressed ? '✋' : '💵'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
