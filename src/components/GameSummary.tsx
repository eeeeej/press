import { Game, Course, GameSummary } from '../types';
import { Trophy, TrendingUp, TrendingDown, RotateCcw, DollarSign } from 'lucide-react';

interface GameSummaryProps {
  game: Game;
  course: Course;
  onNewGame: () => void;
}

export default function GameSummaryComponent({ game, course, onNewGame }: GameSummaryProps) {
  const calculateGameSummary = (): GameSummary[] => {
    const summaries: { [playerId: string]: GameSummary } = {};

    // Initialize summaries
    game.players.forEach(player => {
      summaries[player.id] = {
        playerId: player.id,
        totalWinnings: 0,
        holesWon: 0,
        holesLost: 0
      };
    });

    // Calculate results from each hole
    game.holeScores.forEach(holeScore => {
      holeScore.matches.forEach(match => {
        if (match.result > 0) {
          // Banker wins
          summaries[match.bankerId].totalWinnings += match.result;
          summaries[match.bankerId].holesWon += 1;
          summaries[match.playerId].totalWinnings -= match.result;
          summaries[match.playerId].holesLost += 1;
        } else if (match.result < 0) {
          // Player wins
          summaries[match.playerId].totalWinnings += Math.abs(match.result);
          summaries[match.playerId].holesWon += 1;
          summaries[match.bankerId].totalWinnings -= Math.abs(match.result);
          summaries[match.bankerId].holesLost += 1;
        }
      });
    });

    return Object.values(summaries);
  };

  const summaries = calculateGameSummary();
  const sortedSummaries = summaries.sort((a, b) => b.totalWinnings - a.totalWinnings);
  
  // Sort players by their banker order from the game
  const sortedPlayers = [...game.players].sort((a, b) => {
    const aIndex = game.bankerOrder.indexOf(a.id);
    const bIndex = game.bankerOrder.indexOf(b.id);
    return aIndex - bIndex;
  });

  const getPlayerName = (playerId: string) => {
    return game.players.find(p => p.id === playerId)?.displayName || '';
  };

  const getTrophyIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Trophy className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Trophy className="w-6 h-6 text-amber-600" />;
    return null;
  };

  // Calculate total matches for the game
  const totalMatches = game.holeScores.reduce((sum, hole) => sum + hole.matches.length, 0);

  // Calculate hole-by-hole results for detailed view
  interface HoleResult {
    score: number;
    amount: number;
  }

  interface HoleResultData {
    holeNumber: number;
    bankerId: string;
    par: number;
    results: { [playerId: string]: HoleResult };
  }

  const getHoleResults = (): HoleResultData[] => {
    // Create an array for all 18 holes
    return Array.from({ length: 18 }, (_, i) => {
      const holeNumber = i + 1;
      const holeScore = game.holeScores.find(hs => hs.holeNumber === holeNumber);
      const holeResults: { [playerId: string]: HoleResult } = {};
      
      // Initialize all players with default values
      sortedPlayers.forEach(player => {
        const playerScore = holeScore?.playerScores.find(ps => ps.playerId === player.id);
        holeResults[player.id] = {
          score: playerScore?.score || 0,
          amount: 0
        };
      });
      
      // Calculate winnings/losses for this hole if it's been played
      if (holeScore) {
        holeScore.matches.forEach(match => {
          if (match.result > 0) {
            holeResults[match.bankerId].amount += match.result;
            holeResults[match.playerId].amount -= match.result;
          } else if (match.result < 0) {
            holeResults[match.playerId].amount += Math.abs(match.result);
            holeResults[match.bankerId].amount -= Math.abs(match.result);
          }
        });
      }
      
      return {
        holeNumber,
        bankerId: holeScore?.bankerId || sortedPlayers[0]?.id || '',
        par: course.holes.find(h => h.number === holeNumber)?.par || 0,
        results: holeResults
      };
    });
  };

  const holeResults = getHoleResults();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4">
          {/* Course Info Header */}
          <div className="text-center mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold text-gray-800">GOLF SCORECARD</h1>
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <div>Holes: {game.holeScores.length} / {course.holes.length}</div>
              <div>Players: {game.players.length}</div>
              <div>Game Type: {game.gameType}</div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Final Results</h2>
            {sortedSummaries.map((summary, index) => (
              <div
                key={summary.playerId}
                className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                  index === 0 
                    ? 'border-yellow-300 bg-yellow-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10">
                    {getTrophyIcon(index) || (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-600">{index + 1}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {getPlayerName(summary.playerId)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {summary.holesWon}W • {summary.holesLost}L
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold flex items-center ${
                    summary.totalWinnings > 0 
                      ? 'text-green-600' 
                      : summary.totalWinnings < 0 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                  }`}>
                    <DollarSign className="w-5 h-5" />
                    <span>{summary.totalWinnings > 0 ? '+' : ''}{summary.totalWinnings}</span>
                  </div>
                  <div className="flex items-center justify-end space-x-1 text-sm text-gray-500">
                    {summary.totalWinnings > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : summary.totalWinnings < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Scorecard */}
          <div className="mb-8 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="p-2 text-left w-32">Player (HCP)</th>
                  {/* Hole Numbers */}
                  {holeResults.map(hole => (
                    <th key={hole.holeNumber} className="p-2 text-center border-l border-gray-600 w-12">
                      <div>{hole.holeNumber}</div>
                      <div className="text-xs text-gray-300">{hole.par}</div>
                    </th>
                  ))}
                  <th className="p-2 text-center border-l-2 border-gray-600 w-16">Total</th>
                </tr>
              </thead>
              <tbody>
                {/* Player Rows */}
                {sortedPlayers.map(player => {
                  const totalScore = holeResults.reduce((sum, hole) => {
                    return sum + (hole.results[player.id]?.score || 0);
                  }, 0);
                  const totalPar = holeResults.reduce((sum, hole) => sum + hole.par, 0);
                  const relativeToPar = totalScore - totalPar;
                  
                  return (
                    <tr key={player.id} className="border-b border-gray-200 hover:bg-gray-50">
                      {/* Player Name and Handicap */}
                      <td className="p-2 font-medium">
                        <div className="flex items-center">
                          {player.displayName}
                          <span className="ml-2 text-xs text-gray-500">({player.handicap})</span>
                        </div>
                      </td>
                      
                      {/* Hole Scores */}
                      {holeResults.map(hole => {
                        const isBanker = hole.bankerId === player.id;
                        const score = hole.results[player.id]?.score || 0;
                        const relativeToHolePar = score - hole.par;
                        const amount = hole.results[player.id]?.amount || 0;
                        
                        return (
                          <td key={`${player.id}-${hole.holeNumber}`} className="p-1 border-l border-gray-100 relative h-16">
                            <div className={`relative h-full flex flex-col ${isBanker ? 'bg-yellow-50' : ''} rounded`}>
                              {/* Top row with amount */}
                              <div className="flex justify-end px-1 pt-1 min-h-[20px]">
                                {amount !== 0 && (
                                  <div className={`text-[10px] font-medium ${
                                    amount > 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {amount > 0 ? '+' : ''}{amount}
                                  </div>
                                )}
                              </div>
                              
                              {/* Score at the bottom */}
                              <div className="mt-auto">
                                <div className={`font-mono text-sm text-center ${
                                  relativeToHolePar < 0 ? 'text-blue-600' :
                                  relativeToHolePar > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {score}
                                </div>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      
                      {/* Total Column */}
                      <td className="p-2 text-center border-l-2 border-gray-200 font-medium">
                        {/* Total won/owed */}
                        <div className="flex justify-center mb-1">
                          {(() => {
                            const playerSummary = summaries.find(s => s.playerId === player.id);
                            const totalWon = playerSummary?.totalWinnings || 0;
                            if (totalWon === 0) return null;
                            return (
                              <div className={`text-xs font-medium ${
                                totalWon > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {totalWon > 0 ? '+' : ''}{totalWon}
                              </div>
                            );
                          })()}
                        </div>
                        {/* Total score */}
                        <div className="mt-auto">
                          <div className={`font-mono text-sm ${
                            relativeToPar < 0 ? 'text-blue-600' :
                            relativeToPar > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {totalScore} 
                            <span className="text-xs font-normal text-gray-600 ml-1">
                              ({relativeToPar > 0 ? '+' : ''}{relativeToPar === 0 ? 'E' : relativeToPar})
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                
                {/* Par Row */}
                <tr className="bg-gray-100 font-medium border-t-2 border-gray-300">
                  <td className="p-2 text-left">Par</td>
                  {holeResults.map(hole => (
                    <td key={`par-${hole.holeNumber}`} className="p-1 text-center border-l border-gray-200">
                      {hole.par}
                    </td>
                  ))}
                  <td className="p-2 text-center border-l-2 border-gray-300">
                    {holeResults.reduce((sum, hole) => sum + hole.par, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Section */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Final Results</h3>
            <div className="space-y-3">
              {sortedSummaries.map((summary, index) => (
                <div 
                  key={summary.playerId}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="font-medium">{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium">{getPlayerName(summary.playerId)}</div>
                      <div className="text-sm text-gray-500">
                        {summary.holesWon}W • {summary.holesLost}L • {totalMatches - summary.holesWon - summary.holesLost}T
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${
                    summary.totalWinnings > 0 ? 'text-green-600' : 
                    summary.totalWinnings < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {summary.totalWinnings > 0 ? '+' : ''}{summary.totalWinnings}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onNewGame}
            className="w-full bg-emerald-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>New Game</span>
          </button>
        </div>
      </div>
    </div>
  );
}