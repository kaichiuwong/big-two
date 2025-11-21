import { useEffect, useState, useRef } from 'react';
import { GameState, Player, Card as CardType, Suit, Rank } from './types';
import { createDeck, shuffleDeck, sortHand, findThreeOfDiamonds } from './utils/cardUtils';
import { isValidMove, analyzeHand, isHandUnbeatable } from './utils/gameLogic';
import { PlayerArea } from './components/PlayerArea';
import { Card } from './components/Card';
import { getAiMove } from './services/aiService';
import { playSound } from './utils/audio';
import { Trophy, RefreshCcw, Cpu, AlertCircle, Clock } from 'lucide-react';

// Real images for avatars
const AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80', // User
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=150&h=150&q=80', // AI 1
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&h=150&q=80', // AI 2
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=150&h=150&q=80', // AI 3
];

const PLAYER_NAMES = ['你 (You)', '電腦一號', '電腦二號', '電腦三號'];
const TURN_TIME_LIMIT = 60;

function App() {
  // Game State
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: -1,
    lastPlayedHand: null,
    winnerId: null,
    gameLog: [],
    gameStarted: false,
    passingPlayers: [false, false, false, false]
  });

  // UI State
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);

  // Refs for audio or scrolling logs if needed
  const logEndRef = useRef<HTMLDivElement>(null);

  // --- Initialization ---
  const initGame = () => {
    const deck = shuffleDeck(createDeck());
    const hands = [
      sortHand(deck.slice(0, 13)),
      sortHand(deck.slice(13, 26)),
      sortHand(deck.slice(26, 39)),
      sortHand(deck.slice(39, 52)),
    ];

    const players: Player[] = hands.map((hand, i) => ({
      id: i,
      name: PLAYER_NAMES[i],
      isHuman: i === 0,
      hand,
      avatarUrl: AVATARS[i],
      cardsCount: 13
    }));

    const starterIndex = findThreeOfDiamonds(players);

    setGameState({
      players,
      currentPlayerIndex: starterIndex,
      lastPlayedHand: null,
      winnerId: null,
      gameLog: [`遊戲開始！${players[starterIndex].name} 持有 3♦ 先出牌。`],
      gameStarted: true,
      passingPlayers: [false, false, false, false]
    });
    setSelectedCardIds(new Set());
    setIsAiThinking(false);
    setErrorMsg(null);
    setTimeLeft(TURN_TIME_LIMIT);
  };

  useEffect(() => {
    // Scroll log to bottom
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.gameLog]);

  // --- Timer Logic ---
  useEffect(() => {
    if (!gameState.gameStarted || gameState.winnerId !== null) return;

    setTimeLeft(TURN_TIME_LIMIT); // Reset timer on turn change

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          setTimeout(handleTimeout, 0); 
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [gameState.currentPlayerIndex, gameState.gameStarted, gameState.winnerId]);

  const handleTimeout = () => {
    if (gameState.winnerId !== null) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const mustPlay3D = gameState.gameLog.length === 1 && gameState.lastPlayedHand === null;
    
    if (!gameState.lastPlayedHand) {
        const sortedHand = sortHand(currentPlayer.hand);
        let cardToPlay = sortedHand[0];

        if (mustPlay3D) {
            const d3 = sortedHand.find(c => c.rank === Rank.Three && c.suit === Suit.Diamond);
            if (d3) cardToPlay = d3;
        }
        
        if (currentPlayer.isHuman) {
             setErrorMsg("時間到！自動為您出牌。");
        }
        playCards(currentPlayer.id, [cardToPlay]);
    } else {
        if (currentPlayer.isHuman) {
            setErrorMsg("時間到！自動過牌 (Pass)。");
        }
        passTurn(currentPlayer.id);
    }
  };

  // --- Turn Logic ---
  useEffect(() => {
    if (!gameState.gameStarted || gameState.winnerId !== null) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    if (!currentPlayer.isHuman && !isAiThinking) {
      // AI Turn
      const performAiTurn = async () => {
        setIsAiThinking(true);
        
        // Check for unbeatable hand - Instant Pass
        if (gameState.lastPlayedHand && isHandUnbeatable(gameState.lastPlayedHand)) {
             // Delay slightly for UX (so it doesn't feel like a glitch)
             await new Promise(resolve => setTimeout(resolve, 600));
             passTurn(currentPlayer.id);
             return;
        }

        // Regular AI Thought
        await new Promise(resolve => setTimeout(resolve, 600)); // Faster thinking time (600ms)

        if (gameState.winnerId !== null) return;

        const mustPlay3D = gameState.gameLog.length === 1 && gameState.lastPlayedHand === null;
        
        const allDeck = createDeck();
        const currentHandIds = new Set<string>();
        gameState.players.forEach(p => {
            p.hand.forEach(c => currentHandIds.add(c.id));
        });
        const playedCards = allDeck.filter(c => !currentHandIds.has(c.id));

        const opponents = gameState.players.filter(p => p.id !== currentPlayer.id);

        const move = await getAiMove(currentPlayer, {
          lastPlayedHand: gameState.lastPlayedHand,
          opponents,
          mustPlayThreeOfDiamonds: mustPlay3D,
          playedCards
        });

        if (move.action === 'play') {
          playCards(currentPlayer.id, move.cards);
        } else {
          passTurn(currentPlayer.id);
        }
        setIsAiThinking(false);
      };

      performAiTurn();
    }
  }, [gameState.currentPlayerIndex, gameState.gameStarted, gameState.winnerId]);

  // --- Actions ---

  const handleCardSelect = (card: CardType) => {
    if (gameState.players[0].id !== gameState.currentPlayerIndex) return;

    const newSelected = new Set(selectedCardIds);
    if (newSelected.has(card.id)) {
      newSelected.delete(card.id);
    } else {
      newSelected.add(card.id);
    }
    setSelectedCardIds(newSelected);
    setErrorMsg(null);
  };

  const playCards = (playerId: number, cards: CardType[]) => {
    const player = gameState.players[playerId];
    const analysis = analyzeHand(cards);
    const handTypeStr = analysis.type;
    
    const newHand = player.hand.filter(c => !cards.some(played => played.id === c.id));
    const newPlayers = [...gameState.players];
    newPlayers[playerId] = { ...player, hand: newHand, cardsCount: newHand.length };

    let winner = null;
    if (newHand.length === 0) {
      winner = playerId;
    }

    const newPassing = [false, false, false, false]; 

    // Play Sound Effect
    playSound('play');
    if (winner !== null) {
        setTimeout(() => playSound('win'), 500);
    }

    setGameState(prev => ({
      ...prev,
      players: newPlayers,
      lastPlayedHand: { type: analysis.type, cards, playerIndex: playerId, strength: analysis.strength },
      currentPlayerIndex: winner !== null ? -1 : (playerId + 1) % 4,
      winnerId: winner,
      gameLog: [...prev.gameLog, `${player.name} 出了 ${handTypeStr}`],
      passingPlayers: newPassing
    }));

    if (player.isHuman) {
      setSelectedCardIds(new Set());
    }
  };

  const passTurn = (playerId: number) => {
    const newPassing = [...gameState.passingPlayers];
    newPassing[playerId] = true;

    // Play Sound Effect
    playSound('pass');

    let nextIndex = (playerId + 1) % 4;
    
    let roundWon = false;
    if (gameState.lastPlayedHand && nextIndex === gameState.lastPlayedHand.playerIndex) {
        roundWon = true;
    }

    setGameState(prev => {
        const logMsg = `${prev.players[playerId].name} 過 (Pass)`;
        if (roundWon) {
            return {
                ...prev,
                currentPlayerIndex: nextIndex,
                lastPlayedHand: null,
                passingPlayers: [false, false, false, false],
                gameLog: [...prev.gameLog, logMsg, `${prev.players[nextIndex].name} 贏得此輪！自由出牌。`]
            };
        }
        return {
            ...prev,
            currentPlayerIndex: nextIndex,
            passingPlayers: newPassing,
            gameLog: [...prev.gameLog, logMsg]
        };
    });
  };

  const handleHumanPlay = () => {
    const human = gameState.players[0];
    if (human.id !== gameState.currentPlayerIndex) return;

    const cardsToPlay = human.hand.filter(c => selectedCardIds.has(c.id));
    const mustPlay3D = gameState.gameLog.length === 1 && gameState.lastPlayedHand === null;

    if (isValidMove(cardsToPlay, gameState.lastPlayedHand, !gameState.lastPlayedHand, mustPlay3D)) {
      playCards(0, cardsToPlay);
    } else {
      setErrorMsg("出牌無效！請檢查規則或必須大於枱面上的牌。");
    }
  };

  const handleHumanPass = () => {
    if (gameState.currentPlayerIndex !== 0) return;
    if (!gameState.lastPlayedHand) {
        setErrorMsg("自由出牌時不能 Pass！");
        return;
    }
    passTurn(0);
    setSelectedCardIds(new Set());
    setErrorMsg(null);
  };

  // --- Layout ---
  if (!gameState.gameStarted) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-green-900 text-white p-4 text-center bg-[url('https://www.transparenttextures.com/patterns/felt.png')]">
        <h1 className="text-6xl font-bold mb-4 font-serif tracking-wider text-yellow-400 drop-shadow-lg">鋤大D</h1>
        <h2 className="text-2xl mb-8 text-gray-300 font-serif">Big Two</h2>
        <div className="bg-black/30 p-8 rounded-2xl backdrop-blur-md max-w-md shadow-2xl border border-white/10">
            <p className="mb-6 text-lg">經典廣東啤牌遊戲，大戰 Gemini AI。</p>
            <button 
            onClick={initGame}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl py-4 px-10 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all transform hover:scale-105 flex items-center justify-center gap-2 mx-auto"
            >
             <Cpu size={24}/> 開始遊戲
            </button>
        </div>
      </div>
    );
  }

  const humanPlayer = gameState.players[0];
  const rightBot = gameState.players[1];
  const topBot = gameState.players[2];
  const leftBot = gameState.players[3];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1a472a] text-white overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/felt.png')]">
        
      {/* Game Info / Header */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-3xl font-serif text-yellow-500 font-bold drop-shadow-md">鋤大D</h1>
      </div>

      {/* Game Log Overlay - Bottom Right */}
      <div className="absolute bottom-48 right-4 w-48 lg:w-56 pointer-events-none z-10 hidden md:block">
         <div className="bg-black/40 p-3 rounded-xl text-xs lg:text-sm h-32 lg:h-48 overflow-y-auto flex flex-col border border-white/10 shadow-2xl backdrop-blur-sm scrollbar-hide">
             {/* Standard flex col, scrolling to bottom */}
             <div className="flex-1"></div> {/* Spacer to push content down if few logs */}
             {gameState.gameLog.map((log, i) => (
                 <div key={i} className="mb-1.5 text-white/90 text-shadow-sm font-medium leading-tight border-b border-white/5 pb-1 last:border-0">
                     {log}
                 </div>
             ))}
             <div ref={logEndRef} />
         </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 relative flex items-center justify-center perspective-1000">
        
        {/* Table Center Decoration */}
        <div className="absolute text-green-800/30 font-serif text-[20rem] font-bold select-none pointer-events-none rotate-12">
            ♠
        </div>

        {/* Players */}
        {/* Top Player */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <PlayerArea 
                player={topBot} 
                isCurrentTurn={gameState.currentPlayerIndex === 2} 
                position="top" 
                passed={gameState.passingPlayers[2]}
                timeLeft={gameState.currentPlayerIndex === 2 ? timeLeft : undefined}
            />
        </div>
        {/* Left Player */}
        <div className="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2">
            <PlayerArea 
                player={leftBot} 
                isCurrentTurn={gameState.currentPlayerIndex === 3} 
                position="left" 
                passed={gameState.passingPlayers[3]}
                timeLeft={gameState.currentPlayerIndex === 3 ? timeLeft : undefined}
            />
        </div>
        {/* Right Player */}
        <div className="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2">
            <PlayerArea 
                player={rightBot} 
                isCurrentTurn={gameState.currentPlayerIndex === 1} 
                position="right" 
                passed={gameState.passingPlayers[1]}
                timeLeft={gameState.currentPlayerIndex === 1 ? timeLeft : undefined}
            />
        </div>

        {/* Center: Last Played Cards */}
        <div className="z-10 min-h-[180px] flex items-center justify-center pointer-events-none">
            {gameState.lastPlayedHand ? (
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                    <div className="flex gap-2 sm:gap-4 scale-75 sm:scale-100 origin-center">
                        {gameState.lastPlayedHand.cards.map((c, i) => (
                            <div 
                                key={c.id} 
                                className="transform transition-transform duration-200"
                                style={{ zIndex: i }}
                            >
                                <Card card={c} />
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 bg-black/60 px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md border border-white/30 shadow-lg text-yellow-300">
                        {gameState.players[gameState.lastPlayedHand.playerIndex].name}: {gameState.lastPlayedHand.type}
                    </div>
                </div>
            ) : (
                <div className="text-white/30 font-bold text-2xl border-4 border-dashed border-white/10 p-8 rounded-xl rotate-[-5deg]">
                    自由出牌
                </div>
            )}
        </div>

        {/* Thinking Indicator */}
        {isAiThinking && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-36 z-20">
                 <div className="flex items-center gap-3 bg-white/90 text-black px-6 py-3 rounded-full shadow-2xl animate-pulse">
                    <Cpu className="w-5 h-5 text-blue-600" />
                    <span className="text-base font-bold">Gemini 思考中...</span>
                 </div>
            </div>
        )}

      </div>

      {/* Bottom Area: Human Player & Controls */}
      <div className="relative min-h-[30vh] bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 flex flex-col items-center justify-end pb-6">
         
         {/* Error Toast */}
         {errorMsg && (
            <div className="absolute -top-10 z-40 bg-red-500 text-white px-6 py-3 rounded-full shadow-xl animate-bounce flex items-center gap-2 font-bold">
                <AlertCircle size={20} /> {errorMsg}
            </div>
         )}

         {/* Controls */}
         {gameState.currentPlayerIndex === 0 && !gameState.winnerId && (
            <div className="absolute top-0 flex gap-4 z-30 animate-in slide-in-from-bottom-10 fade-in duration-300 pointer-events-auto">
                <div className="bg-black/50 rounded-full px-4 py-2 flex items-center gap-2 border border-white/20 text-yellow-400 font-mono font-bold">
                    <Clock size={20} /> {timeLeft}s
                </div>
                <button 
                    onClick={handleHumanPass}
                    disabled={!gameState.lastPlayedHand}
                    className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all border border-gray-500"
                >
                    Pass (過)
                </button>
                <button 
                    onClick={handleHumanPlay}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-12 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all transform hover:scale-105 disabled:opacity-50 border-2 border-yellow-300"
                >
                    出牌 (Play)
                </button>
            </div>
         )}

         <PlayerArea 
            player={humanPlayer} 
            isCurrentTurn={gameState.currentPlayerIndex === 0} 
            position="bottom" 
            onCardClick={handleCardSelect}
            selectedCardIds={selectedCardIds}
            passed={gameState.passingPlayers[0]}
            timeLeft={gameState.currentPlayerIndex === 0 ? timeLeft : undefined}
         />
      </div>

      {/* Winner Overlay */}
      {gameState.winnerId !== null && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-500">
            <Trophy className="w-32 h-32 text-yellow-400 mb-6 animate-bounce drop-shadow-[0_0_30px_rgba(234,179,8,0.8)]" />
            <h2 className="text-5xl font-bold text-white mb-4 text-center">
                {gameState.players[gameState.winnerId].name} 贏咗啦!
            </h2>
            <p className="text-gray-300 mb-10 text-xl">
                {gameState.winnerId === 0 ? "恭喜你成為大贏家！" : "再接再厲，下次好運！"}
            </p>
            <button 
                onClick={initGame}
                className="bg-white text-black font-bold text-lg py-4 px-10 rounded-full hover:bg-gray-200 transition-all flex items-center gap-3 shadow-xl transform hover:scale-105"
            >
                <RefreshCcw size={24} /> 再玩一局
            </button>
        </div>
      )}

    </div>
  );
}

export default App;