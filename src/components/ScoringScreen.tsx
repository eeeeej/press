import React, { useState, useEffect, useMemo } from 'react';
import { Player, Course, Game, HoleScore, PlayerScore, GameSummary } from '../types';
import { calculateHandicapDiff, calculateBankerMatches, getNextBanker } from '../utils/gameLogic';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Crown, ArrowLeft, ArrowRight, DollarSign, Zap, LayoutGrid, List, ChevronUp, ChevronDown, Settings } from 'lucide-react';
import ScoreCard from './ScoreCard';
import LiveShareButton from './LiveShareButton';
import PickerSheet from './PickerSheet';

const WAGER_OPTIONS = [1, 2, 3, 4, 5, 10, 15, 20, 25, 50, 75, 100];

interface ScoringScreenProps {
  game: Game;
  course: Course;
  onGameUpdate: (game: Game) => void;
  onFinishGame: (game: Game) => void;
  onBack: () => void;
  liveShareEnabled?: boolean;
  liveShareUrl?: string | null;
  onShareLive?: () => Promise<string | null> | void;
}

function ScoringScreen({ game, course, onGameUpdate, onFinishGame, liveShareEnabled, liveShareUrl, onShareLive }: ScoringScreenProps) {
  const [currentScores, setCurrentScores] = useState<PlayerScore[]>([]);
  const [defaultBetAmount, setDefaultBetAmount] = useLocalStorage<number>('banker-default-bet', 5);
  const [wagerIncrement, setWagerIncrement] = useLocalStorage<number>('banker-wager-increment', 1);
  const [playerBets, setPlayerBets] = useState<{ [playerId: string]: number }>({});
  const [bankerPressed, setBankerPressed] = useState<boolean>(false);
  const [selectedBankerId, setSelectedBankerId] = useState<string>('');
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'summary' | 'config'>('current');
  const [picker, setPicker] = useState<{ playerId: string; kind: 'score' | 'wager' } | null>(null);

  // Derived state and variables
  const currentHole = useMemo(() => {
    // If we're returning from the summary screen and can't find the current hole,
    // default to the last hole in the course
    const hole = course.holes.find(h => h.number === game.currentHole);
    if (!hole && game.status === 'completed') {
      // If game is completed but no current hole found, use the last hole
      return course.holes[course.holes.length - 1];
    }
    return hole;
  }, [course.holes, game.currentHole, game.status]);
  
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
        setSelectedBankerId(bankerId);
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
      setBankerPressed(false);
      setPlayerBets({});
      return;
    }
    
    const existingHoleScore = game.holeScores.find(hs => hs.holeNumber === game.currentHole);

    // Default per-player scores (par) used for fresh holes and for revisiting a
    // skipped hole, which is stored with no player scores.
    const buildInitialScores = (): PlayerScore[] => {
      const banker = getBankerForHole(selectedBankerId);
      return orderedPlayers.map(player => ({
        playerId: player.id,
        score: currentHole.par,
        handicapDiff: calculateHandicapDiff(banker.handicap, player.handicap, currentHole.handicap),
        pressed: false,
      }));
    };

    if (existingHoleScore && existingHoleScore.playerScores.length > 0) {
      setCurrentScores(existingHoleScore.playerScores);
      setDefaultBetAmount(existingHoleScore.betAmount);
      setBankerPressed(existingHoleScore.bankerPressed);
      
      // Initialize player bets from initialWagers if available, otherwise use betAmount
      const bets: { [playerId: string]: number } = {};
      orderedPlayers.forEach(player => {
        // Use the saved initial wager if it exists, otherwise fall back to the hole's betAmount
        bets[player.id] = existingHoleScore.initialWagers?.[player.id] ?? existingHoleScore.betAmount;
      });
      console.log('Initialized player bets from initialWagers:', bets);
      setPlayerBets(bets);
    } else {
      // Get the previous hole's bet amount or use saved default
      const previousHole = game.holeScores
        .filter(hs => hs.holeNumber < game.currentHole)
        .sort((a, b) => b.holeNumber - a.holeNumber)[0];
      
      const betAmount = existingHoleScore?.betAmount || previousHole?.betAmount || defaultBetAmount;

      setCurrentScores(buildInitialScores());
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

  const canReorderBankerOrder = game.currentHole === 1 && game.holeScores.length === 0;

  const reorderBanker = (playerId: string, direction: 'up' | 'down') => {
    const order = [...game.bankerOrder];
    const index = order.indexOf(playerId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === order.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];

    const updatedGame: Game = {
      ...game,
      bankerOrder: order,
      updatedAt: new Date().toISOString()
    };
    onGameUpdate(updatedGame);

    // The banker for hole 1 is the first player in the order, so update selection
    const newBankerId = order[0];
    setSelectedBankerId(newBankerId);
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

  const skipHole = () => {
    if (!currentHole) return;

    const banker = getBankerForHole(selectedBankerId);
    
    // Create a hole score with no matches (skipped hole)
    const holeScore: HoleScore = {
      holeNumber: game.currentHole,
      bankerId: banker.id,
      playerScores: [],
      matches: [], // No matches for skipped hole
      betAmount: defaultBetAmount,
      initialWagers: {},
      bankerPressed: false
    };

    // Make sure we completely remove any existing hole score for this hole
    const filteredHoleScores = game.holeScores.filter(hs => hs.holeNumber !== game.currentHole);
    const updatedHoleScores = [...filteredHoleScores, holeScore];
    
    // Create the updated game object
    const updatedGame: Game = {
      ...game,
      holeScores: updatedHoleScores,
      currentHole: Math.min(game.currentHole + 1, course.holes.length),
      updatedAt: new Date().toISOString()
    };

    onGameUpdate(updatedGame);
  };

  const saveHoleAndContinue = async () => {
    if (!currentHole) return;

    console.log('saveHoleAndContinue - isLastHole:', isLastHole, 'currentHole:', game.currentHole);
    
    const banker = getBankerForHole(selectedBankerId);
    console.log('Banker selected:', banker.displayName);
    
    // Get the bet amount to use (either from state or previous hole)
    const betAmountToUse = defaultBetAmount;
    
    // Store initial wagers for each player
    const initialWagers: { [playerId: string]: number } = {};
    orderedPlayers.forEach(player => {
      initialWagers[player.id] = playerBets[player.id] || betAmountToUse;
    });
    
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
    
    // Clear any existing matches for this hole to prevent accumulation
    const matches = calculateBankerMatches(currentHole, banker, orderedPlayers, scoresWithBets, betAmountToUse, bankerPressed);

    // Create the hole score for the current hole
    const holeScore: HoleScore = {
      holeNumber: game.currentHole,
      bankerId: banker.id,
      playerScores: currentScores,
      matches,
      betAmount: betAmountToUse,
      initialWagers, // Store the initial wagers
      bankerPressed: bankerPressed
    };
    
    console.log('Saving hole with initial wagers:', initialWagers);

    // Make sure we completely remove any existing hole score for this hole
    // This prevents accumulation of matches when editing a hole multiple times
    const filteredHoleScores = game.holeScores.filter(hs => hs.holeNumber !== game.currentHole);
    const updatedHoleScores = [...filteredHoleScores, holeScore];
    
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

  if (!currentHole) {
    return <div>Loading hole data...</div>;
  }

  const banker = getBankerForHole(selectedBankerId);
  const totalWagered = calculateTotalWagered();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
      {/* Header */}
      <div
        className="bg-white shadow-sm p-4"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPreviousHole}
              disabled={game.currentHole === 1}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>
            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-900">{course.name}</h1>
              <p className="text-sm text-gray-600">
                Hole {currentHole.number} • Par {currentHole.par} • {currentHole.yards}y • HCP {currentHole.handicap}
              </p>
            </div>
            <button
              onClick={skipHole}
              disabled={isLastHole}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>Skip</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Default Bet Amount and Hole Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Default Bet Amount */}
              <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
                <DollarSign className="w-4 h-4 text-green-600" />
                <button
                  onClick={() => {
                    const newAmount = Math.max(1, defaultBetAmount - wagerIncrement);
                    setDefaultBetAmount(newAmount);
                    const updatedBets: { [playerId: string]: number } = {};
                    orderedPlayers.forEach(player => {
                      updatedBets[player.id] = newAmount;
                    });
                    setPlayerBets(updatedBets);
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-green-200 hover:bg-green-300 rounded text-green-700 font-bold text-lg"
                >
                  -
                </button>
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
                <button
                  onClick={() => {
                    const newAmount = Math.min(100, defaultBetAmount + wagerIncrement);
                    setDefaultBetAmount(newAmount);
                    const updatedBets: { [playerId: string]: number } = {};
                    orderedPlayers.forEach(player => {
                      updatedBets[player.id] = newAmount;
                    });
                    setPlayerBets(updatedBets);
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-green-200 hover:bg-green-300 rounded text-green-700 font-bold text-lg"
                >
                  +
                </button>
              </div>
            </div>

            {liveShareEnabled && (
              <LiveShareButton
                compact
                liveShareUrl={liveShareUrl}
                onShareLive={onShareLive}
              />
            )}
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
              <span>Scorecard</span>
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`py-2 px-4 font-medium text-sm flex items-center space-x-1 ${
                activeTab === 'config' 
                  ? 'text-emerald-600 border-b-2 border-emerald-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Config</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className="p-4"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
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
                      className={`flex items-center justify-between gap-x-2 gap-y-3 flex-wrap p-4 rounded-xl border-2 ${
                        isBanker 
                          ? 'border-amber-300 bg-amber-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {canReorderBankerOrder && (
                          <div className="flex flex-col items-center space-y-0.5">
                            <button
                              onClick={() => reorderBanker(player.id, 'up')}
                              disabled={game.bankerOrder.indexOf(player.id) === 0}
                              className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-25 disabled:cursor-default transition-colors"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => reorderBanker(player.id, 'down')}
                              disabled={game.bankerOrder.indexOf(player.id) === game.bankerOrder.length - 1}
                              className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-25 disabled:cursor-default transition-colors"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer ${
                            isBanker ? 'bg-amber-100' : 'bg-emerald-100'
                          } relative group`}
                          onMouseDown={() => handleLongPressStart(player.id)}
                          onMouseUp={handleLongPressEnd}
                          onMouseLeave={handleLongPressEnd}
                          onTouchStart={() => handleLongPressStart(player.id)}
                          onTouchEnd={handleLongPressEnd}
                        >
                          {isBanker && <Crown className="w-5 h-5 text-amber-600" />}
                          {!isBanker && (
                            <span className="text-sm font-semibold text-emerald-600">
                              {player.displayName.charAt(0)}
                            </span>
                          )}
                          {/* Add a subtle hint for long-press */}
                          <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-300 opacity-0 group-hover:opacity-50 transition-opacity"></div>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            Long press to select as banker
                          </div>
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
                          <button
                            onClick={() => setPicker({ playerId: player.id, kind: 'wager' })}
                            className="min-h-[44px] px-3 rounded-lg bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 active:bg-blue-200 transition-colors"
                            aria-label={`Set wager for ${player.displayName}`}
                          >
                            ${playerBets[player.id] || defaultBetAmount}
                          </button>
                        )}
                        
                        {/* Press Button */}
                        <button
                          onClick={() => isBanker ? setBankerPressed(!bankerPressed) : togglePress(player.id)}
                          className={`w-11 h-11 flex items-center justify-center rounded-lg transition-all ${
                            (isBanker ? bankerPressed : playerScore?.pressed)
                              ? 'bg-red-100 text-red-600 shadow-md' 
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={isBanker ? "Press All Bets" : "Press Bet"}
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                        
                        {/* Score (tap to change) */}
                        <button
                          onClick={() => setPicker({ playerId: player.id, kind: 'score' })}
                          className="min-w-[2.75rem] min-h-[44px] px-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 active:bg-gray-200 flex flex-col items-center justify-center transition-colors"
                          aria-label={`Set score for ${player.displayName}`}
                        >
                          <span className="text-xl font-bold text-gray-900 leading-none">
                            {playerScore?.score || currentHole.par}
                          </span>
                          <span className="text-xs text-gray-500 mt-0.5">
                            {((playerScore?.score || currentHole.par) - currentHole.par) === 0 ? 'Par' :
                             ((playerScore?.score || currentHole.par) - currentHole.par) > 0 ?
                             `+${(playerScore?.score || currentHole.par) - currentHole.par}` :
                             `${(playerScore?.score || currentHole.par) - currentHole.par}`}
                          </span>
                        </button>
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
          ) : activeTab === 'summary' ? (
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
          ) : (
            <>
              {/* Config Tab */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Configuration</h2>
                
                <div className="space-y-6">
                  {/* Wager Increment Setting */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wager Increment
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Amount to increase/decrease when using +/- buttons
                    </p>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setWagerIncrement(Math.max(1, wagerIncrement - 1))}
                        className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-bold text-lg"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={wagerIncrement}
                        onChange={(e) => setWagerIncrement(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                        className="w-20 text-center text-lg font-semibold border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <button
                        onClick={() => setWagerIncrement(Math.min(10, wagerIncrement + 1))}
                        className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-bold text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Default Wager Display */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700">Default Wager Amount</h3>
                        <p className="text-xs text-gray-500">Starting bet for new games</p>
                      </div>
                      <div className="text-2xl font-bold text-emerald-600">${defaultBetAmount}</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {picker && (() => {
        const pickerPlayer = orderedPlayers.find(p => p.id === picker.playerId);
        if (!pickerPlayer) return null;

        if (picker.kind === 'score') {
          const pickerScore = currentScores.find(s => s.playerId === picker.playerId);
          const current = pickerScore?.score || currentHole.par;
          const base = Array.from({ length: 12 }, (_, i) => i + 1);
          const values = base.includes(current) ? base : [...base, current].sort((a, b) => a - b);
          return (
            <PickerSheet
              title={pickerPlayer.displayName}
              subtitle={`Par ${currentHole.par}`}
              values={values}
              value={current}
              highlightValue={currentHole.par}
              formatSub={(n) => {
                const d = n - currentHole.par;
                return d === 0 ? 'Par' : d > 0 ? `+${d}` : `${d}`;
              }}
              onSelect={(score) => {
                updateScore(picker.playerId, score);
                setPicker(null);
              }}
              onClose={() => setPicker(null)}
            />
          );
        }

        const currentBet = playerBets[picker.playerId] || defaultBetAmount;
        const values = WAGER_OPTIONS.includes(currentBet)
          ? WAGER_OPTIONS
          : [...WAGER_OPTIONS, currentBet].sort((a, b) => a - b);
        return (
          <PickerSheet
            title={pickerPlayer.displayName}
            subtitle="Wager"
            values={values}
            value={currentBet}
            formatValue={(n) => `$${n}`}
            onSelect={(amount) => {
              updatePlayerBet(picker.playerId, amount);
              setPicker(null);
            }}
            onClose={() => setPicker(null)}
          />
        );
      })()}
    </div>
  );
}

export default React.memo(ScoringScreen);