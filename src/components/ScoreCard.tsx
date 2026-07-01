import React, { useEffect, useRef } from 'react';
import { Game, Course, GameSummary } from '../types';
import html2canvas from 'html2canvas';
import { Download, Share2, Zap } from 'lucide-react';
import LiveShareButton from './LiveShareButton';

interface HoleResult {
  score: number | null;
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
  // When true, hides interactive sharing controls (used by the public live view).
  readOnly?: boolean;
  // Whether the live-share backend is configured for this site.
  liveShareEnabled?: boolean;
  // Existing public link for this game, if live sharing was already started.
  liveShareUrl?: string | null;
  // Starts (or refreshes) live sharing for this game; resolves to the link.
  onShareLive?: () => Promise<string | null> | void;
}

const ScoreCard: React.FC<ScoreCardProps> = ({
  game,
  course,
  summaries = [],
  showHeader = true,
  readOnly = false,
  liveShareEnabled = false,
  liveShareUrl = null,
  onShareLive,
}) => {
  // Reference to the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Reference to the scorecard for image capture
  const scorecardRef = useRef<HTMLDivElement>(null);
  
  // Effect to scroll to the right when component mounts
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollLeft = container.scrollWidth;
    }
  }, []);

  const handleDownloadImage = async () => {
    if (!scorecardRef.current || !scrollContainerRef.current) return;

    try {
      // Get the full scrollable width
      const element = scorecardRef.current;
      const container = scrollContainerRef.current;
      const scrollWidth = element.scrollWidth;
      const scrollHeight = element.scrollHeight;
      
      // Save current scroll position
      const originalScrollLeft = container.scrollLeft;
      
      // Reset scroll to leftmost position
      container.scrollLeft = 0;
      
      // Temporarily set width to full scroll width for capture
      const originalWidth = element.style.width;
      const originalOverflow = element.style.overflow;
      element.style.width = `${scrollWidth}px`;
      element.style.overflow = 'visible';

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 1, // Use scale 1 to keep image size manageable
        logging: false,
        width: scrollWidth,
        height: scrollHeight,
        windowWidth: scrollWidth,
        windowHeight: scrollHeight,
      });

      // Restore original styles and scroll position
      element.style.width = originalWidth;
      element.style.overflow = originalOverflow;
      container.scrollLeft = originalScrollLeft;

      const link = document.createElement('a');
      link.download = `scorecard-${course.name}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate image. Please try again.');
    }
  };

  const handleShareImage = async () => {
    if (!scorecardRef.current || !scrollContainerRef.current) return;

    try {
      // Get the full scrollable width
      const element = scorecardRef.current;
      const container = scrollContainerRef.current;
      const scrollWidth = element.scrollWidth;
      const scrollHeight = element.scrollHeight;
      
      // Save current scroll position
      const originalScrollLeft = container.scrollLeft;
      
      // Reset scroll to leftmost position
      container.scrollLeft = 0;
      
      // Temporarily set width to full scroll width for capture
      const originalWidth = element.style.width;
      const originalOverflow = element.style.overflow;
      element.style.width = `${scrollWidth}px`;
      element.style.overflow = 'visible';

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 1, // Use scale 1 to keep image size manageable
        logging: false,
        width: scrollWidth,
        height: scrollHeight,
        windowWidth: scrollWidth,
        windowHeight: scrollHeight,
      });

      // Restore original styles and scroll position
      element.style.width = originalWidth;
      element.style.overflow = originalOverflow;
      container.scrollLeft = originalScrollLeft;

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        if (navigator.share && navigator.canShare({ files: [new File([blob], 'scorecard.png', { type: 'image/png' })] })) {
          const file = new File([blob], 'scorecard.png', { type: 'image/png' });
          await navigator.share({
            files: [file],
            title: `${course.name} Scorecard`,
            text: `Scorecard for ${course.name}`,
          });
        } else {
          // Fallback to download if share not supported
          handleDownloadImage();
        }
      });
    } catch (error) {
      console.error('Error sharing image:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        alert('Failed to share image. Please try downloading instead.');
      }
    }
  };

  // Sort players by their banker order from the game
  const sortedPlayers = [...game.players].sort((a, b) => {
    const aIndex = game.bankerOrder.indexOf(a.id);
    const bIndex = game.bankerOrder.indexOf(b.id);
    return aIndex - bIndex;
  });

  const getHoleResults = (): (HoleResultData | { isNineHoleTotal: boolean, holeNumber: number, label: string })[] => {
    // Always show all holes from the course
    const totalHoles = course.holes.length;
    
    const results: (HoleResultData | { isNineHoleTotal: boolean, holeNumber: number, label: string })[] = [];
    
    // Create an array for all holes with 9-hole totals inserted
    for (let i = 0; i < totalHoles; i++) {
      const holeNumber = i + 1;
      const holeScore = game.holeScores.find(hs => hs.holeNumber === holeNumber);
      const holeResults: { [playerId: string]: HoleResult } = {};
      
      // Initialize all players with default values
      sortedPlayers.forEach(player => {
        const playerScore = holeScore?.playerScores.find(ps => ps.playerId === player.id);
        holeResults[player.id] = {
          score: playerScore?.score ?? null, // Use null for skipped holes
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
      
      results.push({
        holeNumber,
        bankerId: holeScore?.bankerId || sortedPlayers[0]?.id || '',
        par: course.holes.find(h => h.number === holeNumber)?.par || 0,
        results: holeResults
      });
      
      // Add 9-hole total after hole 9
      if (holeNumber === 9) {
        results.push({ isNineHoleTotal: true, holeNumber: 9, label: '9' });
      }
      
      // Add 18-hole total after hole 18
      if (holeNumber === 18) {
        results.push({ isNineHoleTotal: true, holeNumber: 18, label: '18' });
      }
    }
    
    return results;
  };

  const holeResults = getHoleResults();

  // Calculate 9-hole totals for each player
  const getNineHoleTotals = (playerId: string, startHole: number, endHole: number) => {
    const holesInRange = holeResults.filter((h): h is HoleResultData => !('isNineHoleTotal' in h) && h.holeNumber >= startHole && h.holeNumber <= endHole);
    const score = holesInRange.reduce((sum, hole) => sum + (hole.results[playerId]?.score || 0), 0);
    const par = holesInRange.reduce((sum, hole) => sum + hole.par, 0);
    const relativeToPar = score - par;
    return { score, par, relativeToPar };
  };

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
    <div>
      {/* Share/Download Buttons */}
      {!readOnly && (
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleDownloadImage}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              title="Download as image"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            <button
              onClick={handleShareImage}
              className="flex items-center space-x-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
              title="Share scorecard image"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Image</span>
            </button>
          </div>

          {liveShareEnabled && (
            <LiveShareButton liveShareUrl={liveShareUrl} onShareLive={onShareLive} />
          )}
        </div>
      )}
      
      <div className="overflow-x-auto" ref={scrollContainerRef}>
        <div ref={scorecardRef}>
          <table className="w-full text-xs border-collapse relative">
        <colgroup>
          <col style={{ width: '120px', minWidth: '120px' }} />
          {holeResults.map((item, index) => (
            <col key={`col-${index}`} style={('isNineHoleTotal' in item) ? { width: '60px', minWidth: '60px' } : { width: '50px', minWidth: '50px' }} />
          ))}
          <col style={{ width: '80px', minWidth: '80px' }} />
        </colgroup>
        {showHeader && (
          <thead>
            {/* Course Name Row */}
            <tr className="bg-gray-700 text-white">
              <th className="p-2 text-left sticky left-0 z-10 bg-gray-700 shadow-md"></th>
              {(() => {
                const cells: JSX.Element[] = [];
                let currentCourseName: string | null = null;
                let courseStartIndex = 0;

                holeResults.forEach((item, index) => {
                  if ('isNineHoleTotal' in item) {
                    // Close any open course span
                    if (currentCourseName !== null) {
                      cells.push(
                        <th 
                          key={`course-${currentCourseName}`}
                          colSpan={index - courseStartIndex}
                          className="p-2 text-center border-l border-gray-600"
                        >
                          {currentCourseName}
                        </th>
                      );
                      currentCourseName = null;
                    }
                    // Add empty cell for 9-hole total with different color
                    cells.push(
                      <th 
                        key={`total-${index}`}
                        className="p-2 text-center border-l-2 border-gray-600 w-16 bg-gray-600"
                      >
                      </th>
                    );
                  } else {
                    const hole = course.holes.find(h => h.number === item.holeNumber);
                    const holeCourseName = hole?.originalCourseName || course.name;
                    
                    if (currentCourseName === null) {
                      currentCourseName = holeCourseName;
                      courseStartIndex = index;
                    } else if (currentCourseName !== holeCourseName) {
                      // Course changed, close previous span
                      cells.push(
                        <th 
                          key={`course-${currentCourseName}`}
                          colSpan={index - courseStartIndex}
                          className="p-2 text-center border-l border-gray-600"
                        >
                          {currentCourseName}
                        </th>
                      );
                      currentCourseName = holeCourseName;
                      courseStartIndex = index;
                    }
                  }
                });

                // Close any remaining course span
                if (currentCourseName !== null) {
                  cells.push(
                    <th 
                      key={`course-${currentCourseName}`}
                      colSpan={holeResults.length - courseStartIndex}
                      className="p-2 text-center border-l border-gray-600"
                    >
                      {currentCourseName}
                    </th>
                  );
                }

                return cells;
              })()}
              <th className="p-2 text-center border-l-2 border-gray-600 w-16"></th>
            </tr>
            <tr className="bg-gray-800 text-white">
              <th className="p-2 text-left sticky left-0 z-10 bg-gray-800 shadow-md">Player (HCP)</th>
              {/* Hole Numbers */}
              {holeResults.map((item, index) => {
                if ('isNineHoleTotal' in item) {
                  return (
                    <th key={`total-${index}`} className="p-2 text-center border-l-2 border-gray-600 w-16 bg-gray-700">
                    </th>
                  );
                }
                return (
                  <th key={item.holeNumber} className="p-2 text-center border-l border-gray-600 w-12">
                    <div>{item.holeNumber}</div>
                    <div className="text-xs text-gray-300">{course.holes.find(h => h.number === item.holeNumber)?.handicap || ''}</div>
                  </th>
                );
              })}
              <th className="p-2 text-center border-l-2 border-gray-600 w-16">Total</th>
            </tr>
            {/* Par Row */}
            <tr className="bg-gray-100 font-medium border-t-2 border-gray-300">
              <td className="p-2 text-left sticky left-0 z-10 bg-gray-100 shadow-md">Par</td>
              {holeResults.map((item, index) => {
                if ('isNineHoleTotal' in item) {
                  // Calculate par for the 9-hole range
                  const startHole = item.holeNumber === 9 ? 1 : 10;
                  const endHole = item.holeNumber;
                  const parTotal = holeResults
                    .filter((h): h is HoleResultData => !('isNineHoleTotal' in h) && h.holeNumber >= startHole && h.holeNumber <= endHole)
                    .reduce((sum, h) => sum + h.par, 0);
                  return (
                    <td key={`par-${index}`} className="p-2 text-center border-l-2 border-gray-300 font-medium bg-gray-200">
                      {parTotal}
                    </td>
                  );
                }
                return (
                  <td key={`par-${item.holeNumber}`} className="p-1 text-center border-l border-gray-200">
                    {item.par}
                  </td>
                );
              })}
              <td className="p-2 text-center border-l-2 border-gray-300">
                {holeResults.filter((h): h is HoleResultData => !('isNineHoleTotal' in h)).reduce((sum, h) => sum + h.par, 0)}
              </td>
            </tr>
          </thead>
        )}
        <tbody>
          {/* Player Rows */}
          {sortedPlayers.map(player => {
            const totalScore = holeResults.reduce((sum, hole) => {
              if ('isNineHoleTotal' in hole) return sum;
              return sum + (hole.results[player.id]?.score || 0);
            }, 0);
            const totalPar = holeResults.reduce((sum, hole) => {
              if ('isNineHoleTotal' in hole) return sum;
              return sum + hole.par;
            }, 0);
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
                {holeResults.map((item, index) => {
                  if ('isNineHoleTotal' in item) {
                    // Display 9-hole total
                    const startHole = item.holeNumber === 9 ? 1 : 10;
                    const endHole = item.holeNumber;
                    const nineHoleTotal = getNineHoleTotals(player.id, startHole, endHole);
                    return (
                      <td key={`${player.id}-total-${index}`} className="p-2 text-center border-l-2 border-gray-200 font-medium bg-gray-50">
                        <div className={`font-mono text-sm ${
                          nineHoleTotal.relativeToPar < 0 ? 'text-blue-600' :
                          nineHoleTotal.relativeToPar > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {nineHoleTotal.score}
                          <span className="text-xs font-normal text-gray-600 ml-1">
                            ({nineHoleTotal.relativeToPar > 0 ? '+' : ''}{nineHoleTotal.relativeToPar === 0 ? 'E' : nineHoleTotal.relativeToPar})
                          </span>
                        </div>
                      </td>
                    );
                  }
                  
                  // Display individual hole score
                  const isBanker = item.bankerId === player.id;
                  const score = item.results[player.id]?.score;
                  const relativeToHolePar = score !== null ? score - item.par : 0;
                  const amount = item.results[player.id]?.amount || 0;
                  
                  // Check if player pressed on this hole
                  const holeScore = game.holeScores.find(hs => hs.holeNumber === item.holeNumber);
                  const playerScore = holeScore?.playerScores.find(ps => ps.playerId === player.id);
                  const isPressed = playerScore?.pressed || false;
                  // Check if banker pressed on this hole
                  const isBankerPressed = isBanker && holeScore?.bankerPressed || false;
                  
                  return (
                    <td key={`${player.id}-${item.holeNumber}`} className={`p-1 border-l border-gray-100 relative h-16 ${isBanker ? 'bg-yellow-50' : ''}`}>
                      <div className="relative h-full flex flex-col rounded">
                        {/* Lightning icon if pressed */}
                        {(isPressed || isBankerPressed) && (
                          <div className="absolute top-0 left-0 p-0.5">
                            <Zap className="w-3 h-3 text-yellow-500" />
                          </div>
                        )}
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
                          {score !== null ? (
                            <div className={`font-mono text-sm text-center ${
                              relativeToHolePar < 0 ? 'text-blue-600' :
                              relativeToHolePar > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {score}
                            </div>
                          ) : null}
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
      </div>
    </div>
  );
};

export default ScoreCard;
