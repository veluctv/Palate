import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Star, MapPin, Loader2 } from 'lucide-react';
import { DishCard } from '../components/DishCard';
import { Dish, FoodLog } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export const HomeScreen: React.FC = () => {
  const [featuredDishes, setFeaturedDishes] = useState<Dish[]>([]);
  const [recentLogs, setRecentLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        // Fetch featured dishes (top rated)
        const dishesQuery = query(
          collection(db, 'dishes'),
          orderBy('avgRating', 'desc'),
          limit(2)
        );
        const dishesSnapshot = await getDocs(dishesQuery);
        const dishes = dishesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dish));
        setFeaturedDishes(dishes);

        // Fetch recent activity
        const logsQuery = query(
          collection(db, 'logs'),
          orderBy('timestamp', 'desc'),
          limit(3)
        );
        const logsSnapshot = await getDocs(logsQuery);
        const logs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodLog));
        setRecentLogs(logs);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'home_data');
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12">
      {/* Hero */}
      <section className="space-y-4">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl md:text-6xl font-serif font-black leading-tight"
        >
          Your social record of <span className="text-accent italic">human taste.</span>
        </motion.h1>
        <p className="text-muted max-w-md">
          Log your meals, build your palate, and find your palate twins in Singapore and beyond.
        </p>
      </section>

      {/* Quick Stats / Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-3xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted">Your Palate</h3>
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          </div>
          <p className="text-2xl font-bold">Refining...</p>
          <p className="text-[10px] text-muted">Keep logging to sharpen your map.</p>
        </div>
        <div className="glass rounded-3xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted">Trending Area</h3>
            <MapPin size={14} className="text-accent" />
          </div>
          <p className="text-2xl font-bold">Tiong Bahru</p>
          <p className="text-[10px] text-muted">Popular among your taste matches.</p>
        </div>
      </div>

      {/* Featured */}
      {featuredDishes.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-accent" />
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold">Featured Plates</h2>
            </div>
            <button className="text-[10px] uppercase tracking-widest font-bold text-muted hover:text-white transition-colors">View All</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {featuredDishes.map(dish => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity Mini */}
      {recentLogs.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-muted">Recent Activity</h2>
          <div className="space-y-4">
            {recentLogs.map((log) => (
              <div key={log.id} className="glass rounded-2xl p-4 flex gap-4 items-center">
                <div className="w-12 h-12 rounded-xl bg-card overflow-hidden flex-shrink-0">
                  <img 
                    src={log.photoURL} 
                    alt={log.dishName} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{log.dishName}</p>
                  <p className="text-xs text-muted truncate">at {log.restaurantName}</p>
                </div>
                <div className="flex items-center gap-1 text-accent">
                  <Star size={12} className="fill-accent" />
                  <span className="text-xs font-bold">{log.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
