import { Card, Rank, Suit } from '../types';

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (let s = 0; s < 4; s++) {
    for (let r = 0; r < 13; r++) {
      deck.push({
        suit: s as Suit,
        rank: r as Rank,
        id: `${r}-${s}`
      });
    }
  }
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const sortHand = (hand: Card[]): Card[] => {
  return [...hand].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.suit - b.suit;
  });
};

export const getCardSymbol = (rank: Rank): string => {
  const symbols = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  return symbols[rank];
};

export const getSuitSymbol = (suit: Suit): string => {
  switch (suit) {
    case Suit.Diamond: return '♦';
    case Suit.Club: return '♣';
    case Suit.Heart: return '♥';
    case Suit.Spade: return '♠';
  }
};

export const getSuitColor = (suit: Suit): string => {
  return (suit === Suit.Diamond || suit === Suit.Heart) ? 'text-red-600' : 'text-slate-900';
};

export const formatHand = (cards: Card[]): string => {
  return cards.map(c => `${getCardSymbol(c.rank)}${getSuitSymbol(c.suit)}`).join(' ');
};

export const findThreeOfDiamonds = (players: { hand: Card[] }[]): number => {
  for (let i = 0; i < players.length; i++) {
    if (players[i].hand.some(c => c.rank === Rank.Three && c.suit === Suit.Diamond)) {
      return i;
    }
  }
  return -1;
};
