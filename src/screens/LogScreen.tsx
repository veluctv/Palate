import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Star, Clock, Repeat, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { StarRating } from '../components/StarRating';
import { identifyDishFromImage } from '../services/gemini';
import { PalateMap } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';

export const LogScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dishName, setDishName] = useState(searchParams.get('name') || '');
  const [restaurantName, setRestaurantName] = useState(searchParams.get('restaurant') || '');
  const [dishId, setDishId] = useState(searchParams.get('dishId') || '');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [worthTheQueue, setWorthTheQueue] = useState(false);
  const [reMakanCount, setReMakanCount] = useState(1);
  const [flavorProfile, setFlavorProfile] = useState<PalateMap | null>(null);
  const [step, setStep] = useState<'upload' | 'details' | 'success'>(searchParams.get('name') ? 'details' : 'upload');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImage(base64);
        setStep('details');
        await analyzeImage(base64.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64: string) => {
    setIsAnalyzing(true);
    try {
      const result = await identifyDishFromImage(base64);
      setDishName(result.dishName);
      if (result.restaurantName) setRestaurantName(result.restaurantName);
      setFlavorProfile(result.flavorProfile);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!auth.currentUser || !flavorProfile) return;
    
    setIsAnalyzing(true);
    const userId = auth.currentUser.uid;
    const path = 'logs';
    
    try {
      // 1. Save Log
      await addDoc(collection(db, path), {
        userId,
        dishName,
        restaurantName,
        rating,
        review,
        photoURL: image, // In a real app, upload to Storage first
        worthTheQueue,
        reMakanCount,
        timestamp: serverTimestamp(),
        flavorProfile,
        tags: [],
      });

      // 2. Update User Profile Stats & Palate
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const count = userData.stats?.totalPlates || 0;
        const currentPalate = userData.palateMap || flavorProfile;
        
        // Calculate new weighted average for palate
        const newPalate: any = {};
        Object.keys(flavorProfile).forEach((key) => {
          const k = key as keyof PalateMap;
          const currentVal = currentPalate[k] || 0.5;
          newPalate[k] = (currentVal * count + flavorProfile[k]) / (count + 1);
        });

        await updateDoc(userRef, {
          palateMap: newPalate,
          'stats.totalPlates': increment(1),
        });
      }

      setStep('success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12 }}
        >
          <CheckCircle2 className="w-20 h-20 text-green-500" />
        </motion.div>
        <h1 className="text-2xl font-bold">Makan Logged!</h1>
        <p className="text-muted">Your palate has been updated. Keep eating!</p>
        <button 
          onClick={() => window.location.href = '/profile'}
          className="bg-accent text-black font-bold px-8 py-3 rounded-full"
        >
          View Profile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <h1 className="text-2xl font-bold">Log a Meal</h1>

      <AnimatePresence mode="wait">
        {step === 'upload' ? (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-accent transition-colors bg-card/50"
            >
              <div className="p-4 bg-accent/10 rounded-full text-accent">
                <Camera size={32} />
              </div>
              <div className="text-center">
                <p className="font-bold">Snap or Upload</p>
                <p className="text-xs text-muted">Magic Log will detect the dish</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="details"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Image Preview */}
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-border">
              <img src={image!} alt="Preview" className="w-full h-full object-cover" />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  <p className="text-xs font-bold tracking-widest uppercase">Analyzing Dish...</p>
                </div>
              )}
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted">Dish Name</label>
                <input 
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  placeholder="What are you eating?"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted">Restaurant</label>
                <input 
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Where are you?"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted">Rating</label>
                <StarRating value={rating} onChange={setRating} size={32} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted">Review</label>
                <textarea 
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Tell us about the flavors..."
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 h-32 focus:outline-none focus:border-accent transition-colors resize-none"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setWorthTheQueue(!worthTheQueue)}
                  className={cn(
                    "flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all",
                    worthTheQueue ? "bg-accent/10 border-accent text-accent" : "bg-card border-border text-muted"
                  )}
                >
                  <Clock size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Worth Queue?</span>
                </button>
                <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl">
                  <div className="flex items-center gap-2 text-muted">
                    <Repeat size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Re-makan</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setReMakanCount(Math.max(1, reMakanCount - 1))} className="text-accent">-</button>
                    <span className="font-bold">{reMakanCount}</span>
                    <button onClick={() => setReMakanCount(reMakanCount + 1)} className="text-accent">+</button>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={!dishName || rating === 0}
                className="w-full bg-accent text-black font-bold py-4 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                Log to Palate
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
