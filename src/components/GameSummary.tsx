import React from 'react';
import { Game, Course, GameSummary } from '../types';
import { Trophy, TrendingUp, TrendingDown, RotateCcw, DollarSign, Crown } from 'lucide-react';

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

  const getPlayerName = (playerId: string) => {
    return game.players.find(p => p.id === playerId)?.displayName || '';
  };

  const getTrophyIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Trophy className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Trophy className="w-6 h-6 text-amber-600" />;
    return null;
  };

  const totalBetAmount = game.holeScores.reduce((sum, hole) => sum + hole.betAmount, 0);
  const totalMatches = game.holeScores.reduce((sum, hole) => sum + hole.matches.length, 0);

  // Calculate hole-by-hole results for detailed view
  const getHoleResults = () => {
    return game.holeScores.map(holeScore => {
      const holeResults: { [playerId: string]: number } = {};
      
      // Initialize all players with 0
      game.players.forEach(player => {
        holeResults[player.id] = 0;
      });
      
      // Calculate winnings/losses for this hole
      holeScore.matches.forEach(match => {
        if (match.result > 0) {
          holeResults[match.bankerId] += match.result;
          holeResults[match.playerId] -= match.result;
        } else if (match.result < 0) {
          holeResults[match.playerId] += Math.abs(match.result);
          holeResults[match.bankerId] -= Math.abs(match.result);
        }
      });
      
      return {
        holeNumber: holeScore.holeNumber,
        bankerId: holeScore.bankerId,
        results: holeResults
      };
    });
  };

  const holeResults = getHoleResults();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="text-center mb-8">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Game Complete!</h1>
            <p className="text-gray-600">{course.name} • {game.holeScores.length} holes played</p>
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

          {/* Hole-by-Hole Results */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hole-by-Hole Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Hole</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Banker</th>
                    {game.players.map(player => (
                      <th key={player.id} className="text-center py-2 px-3 font-medium text-gray-700">
                        {player.displayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holeResults.map(hole => (
                    <tr key={hole.holeNumber} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{hole.holeNumber}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center space-x-1">
                          <Crown className="w-3 h-3 text-amber-500" />
                          <span className="text-xs">
                            {getPlayerName(hole.bankerId)}
                          </span>
                        </div>
                      </td>
                      {game.players.map(player => (
                        <td key={player.id} className="py-2 px-3 text-center">
                          <span className={`font-semibold ${
                            hole.results[player.id] > 0 ? 'text-green-600' :
                            hole.results[player.id] < 0 ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {hole.results[player.id] > 0 ? '+' : ''}{hole.results[player.id] || '0'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Game Stats */}
          <div className="bg-gray-50 rounded-xl p-4 mb-8">
            <h3 className="font-semibold text-gray-900 mb-3">Game Statistics</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Holes:</span>
                <span className="font-semibold ml-2">{game.holeScores.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Players:</span>
                <span className="font-semibold ml-2">{game.players.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Matches:</span>
                <span className="font-semibold ml-2">{totalMatches}</span>
              </div>
              <div>
                <span className="text-gray-600">Avg Bet:</span>
                <span className="font-semibold ml-2">${(totalBetAmount / game.holeScores.length).toFixed(0)}</span>
              </div>
              <div>
                <span className="text-gray-600">Game Type:</span>
                <span className="font-semibold ml-2 capitalize">{game.gameType}</span>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <span className="font-semibold ml-2">
                  {new Date(game.createdAt).toLocaleDateString()}
                </span>
              </div>
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