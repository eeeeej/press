import React, { useState, useEffect } from 'react';
import { Player, Course, Game, HoleScore, PlayerScore } from '../types';
import { calculateHandicapDiff, calculateBankerMatches, getNextBanker } from '../utils/gameLogic';
import { Minus, Plus, Crown, ArrowLeft, ArrowRight, DollarSign, Zap, LayoutGrid, List } from 'lucide-react';

interface ScoringScreenProps {
  game: Game;
  course: Course;
  onGameUpdate: (game: Game) => void;
  onFinishGame: () => void;
  onBack: () => void;
}

export default function ScoringScreen({ game, course, onGameUpdate, onFinishGame, onBack }: ScoringScreenProps) {
  const [currentScores, setCurrentScores] = useState<PlayerScore[]>([]);
  const [defaultBetAmount, setDefaultBetAmount] = useState<number>(1);
  const [playerBets, setPlayerBets] = useState<{ [playerId: string]: number }>({});
  const [bankerPressed, setBankerPressed] = useState<boolean>(false);
  const [showBankerSelection, setShowBankerSelection] = useState(false);
  const [selectedBankerId, setSelectedBankerId] = useState<string>('');
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const currentHole = course.holes.find(h => h.number === game.currentHole);
  const isLastHole = game.currentHole === course.holes.length;
  
  // Arrange players in banker order
  const orderedPlayers = React.useMemo(() => {
    const ordered = [...game.bankerOrder.map(id => game.players.find(p => p.id === id)!).filter(Boolean)];
    // Add any players not in banker order (shouldn't happen but safety check)
    game.players.forEach(player => {
      if (!ordered.find(p => p.id === player.id)) {
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
  
  // Initialize scores for current hole
  useEffect(() => {
    // Make sure we have the current hole data before proceeding
    const currentHoleData = course.holes.find(h => h.number === game.currentHole);
    if (!currentHoleData) {
      console.error('Could not find hole data for hole', game.currentHole);
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
      
      // Check if manual banker selection is needed
      const { isManualSelection } = getNextBanker(
        orderedPlayers,
        game.bankerOrder,
        game.currentHole,
        course.holes.length
      );

      if (isManualSelection && !selectedBankerId) {
        setShowBankerSelection(true);
        return; // Don't initialize scores until banker is selected
      }

      const banker = getBankerForHole(selectedBankerId);
      const initialScores: PlayerScore[] = orderedPlayers.map(player => {
        const handicapDiff = calculateHandicapDiff(
          banker.handicap,
          player.handicap,
          currentHoleData.handicap
        );
        
        return {
          playerId: player.id,
          score: currentHoleData.par, // Default to par
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
      setSelectedBankerId(playerId);
      setShowBankerSelection(true);
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
    
    const matches = calculateBankerMatches(currentHole, banker, orderedPlayers, scoresWithBets, betAmountToUse, bankerPressed);

    // Create the hole score for the current hole
    const holeScore: HoleScore = {
      holeNumber: game.currentHole,
      bankerId: banker.id,
      playerScores: currentScores,
      matches,
      betAmount: betAmountToUse,
      bankerPressed
    };

    // Update the hole scores array with the new score
    const updatedHoleScores = [...game.holeScores.filter(hs => hs.holeNumber !== game.currentHole), holeScore];
    
    // Create the updated game object
    const updatedGame: Game = {
      ...game,
      holeScores: updatedHoleScores,
      // Don't increment currentHole if it's the last hole
      currentHole: isLastHole ? game.currentHole : game.currentHole + 1,
      // Mark as completed if it's the last hole
      status: isLastHole ? 'completed' : 'in_progress',
      updatedAt: new Date().toISOString()
    };

    console.log('Saving hole score. Is last hole?', isLastHole, 'Hole number:', game.currentHole);
    console.log('Updated hole scores:', updatedHoleScores);
    
    try {
      // Update the game state and wait for it to complete
      console.log('Calling onGameUpdate...');
      const savedGame = await onGameUpdate(updatedGame);
      console.log('onGameUpdate completed', { savedGame });
      
      if (isLastHole) {
        console.log('Final hole completed. Calling onFinishGame...');
        // Add a small delay to ensure state is properly updated
        setTimeout(() => {
          onFinishGame();
          console.log('onFinishGame called');
        }, 100);
      } else {
        console.log('Moving to next hole');
        setShowBankerSelection(false);
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
      setShowBankerSelection(false);
      setSelectedBankerId('');
    }
  };

  if (!currentHole) return null;

  if (showBankerSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 p-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Select Banker for Hole {game.currentHole}
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Manual selection required for remaining holes
            </p>
            <div className="space-y-3">
              {orderedPlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => setSelectedBankerId(player.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    selectedBankerId === player.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Crown className="w-5 h-5 text-amber-500" />
                      <div className="text-left">
                        <div className="font-semibold">{player.displayName}</div>
                        <div className="text-sm text-gray-600">Handicap: {player.handicap}</div>
                      </div>
                    </div>
                    {selectedBankerId === player.id && (
                      <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowBankerSelection(false)}
              disabled={!selectedBankerId}
              className="w-full mt-6 bg-emerald-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Confirm Banker
            </button>
          </div>
        </div>
      </div>
    );
  }

  const banker = getBankerForHole(selectedBankerId);
  const totalWagered = calculateTotalWagered();
  const [activeTab, setActiveTab] = useState<'current' | 'summary'>('current');

  // Calculate game summary data for the summary tab
  const gameSummary = React.useMemo(() => {
    const summaries = game.players.map(player => {
      let totalWinnings = 0;
      let holesWon = 0;
      let holesLost = 0;
      let holesTied = 0;

      game.holeScores.forEach(holeScore => {
        holeScore.matches.forEach(match => {
          if (match.bankerId === player.id) {
            totalWinnings += match.result;
            if (match.result > 0) holesWon++;
            else if (match.result < 0) holesLost++;
            else holesTied++;
          } else if (match.playerId === player.id) {
            totalWinnings -= match.result;
            if (match.result < 0) holesWon++;
            else if (match.result > 0) holesLost++;
            else holesTied++;
          }
        });
      });

      return {
        playerId: player.id,
        playerName: player.displayName,
        totalWinnings,
        holesWon,
        holesLost,
        holesTied
      };
    });

    return summaries.sort((a, b) => b.totalWinnings - a.totalWinnings);
  }, [game.players, game.holeScores]);

  // Calculate hole results for the summary view
  const holeResults = React.useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => {
      const holeNumber = i + 1;
      const holeScore = game.holeScores.find(hs => hs.holeNumber === holeNumber);
      const holeResults: { [playerId: string]: { score: number; amount: number } } = {};
      
      game.players.forEach(player => {
        const playerScore = holeScore?.playerScores?.find(ps => ps.playerId === player.id);
        holeResults[player.id] = {
          score: playerScore?.score || 0,
          amount: 0
        };
      });
      
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
        bankerId: holeScore?.bankerId || game.players[0]?.id || '',
        par: course.holes.find(h => h.number === holeNumber)?.par || 0,
        results: holeResults
      };
    });
  }, [game.holeScores, game.players, course.holes]);

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
              
              {/* Total Wagered */}
              <div className="flex items-center space-x-1 bg-purple-50 px-3 py-2 rounded-lg">
                <span className="text-xs text-purple-600 font-medium">Wagered:</span>
                <span className="text-sm font-bold text-purple-700">${totalWagered}</span>
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
                        }`}
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
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Player Summary */}
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-800 mb-2">Player Standings</h3>
                <div className="space-y-2">
                  {gameSummary.map((player, index) => (
                    <div key={player.playerId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-700'
                        } font-semibold`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{player.playerName}</div>
                          <div className="text-xs text-gray-500">
                            {player.holesWon}W / {player.holesLost}L / {player.holesTied}T
                          </div>
                        </div>
                      </div>
                      <div className={`font-semibold ${
                        player.totalWinnings > 0 ? 'text-green-600' : 
                        player.totalWinnings < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {player.totalWinnings > 0 ? '+' : ''}{player.totalWinnings}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Scorecard */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="p-2 text-left w-24">Player</th>
                      {holeResults.map(hole => (
                        <th key={hole.holeNumber} className="p-1 text-center text-xs w-10">
                          <div>{hole.holeNumber}</div>
                        </th>
                      ))}
                      <th className="p-2 text-center font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {game.players.map(player => {
                      const totalScore = holeResults.reduce((sum, hole) => {
                        return sum + (hole.results[player.id]?.score || 0);
                      }, 0);
                      const totalPar = holeResults.reduce((sum, hole) => sum + hole.par, 0);
                      const relativeToPar = totalScore - totalPar;
                      
                      return (
                        <tr key={player.id} className="border-b border-gray-100">
                          <td className="p-2 text-sm font-medium">
                            <div className="flex items-center">
                              {player.displayName}
                            </div>
                          </td>
                          
                          {holeResults.map(hole => {
                            const isBanker = hole.bankerId === player.id;
                            const score = hole.results[player.id]?.score || 0;
                            const amount = hole.results[player.id]?.amount || 0;
                            const relativeToHolePar = score - hole.par;
                            
                            return (
                              <td key={`${player.id}-${hole.holeNumber}`} className="p-0.5">
                                <div className={`h-full flex flex-col items-center justify-center min-h-[40px] ${
                                  isBanker ? 'bg-yellow-50' : ''
                                }`}>
                                  {amount !== 0 && (
                                    <div className={`text-[10px] font-medium ${
                                      amount > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {amount > 0 ? '+' : ''}{amount}
                                    </div>
                                  )}
                                  <div className={`text-sm ${
                                    relativeToHolePar < 0 ? 'text-blue-600' :
                                    relativeToHolePar > 0 ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    {score}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                          
                          <td className="p-1 text-center font-medium">
                            <div className="flex flex-col items-center">
                              <div className={`text-sm ${
                                relativeToPar < 0 ? 'text-blue-600' :
                                relativeToPar > 0 ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {totalScore}
                              </div>
                              <div className="text-xs text-gray-500">
                                {relativeToPar > 0 ? '+' : ''}{relativeToPar === 0 ? 'E' : relativeToPar}
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
          )}
        </div>
      </div>
    </div>
  );
}