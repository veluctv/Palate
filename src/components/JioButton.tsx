import React, { useState } from 'react';
import { Users, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface JioButtonProps {
  restaurantName: string;
  className?: string;
}

export const JioButton: React.FC<JioButtonProps> = ({ restaurantName, className }) => {
  const [isJioed, setIsJioed] = useState(false);

  return (
    <button 
      onClick={() => setIsJioed(!isJioed)}
      className={cn(
        "relative flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all overflow-hidden",
        isJioed 
          ? "bg-green-500/10 text-green-500 border border-green-500/20" 
          : "bg-card border border-border text-muted hover:bg-accent hover:text-black hover:border-accent",
        className
      )}
    >
      <AnimatePresence mode="wait">
        {isJioed ? (
          <motion.div
            key="check"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            exit={{ y: -20 }}
            className="flex items-center gap-2"
          >
            <Check size={14} />
            <span>Jio-ed!</span>
          </motion.div>
        ) : (
          <motion.div
            key="jio"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            exit={{ y: -20 }}
            className="flex items-center gap-2"
          >
            <Users size={14} />
            <span>Jio Me</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};
