import React from 'react';
import { PalateMap } from '../types';
import { cn } from '../lib/utils';

interface TasteMatchProps {
  palateA: PalateMap;
  palateB: PalateMap;
  className?: string;
}

export const TasteMatch: React.FC<TasteMatchProps> = ({ palateA, palateB, className }) => {
  // Calculate Euclidean distance or similar for match percentage
  const axes = Object.keys(palateA) as (keyof PalateMap)[];
  const sumOfSquares = axes.reduce((sum, axis) => {
    return sum + Math.pow(palateA[axis] - palateB[axis], 2);
  }, 0);
  
  const distance = Math.sqrt(sumOfSquares);
  const maxDistance = Math.sqrt(axes.length); // Max distance if one is all 0 and other is all 1
  const matchPercentage = Math.max(0, Math.min(100, Math.round((1 - distance / maxDistance) * 100)));

  return (
    <div className={cn(
      "flex items-center gap-2 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight",
      matchPercentage > 80 ? "bg-accent/10 text-accent" : "bg-muted/10 text-muted",
      className
    )}>
      <div className="flex gap-0.5">
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className={cn(
              "w-1 h-3 rounded-full",
              matchPercentage > (i * 25) ? "bg-accent" : "bg-muted/20"
            )} 
          />
        ))}
      </div>
      <span>{matchPercentage}% TASTE MATCH</span>
    </div>
  );
};
