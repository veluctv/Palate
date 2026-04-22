import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FoodLog } from '../types';
import { Star, MessageCircle, Heart, Share2, Clock, Loader2 } from 'lucide-react';
import { formatRating } from '../lib/utils';
import { motion } from 'motion/react';
import { JioButton } from '../components/JioButton';
import { TasteMatch } from '../components/TasteMatch';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

export const FeedScreen: React.FC = () => {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = 'logs';
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(20));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FoodLog[];
      setLogs(newLogs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feed</h1>
        <div className="flex gap-2">
          <button className="text-xs font-bold uppercase tracking-widest text-accent border-b-2 border-accent pb-1">Following</button>
          <button className="text-xs font-bold uppercase tracking-widest text-muted pb-1">Global</button>
        </div>
      </div>

      <div className="space-y-12">
        {logs.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p>No logs yet. Be the first to log a meal!</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <motion.div 
              key={log.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-4"
            >
              {/* User Info */}
              <Link to={`/profile/${log.userId}`} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent group-hover:bg-accent group-hover:text-black transition-colors">
                  {log.userId[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold group-hover:text-accent transition-colors">User {log.userId.slice(0, 5)}</p>
                  <p className="text-[10px] text-muted uppercase tracking-tighter flex items-center gap-1">
                    <Clock size={10} /> {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleDateString() : 'Just now'}
                  </p>
                </div>
                <TasteMatch 
                  palateA={log.flavorProfile} 
                  palateB={log.flavorProfile} // In real app, compare with current user
                  className="ml-auto"
                />
              </Link>

              {/* Photo */}
              <div className="aspect-square rounded-3xl overflow-hidden border border-border relative group">
                <img 
                  src={log.photoURL} 
                  alt={log.dishName} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-white/10">
                  <Star className="w-4 h-4 fill-accent text-accent" />
                  <span className="font-bold">{formatRating(log.rating)}</span>
                </div>
                {log.worthTheQueue && (
                  <div className="absolute bottom-4 left-4 bg-accent text-black text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                    Worth the Queue
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-lg font-bold hover:text-accent cursor-pointer transition-colors">{log.dishName}</h2>
                  <span className="text-xs text-muted">at</span>
                  <span className="text-sm font-semibold text-muted hover:text-white cursor-pointer transition-colors">{log.restaurantName}</span>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  {log.review}
                </p>
                <div className="flex flex-wrap gap-2">
                  {log.tags?.map(tag => (
                    <span key={tag} className="text-[10px] bg-card border border-border px-2 py-0.5 rounded-md text-muted font-medium">#{tag}</span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-6 pt-2">
                <button className="flex items-center gap-2 text-muted hover:text-accent transition-colors">
                  <Heart size={20} />
                  <span className="text-xs font-bold">0</span>
                </button>
                <button className="flex items-center gap-2 text-muted hover:text-accent transition-colors">
                  <MessageCircle size={20} />
                  <span className="text-xs font-bold">0</span>
                </button>
                <button className="flex items-center gap-2 text-muted hover:text-accent transition-colors">
                  <Share2 size={20} />
                </button>
                <JioButton restaurantName={log.restaurantName} className="ml-auto" />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

