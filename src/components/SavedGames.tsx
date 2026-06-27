import { useState, useEffect } from 'react';
import { useGamePersistence, SavedGame } from '../hooks/useGamePersistence';
import { Clock, CheckCircle, Trash2, ArrowLeft, Plus } from 'lucide-react';

interface SavedGamesProps {
  onResumeGame: (gameId: string) => void;
  onDeleteGame: (gameId: string) => void;
  onBack: () => void;
  onNewGame: () => void;
}

export default function SavedGames({ onResumeGame, onDeleteGame, onBack, onNewGame }: SavedGamesProps) {
  const { getSavedGames, getInProgressGames, getCompletedGames } = useGamePersistence();
  const [refreshKey, setRefreshKey] = useState(0);
  const [inProgressGames, setInProgressGames] = useState<SavedGame[]>([]);
  const [completedGames, setCompletedGames] = useState<SavedGame[]>([]);
  const [allGames, setAllGames] = useState<SavedGame[]>([]);

  const refreshGames = () => {
    setInProgressGames(getInProgressGames());
    setCompletedGames(getCompletedGames());
    setAllGames(getSavedGames());
  };

  useEffect(() => {
    refreshGames();
  }, [refreshKey]);

  const handleDeleteGame = (gameId: string) => {
    onDeleteGame(gameId);
    setRefreshKey(prev => prev + 1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const GameCard = ({ game }: { game: SavedGame }) => (
    <div className="bg-white rounded-xl shadow-md p-4 mb-3 border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-gray-900">{game.courseName || 'Unknown Course'}</h3>
            {game.status === 'completed' ? (
              <span className="flex items-center space-x-1 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" />
                <span>Completed</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" />
                <span>In Progress</span>
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex items-center space-x-4">
              <span>Players: {game.players.length}</span>
              <span>Hole: {game.currentHole}</span>
            </div>
            <div className="text-xs text-gray-500">
              Last updated: {formatDate(game.updatedAt || game.createdAt.toString())}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => onResumeGame(game.id)}
            className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {game.status === 'completed' ? 'View' : 'Resume'}
          </button>
          <button
            onClick={() => handleDeleteGame(game.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete game"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            <h1 className="text-lg font-bold text-gray-900">Saved Games</h1>
            <div className="w-20" /> {/* Spacer */}
          </div>
          
          <button
            onClick={onNewGame}
            className="w-full flex items-center justify-center space-x-2 bg-emerald-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Start New Game</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="max-w-lg mx-auto">
          {allGames.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <div className="text-gray-400 mb-4">
                <Clock className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved games</h3>
              <p className="text-gray-600 mb-4">Start a new game to get started!</p>
              <button
                onClick={onNewGame}
                className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Start New Game
              </button>
            </div>
          ) : (
            <>
              {inProgressGames.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    In Progress ({inProgressGames.length})
                  </h2>
                  {inProgressGames.map(game => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              )}
              
              {completedGames.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    Completed ({completedGames.length})
                  </h2>
                  {completedGames.map(game => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
