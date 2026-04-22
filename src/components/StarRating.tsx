import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '../lib/utils';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ value, onChange, size = 24 }) => {
  return (
    <div className="flex items-center gap-1">
      {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((rating) => {
        const isFull = value >= rating;
        const isHalf = value + 0.5 === rating;
        
        // We only show 5 stars visually, but allow half-star selection
        if (rating % 1 !== 0) return null;

        return (
          <div key={rating} className="relative cursor-pointer group">
            <Star 
              className={cn(
                "transition-colors",
                value >= rating ? "fill-accent text-accent" : "text-border"
              )}
              size={size}
              onClick={() => onChange(rating)}
            />
            {/* Left half for .5 selection */}
            <div 
              className="absolute top-0 left-0 w-1/2 h-full z-10"
              onClick={(e) => {
                e.stopPropagation();
                onChange(rating - 0.5);
              }}
            />
          </div>
        );
      })}
      <span className="ml-2 text-sm font-bold text-accent">{value.toFixed(1)}</span>
    </div>
  );
};
