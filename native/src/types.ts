export type GameType = 'mahjong' | 'rummy';

export interface Round {
  loser: string;
  winner: string;
  points: number;
}

export interface GameState {
  gameType: GameType;
  playerCount: number;
  players: string[];
  rounds: Round[];
  gameStartTime: number;
}
