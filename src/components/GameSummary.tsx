import { Game, Course, GameSummary } from '../types';
import { RotateCcw } from 'lucide-react';
import React from 'react';
import ScoreCard from './ScoreCard';

interface GameSummaryProps {
  game: Game;
  course: Course;
  onNewGame: () => void;
}

function GameSummaryComponent({ game, course, onNewGame }: GameSummaryProps) {
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

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4">
          {/* Course Info Header */}
          <div className="text-center mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold text-gray-800">{course.name}</h1>
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <div>Holes: {game.holeScores.length} / {course.holes.length}</div>
              <div>Players: {game.players.length}</div>
              <div>Game Type: {game.gameType}</div>
            </div>
          </div>

          {/* Scorecard - using the new ScoreCard component */}
          <div className="mb-8">
            <ScoreCard 
              game={game}
              course={course}
              summaries={summaries}
              showHeader={true}
            />
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

export default React.memo(GameSummaryComponent);