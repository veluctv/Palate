import React, { useState } from 'react';
import { Users, Check, BookmarkPlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface EatlistButtonProps {
  restaurantName: string;
  className?: string;
}

export const EatlistButton: React.FC<EatlistButtonProps> = ({ restaurantName, className }) => {
  const [isOnEatlist, setIsOnEatlist] = useState(false);

  return (
    <button 
      onClick={() => setIsOnEatlist(!isOnEatlist)}
      className={cn(
        "relative flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all overflow-hidden",
        isOnEatlist 
          ? "bg-accent/20 text-accent border border-accent/30" 
          : "bg-card border border-border text-muted hover:bg-accent hover:text-black hover:border-accent",
        className
      )}
    >
      <AnimatePresence mode="wait">
        {isOnEatlist ? (
          <motion.div
            key="check"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            exit={{ y: -20 }}
            className="flex items-center gap-2"
          >
            <Check size={14} />
            <span>On Eatlist!</span>
          </motion.div>
        ) : (
          <motion.div
            key="invite"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            exit={{ y: -20 }}
            className="flex items-center gap-2"
          >
            <BookmarkPlus size={14} />
            <span>Eatlist Me</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};
