import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PalateChart } from '../components/PalateChart';
import { DishCard } from '../components/DishCard';
import { UserProfile, Dish, FoodLog } from '../types';
import { MapPin, Utensils, Globe, Settings, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';

export const ProfileScreen: React.FC = () => {
  const { id: paramId } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = paramId || auth.currentUser?.uid;

  useEffect(() => {
    const fetchProfileAndLogs = async () => {
      if (!userId) return;

      const userDocRef = doc(db, 'users', userId);
      
      try {
        // Fetch Profile
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setProfile({ id: userDoc.id, ...userDoc.data() } as UserProfile);
        } else if (userId === auth.currentUser?.uid) {
          // Create default profile if it's the current user and doesn't exist
          const newProfile: UserProfile = {
            id: userId,
            username: auth.currentUser.email?.split('@')[0] || 'user',
            displayName: auth.currentUser.displayName || 'New Foodie',
            photoURL: auth.currentUser.photoURL || undefined,
            signature4: [],
            palateMap: {
              sweet: 0.5,
              sour: 0.5,
              salty: 0.5,
              bitter: 0.5,
              umami: 0.5,
              spicy: 0.5,
              richness: 0.5,
              texture: 0.5,
            },
            stats: {
              totalPlates: 0,
              distinctCuisines: 0,
              neighborhoods: 0,
            },
          };
          await setDoc(userDocRef, newProfile);
          setProfile(newProfile);
        } else {
          // Profile not found
          setProfile(null);
        }

        // Fetch Logs
        const logsQuery = query(collection(db, 'logs'), where('userId', '==', userId), limit(10));
        const logsSnapshot = await getDocs(logsQuery);
        const userLogs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FoodLog[];
        setLogs(userLogs);

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndLogs();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-muted">User profile not found.</p>
        <button onClick={() => window.history.back()} className="text-accent font-bold uppercase tracking-widest text-xs">Go Back</button>
      </div>
    );
  }

  const isOwnProfile = userId === auth.currentUser?.uid;

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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt={profile.displayName} className="w-20 h-20 rounded-full border-2 border-accent object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center text-2xl font-bold text-accent">
              {profile.displayName[0]}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{profile.displayName}</h1>
            <p className="text-muted">@{profile.username}</p>
          </div>
        </div>
        {isOwnProfile && (
          <button className="p-2 hover:bg-card rounded-full transition-colors">
            <Settings className="w-6 h-6 text-muted" />
          </button>
        )}
      </div>

      {profile.bio && (
        <p className="text-sm leading-relaxed max-w-md">
          {profile.bio}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<Utensils className="w-4 h-4" />} label="Plates" value={logs.length || profile.stats.totalPlates} />
        <StatCard icon={<Globe className="w-4 h-4" />} label="Cuisines" value={profile.stats.distinctCuisines} />
        <StatCard icon={<MapPin className="w-4 h-4" />} label="Areas" value={profile.stats.neighborhoods} />
      </div>

      {/* Palate Map */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-muted">Palate Map</h2>
          <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold">REFINING...</span>
        </div>
        <div className="glass rounded-3xl p-4 aspect-square max-w-sm mx-auto">
          <PalateChart data={profile.palateMap} />
        </div>
      </section>

      {/* Signature 4 / Recent Logs */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-muted">
          {signatureDishes.length > 0 ? "Recent Plates" : "Signature 4"}
        </h2>
        {signatureDishes.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {signatureDishes.map((dish) => (
              <motion.div
                key={dish.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <DishCard dish={dish} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-3xl p-12 text-center space-y-4">
            <p className="text-sm text-muted">{isOwnProfile ? "You haven't logged any meals yet." : "This user hasn't logged any meals yet."}</p>
            {isOwnProfile && (
              <button 
                onClick={() => window.location.href = '/log'}
                className="text-xs font-bold uppercase tracking-widest text-accent"
              >
                Start Logging
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
