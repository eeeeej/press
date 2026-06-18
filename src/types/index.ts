export interface Player {
  id: string;
  name: string;
  displayName: string;
  handicap: number;
}

export interface Hole {
  number: number;
  par: number;
  yards: number;
  handicap: number;
}

export interface Course {
  id: number;
  name: string;
  holes: Hole[];
}

export interface PlayerScore {
  playerId: string;
  score: number;
  handicapDiff: number;
  pressed: boolean;
}

export interface HoleScore {
  holeNumber: number;
  bankerId: string;
  playerScores: PlayerScore[];
  matches: BankerMatch[];
  betAmount: number;
  initialWagers: { [playerId: string]: number };  // Track initial wager per player
  bankerPressed: boolean;
}

export interface BankerMatch {
  bankerId: string;
  playerId: string;
  bankerScore: number;
  playerScore: number;
  bankerAdjustedScore: number;
  playerAdjustedScore: number;
  result: number; // +/- amount
  betAmount: number;
  playerPressed: boolean;
  bankerPressed: boolean;
}

export type GameStatus = 'in_progress' | 'completed';

export interface Game {
  id: string;
  courseId: number;
  players: Player[];
  bankerOrder: string[];
  currentHole: number;
  holeScores: HoleScore[];
  gameType: 'banker';
  status: GameStatus;
  createdAt: Date;
  updatedAt?: string; // Optional field for tracking updates
}

export interface GameSummary {
  playerId: string;
  totalWinnings: number;
  holesWon: number;
  holesLost: number;
}