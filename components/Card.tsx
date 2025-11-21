import React from 'react';
import { Card as CardType, Rank } from '../types';
import { getCardSymbol, getSuitSymbol, getSuitColor } from '../utils/cardUtils';
import { clsx } from 'clsx';
import { Crown } from 'lucide-react';

interface CardProps {
  card: CardType;
  selected?: boolean;
  onClick?: () => void;
  hidden?: boolean;
  small?: boolean; // For small displays like logs or opponents
}

export const Card: React.FC<CardProps> = ({ card, selected, onClick, hidden, small }) => {
  const symbol = getCardSymbol(card.rank);
  const suitSymbol = getSuitSymbol(card.suit);
  const colorClass = getSuitColor(card.suit);
  
  const isFaceCard = card.rank === Rank.Jack || card.rank === Rank.Queen || card.rank === Rank.King;
  const isAce = card.rank === Rank.Ace;

  if (hidden) {
    return (
      <div 
        className={clsx(
          "bg-blue-900 border-2 border-white rounded-lg shadow-md relative overflow-hidden",
          small ? "w-8 h-12" : "w-20 h-28 sm:w-24 sm:h-36"
        )}
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3/4 h-3/4 border border-blue-400/30 rounded-sm"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-white rounded-lg shadow-md select-none transition-transform duration-200 cursor-pointer relative overflow-hidden border border-gray-300",
        small ? "w-10 h-14" : "w-20 h-28 sm:w-24 sm:h-36",
        selected ? "-translate-y-6 shadow-2xl ring-4 ring-yellow-400 z-10" : "hover:-translate-y-2",
        colorClass
      )}
    >
      {/* Top Left Corner - Critical for fanned hands */}
      <div className={clsx(
          "absolute top-0.5 left-0.5 sm:top-1 sm:left-1 flex flex-col items-center leading-none z-10 bg-white/80 rounded px-0.5", 
          small ? "scale-75 origin-top-left" : ""
      )}>
        <span className="font-bold font-serif text-xl sm:text-2xl tracking-tighter">{symbol}</span>
        <span className="text-lg sm:text-xl -mt-1">{suitSymbol}</span>
      </div>

      {/* Bottom Right Corner (Rotated) */}
      <div className={clsx(
          "absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 flex flex-col items-center leading-none rotate-180 bg-white/80 rounded px-0.5", 
          small ? "scale-75 origin-bottom-right" : ""
      )}>
        <span className="font-bold font-serif text-xl sm:text-2xl tracking-tighter">{symbol}</span>
        <span className="text-lg sm:text-xl -mt-1">{suitSymbol}</span>
      </div>

      {/* Center Content */}
      {!small && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {isFaceCard ? (
            // Face Card Styling (JQK Patterns)
            <div className="w-[70%] h-[65%] border-2 border-current opacity-80 rounded-sm flex flex-col items-center justify-center relative overflow-hidden bg-current/5">
                {/* Decorative corners inside the box */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-current"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-current"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-current"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-current"></div>
                
                <Crown className="w-6 h-6 mb-1 opacity-70" />
                <span className="text-4xl font-serif font-bold z-10">{symbol}</span>
                <div className="absolute -bottom-4 -right-4 text-6xl opacity-10 rotate-[-15deg]">{suitSymbol}</div>
            </div>
          ) : isAce ? (
             // Ace Styling
             <div className="text-5xl opacity-80 transform scale-125">
               {suitSymbol}
             </div>
          ) : (
            // Number Card Styling
            <div className="flex flex-col items-center opacity-20 transform scale-150">
               <span className="text-4xl font-bold">{symbol}</span>
               <span className="text-2xl">{suitSymbol}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Small center for log view/small cards */}
      {small && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            {suitSymbol}
         </div>
      )}
    </div>
  );
};