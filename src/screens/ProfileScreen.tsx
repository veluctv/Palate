import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PalateChart } from '../components/PalateChart';
import { DishCard } from '../components/DishCard';
import { UserProfile, Dish, FoodLog, PalateMap, FoodList } from '../types';
import { MapPin, Utensils, Globe, Settings, Loader2, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { TasteMatch } from '../components/TasteMatch';
import { useAuth } from '../App';

export const ProfileScreen: React.FC = () => {
  const { id: paramId } = useParams<{ id: string }>();
  const { user: currentUser, profile: currentUserProfile } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLists, setUserLists] = useState<FoodList[]>([]);

  const userId = paramId || currentUser?.uid;

  useEffect(() => {
    const fetchProfileAndLogs = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      // If it's my own profile and we already have it in context, use it (optional optimization)
      if (userId === currentUser?.uid && currentUserProfile) {
        setProfile(currentUserProfile);
      } else {
        const userDocRef = doc(db, 'users', userId);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setProfile({ id: userDoc.id, ...userDoc.data() } as UserProfile);
          } else {
            setProfile(null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${userId}`);
        }
      }

      try {
        // Fetch Logs anyway for the target userId
        const logsQuery = query(collection(db, 'logs'), where('userId', '==', userId), limit(10));
        const logsSnapshot = await getDocs(logsQuery);
        const userLogs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FoodLog[];
        setLogs(userLogs);
      } catch (e) {
        console.error("Logs fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndLogs();
  }, [userId, currentUserProfile, currentUser?.uid]);

  useEffect(() => {
    const fetchLists = async () => {
      if (!profile?.lists || profile.lists.length === 0) {
        setUserLists([]);
        return;
      }
      try {
        const listsQuery = query(collection(db, 'lists'), where('id', 'in', profile.lists));
        const snap = await getDocs(listsQuery);
        setUserLists(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as FoodList));
      } catch (e) {
        console.error("Lists fetch error:", e);
      }
    };
    fetchLists();
  }, [profile?.lists]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center px-6">
        <div className="w-20 h-20 rounded-[2rem] bg-muted/10 flex items-center justify-center text-muted">
          <UserIcon size={32} />
        </div>
        <div className="space-y-2">
          <p className="text-xl font-bold italic">User not found</p>
          <p className="text-muted text-sm font-serif italic text-balance">
            The profile you are looking for does not exist in our flavor registry.
          </p>
        </div>
        <button 
          onClick={() => window.history.back()} 
          className="bg-accent text-black font-black uppercase tracking-[0.2em] text-[10px] px-8 py-4 rounded-2xl shadow-xl shadow-accent/20 hover:scale-105 transition-transform"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  const isOwnProfile = userId === currentUser?.uid;

  // Convert logs to Dish format for DishCard (simplified)
  const signatureDishes: Dish[] = logs.slice(0, 4).map(log => ({
    id: log.dishId || log.id,
    name: log.dishName,
    restaurantId: log.restaurantId,
    restaurantName: log.restaurantName,
    avgRating: log.rating,
    flavorProfile: log.flavorProfile,
    photoURL: log.photoURL
  }));

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-6">
          <div className="relative">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.displayName} className="w-24 h-24 rounded-[2rem] border-2 border-accent object-cover shadow-2xl shadow-accent/20" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-24 h-24 rounded-[2rem] bg-accent/10 border-2 border-accent/20 flex items-center justify-center text-3xl font-black text-accent italic shadow-2xl">
                {profile.displayName[0]}
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-black border border-border px-2 py-0.5 rounded-lg text-[8px] font-bold tracking-[0.2em] uppercase text-accent">
              Level {Math.floor(profile.stats.totalPlates / 10) + 1}
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black italic tracking-tight">{profile.displayName}</h1>
            <p className="text-accent text-xs font-bold tracking-widest uppercase">@{profile.username} <span className="text-muted/50 ml-1">Singapore</span></p>
          </div>
        </div>
        {isOwnProfile ? (
          <button className="p-3 glass rounded-2xl hover:bg-accent hover:text-black transition-all">
            <Settings className="w-5 h-5" />
          </button>
        ) : (
           currentUserProfile && (
             <div className="px-4 py-2 glass rounded-2xl">
               <TasteMatch palateA={profile.palateMap} palateB={currentUserProfile.palateMap} /> 
             </div>
           )
        )}
      </div>

      {profile.bio && (
        <p className="text-sm leading-relaxed max-w-md font-serif italic text-muted">
          "{profile.bio}"
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<Utensils className="w-4 h-4" />} label="Plates" value={profile.stats.totalPlates} />
        <StatCard icon={<Globe className="w-4 h-4" />} label="Cuisines" value={profile.stats.distinctCuisines} />
        <StatCard icon={<MapPin className="w-4 h-4" />} label="Areas" value={profile.stats.neighborhoods} />
      </div>

      {/* Palate Map */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] uppercase tracking-[0.3em] font-black text-muted">Palate Definition</h2>
          <div className="h-px flex-1 bg-border/30 mx-4" />
        </div>
        <div className="glass rounded-[3rem] p-8 aspect-square max-w-sm mx-auto shadow-2xl bg-gradient-to-br from-accent/5 to-transparent">
          <PalateChart data={profile.palateMap} />
        </div>
      </section>

      {/* Lists Section */}
      {userLists.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-[10px] uppercase tracking-[0.3em] font-black text-muted">Curated Lists</h2>
          <div className="space-y-4">
            {userLists.map(list => (
              <div key={list.id} className="p-6 glass rounded-3xl group cursor-pointer hover:shadow-xl transition-all border border-border/50">
                <p className="text-xs text-accent font-bold uppercase tracking-widest mb-1">{list.dishIds.length} Items</p>
                <h3 className="text-lg font-bold italic tracking-tight group-hover:text-accent transition-colors">{list.title}</h3>
                <p className="text-xs text-muted font-serif truncate mt-1">{list.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Signature 4 / Recent Logs */}
      <section className="space-y-6">
        <h2 className="text-[10px] uppercase tracking-[0.3em] font-black text-muted">
          {signatureDishes.length > 0 ? "Recent Experiences" : "Signature 4"}
        </h2>
        {signatureDishes.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {signatureDishes.map((dish) => (
              <motion.div
                key={dish.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
              >
                <DishCard dish={dish} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-[2rem] p-12 text-center space-y-4 border border-dashed border-border/50">
            <p className="text-sm text-muted font-serif italic text-balance mb-4">
              {isOwnProfile ? "Your food diary is currently empty. Start documenting your journey." : "This explorer has not yet shared their culinary records."}
            </p>
            {isOwnProfile && (
              <button 
                onClick={() => window.location.href = '/log'}
                className="bg-accent text-black text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-full shadow-lg shadow-accent/20"
              >
                Launch Auto Log
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <div className="glass rounded-2xl p-3 flex flex-col items-center gap-1">
    <div className="text-accent">{icon}</div>
    <span className="text-lg font-bold">{value}</span>
    <span className="text-[10px] uppercase tracking-wider text-muted font-bold">{label}</span>
  </div>
);
