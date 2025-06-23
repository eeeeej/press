import { useState } from 'react';
import { Player, Course, Game, GameStatus } from './types';
import { courses } from './data/courses';
import { shuffleArray } from './utils/gameLogic';
import { useLocalStorage } from './hooks/useLocalStorage';
import PlayerManagement from './components/PlayerManagement';
import CourseSelection from './components/CourseSelection';
import ScoringScreen from './components/ScoringScreen';
import GameSummary from './components/GameSummary';

type GameState = 'players' | 'course' | 'playing' | 'complete';

function App() {
  const [gameState, setGameState] = useState<GameState>('players');
  const [players, setPlayers] = useLocalStorage<Player[]>('banker-players', []);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentGame, setCurrentGame] = useLocalStorage<Game | null>('banker-current-game', null);

  const handlePlayersNext = () => {
    setGameState('course');
  };

  const handleCourseNext = () => {
    if (!selectedCourse) return;

    const bankerOrder = shuffleArray(players.map(p => p.id));
    
    const newGame: Game = {
      id: Date.now().toString(),
      courseId: selectedCourse.id,
      players: [...players],
      bankerOrder,
      currentHole: 1,
      holeScores: [],
      gameType: 'banker',
      status: 'in_progress',
      createdAt: new Date(),
      updatedAt: new Date().toISOString()
    };

    setCurrentGame(newGame);
    setGameState('playing');
  };

  const handleGameUpdate = (updatedGame: Game) => {
    // Validate hole number - allow saving the final hole
    if (selectedCourse && updatedGame.currentHole > selectedCourse.holes.length && updatedGame.status !== 'completed') {
      console.error(`Invalid hole number: ${updatedGame.currentHole}. Course has ${selectedCourse.holes.length} holes.`);
      return;
    }
    
    console.log('Updating game state:', {
      currentHole: updatedGame.currentHole,
      totalHoles: selectedCourse?.holes.length || 'N/A',
      status: updatedGame.status,
      holeScores: updatedGame.holeScores.length
    });
    
    // Ensure we include the updatedAt timestamp
    const gameWithUpdate = {
      ...updatedGame,
      updatedAt: new Date().toISOString()
    };
    
    setCurrentGame(gameWithUpdate);
    console.log('Game state updated');
    return gameWithUpdate;
  };

  // Modified to be async and accept the final game state
  const handleFinishGame = async (finalGameState?: Game) => {
    console.log('handleFinishGame called with finalGameState:', finalGameState);
    
    // If we received a final game state, use it directly
    if (finalGameState) {
      console.log('Using provided final game state');
      const completeGame = {
        ...finalGameState,
        status: 'completed' as const,
        updatedAt: new Date().toISOString()
      };
      
      // Set the game first, then change screens
      setCurrentGame(completeGame);
      console.log('Game set to completed state', completeGame);
      
      // Wait for state to update before changing screens
      setTimeout(() => {
        setGameState('complete');
        console.log('Game screen changed to complete');
      }, 100);
      
      return;
    }
    
    // Fallback if no game state was provided
    setCurrentGame(prevGame => {
      if (!prevGame) return null;
      
      const updatedGame = {
        ...prevGame,
        status: 'completed' as const,
        updatedAt: new Date().toISOString()
      };
      
      return updatedGame;
    });
    
    // Give state time to update
    setTimeout(() => {
      setGameState('complete');
    }, 100);
  };

  const handleNewGame = () => {
    setCurrentGame(null);
    setSelectedCourse(null);
    setGameState('players');
  };

  const handleBackToPlayers = () => {
    setGameState('players');
  };

  const handleBackToCourse = () => {
    setGameState('course');
  };

  console.log('Rendering App with gameState:', gameState);

  if (gameState === 'players') {
    console.log('Rendering PlayerManagement');
    return (
      <PlayerManagement
        players={players}
        onPlayersChange={setPlayers}
        onNext={handlePlayersNext}
      />
    );
  }

  if (gameState === 'course') {
    console.log('Rendering CourseSelection');
    return (
      <CourseSelection
        courses={courses}
        selectedCourse={selectedCourse}
        onCourseSelect={setSelectedCourse}
        onNext={handleCourseNext}
        onBack={handleBackToPlayers}
      />
    );
  }

  if (gameState === 'playing' && currentGame && selectedCourse) {
    console.log('Rendering ScoringScreen');
    return (
      <ScoringScreen
        key={currentGame.id}  // Ensure new instance on game change
        game={currentGame}
        course={selectedCourse}
        onGameUpdate={handleGameUpdate}
        onFinishGame={handleFinishGame}
        onBack={handleBackToCourse}
      />
    );
  }

  if (gameState === 'complete' && currentGame && selectedCourse) {
    console.log('Rendering GameSummary');
    return (
      <GameSummary
        game={currentGame}
        course={selectedCourse}
        onNewGame={handleNewGame}
      />
    );
  }

  console.error('Unexpected state - gameState:', gameState, 'currentGame:', !!currentGame, 'selectedCourse:', !!selectedCourse);

  return null;
}

export default App;