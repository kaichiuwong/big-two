export enum Suit {
  Diamond = 0, // Lowest
  Club = 1,
  Heart = 2,
  Spade = 3    // Highest
}

export enum Rank {
  Three = 0,
  Four = 1,
  Five = 2,
  Six = 3,
  Seven = 4,
  Eight = 5,
  Nine = 6,
  Ten = 7,
  Jack = 8,
  Queen = 9,
  King = 10,
  Ace = 11,
  Two = 12 // Highest in Big Two
}

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // unique identifier for React keys
}

export enum HandType {
  Single = '單張',
  Pair = '一對',
  Triple = '三條',
  Straight = '順子',
  Flush = '同花',
  FullHouse = '葫蘆',
  Quads = '鐵支', // or 四條
  StraightFlush = '同花順',
  Invalid = '無效'
}

export interface PlayedHand {
  type: HandType;
  cards: Card[];
  playerIndex: number;
  strength: number; // Internal numeric value for comparison
}

export interface Player {
  id: number;
  name: string;
  isHuman: boolean;
  hand: Card[];
  avatarUrl: string;
  cardsCount: number; // Used for hiding AI hands
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  lastPlayedHand: PlayedHand | null;
  winnerId: number | null;
  gameLog: string[];
  gameStarted: boolean;
  passingPlayers: boolean[]; // Track who passed in current round
}

export type AiAction = {
  action: 'play' | 'pass';
  cardIndices: number[]; // Indices of cards in hand to play
};