import { Game } from '../types';

const SAVED_GAMES_KEY = 'banker-saved-games';

export interface SavedGame extends Game {
  courseName?: string; // Optional course name for display
}

export function useGamePersistence() {
  // Get all saved games from localStorage
  const getSavedGames = (): SavedGame[] => {
    try {
      const item = window.localStorage.getItem(SAVED_GAMES_KEY);
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error('Error reading saved games:', error);
      return [];
    }
  };

  // Save a game to the saved games list
  const saveGame = (game: Game, courseName?: string): void => {
    try {
      const savedGames = getSavedGames();
      const existingIndex = savedGames.findIndex(g => g.id === game.id);
      
      const gameToSave: SavedGame = {
        ...game,
        courseName,
        updatedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        // Update existing game
        savedGames[existingIndex] = gameToSave;
      } else {
        // Add new game
        savedGames.push(gameToSave);
      }

      window.localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(savedGames));
    } catch (error) {
      console.error('Error saving game:', error);
    }
  };

  // Load a specific game by ID
  const loadGame = (gameId: string): SavedGame | null => {
    try {
      const savedGames = getSavedGames();
      return savedGames.find(g => g.id === gameId) || null;
    } catch (error) {
      console.error('Error loading game:', error);
      return null;
    }
  };

  // Delete a specific game
  const deleteGame = (gameId: string): void => {
    try {
      const savedGames = getSavedGames();
      const filteredGames = savedGames.filter(g => g.id !== gameId);
      window.localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(filteredGames));
    } catch (error) {
      console.error('Error deleting game:', error);
    }
  };

  // Clear all saved games
  const clearAllGames = (): void => {
    try {
      window.localStorage.removeItem(SAVED_GAMES_KEY);
    } catch (error) {
      console.error('Error clearing saved games:', error);
    }
  };

  // Get only in-progress games
  const getInProgressGames = (): SavedGame[] => {
    return getSavedGames().filter(g => g.status === 'in_progress');
  };

  // Get only completed games
  const getCompletedGames = (): SavedGame[] => {
    return getSavedGames().filter(g => g.status === 'completed');
  };

  return {
    getSavedGames,
    saveGame,
    loadGame,
    deleteGame,
    clearAllGames,
    getInProgressGames,
    getCompletedGames
  };
}
