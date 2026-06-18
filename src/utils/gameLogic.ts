import { Player, Hole, BankerMatch, PlayerScore } from '../types';

export function calculateHandicapDiff(
  bankerHandicap: number,
  playerHandicap: number,
  holeHandicap: number
): number {
  const handicapDiff = Math.abs(bankerHandicap - playerHandicap);
  
  if (handicapDiff >= holeHandicap) {
    // Adjust non-banker player's score based on handicap comparison
    return bankerHandicap > playerHandicap ? -1 : 1;
  }
  
  return 0;
}

export function calculateBankerMatches(
  hole: Hole,
  banker: Player,
  players: Player[],
  playerScores: (PlayerScore & { betAmount?: number })[],
  defaultBetAmount: number,
  bankerPressed: boolean
): BankerMatch[] {
  const bankerScore = playerScores.find(ps => ps.playerId === banker.id)?.score || hole.par;
  const otherPlayers = players.filter(p => p.id !== banker.id);
  
  return otherPlayers.map(player => {
    const playerScoreData = playerScores.find(ps => ps.playerId === player.id);
    const playerScore = playerScoreData?.score || hole.par;
    const playerPressed = playerScoreData?.pressed || false;
    const playerBetAmount = playerScoreData?.betAmount || defaultBetAmount;
    const handicapDiff = calculateHandicapDiff(banker.handicap, player.handicap, hole.handicap);
    
    const bankerAdjustedScore = bankerScore + (handicapDiff > 0 ? handicapDiff : 0);
    const playerAdjustedScore = playerScore + (handicapDiff < 0 ? Math.abs(handicapDiff) : 0);
    
    // Calculate bet amount with press multipliers
    let finalBetAmount = playerBetAmount;
    if (playerPressed) finalBetAmount *= 2; // Player press doubles the bet
    if (bankerPressed) finalBetAmount *= 2; // Banker press doubles all bets again
    
    let result = 0;
    if (bankerAdjustedScore < playerAdjustedScore) {
      result = finalBetAmount; // Banker wins
    } else if (bankerAdjustedScore > playerAdjustedScore) {
      result = -finalBetAmount; // Player wins
    }
    // Tie = 0
    
    return {
      bankerId: banker.id,
      playerId: player.id,
      bankerScore,
      playerScore,
      bankerAdjustedScore,
      playerAdjustedScore,
      result,
      betAmount: finalBetAmount,
      playerPressed,
      bankerPressed
    };
  });
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getNextBanker(
  players: Player[],
  bankerOrder: string[],
  currentHole: number,
  totalHoles: number
): { bankerId: string; isManualSelection: boolean } {
  // const holesRemaining = totalHoles - currentHole + 1;
  // const isManualSelection = holesRemaining < players.length;
  
  // if (isManualSelection) {
  //   // Return the first player for manual selection - UI will handle the selection
  //   return { bankerId: players[0].id, isManualSelection: true };
  // }
  
  const bankerIndex = (currentHole - 1) % bankerOrder.length;
  return { bankerId: bankerOrder[bankerIndex], isManualSelection: true };
}