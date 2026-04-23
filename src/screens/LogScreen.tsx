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
  const [revisitCount, setRevisitCount] = useState(1);
  const [flavorProfile, setFlavorProfile] = useState<PalateMap | null>(null);
  const [step, setStep] = useState<'entry' | 'details' | 'success'>(searchParams.get('name') ? 'details' : 'entry');
  const [showManualMetrics, setShowManualMetrics] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultPalate: PalateMap = { 
    sweet: 0.5, sour: 0.5, salty: 0.5, bitter: 0.5, 
    umami: 0.5, spicy: 0.5, richness: 0.5, texture: 0.5 
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImage(base64);
        setStep('details');
        setFlavorProfile(defaultPalate); // Set defaults while loading
        await analyzeImage(base64.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualStart = () => {
    setFlavorProfile(defaultPalate);
    setStep('details');
  };

  const updateMetric = (key: keyof PalateMap, val: number) => {
    if (!flavorProfile) return;
    setFlavorProfile({ ...flavorProfile, [key]: val });
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
      // 1. Get User Profile for redundant storage
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      // 2. Save Log
      await addDoc(collection(db, path), {
        userId,
        username: userData?.username || 'anonymous',
        userDisplayName: userData?.displayName || 'Unknown User',
        dishName,
        restaurantName,
        rating,
        review,
        photoURL: image, // In a real app, upload to Storage first
        worthTheQueue,
        revisitCount,
        timestamp: serverTimestamp(),
        flavorProfile,
        tags: [],
      });

      // 3. Update User Profile Stats & Palate
      if (userSnap.exists()) {
        const count = userData.stats?.totalPlates || 0;
        const currentPalate = userData.palateMap || flavorProfile;
        
        // Calculate new weighted average for palate
        const newPalate: any = {};
        Object.keys(flavorProfile).forEach((key) => {
          const k = key as keyof PalateMap;
          const currentVal = (currentPalate as any)[k] || 0.5;
          newPalate[k] = (currentVal * count + (flavorProfile as any)[k]) / (count + 1);
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
        <h1 className="text-2xl font-bold">Meal Logged!</h1>
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
    <div className="space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold italic">Log a Meal</h1>
        {step === 'details' && (
          <button 
            onClick={() => setStep('entry')}
            className="text-[10px] uppercase font-bold text-muted hover:text-white"
          >
            Start Over
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {step === 'entry' ? (
          <motion.div 
            key="entry"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 gap-6"
          >
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-accent transition-colors bg-card/50 px-6 py-8"
            >
              <div className="p-4 bg-accent/10 rounded-full text-accent shadow-[0_0_20px_rgba(255,100,50,0.15)]">
                <Camera size={32} />
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold text-lg italic">Auto Log</p>
                <p className="text-xs text-muted max-w-[200px] mx-auto">Upload a photo for automatic detection</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload}
              />
            </div>

            <button 
              onClick={handleManualStart}
              className="flex items-center justify-between p-6 glass rounded-2xl group hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all"
            >
              <div className="text-left space-y-1">
                <p className="font-bold underline italic underline-offset-4 decoration-accent">Manual Log</p>
                <p className="text-[10px] text-muted">Skip the scan and fill the record yourself</p>
              </div>
              <Upload size={18} className="text-muted group-hover:text-accent transition-colors" />
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="details"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Visual Header */}
            {image ? (
              <div className="relative aspect-video rounded-3xl overflow-hidden border border-border shadow-2xl">
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 text-accent animate-spin" />
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold tracking-[0.3em] uppercase text-accent animate-pulse">Quantifying Taste</p>
                      <p className="text-[10px] text-muted italic">Identifying ingredients and flavor notes</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 glass rounded-3xl border border-dashed border-border text-center space-y-2">
                <p className="text-xs uppercase font-bold tracking-widest text-muted">Manual Mode</p>
                <p className="text-sm italic">Documentation via manual record</p>
              </div>
            )}

            {/* Core Form */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted">Dish Identity</label>
                  <input 
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    placeholder="Name of the plate"
                    className="w-full bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors font-bold italic"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted">Establishment</label>
                  <input 
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="Restaurant or Stall"
                    className="w-full bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-colors italic"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted">Meal Rating</label>
                <StarRating value={rating} onChange={setRating} size={36} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted">Flavor Commentary</label>
                <textarea 
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Record the specific textures and notes..."
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 h-24 focus:outline-none focus:border-accent transition-colors resize-none text-sm italic"
                />
              </div>

              {/* Palate Metrics Section */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-widest">Palate Profile</h3>
                    <p className="text-[10px] text-muted italic">Adjust the 8 flavor dimensions manually</p>
                  </div>
                  <button 
                    onClick={() => setShowManualMetrics(!showManualMetrics)}
                    className="text-[10px] uppercase font-bold text-accent"
                  >
                    {showManualMetrics ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>

                {showManualMetrics && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4"
                  >
                    {(Object.keys(defaultPalate) as Array<keyof PalateMap>).map((key) => (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-muted">{key}</span>
                          <span className="text-[10px] font-mono text-accent">{(flavorProfile?.[key] || 0.5).toFixed(2)}</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={flavorProfile?.[key] || 0.5}
                          onChange={(e) => updateMetric(key, parseFloat(e.target.value))}
                          className="w-full h-1 bg-card rounded-lg appearance-none cursor-pointer accent-accent appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
                        />
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Logistics Toggles */}
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setWorthTheQueue(!worthTheQueue)}
                  className={cn(
                    "flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all",
                    worthTheQueue ? "bg-accent/10 border-accent text-accent shadow-[0_0_15px_rgba(255,100,50,0.1)]" : "bg-card border-border text-muted"
                  )}
                >
                  <Clock size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Queue Worth</span>
                </button>
                <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl">
                  <div className="flex items-center gap-2 text-muted">
                    <Repeat size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Revisit</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setRevisitCount(Math.max(1, revisitCount - 1))} className="text-accent font-bold">-</button>
                    <span className="font-bold text-sm tracking-tighter">{revisitCount}</span>
                    <button onClick={() => setRevisitCount(revisitCount + 1)} className="text-accent font-bold">+</button>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={!dishName || rating === 0 || isAnalyzing}
                className="w-full bg-accent text-black font-serif font-black italic text-lg py-5 rounded-3xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-xl shadow-accent/20"
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
