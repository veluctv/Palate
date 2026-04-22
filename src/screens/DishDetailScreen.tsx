import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, Clock, MapPin, ChevronLeft, Share2, Heart, Loader2, TrendingUp } from 'lucide-react';
import { PalateChart } from '../components/PalateChart';
import { DishCard } from '../components/DishCard';
import { formatRating } from '../lib/utils';
import { Dish, FoodLog } from '../types';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { discoverFamousPlaces, discoverMenu } from '../services/geminiService';

export const DishDetailScreen: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dish, setDish] = useState<Dish | null>(null);
  const [recentLogs, setRecentLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredDishes, setDiscoveredDishes] = useState<any[]>([]);
  const [fullMenu, setFullMenu] = useState<any[]>([]);

  useEffect(() => {
    const fetchDishData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        // 1. Try fetching from 'dishes'
        const dishDoc = await getDoc(doc(db, 'dishes', id));
        let dishData: Dish | null = null;

        if (dishDoc.exists()) {
          dishData = { id: dishDoc.id, ...dishDoc.data() } as Dish;
        } else if (id.startsWith('resolve:') || id.startsWith('ChIJ') || id.length > 15) {
          // Resolve global AI discovery or Google Place IDs (ChIJ is common prefix)
          let targetRestaurant = '';
          let targetDish = '';
          let targetNeighborhood = '';

          if (id.startsWith('resolve:')) {
            const parts = id.split(':');
            targetDish = decodeURIComponent(parts[1]);
            targetRestaurant = decodeURIComponent(parts[2]);
            targetNeighborhood = decodeURIComponent(parts[3]);
          } else {
            // It's likely a raw Place ID from Google
            targetRestaurant = ''; 
          }

          try {
            // Find Google Place first
            const searchQuery = targetRestaurant ? `${targetRestaurant} ${targetNeighborhood}` : id;
            const searchRes = await fetch(`/api/places?query=${encodeURIComponent(searchQuery)}+Singapore`);
            const searchData = await searchRes.json();
            
            const place = searchData.results?.[0];
            if (place) {
              const res = await fetch(`/api/places/details?placeId=${place.place_id}`);
              const data = await res.json();
              const p = data.result;
              const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
              
              dishData = {
                id: id,
                name: targetDish || p.name,
                restaurantId: place.place_id,
                restaurantName: p.name,
                avgRating: p.rating || 0,
                photoURL: p.photos && apiKey ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${p.photos[0].photo_reference}&key=${apiKey}` : undefined,
                flavorProfile: { sweet: 0.5, sour: 0.5, salty: 0.5, bitter: 0.5, umami: 0.5, spicy: 0.5, richness: 0.5, texture: 0.5 },
                location: { neighborhood: p.vicinity }
              } as Dish;
              
              // Smart Menu Discovery!
              setDiscovering(true);
              const discovered = await discoverMenu(p.name, p.vicinity, targetDish);
              
              setFullMenu(discovered.map((d: any, idx: number) => ({
                id: `resolve:${encodeURIComponent(d.name)}:${encodeURIComponent(p.name)}:${encodeURIComponent(p.vicinity)}`,
                ...d,
                restaurantName: p.name,
                restaurantId: place.place_id,
                photoURL: `https://picsum.photos/seed/${d.name}${idx}/400/400`
              })));
            }
          } catch (e) {
            console.error('Resolution failed:', e);
          }
        }
        
        // Fallback to logs if still not found
        if (!dishData) {
          const logDoc = await getDoc(doc(db, 'logs', id));
          if (logDoc.exists()) {
            const logData = logDoc.data() as FoodLog;
            dishData = {
              id: logData.dishId || logDoc.id,
              name: logData.dishName,
              restaurantId: logData.restaurantId,
              restaurantName: logData.restaurantName,
              avgRating: logData.rating,
              flavorProfile: logData.flavorProfile,
              photoURL: logData.photoURL
            };
          }
        }

        if (dishData) {
          setDish(dishData);
          // 3. Fetch recent logs for this dish (Universal - by name)
          const logsQuery = query(
            collection(db, 'logs'), 
            where('dishName', '==', dishData.name),
            orderBy('timestamp', 'desc'),
            limit(10)
          );
          const logsSnapshot = await getDocs(logsQuery);
          setRecentLogs(logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FoodLog[]);

          // 4. Variety: If it's a dish, let's find other places that have it!
          try {
            const discovered = await discoverFamousPlaces(dishData.name);
            
            // Filter out the current restaurant
            const otherPlaces = discovered.filter((d: any) => d.name !== dishData.restaurantName);
            
            setDiscoveredDishes(otherPlaces.slice(0, 4).map((d: any, idx: number) => ({
              id: `resolve:${encodeURIComponent(dishData.name)}:${encodeURIComponent(d.name)}:${encodeURIComponent(d.neighborhood)}`,
              name: dishData.name,
              restaurantName: d.name,
              avgRating: d.estimatedRating,
              priceLevel: d.priceLevel,
              globalInfo: d.whyItsFamous,
              location: { neighborhood: d.neighborhood },
              photoURL: `https://picsum.photos/seed/${d.name}${idx}/400/300`
            })));
          } catch (e) {
            console.error('Variety discovery failed:', e);
          }
        }

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `dishes/${id}`);
      } finally {
        setLoading(false);
        setDiscovering(false);
      }
    };

    fetchDishData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!dish) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted">Dish not found.</p>
        <button onClick={() => navigate(-1)} className="text-accent font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 glass rounded-full">
          <ChevronLeft size={20} />
        </button>
        <div className="flex gap-2">
          <button className="p-2 glass rounded-full"><Heart size={20} /></button>
          <button className="p-2 glass rounded-full"><Share2 size={20} /></button>
        </div>
      </div>

      {/* Hero Image */}
      <div className="aspect-video rounded-3xl overflow-hidden border border-border relative">
        <img src={dish.photoURL || `https://picsum.photos/seed/${dish.name}/800/600`} alt={dish.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold drop-shadow-lg">{dish.name}</h1>
            <div className="flex items-center gap-2 text-white/80 text-sm drop-shadow-lg">
              <MapPin size={14} />
              <span>{dish.restaurantName}</span>
            </div>
          </div>
          <div className="bg-accent text-black px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
            <Star size={18} className="fill-black" />
            <span className="text-xl font-black">{formatRating(dish.avgRating)}</span>
          </div>
        </div>
      </div>

      {/* Primary Action */}
      <button 
        onClick={() => navigate(`/log?dishId=${encodeURIComponent(dish.id)}&name=${encodeURIComponent(dish.name)}&restaurant=${encodeURIComponent(dish.restaurantName)}`)}
        className="w-full bg-accent text-black font-black py-4 rounded-2xl shadow-xl shadow-accent/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
      >
        <TrendingUp size={20} />
        <span>LOG THIS MAKAN</span>
      </button>

      {/* Flavor Profile */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-muted">Flavor DNA</h2>
        <div className="glass rounded-3xl p-6 flex flex-col md:flex-row items-center gap-8">
          <div className="w-full max-w-[250px]">
            <PalateChart data={dish.flavorProfile} size={250} />
          </div>
          <div className="flex-1 space-y-4">
            <p className="text-sm text-muted leading-relaxed">
              This dish has a unique profile analyzed by our AI. Check the radar chart to see how its flavors balance out.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted">Richness</p>
                <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${dish.flavorProfile.richness * 100}%` }} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted">Spiciness</p>
                <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-red-500" style={{ width: `${dish.flavorProfile.spicy * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full Menu Section */}
      {fullMenu.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-muted">Signature Menu</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] text-muted font-bold">AI GENERATED MENU</span>
            </div>
          </div>
          <div className="space-y-4">
            {fullMenu.map((m: any) => (
              <div 
                key={m.id}
                onClick={() => navigate(`/dish/${m.id}`)}
                className="glass rounded-3xl p-4 flex items-center gap-4 hover:border-accent transition-all cursor-pointer group"
              >
                <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                  <img src={m.photoURL} alt={m.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-sm truncate group-hover:text-accent transition-colors">{m.name}</h3>
                    <span className="text-xs font-mono text-accent">{m.price}</span>
                  </div>
                  <p className="text-[10px] text-muted line-clamp-2 leading-relaxed italic">
                    {m.description || "Freshly analyzed flavor DNA for this iconic dish."}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                     <PalateChart data={m.flavorProfile} size={40} simple />
                     <span className="text-[8px] uppercase tracking-widest text-muted/60 font-bold">Analysed Profile</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Discovery Section (Variety) */}
      {discoveredDishes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-muted">Where to find this in SGP</h2>
            {discovering && <Loader2 size={12} className="animate-spin text-accent" />}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {discoveredDishes.map((d) => (
              <DishCard key={d.id} dish={d} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-muted">Community Palate Logs</h2>
        <div className="space-y-4">
          {recentLogs.length > 0 ? (
            recentLogs.map(log => (
              <div key={log.id} className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Link to={`/profile/${log.userId}`} className="flex items-center gap-2 group">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent group-hover:bg-accent group-hover:text-black transition-colors">
                      {log.userId[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-bold group-hover:text-accent transition-colors">User {log.userId.slice(0, 5)}</span>
                  </Link>
                  <div className="flex items-center gap-1 text-accent">
                    <Star size={10} className="fill-accent" />
                    <span className="text-[10px] font-bold">{formatRating(log.rating)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-accent/60">
                    <MapPin size={8} />
                    <span>{log.restaurantName}</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{log.review || "No review text provided."}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted italic">No logs yet for this dish.</p>
          )}
        </div>
      </section>
    </div>
  );
};
