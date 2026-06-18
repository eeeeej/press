import React, { useEffect, useRef } from 'react';
import { Game, Course, GameSummary } from '../types';

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

interface ScoreCardProps {
  game: Game;
  course: Course;
  summaries?: GameSummary[];
  showHeader?: boolean;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ game, course, summaries = [], showHeader = true }) => {
  // Reference to the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Effect to scroll to the right when component mounts
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollLeft = container.scrollWidth;
    }
  }, []);

  // Sort players by their banker order from the game
  const sortedPlayers = [...game.players].sort((a, b) => {
    const aIndex = game.bankerOrder.indexOf(a.id);
    const bIndex = game.bankerOrder.indexOf(b.id);
    return aIndex - bIndex;
  });

  const getHoleResults = (): HoleResultData[] => {
    // Get the actual count of holes that have been played
    const holesPlayed = game.status === 'completed' 
      ? course.holes.length  // If game is complete, use the course length
      : game.currentHole - 1; // Otherwise use currentHole - 1 (since currentHole is 1-indexed)
    
    // Create an array for all played holes
    return Array.from({ length: holesPlayed }, (_, i) => {
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

  // Calculate player summaries if not provided
  const calculatedSummaries = summaries.length > 0 ? summaries : (() => {
    const playerSummaries: { [playerId: string]: GameSummary } = {};

    // Initialize summaries
    game.players.forEach(player => {
      playerSummaries[player.id] = {
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
          playerSummaries[match.bankerId].totalWinnings += match.result;
          playerSummaries[match.bankerId].holesWon += 1;
          playerSummaries[match.playerId].totalWinnings -= match.result;
          playerSummaries[match.playerId].holesLost += 1;
        } else if (match.result < 0) {
          // Player wins
          playerSummaries[match.playerId].totalWinnings += Math.abs(match.result);
          playerSummaries[match.playerId].holesWon += 1;
          playerSummaries[match.bankerId].totalWinnings -= Math.abs(match.result);
          playerSummaries[match.bankerId].holesLost += 1;
        }
      });
    });

    return Object.values(playerSummaries);
  })();

  return (
    <div className="overflow-x-auto" ref={scrollContainerRef}>
      <table className="w-full text-xs border-collapse relative">
        <colgroup>
          <col style={{ width: '120px', minWidth: '120px' }} />
          {holeResults.map((_, index) => (
            <col key={`col-${index}`} style={{ width: '50px', minWidth: '50px' }} />
          ))}
          <col style={{ width: '80px', minWidth: '80px' }} />
        </colgroup>
        {showHeader && (
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="p-2 text-left sticky left-0 z-10 bg-gray-800 shadow-md">Player (HCP)</th>
              {/* Hole Numbers */}
              {holeResults.map(hole => (
                <th key={hole.holeNumber} className="p-2 text-center border-l border-gray-600 w-12">
                  <div>{hole.holeNumber}</div>
                  <div className="text-xs text-gray-300">{hole.par}</div>
                </th>
              ))}
              <th className="p-2 text-center border-l-2 border-gray-600 w-16">Total</th>
            </tr>
            {/* Par Row */}
            <tr className="bg-gray-100 font-medium border-t-2 border-gray-300">
              <td className="p-2 text-left sticky left-0 z-10 bg-gray-100 shadow-md">Par</td>
              {holeResults.map(hole => (
                <td key={`par-${hole.holeNumber}`} className="p-1 text-center border-l border-gray-200">
                  {hole.par}
                </td>
              ))}
              <td className="p-2 text-center border-l-2 border-gray-300">
                {holeResults.reduce((sum, hole) => sum + hole.par, 0)}
              </td>
            </tr>
          </thead>
        )}
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
                <td className="p-2 font-medium sticky left-0 z-10 bg-white shadow-md">
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
                    <td key={`${player.id}-${hole.holeNumber}`} className={`p-1 border-l border-gray-100 relative h-16 ${isBanker ? 'bg-yellow-50' : ''}`}>
                      <div className="relative h-full flex flex-col rounded">
                        {/* Top row with amount */}
                        <div className="flex justify-end px-1 pt-1 min-h-[20px]">
                          {amount !== 0 && (
                            <div className={`text-[10px] font-medium ${
                              amount > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {amount > 0 ? '+$' : '-$'}{Math.abs(amount)}
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
                      const playerSummary = calculatedSummaries.find(s => s.playerId === player.id);
                      const totalWon = playerSummary?.totalWinnings || 0;
                      if (totalWon === 0) return null;
                      return (
                        <div className={`text-xs font-medium ${
                          totalWon > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {totalWon > 0 ? '+$' : '-$'}{Math.abs(totalWon)}
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
        </tbody>
      </table>
    </div>
  );
};

export default ScoreCard;
