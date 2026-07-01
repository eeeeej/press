import { useState, useEffect } from 'react';
import { Player, Course, Game } from './types';
import { courses } from './data/courses';
import { shuffleArray } from './utils/gameLogic';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useGamePersistence } from './hooks/useGamePersistence';
import PlayerManagement from './components/PlayerManagement';
import CourseSelection from './components/CourseSelection';
import ScoringScreen from './components/ScoringScreen';
import GameSummary from './components/GameSummary';
import SavedGames from './components/SavedGames';
import LiveScoreCardView from './components/LiveScoreCardView';
import { isLiveShareEnabled } from './lib/supabase';
import { buildShareUrl, getShareId, getViewShareId, pushScorecard } from './lib/liveShare';

type GameState = 'players' | 'course' | 'playing' | 'complete' | 'saved-games' | 'play-more-course';

function App() {
  const [gameState, setGameState] = useState<GameState>('players');
  const [players, setPlayers] = useLocalStorage<Player[]>('banker-players', []);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentGame, setCurrentGame] = useLocalStorage<Game | null>('banker-current-game', null);
  const [liveShareUrl, setLiveShareUrl] = useState<string | null>(null);
  const { saveGame, loadGame, deleteGame } = useGamePersistence();

  // Public read-only live view: /view/<shareId> renders the shared scorecard.
  const viewShareId = getViewShareId();

  // Auto-save game whenever it changes
  useEffect(() => {
    if (currentGame && selectedCourse) {
      saveGame(currentGame, selectedCourse.name);
    }
  }, [currentGame, selectedCourse, saveGame]);

  // Keep the visible live link in sync with the current game, and mirror every
  // change to the shared row once live sharing has been started for this game
  // (i.e. a share id already exists).
  useEffect(() => {
    if (!currentGame) {
      setLiveShareUrl(null);
      return;
    }
    const shareId = getShareId(currentGame.id);
    setLiveShareUrl(shareId ? buildShareUrl(shareId) : null);
    if (shareId && selectedCourse) {
      // Background auto-sync; errors are already logged in pushScorecard.
      pushScorecard(currentGame, selectedCourse).catch(() => {});
    }
  }, [currentGame, selectedCourse]);

  const handleShareLive = async (): Promise<string | null> => {
    if (!currentGame || !selectedCourse) return null;
    const shareId = await pushScorecard(currentGame, selectedCourse);
    if (!shareId) return null;
    const url = buildShareUrl(shareId);
    setLiveShareUrl(url);
    return url;
  };

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

  const handleBackToPlaying = () => {
    // Reset the game status to in_progress when going back from summary
    if (currentGame && currentGame.status === 'completed' && selectedCourse) {
      const lastHoleNumber = selectedCourse.holes.length;
      
      // Create a completely fresh copy of the game state to avoid any reference issues
      const cleanGame = JSON.parse(JSON.stringify(currentGame));
      
      // Ensure we're not duplicating any hole scores by creating a Map keyed by hole number
      // This prevents any potential for double-counting or accumulation of wager amounts
      const uniqueHoleScoresMap = new Map();
      
      // Process each hole score to ensure we only have one entry per hole
      cleanGame.holeScores.forEach((hs: any) => {
        uniqueHoleScoresMap.set(hs.holeNumber, hs);
      });
      
      // Convert the Map back to an array
      const uniqueHoleScores = Array.from(uniqueHoleScoresMap.values());
      
      const updatedGame = {
        ...cleanGame,
        status: 'in_progress' as const,
        currentHole: lastHoleNumber,
        holeScores: uniqueHoleScores,
        updatedAt: new Date().toISOString()
      };
      
      console.log('Navigating back to playing with unique hole scores:', uniqueHoleScores.length);
      setCurrentGame(updatedGame);
    }
    setGameState('playing');
  };

  const handleResumeGame = (gameId: string) => {
    const savedGame = loadGame(gameId);
    if (savedGame) {
      // Find the course
      const course = courses.find(c => c.id === savedGame.courseId);
      if (course) {
        setSelectedCourse(course);
        setCurrentGame(savedGame);
        setGameState(savedGame.status === 'completed' ? 'complete' : 'playing');
      }
    }
  };

  const handleDeleteGame = (gameId: string) => {
    deleteGame(gameId);
  };

  const handleShowSavedGames = () => {
    setGameState('saved-games');
  };

  const handlePlayMore = () => {
    setGameState('play-more-course');
  };

  const handlePlayMoreCourseSelect = (additionalCourse: Course) => {
    if (!selectedCourse || !currentGame) return;

    // Merge the holes from the additional course, preserving original course info
    const mergedCourse: Course = {
      ...selectedCourse,
      holes: [
        ...selectedCourse.holes.map(hole => ({
          ...hole,
          // Preserve existing originalCourseName if it exists, otherwise set it
          originalCourseName: hole.originalCourseName || selectedCourse.name,
          originalCourseId: hole.originalCourseId || selectedCourse.id
        })),
        ...additionalCourse.holes.map(hole => ({
          ...hole,
          number: selectedCourse.holes.length + hole.number,
          originalCourseName: additionalCourse.name,
          originalCourseId: additionalCourse.id
        }))
      ],
      name: `${selectedCourse.name} + ${additionalCourse.name}`
    };

    // Update the game to continue from the first hole of the new course
    const updatedGame: Game = {
      ...currentGame,
      status: 'in_progress' as const,
      currentHole: selectedCourse.holes.length + 1,
      updatedAt: new Date().toISOString()
    };

    setSelectedCourse(mergedCourse);
    setCurrentGame(updatedGame);
    setGameState('playing');
  };

  console.log('Rendering App with gameState:', gameState);

  if (viewShareId) {
    return <LiveScoreCardView shareId={viewShareId} />;
  }

  if (gameState === 'players') {
    console.log('Rendering PlayerManagement');
    return (
      <PlayerManagement
        players={players}
        onPlayersChange={setPlayers}
        onNext={handlePlayersNext}
        onShowSavedGames={handleShowSavedGames}
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
        liveShareEnabled={isLiveShareEnabled}
        liveShareUrl={liveShareUrl}
        onShareLive={handleShareLive}
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
        onPlayMore={handlePlayMore}
        onBack={handleBackToPlaying}
        liveShareEnabled={isLiveShareEnabled}
        liveShareUrl={liveShareUrl}
        onShareLive={handleShareLive}
      />
    );
  }

  if (gameState === 'saved-games') {
    console.log('Rendering SavedGames');
    return (
      <SavedGames
        onResumeGame={handleResumeGame}
        onDeleteGame={handleDeleteGame}
        onBack={handleNewGame}
        onNewGame={handleNewGame}
      />
    );
  }

  if (gameState === 'play-more-course') {
    console.log('Rendering CourseSelection for Play More');
    return (
      <CourseSelection
        courses={courses}
        selectedCourse={null}
        onCourseSelect={handlePlayMoreCourseSelect}
        onNext={() => {}}
        onBack={() => setGameState('complete')}
        playMoreMode={true}
      />
    );
  }

  console.error('Unexpected state - gameState:', gameState, 'currentGame:', !!currentGame, 'selectedCourse:', !!selectedCourse);

  return null;
}

export default App;