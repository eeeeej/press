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
      createdAt: new Date()
    };

    setCurrentGame(newGame);
    setGameState('playing');
  };

  const handleGameUpdate = (updatedGame: Game) => {
    setCurrentGame(updatedGame);
  };

  const handleFinishGame = () => {
    setGameState('complete');
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

  if (gameState === 'players') {
    return (
      <PlayerManagement
        players={players}
        onPlayersChange={setPlayers}
        onNext={handlePlayersNext}
      />
    );
  }

  if (gameState === 'course') {
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
    return (
      <GameSummary
        game={currentGame}
        course={selectedCourse}
        onNewGame={handleNewGame}
      />
    );
  }

  return null;
}

export default App;