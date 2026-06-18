import * as React from 'react';
import { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { ScoringScreen } from '../components/ScoringScreen.new';
import type { Game, Course, Player } from '../types';

// Sample data for testing
const testPlayers: Player[] = [
  { id: '1', name: 'Player 1', displayName: 'P1', handicap: 10 },
  { id: '2', name: 'Player 2', displayName: 'P2', handicap: 15 },
  { id: '3', name: 'Player 3', displayName: 'P3', handicap: 20 },
];

const testCourse: Course = {
  id: 1,
  name: 'Test Course',
  holes: Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: 4,
    yards: 350 + (i * 10),
    handicap: i + 1
  }))
};

const testGame: Game = {
  id: 'test-game',
  courseId: 1,
  players: testPlayers,
  bankerOrder: ['1', '2', '3'],
  currentHole: 1,
  holeScores: [],
  gameType: 'banker',
  status: 'in_progress',
  createdAt: new Date(),
  updatedAt: new Date().toISOString(),
};

export const ScoringTestScreen: React.FC = () => {
  const [game, setGame] = React.useState<Game>(testGame);

  const handleGameUpdate = (updatedGame: Game) => {
    console.log('Game updated:', updatedGame);
    setGame(updatedGame);
  };

  const handleFinishGame = (finalGame: Game) => {
    console.log('Game finished:', finalGame);
    // Handle game completion
  };

  const handleBack = () => {
    console.log('Back button pressed');
    // Handle back navigation
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScoringScreen
        game={game}
        course={testCourse}
        onGameUpdate={handleGameUpdate}
        onFinishGame={handleFinishGame}
        onBack={handleBack}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default ScoringTestScreen;
