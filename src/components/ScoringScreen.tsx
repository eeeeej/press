import React, { useState, useEffect, useMemo } from 'react';
import { Player, Course, Game, HoleScore, PlayerScore, GameSummary } from '../types';
import { calculateHandicapDiff, calculateBankerMatches, getNextBanker } from '../utils/gameLogic';
import { Minus, Plus, Crown, ArrowLeft, ArrowRight, DollarSign, Zap, LayoutGrid, List } from 'lucide-react';
import ScoreCard from './ScoreCard';

interface ScoringScreenProps {
  game: Game;
  course: Course;
  onGameUpdate: (game: Game) => void;
  onFinishGame: (game: Game) => void;
  onBack: () => void;
}

function ScoringScreen({ game, course, onGameUpdate, onFinishGame, onBack }: ScoringScreenProps) {
  const [currentScores, setCurrentScores] = useState<PlayerScore[]>([]);
  const [defaultBetAmount, setDefaultBetAmount] = useState<number>(1);
  const [playerBets, setPlayerBets] = useState<{ [playerId: string]: number }>({});
  const [bankerPressed, setBankerPressed] = useState<boolean>(false);
  const [selectedBankerId, setSelectedBankerId] = useState<string>('');
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'summary'>('current');

  // Derived state and variables
  const currentHole = course.holes.find(h => h.number === game.currentHole);
  const isLastHole = game.currentHole === course.holes.length;
  
  // Arrange players in banker order
  const orderedPlayers = useMemo(() => {
    const ordered = [...game.bankerOrder.map(id => game.players.find(p => p.id === id)!).filter(Boolean)];
    // Add any players not in banker order (shouldn't happen but safety check)
    game.players.forEach(player => {
      if (!ordered.some(p => p.id === player.id)) {
        ordered.push(player);
      }
    });
    return ordered;
  }, [game.players, game.bankerOrder]);

  // Calculate running totals for each player through current hole
  const calculateRunningTotal = (playerId: string): number => {
    let total = 0;
    for (let holeNum = 1; holeNum < game.currentHole; holeNum++) {
      const holeScore = game.holeScores.find(hs => hs.holeNumber === holeNum);
      if (holeScore) {
        holeScore.matches.forEach(match => {
          if (match.bankerId === playerId) {
            total += match.result;
          } else if (match.playerId === playerId) {
            total -= match.result;
          }
        });
      }
    }
    return total;
  };
  
  // Pure function to get banker without side effects
  const getBankerForHole = (selectedBankerId?: string): Player => {
    const existingHoleScore = game.holeScores.find(hs => hs.holeNumber === game.currentHole);
    if (existingHoleScore) {
      return orderedPlayers.find(p => p.id === existingHoleScore.bankerId)!;
    }

    const { bankerId, isManualSelection } = getNextBanker(
      orderedPlayers,
      game.bankerOrder,
      game.currentHole,
      course.holes.length
    );

    const finalBankerId = isManualSelection && selectedBankerId ? selectedBankerId : bankerId;
    return orderedPlayers.find(p => p.id === finalBankerId)!;
  };
  
  // Check if manual banker selection is needed
  useEffect(() => {
    if (currentHole && !game.holeScores.find(hs => hs.holeNumber === game.currentHole) && !selectedBankerId) {
      const { isManualSelection, bankerId } = getNextBanker(
        orderedPlayers,
        game.bankerOrder,
        game.currentHole,
        course.holes.length
      );
      
      if (isManualSelection) {
        // Instead of showing the modal, show a toast notification
        // instructing the user to long-press on a player to select banker
        const element = document.createElement('div');
        element.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-amber-50 border border-amber-200 rounded-lg p-3 shadow-lg z-50 flex items-center space-x-2 transition-opacity';
        element.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path></svg>
          <span class="text-sm font-medium text-amber-800">Long-press on a player icon to select banker</span>
        `;
        document.body.appendChild(element);
        
        // Remove the notification after a delay
        setTimeout(() => {
          element.classList.add('opacity-0');
          setTimeout(() => {
            document.body.removeChild(element);
          }, 300);
        }, 5000);
      } else {
        // If not manual selection, use the automatically determined banker
        setSelectedBankerId(bankerId);
      }
    }
  }, [currentHole, game.holeScores, orderedPlayers, selectedBankerId, game, course.holes.length]);
  
  // Initialize scores for current hole
  useEffect(() => {
    if (!currentHole) {
      setCurrentScores([]);
      setDefaultBetAmount(1);
      setBankerPressed(false);
      setPlayerBets({});
      return;
    }
    
    const existingHoleScore = game.holeScores.find(hs => hs.holeNumber === game.currentHole);
    
    if (existingHoleScore) {
      setCurrentScores(existingHoleScore.playerScores);
      setDefaultBetAmount(existingHoleScore.betAmount);
      setBankerPressed(existingHoleScore.bankerPressed);
      
      // Set individual player bets from existing data
      const bets: { [playerId: string]: number } = {};
      orderedPlayers.forEach(player => {
        const match = existingHoleScore.matches.find(m => m.playerId === player.id || m.bankerId === player.id);
        bets[player.id] = match?.betAmount || existingHoleScore.betAmount;
      });
      setPlayerBets(bets);
    } else {
      // Get the previous hole's bet amount or use 1 as default
      const previousHole = game.holeScores
        .filter(hs => hs.holeNumber < game.currentHole)
        .sort((a, b) => b.holeNumber - a.holeNumber)[0];
      
      const betAmount = previousHole?.betAmount || 1;
      
      const banker = getBankerForHole(selectedBankerId);
      const initialScores: PlayerScore[] = orderedPlayers.map(player => {
        const handicapDiff = calculateHandicapDiff(
          banker.handicap,
          player.handicap,
          currentHole.handicap
        );
        
        return {
          playerId: player.id,
          score: currentHole.par, // Default to par
          handicapDiff,
          pressed: false
        };
      });
      
      setCurrentScores(initialScores);
      setDefaultBetAmount(betAmount);
      setBankerPressed(false);
      
      // Initialize player bets with the bet amount from the previous hole
      const bets: { [playerId: string]: number } = {};
      orderedPlayers.forEach(player => {
        bets[player.id] = betAmount;
      });
      setPlayerBets(bets);
    }
  }, [game.currentHole, orderedPlayers, selectedBankerId]);

  const updateScore = (playerId: string, newScore: number) => {
    setCurrentScores(prev => prev.map(ps => 
      ps.playerId === playerId ? { ...ps, score: Math.max(1, newScore) } : ps
    ));
  };

  const updatePlayerBet = (playerId: string, betAmount: number) => {
    setPlayerBets(prev => ({
      ...prev,
      [playerId]: Math.max(1, betAmount)
    }));
  };

  const togglePress = (playerId: string) => {
    setCurrentScores(prev => prev.map(ps => 
      ps.playerId === playerId ? { ...ps, pressed: !ps.pressed } : ps
    ));
  };

  const handleLongPressStart = (playerId: string) => {
    const timer = setTimeout(() => {
      // Set the selected banker ID
      setSelectedBankerId(playerId);
      
      // Check if there's an existing hole score for the current hole
      const existingHoleScore = game.holeScores.find(hs => hs.holeNumber === game.currentHole);
      
      // If there's an existing hole score, update it with the new banker ID
      if (existingHoleScore) {
        // Create an updated hole score with the new banker ID
        const updatedHoleScore: HoleScore = {
          ...existingHoleScore,
          bankerId: playerId
        };
        
        // Update the game state with the new banker ID
        const updatedHoleScores = [
          ...game.holeScores.filter(hs => hs.holeNumber !== game.currentHole),
          updatedHoleScore
        ];
        
        // Create the updated game object
        const updatedGame: Game = {
          ...game,
          holeScores: updatedHoleScores,
          updatedAt: new Date().toISOString()
        };
        
        // Update the game state
        onGameUpdate(updatedGame);
      }
      
      // Add visual feedback when banker is selected
      // Create a temporary element for visual feedback
      const element = document.createElement('div');
      element.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50 transition-opacity';
      element.innerHTML = `
        <div class="bg-white rounded-lg p-4 shadow-lg transform scale-100 transition-transform">
          <div class="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path></svg>
            <span class="font-medium">${orderedPlayers.find(p => p.id === playerId)?.displayName} is now the banker</span>
          </div>
        </div>
      `;
      document.body.appendChild(element);
      
      // Remove the feedback after a short delay
      setTimeout(() => {
        element.classList.add('opacity-0');
        setTimeout(() => {
          document.body.removeChild(element);
        }, 300);
      }, 1500);
    }, 800); // 800ms long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Calculate total wagered amount for this hole
  const calculateTotalWagered = (): number => {
    let total = 0;
    orderedPlayers.forEach(player => {
      if (player.id !== getBankerForHole(selectedBankerId).id) {
        let betAmount = playerBets[player.id] || defaultBetAmount;
        const playerScore = currentScores.find(ps => ps.playerId === player.id);
        if (playerScore?.pressed) betAmount *= 2;
        if (bankerPressed) betAmount *= 2;
        total += betAmount;
      }
    });
    return total;
  };

  const saveHoleAndContinue = async () => {
    if (!currentHole) return;

    console.log('saveHoleAndContinue - isLastHole:', isLastHole, 'currentHole:', game.currentHole);
    
    const banker = getBankerForHole(selectedBankerId);
    console.log('Banker selected:', banker.displayName);
    
    // Get the bet amount to use (either from state or previous hole)
    const betAmountToUse = defaultBetAmount;
    
    // Create modified scores with individual bet amounts for calculation
    const scoresWithBets = currentScores.map(score => ({
      ...score,
      betAmount: playerBets[score.playerId] || betAmountToUse
    }));
    
    // Check if we have scores for all players
    const allPlayersHaveScores = game.players.every(player => 
      currentScores.some(score => score.playerId === player.id)
    );
    
    if (!allPlayersHaveScores) {
      console.error('Not all players have scores');
      alert('Please enter scores for all players before proceeding');
      return;
    }
    
    const matches = calculateBankerMatches(currentHole, banker, orderedPlayers, scoresWithBets, betAmountToUse, bankerPressed);

    // Create the hole score for the current hole
    const holeScore: HoleScore = {
      holeNumber: game.currentHole,
      bankerId: banker.id,
      playerScores: currentScores,
      matches,
      betAmount: betAmountToUse,
      bankerPressed: bankerPressed
    };

    // Update the hole scores array with the new score
    const updatedHoleScores = [...game.holeScores.filter(hs => hs.holeNumber !== game.currentHole), holeScore];
    
    // Create the updated game object
    const updatedGame: Game = {
      ...game,
      holeScores: updatedHoleScores,
      // Set the current hole correctly
      currentHole: game.currentHole + 1,
      // Mark as completed if we've just saved the last hole
      status: isLastHole ? 'completed' : 'in_progress',
      updatedAt: new Date().toISOString()
    };

    console.log('Saving hole score. Is last hole?', isLastHole, 'Hole number:', game.currentHole);
    console.log('Updated hole scores:', updatedHoleScores.length);
    
    try {
      // Update the game state
      console.log('Calling onGameUpdate...');
      // Handle the case where onGameUpdate might not return a value
      onGameUpdate(updatedGame);
      
      if (isLastHole) {
        console.log('Final hole completed. Calling onFinishGame with updated game...');
        // Pass the updated game directly to onFinishGame
        setTimeout(() => {
          onFinishGame(updatedGame);
        }, 100);
      } else {
        console.log('Moving to next hole');
        setSelectedBankerId('');
      }
    } catch (error) {
      console.error('Error saving hole:', error);
    }
  };

  const goToPreviousHole = () => {
    if (game.currentHole > 1) {
      const updatedGame: Game = {
        ...game,
        currentHole: game.currentHole - 1
      };
      onGameUpdate(updatedGame);
      setSelectedBankerId('');
    }
  };

  // Calculate game summary statistics for the summary tab
  const gameSummary = useMemo(() => {
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
  }, [game.players, game.holeScores]);

  // Calculate player standings for the summary tab header
  const calculatePlayerStandings = () => {
    const summaries = [...gameSummary];
    return summaries.sort((a, b) => b.totalWinnings - a.totalWinnings);
  };

  const playerStandings = useMemo(() => calculatePlayerStandings(), [gameSummary]);

  if (!currentHole) {
    return <div>Loading hole data...</div>;
  }

  const banker = getBankerForHole(selectedBankerId);
  const totalWagered = calculateTotalWagered();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-900">{course.name}</h1>
              <p className="text-sm text-gray-600">
                Hole {currentHole.number} • Par {currentHole.par} • {currentHole.yards}y • HCP {currentHole.handicap}
              </p>
            </div>
            <div className="w-9 h-9" /> {/* Spacer */}
          </div>

          {/* Default Bet Amount and Hole Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousHole}
              disabled={game.currentHole === 1}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>
            
            <div className="flex items-center space-x-4">
              {/* Default Bet Amount */}
              <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
                <DollarSign className="w-4 h-4 text-green-600" />
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={defaultBetAmount}
                  onChange={(e) => {
                    const newAmount = Math.max(1, parseInt(e.target.value) || 1);
                    setDefaultBetAmount(newAmount);
                    // Update all player bets to new default if they haven't been customized
                    const updatedBets: { [playerId: string]: number } = {};
                    orderedPlayers.forEach(player => {
                      updatedBets[player.id] = newAmount;
                    });
                    setPlayerBets(updatedBets);
                  }}
                  className="w-12 text-center bg-transparent text-sm font-semibold text-green-700 border-none outline-none"
                />
              </div>
              
              {/* Banker Info */}
              <div className="flex items-center space-x-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-gray-700">
                  {banker.displayName}
                </span>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              {game.currentHole}/{course.holes.length}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 pt-2">
        <div className="max-w-lg mx-auto">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('current')}
              className={`py-2 px-4 font-medium text-sm flex items-center space-x-1 ${
                activeTab === 'current' 
                  ? 'text-emerald-600 border-b-2 border-emerald-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Current Hole</span>
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-2 px-4 font-medium text-sm flex items-center space-x-1 ${
                activeTab === 'summary' 
                  ? 'text-emerald-600 border-b-2 border-emerald-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Game Summary</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="max-w-lg mx-auto">
          {activeTab === 'current' ? (
            <div className="bg-white rounded-2xl shadow-xl p-4">
              <div className="grid gap-3">
                {orderedPlayers.map(player => {
                  const playerScore = currentScores.find(ps => ps.playerId === player.id);
                  const isBanker = player.id === banker.id;
                  const handicapDiff = calculateHandicapDiff(banker.handicap, player.handicap, currentHole.handicap);
                  const runningTotal = calculateRunningTotal(player.id);
                  
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                        isBanker 
                          ? 'border-amber-300 bg-amber-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer ${
                            isBanker ? 'bg-amber-100' : 'bg-emerald-100'
                          } relative group`}
                          onMouseDown={() => handleLongPressStart(player.id)}
                          onMouseUp={handleLongPressEnd}
                          onMouseLeave={handleLongPressEnd}
                          onTouchStart={() => handleLongPressStart(player.id)}
                          onTouchEnd={handleLongPressEnd}
                          title="Long press to select as banker"
                        >
                          {isBanker && <Crown className="w-5 h-5 text-amber-600" />}
                          {!isBanker && (
                            <span className="text-sm font-semibold text-emerald-600">
                              {player.displayName.charAt(0)}
                            </span>
                          )}
                          {/* Add a subtle hint for long-press */}
                          <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-300 opacity-0 group-hover:opacity-50 transition-opacity"></div>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center space-x-1">
                            <span>{player.displayName}</span>
                            {handicapDiff !== 0 && (
                              <sup className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                                handicapDiff > 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {handicapDiff > 0 ? '+' : ''}{handicapDiff}
                              </sup>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="text-gray-600">HCP: {player.handicap}</span>
                            {game.currentHole > 1 && (
                              <span className={`font-semibold ${
                                runningTotal > 0 ? 'text-green-600' : 
                                runningTotal < 0 ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                Total: {runningTotal > 0 ? '+' : ''}{runningTotal}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* Individual Bet Amount */}
                        {isBanker ? (
                          <div className="flex items-center space-x-1 bg-purple-50 px-2 py-1 rounded mr-2">
                            <div className="w-auto text-center text-xs font-bold text-purple-700 pl-0.5">
                              ${totalWagered}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 bg-blue-50 px-2 py-1 rounded">
                            <DollarSign className="w-3 h-3 text-blue-600" />
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={playerBets[player.id] || defaultBetAmount}
                              onChange={(e) => updatePlayerBet(player.id, parseInt(e.target.value) || 1)}
                              className="w-8 text-center bg-transparent text-xs font-semibold text-blue-700 border-none outline-none"
                            />
                          </div>
                        )}
                        
                        {/* Press Button */}
                        <button
                          onClick={() => isBanker ? setBankerPressed(!bankerPressed) : togglePress(player.id)}
                          className={`p-2 rounded-lg transition-all ${
                            (isBanker ? bankerPressed : playerScore?.pressed)
                              ? 'bg-red-100 text-red-600 shadow-md' 
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={isBanker ? "Press All Bets" : "Press Bet"}
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                        
                        {/* Score Controls */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateScore(player.id, (playerScore?.score || currentHole.par) - 1)}
                            className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          
                          <div className="w-12 text-center">
                            <div className="text-2xl font-bold text-gray-900">
                              {playerScore?.score || currentHole.par}
                            </div>
                            <div className="text-xs text-gray-500">
                              {((playerScore?.score || currentHole.par) - currentHole.par) === 0 ? 'Par' :
                               ((playerScore?.score || currentHole.par) - currentHole.par) > 0 ? 
                               `+${(playerScore?.score || currentHole.par) - currentHole.par}` :
                               `${(playerScore?.score || currentHole.par) - currentHole.par}`}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => updateScore(player.id, (playerScore?.score || currentHole.par) + 1)}
                            className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={saveHoleAndContinue}
                className="w-full mt-6 bg-emerald-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>{isLastHole ? 'Finish Game' : 'Next Hole'}</span>
                {!isLastHole && <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          ) : (
            <>
              {/* ScoreCard Component */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <ScoreCard 
                  game={game} 
                  course={course} 
                  summaries={gameSummary}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(ScoringScreen);