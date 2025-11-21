import { Card, HandType, PlayedHand, Rank, Suit } from '../types';
import { sortHand } from './cardUtils';

// Helper to get card value for straights (0-12 based on rank enum is 3...2)
// But straights logic usually considers order of ranks.
// Standard Big 2: 3 4 5 6 7 8 9 10 J Q K A 2
// Straight strength usually determined by the highest card.

export const analyzeHand = (cards: Card[]): { type: HandType; strength: number } => {
  const sorted = sortHand(cards);
  const len = sorted.length;

  if (len === 1) {
    // Single: Strength is Rank * 4 + Suit
    const c = sorted[0];
    return { type: HandType.Single, strength: c.rank * 4 + c.suit };
  }

  if (len === 2) {
    // Pair: Ranks must match. Strength is Rank of pair (suit of higher one is tiebreaker if needed, usually just rank logic + highest suit)
    // In HK rules: Pair 3D 3S < Pair 4D 4C.
    // Between Pair 3D 3H and 3C 3S? Usually compare the highest suit in the pair.
    if (sorted[0].rank === sorted[1].rank) {
      const maxSuit = Math.max(sorted[0].suit, sorted[1].suit);
      return { type: HandType.Pair, strength: sorted[0].rank * 40 + maxSuit }; // *40 to create gap
    }
    return { type: HandType.Invalid, strength: 0 };
  }

  if (len === 3) {
    // Triple: Ranks must match
    if (sorted[0].rank === sorted[1].rank && sorted[1].rank === sorted[2].rank) {
      return { type: HandType.Triple, strength: sorted[0].rank };
    }
    return { type: HandType.Invalid, strength: 0 };
  }

  if (len === 5) {
    // Check Flush
    const isFlush = cards.every(c => c.suit === cards[0].suit);
    
    // Check Straight
    // Simple consecutive check on ranks indices (3=0... 2=12)
    // A straight like 3-4-5-6-7 is ranks 0-1-2-3-4.
    // 2-3-4-5-6 is not possible if 2 is highest rank index 12.
    // We need to map ranks to straight values. 
    // 3=3, ... A=14, 2=15.
    // Valid straights:
    // 3,4,5,6,7 (lowest)
    // ...
    // 10,J,Q,K,A
    // J,Q,K,A,2
    // A,2,3,4,5 (Sometimes valid, usually small)
    // For simplicity and standard implementation: We check consecutive IDs in the sorted array.
    // BUT Rank enum is 3=0...2=12.
    // So 3,4,5,6,7 is 0,1,2,3,4.
    // J,Q,K,A,2 is 8,9,10,11,12.
    // A,2,3,4,5 is 11,12,0,1,2 (sorted would be 0,1,2,11,12).
    
    let isStraight = true;
    for (let i = 0; i < 4; i++) {
      if (sorted[i+1].rank !== sorted[i].rank + 1) {
        isStraight = false;
        break;
      }
    }
    
    // Special Case: A 2 3 4 5 (ranks 11, 12, 0, 1, 2 -> sorted 0,1,2,11,12)
    if (!isStraight) {
        // Check A-2-3-4-5
        const ranks = sorted.map(c => c.rank);
        if (ranks.join(',') === '0,1,2,11,12') isStraight = true;
    }

    // Check Quads (4 same)
    const counts = new Map<number, number>();
    sorted.forEach(c => counts.set(c.rank, (counts.get(c.rank) || 0) + 1));
    const hasQuad = Array.from(counts.values()).includes(4);
    const hasTriple = Array.from(counts.values()).includes(3);
    const hasPair = Array.from(counts.values()).includes(2);

    const isFullHouse = hasTriple && hasPair;
    const isQuads = hasQuad; // 4 + 1

    const highestCard = sorted[4]; // Highest by standard sort
    // If Straight Flush
    if (isStraight && isFlush) {
      return { type: HandType.StraightFlush, strength: 5000 + highestCard.rank * 4 + highestCard.suit };
    }
    // Quads
    if (isQuads) {
        // Strength based on the rank of the quad
        let quadRank = -1;
        counts.forEach((count, r) => { if (count === 4) quadRank = r; });
        return { type: HandType.Quads, strength: 4000 + quadRank };
    }
    // Full House
    if (isFullHouse) {
        // Strength based on the rank of the triple
        let tripRank = -1;
        counts.forEach((count, r) => { if (count === 3) tripRank = r; });
        return { type: HandType.FullHouse, strength: 3000 + tripRank };
    }
    // Flush (Rank > Straight in standard rules?)
    // Wikipedia HK: Straight Flush > Quads > Full House > Flush > Straight
    if (isFlush) {
        // Strength based on suit first, then highest card? Or highest card then suit?
        // HK Rules: "若最大那張牌大小相同，則比較花色".
        // Usually: Compare Suit of flush? No, compare highest card rank, then suit.
        // Or: Spades Flush > Hearts Flush?
        // Let's use Highest Card value.
        return { type: HandType.Flush, strength: 2000 + highestCard.rank * 4 + highestCard.suit };
    }
    // Straight
    if (isStraight) {
        // Strength based on highest card
        return { type: HandType.Straight, strength: 1000 + highestCard.rank * 4 + highestCard.suit };
    }
  }

  return { type: HandType.Invalid, strength: -1 };
};

export const isValidMove = (
  cards: Card[], 
  lastHand: PlayedHand | null, 
  isFreeTurn: boolean, 
  mustPlayThreeOfDiamonds: boolean
): boolean => {
  if (cards.length === 0) return false;

  // Must contain 3D if it's the very first turn
  if (mustPlayThreeOfDiamonds) {
    const has3D = cards.some(c => c.rank === Rank.Three && c.suit === Suit.Diamond);
    if (!has3D) return false;
  }

  const analysis = analyzeHand(cards);
  if (analysis.type === HandType.Invalid) return false;

  if (isFreeTurn || !lastHand) {
    return true;
  }

  // Compare with last hand
  // Must be same number of cards (except technically Quads/SF can beat lower 5-card hands? Not in all variations.
  // Standard: Must be same number of cards.
  if (cards.length !== lastHand.cards.length) return false;

  // 5-card hierarchy comparison
  if (cards.length === 5) {
      // If types are different, compare type priority
      const typePriority = {
          [HandType.Straight]: 1,
          [HandType.Flush]: 2,
          [HandType.FullHouse]: 3,
          [HandType.Quads]: 4,
          [HandType.StraightFlush]: 5
      };
      const myP = typePriority[analysis.type as keyof typeof typePriority] || 0;
      const lastP = typePriority[lastHand.type as keyof typeof typePriority] || 0;
      
      if (myP > lastP) return true;
      if (myP < lastP) return false;
      // Same type, compare strength
      return analysis.strength > lastHand.strength;
  }

  // Singles, Pairs, Triples
  // Must be same type (already checked length, pairs/triples have type enforced by analyzeHand)
  // Just compare strength
  if (analysis.type !== lastHand.type) return false;
  return analysis.strength > lastHand.strength;
};

/**
 * Checks if the played hand is theoretically unbeatable in standard play.
 * Used to let AI skip thinking.
 */
export const isHandUnbeatable = (hand: PlayedHand): boolean => {
    // Single 2 of Spades
    if (hand.type === HandType.Single) {
        return hand.cards[0].rank === Rank.Two && hand.cards[0].suit === Suit.Spade;
    }
    // Pair containing 2 of Spades (Highest Pair)
    if (hand.type === HandType.Pair) {
        return hand.cards.some(c => c.rank === Rank.Two && c.suit === Suit.Spade);
    }
    // Triple 2s (Highest Triple)
    if (hand.type === HandType.Triple) {
        return hand.cards[0].rank === Rank.Two;
    }
    // Note: 5-card hands are complex (e.g. Royal Flush), skipping for simplicity
    // as they are rare and checking exhaustively is complex.
    return false;
};