import { GoogleGenAI, Schema, Type } from "@google/genai";
import { Card, PlayedHand, Player, Rank, Suit } from '../types';
import { formatHand, sortHand, getCardSymbol, getSuitSymbol } from '../utils/cardUtils';
import { isValidMove } from '../utils/gameLogic';

// We instantiate genAI inside the function to ensure fresh keys if needed, though here we use process.env
const MODEL_NAME = "gemini-2.5-flash";

export const getAiMove = async (
  player: Player,
  gameState: {
    lastPlayedHand: PlayedHand | null;
    opponents: Player[];
    mustPlayThreeOfDiamonds: boolean;
    playedCards: Card[];
  }
): Promise<{ action: 'play' | 'pass', cards: Card[] }> => {

  // --- Card Counting & Context Analysis ---
  const handStr = formatHand(sortHand(player.hand));
  const lastPlayStr = gameState.lastPlayedHand 
    ? `${gameState.lastPlayedHand.type} (${formatHand(gameState.lastPlayedHand.cards)})` 
    : "None (Free Turn)";
  
  const opponentSummaries = gameState.opponents.map(p => 
    `Player ${p.name}: ${p.hand.length} cards left`
  ).join(', ');

  // Count key cards to inform strategy
  const twosPlayed = gameState.playedCards.filter(c => c.rank === Rank.Two).length;
  const acesPlayed = gameState.playedCards.filter(c => c.rank === Rank.Ace).length;
  const kingsPlayed = gameState.playedCards.filter(c => c.rank === Rank.King).length;
  const totalPlayed = gameState.playedCards.length;

  const prompt = `
    You are a world-class Big Two (Cho Dai Dee) AI strategist.
    
    GAME RULES CONTEXT:
    - Rank Order: 3 < 4 < 5 < ... < 10 < J < Q < K < A < 2.
    - Suit Order: Diamond (♦) < Club (♣) < Heart (♥) < Spade (♠).
    - Valid Hands: Single, Pair, Triple, 5-Card (Straight, Flush, Full House, Quads, Straight Flush).
    - You must beat the last played hand with a higher hand of the same type/count.
    - If you have 3♦ and it is the start of the game, you MUST play it.

    CURRENT SITUATION:
    - Your Hand: [ ${handStr} ]
    - Cards on Table to Beat: ${lastPlayStr}
    - Opponents: ${opponentSummaries}
    - Must Play 3♦: ${gameState.mustPlayThreeOfDiamonds}
    
    CARD COUNTING DATA (Cards already played/gone):
    - Total Discarded: ${totalPlayed}/52
    - 2s Gone: ${twosPlayed}/4
    - Aces Gone: ${acesPlayed}/4
    - Kings Gone: ${kingsPlayed}/4
    
    STRATEGY GUIDELINES:
    1. **Control**: If you have the lead (Free Turn), play hands that you are strong in. If you have a strong 5-card hand, play it to force opponents to pass or waste high cards.
    2. **Card Counting**: If most 2s and Aces are gone, your Kings and Queens are very powerful. Play them aggressively to win rounds.
    3. **Strategic Passing**: 
       - If an opponent plays a high card (e.g., 2) and you only have one 2, consider PASSING to save your 2 for a more critical moment (like regaining control later).
       - If you cannot beat the hand, you must PASS.
    4. **End Game Defense**: 
       - If an opponent has 1-2 cards left, playing a Single is dangerous. Try to play Pairs or 5-card hands to block them.
       - If you must play a Single, play your largest Single to prevent them from winning cheaply.
    5. **Clearing Hand**: Generally, try to clear small "trash" cards when you have a Free Turn, unless you need to block an opponent.

    TASK:
    Determine the best valid move.
    - Return 'pass' if you cannot beat the table or choose to save strength.
    - Return 'play' with the list of cards if you make a move.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, enum: ['play', 'pass'] },
      cards: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Array of card strings exactly as they appear in hand, e.g. '3♦', '10♠'"
      },
      reasoning: { type: Type.STRING }
    },
    required: ['action', 'cards']
  };

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3 // Low temperature for strategic consistency
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    if (result.action === 'pass') {
      return { action: 'pass', cards: [] };
    }

    // Map string cards back to Card objects
    const playedCards: Card[] = [];
    if (result.cards && Array.isArray(result.cards)) {
        for (const cStr of result.cards) {
            const rankChar = cStr.slice(0, -1);
            const suitChar = cStr.slice(-1);
            
            const found = player.hand.find(h => 
                getCardSymbol(h.rank) === rankChar && getSuitSymbol(h.suit) === suitChar
            );
            if (found) playedCards.push(found);
        }
    }

    // Local Validation Fallback
    if (isValidMove(playedCards, gameState.lastPlayedHand, !gameState.lastPlayedHand, gameState.mustPlayThreeOfDiamonds)) {
        return { action: 'play', cards: playedCards };
    } else {
        console.warn("AI suggested invalid move, performing fallback logic.");
        
        // Simple Fallback: 
        // 1. If free turn, play lowest valid single (or 3d if needed)
        if (!gameState.lastPlayedHand) {
             const sorted = sortHand(player.hand);
             if (gameState.mustPlayThreeOfDiamonds) {
                const d3 = sorted.find(c => c.rank === Rank.Three && c.suit === Suit.Diamond);
                if (d3) return { action: 'play', cards: [d3] };
             }
             return { action: 'play', cards: [sorted[0]] };
        }
        // 2. Otherwise Pass
        return { action: 'pass', cards: [] };
    }

  } catch (error) {
    console.error("AI Error", error);
    return { action: 'pass', cards: [] };
  }
};