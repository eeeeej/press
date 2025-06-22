import React, { useState } from 'react';
import { Player, Course, Game } from './types';
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

  const handleFinishGame = () => {
    console.log('handleFinishGame called, setting gameState to complete');
    
    // Ensure we have the latest game state
    setCurrentGame(prevGame => {
      if (!prevGame) return null;
      
      console.log('Updating game status to completed');
      return {
        ...prevGame,
        status: 'completed',
        updatedAt: new Date().toISOString()
      };
    });
    
    // Use a small timeout to ensure state updates are processed
    setTimeout(() => {
      console.log('Setting gameState to complete');
      setGameState('complete');
      console.log('gameState set to complete');
    }, 50);
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