import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dish } from '../types';
import { Star, Bookmark } from 'lucide-react';
import { formatRating } from '../lib/utils';

interface DishCardProps {
  dish: Dish;
  onClick?: () => void;
}

export const DishCard: React.FC<DishCardProps> = ({ dish, onClick }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/dish/${dish.id}`);
    }
  };

  const officialName = dish.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  return (
    <div 
      className="group cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="dish-poster relative overflow-hidden rounded-2xl aspect-square border border-border/50">
        <img 
          src={dish.photoURL || `https://picsum.photos/seed/${dish.name}/400/400`} 
          alt={dish.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-3 right-3 bg-accent text-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg z-10">
          <Star className="w-3 h-3 fill-black text-black" />
          <span className="text-[10px] font-black">{formatRating(dish.avgRating)}</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); /* modal logic */ }}
          className="absolute bottom-3 right-3 p-2 glass rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent hover:text-black z-10 shadow-xl"
        >
          <Bookmark size={12} />
        </button>
        {(dish as any).isGlobal && (
          <div className="absolute top-3 left-3 bg-white/10 backdrop-blur-md border border-white/20 text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg">
            Discovery
          </div>
        )}
      </div>
      <div className="mt-3 space-y-0.5">
        <h3 className="text-sm font-bold truncate group-hover:text-accent transition-colors">
          {officialName}
        </h3>
        <p className="text-[10px] text-muted uppercase tracking-widest truncate">
          {dish.restaurantName === dish.name ? (dish as any).location?.neighborhood : dish.restaurantName}
        </p>
      </div>
    </div>
  );
};
