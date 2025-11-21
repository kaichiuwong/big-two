import React from 'react';
import { Player, Card as CardType } from '../types';
import { Card } from './Card';
import { clsx } from 'clsx';

interface PlayerAreaProps {
  player: Player;
  isCurrentTurn: boolean;
  position: 'bottom' | 'top' | 'left' | 'right';
  onCardClick?: (card: CardType) => void;
  selectedCardIds?: Set<string>;
  passed?: boolean;
  timeLeft?: number;
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({ 
  player, 
  isCurrentTurn, 
  position, 
  onCardClick, 
  selectedCardIds,
  passed,
  timeLeft
}) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  
  // Determine layout direction based on position
  // Left/Right = Always Vertical column
  const isVertical = position === 'left' || position === 'right';

  // Vertical overlap for side players
  const verticalOverlap = isMobile ? "-mt-12" : "-mt-16";
  
  // Horizontal overlap for top/bottom players
  const horizontalOverlap = player.hand.length > 10 
      ? (isMobile ? "-ml-8" : "-ml-10") 
      : (isMobile ? "-ml-6" : "-ml-8");

  // Render logic: Top player has Avatar First. All others (Left, Right, Bottom) have Avatar Last (Bottom).
  const showAvatarTop = position === 'top';

  const AvatarComponent = (
    <div className={clsx(
      "relative flex flex-col items-center p-2 rounded-xl transition-all z-30",
      // Margins based on position to separate from cards
      showAvatarTop ? "mb-4" : "mt-4", 
      isCurrentTurn ? "bg-yellow-500/20 ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.5)]" : "bg-black/20",
    )}>
      <div className="relative">
        <img 
          src={player.avatarUrl} 
          alt={player.name}
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-white/50 object-cover bg-gray-800"
        />
        
        {/* Timer Overlay */}
        {isCurrentTurn && timeLeft !== undefined && (
          <div className={clsx(
            "absolute -top-2 -right-2 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-white animate-bounce",
            timeLeft < 10 ? "bg-red-600" : "bg-yellow-600"
          )}>
            {timeLeft}
          </div>
        )}
      </div>

      <div className="text-white font-bold text-sm mt-1 bg-black/50 px-2 rounded-full truncate max-w-[100px]">
        {player.name}
      </div>
      <div className="text-yellow-300 text-xs font-mono">
        {player.hand.length} 張牌
      </div>

      {passed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl backdrop-blur-[1px]">
          <span className="text-white font-bold border-2 border-white px-2 py-1 -rotate-12 text-sm">PASS</span>
        </div>
      )}
    </div>
  );

  const HandComponent = (
    <div className={clsx(
      "flex items-center justify-center relative",
      isVertical ? "flex-col w-16 py-4" : "flex-row min-h-[100px]",
    )}>
      {player.hand.map((card, index) => (
        <div 
          key={card.id} 
          className={clsx(
            "transition-all duration-300",
            // Apply appropriate margin based on direction
            index !== 0 && (isVertical ? verticalOverlap : horizontalOverlap),
            "hover:z-40"
          )}
          style={{ zIndex: index }}
        >
          <Card 
            card={card} 
            hidden={!player.isHuman} 
            selected={selectedCardIds?.has(card.id)}
            onClick={() => onCardClick && onCardClick(card)}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className={clsx(
      "flex items-center transition-opacity duration-300 relative",
      "flex-col", 
      position === 'left' && "items-start ml-2",
      position === 'right' && "items-end mr-2",
      passed && "opacity-50 grayscale"
    )}>
      
      {showAvatarTop && AvatarComponent}
      {HandComponent}
      {!showAvatarTop && AvatarComponent}

    </div>
  );
};