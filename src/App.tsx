import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signIn } from './firebase';
import { Layout } from './components/Layout';
import { HomeScreen } from './screens/HomeScreen';
import { SearchScreen } from './screens/SearchScreen';
import { LogScreen } from './screens/LogScreen';
import { FeedScreen } from './screens/FeedScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { DishDetailScreen } from './screens/DishDetailScreen';
import { AdminScreen } from './screens/AdminScreen';
import { Loader2 } from 'lucide-react';
import { UserProfile } from './types';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: UserProfile | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, profile: null });

export const useAuth = () => useContext(AuthContext);

const LoginScreen: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-8 text-center">
    <div className="space-y-4">
      <h1 className="text-5xl font-serif font-black italic text-accent">Palate</h1>
      <p className="text-muted max-w-xs mx-auto">
        Your social record of human taste. Join the community of foodies in Singapore.
      </p>
    </div>
    <button 
      onClick={signIn}
      className="bg-white text-black font-bold px-8 py-4 rounded-2xl flex items-center gap-3 hover:bg-accent transition-colors"
    >
      <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
      Continue with Google
    </button>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Essential: Sync profile at the entry point
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setProfile({ id: userDoc.id, ...userDoc.data() } as UserProfile);
          } else {
            const newProfile: UserProfile = {
              id: user.uid,
              username: user.email?.split('@')[0] || 'user',
              displayName: user.displayName || 'New Foodie',
              photoURL: user.photoURL || undefined,
              signature4: [],
              palateMap: {
                sweet: 0.5, sour: 0.5, salty: 0.5, bitter: 0.5,
                umami: 0.5, spicy: 0.5, richness: 0.5, texture: 0.5,
              },
              stats: { totalPlates: 0, distinctCuisines: 0, neighborhoods: 0 },
              lists: []
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
        } catch (e) {
          console.error("Critical: Profile fetch failure", e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, profile }}>
      <BrowserRouter>
        {!user ? (
          <Routes>
            <Route path="*" element={<LoginScreen />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomeScreen />} />
              <Route path="search" element={<SearchScreen />} />
              <Route path="log" element={<LogScreen />} />
              <Route path="feed" element={<FeedScreen />} />
              <Route path="profile" element={<ProfileScreen />} />
              <Route path="profile/:id" element={<ProfileScreen />} />
              <Route path="dish/:id" element={<DishDetailScreen />} />
              <Route path="admin" element={<AdminScreen />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        )}
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
