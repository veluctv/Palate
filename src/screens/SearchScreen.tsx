import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, MapPin, Utensils, Users, TrendingUp, Loader2, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { DishCard } from '../components/DishCard';
import { Dish, UserProfile } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, limit, orderBy, startAt, endAt } from 'firebase/firestore';

const TRENDING_DISHES: Dish[] = [
  { id: 't1', name: 'Mala Xiang Guo', restaurantId: 'r7', restaurantName: 'Ri Ri Hong', avgRating: 4.6, flavorProfile: { sweet: 0.1, sour: 0.2, salty: 0.8, bitter: 0.3, umami: 0.9, spicy: 1.0, richness: 0.7, texture: 0.8 } },
  { id: 't2', name: 'Croissant', restaurantId: 'r8', restaurantName: 'Tiong Bahru Bakery', avgRating: 4.7, flavorProfile: { sweet: 0.3, sour: 0.1, salty: 0.4, bitter: 0.1, umami: 0.6, spicy: 0.0, richness: 0.9, texture: 1.0 } },
  { id: 't3', name: 'Nasi Lemak', restaurantId: 'r9', restaurantName: 'The Village', avgRating: 4.4, flavorProfile: { sweet: 0.4, sour: 0.1, salty: 0.6, bitter: 0.1, umami: 0.8, spicy: 0.7, richness: 0.8, texture: 0.6 } },
  { id: 't4', name: 'Oyster Omelette', restaurantId: 'r10', restaurantName: 'Newton Circus', avgRating: 4.5, flavorProfile: { sweet: 0.1, sour: 0.2, salty: 0.7, bitter: 0.1, umami: 0.9, spicy: 0.4, richness: 0.8, texture: 0.7 } },
];

import { discoverFamousPlaces } from '../services/geminiService';

export const SearchScreen: React.FC = () => {
  const [queryText, setQueryText] = useState('');
  const [activeTab, setActiveTab] = useState<'top' | 'dishes' | 'restaurants' | 'people'>('top');
  const [results, setResults] = useState<any[]>([]);
  const [topResults, setTopResults] = useState<{ dishes: any[], people: any[], restaurants: any[], global: any[] }>({ dishes: [], people: [], restaurants: [], global: [] });
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (!queryText.trim()) {
        setResults([]);
        setTopResults({ dishes: [], people: [], restaurants: [], global: [] });
        return;
      }

      setLoading(true);

      const fetchPlaces = async (text: string) => {
        try {
          console.log(`Places Probe: ${text}`);
          // Broad first search
          const res = await fetch(`/api/places?query=${encodeURIComponent(text + " Singapore")}`);
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error('Places API Error:', res.status, errData);
            return [];
          }
          const data = await res.json();
          
          let results = data.results || [];

          if (results.length === 0) {
            console.log(`No results for "${text} Singapore", trying raw query...`);
            const res2 = await fetch(`/api/places?query=${encodeURIComponent(text)}`);
            if (res2.ok) {
               const data2 = await res2.json();
               results = data2.results || [];
            }
          }

          if (results.length > 0) {
            const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
            return results.map((p: any) => ({
              id: p.place_id,
              name: p.name,
              restaurantName: p.name,
              restaurantId: p.place_id,
              avgRating: p.rating || 0,
              photoURL: p.photos && apiKey ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photos[0].photo_reference}&key=${apiKey}` : undefined,
              location: { neighborhood: p.vicinity?.split(',')[0] || 'Singapore' },
              type: 'restaurant'
            }));
          }
        } catch (error) {
          console.error('Network failure in fetchPlaces:', error);
        }
        return [];
      };

      const fetchFirestore = async (collectionName: string, searchField: string, text: string, type: 'dish' | 'person') => {
        try {
          const queries = new Set([text.toLowerCase(), text]);
          queries.add(text.charAt(0).toUpperCase() + text.slice(1));
          const titleCase = text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
          queries.add(titleCase);

          const allResults: any[] = [];
          for (const qText of Array.from(queries)) {
            const q = query(
              collection(db, collectionName),
              where(searchField, '>=', qText),
              where(searchField, '<=', qText + '\uf8ff'),
              limit(10)
            );
            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
              const data = doc.data();
              if (!allResults.find(r => r.id === doc.id)) {
                allResults.push({ id: doc.id, ...data, type });
              }
            });
          }
          return allResults;
        } catch (error) {
          console.error(`Failed to fetch ${collectionName}:`, error);
          return [];
        }
      };

      const fetchGlobalDiscovery = async (text: string) => {
        setDiscovering(true);
        try {
          const discovered = await discoverFamousPlaces(text);
          
          const formattedQuery = text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          
          return discovered.map((d: any, idx: number) => ({
            id: `resolve:${encodeURIComponent(formattedQuery)}:${encodeURIComponent(d.name)}:${encodeURIComponent(d.neighborhood)}`,
            name: formattedQuery,
            restaurantName: d.name,
            avgRating: d.estimatedRating,
            priceLevel: d.priceLevel,
            location: { neighborhood: d.neighborhood },
            type: 'dish',
            isGlobal: true,
            globalInfo: d.whyItsFamous
          }));
        } catch (e) {
          console.error('Smart discovery failed:', e);
          return [];
        } finally {
          setDiscovering(false);
        }
      };

      if (activeTab === 'top') {
        const fetchAll = async () => {
          setLoading(true);
          
          let dishes: any[] = [];
          let people: any[] = [];
          let restaurants: any[] = [];
          let global: any[] = [];

          try {
            console.log(`Searching for: ${queryText}`);
            const results = await Promise.allSettled([
              fetchFirestore('dishes', 'name', queryText, 'dish'),
              fetchFirestore('users', 'displayName', queryText, 'person'),
              fetchPlaces(queryText),
              queryText.length >= 3 ? fetchGlobalDiscovery(queryText) : Promise.resolve([])
            ]);

            if (results[0].status === 'fulfilled') dishes = results[0].value;
            if (results[1].status === 'fulfilled') people = results[1].value;
            if (results[2].status === 'fulfilled') restaurants = results[2].value;
            if (results[3].status === 'fulfilled') global = results[3].value;
            
            console.log(`Results found - Local: ${dishes.length}, Places: ${restaurants.length}, Global AI: ${global.length}`);
          } catch (e) {
            console.error("Aggregation error:", e);
          }

          setTopResults({ dishes, people, restaurants, global });
          setLoading(false);
        };

        fetchAll();
        return;
      }

      if (activeTab === 'restaurants') {
        const restaurants = await fetchPlaces(queryText);
        setResults(restaurants);
        setLoading(false);
        return;
      }

      let collectionName = 'dishes';
      let searchField = 'name';
      let type: 'dish' | 'person' = 'dish';

      if (activeTab === 'people') {
        collectionName = 'users';
        searchField = 'displayName';
        type = 'person';
      }

      const [firestoreResults, globalDiscovery] = await Promise.all([
        fetchFirestore(collectionName, searchField, queryText, type),
        (activeTab === 'dishes' && queryText.length >= 3) ? fetchGlobalDiscovery(queryText) : Promise.resolve([])
      ]);
      
      setResults([...firestoreResults, ...globalDiscovery]);
      setLoading(false);
    };

    const timeoutId = setTimeout(performSearch, 500);
    return () => clearTimeout(timeoutId);
  }, [queryText, activeTab]);

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="relative group">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5 group-focus-within:text-accent transition-colors" />
        <input 
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="Search dishes, places, or foodies..."
          className="w-full bg-card border border-border rounded-2xl pl-12 pr-12 py-4 focus:outline-none focus:border-accent transition-colors"
        />
        {queryText && (
          <button 
            onClick={() => setQueryText('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-white p-1"
          >
            <Loader2 className={cn("w-4 h-4", loading && "animate-spin")} />
            {!loading && <span className="text-lg leading-none">&times;</span>}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border overflow-x-auto no-scrollbar">
        <TabButton 
          active={activeTab === 'top'} 
          onClick={() => setActiveTab('top')} 
          label="Top" 
        />
        <TabButton 
          active={activeTab === 'dishes'} 
          onClick={() => setActiveTab('dishes')} 
          icon={<Utensils size={14} />} 
          label="Dishes" 
        />
        <TabButton 
          active={activeTab === 'restaurants'} 
          onClick={() => setActiveTab('restaurants')} 
          icon={<MapPin size={14} />} 
          label="Places" 
        />
        <TabButton 
          active={activeTab === 'people'} 
          onClick={() => setActiveTab('people')} 
          icon={<Users size={14} />} 
          label="People" 
        />
      </div>

      {/* Content */}
      {!queryText ? (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-accent">
              <TrendingUp size={18} />
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold">Trending in Singapore</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {TRENDING_DISHES.map(dish => (
                <DishCard key={dish.id} dish={dish} />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-muted">Popular Neighborhoods</h2>
            <div className="flex flex-wrap gap-2">
              {['Tanjong Pagar', 'Tiong Bahru', 'Orchard', 'Katong', 'Joo Chiat', 'Bugis', 'Holland Village'].map(area => (
                <button 
                  key={area} 
                  onClick={() => { setQueryText(area); setActiveTab('top'); }}
                  className="glass px-4 py-2 rounded-xl text-xs font-bold hover:border-accent hover:text-accent transition-colors transition-transform active:scale-95"
                >
                  {area}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : activeTab === 'top' ? (
            <div className="space-y-8">
              {topResults.global.length > 0 && (
                <section className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white">Dish-First Discovery</h3>
                    </div>
                    <span className="text-[10px] text-muted uppercase tracking-widest">Global Intelligence</span>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {topResults.global.map((dish: any) => (
                      <Link 
                        key={dish.id} 
                        to={`/dish/${dish.id}`}
                        className="group relative overflow-hidden rounded-3xl glass hover:border-accent transition-all duration-500"
                      >
                        <div className="flex aspect-[21/9]">
                          <div className="w-1/3 h-full overflow-hidden">
                            <img 
                              src={`https://picsum.photos/seed/${dish.restaurantName}/400/400`} 
                              alt={dish.restaurantName}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-75 group-hover:brightness-100" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 p-6 flex flex-col justify-center gap-2 relative bg-gradient-to-r from-card/80 to-card">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] uppercase tracking-widest font-black text-accent">{dish.name}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-muted">{dish.priceLevel}</span>
                                <div className="flex items-center gap-1 bg-accent/10 px-2 py-0.5 rounded-full">
                                  <Star size={10} className="text-accent fill-accent" />
                                  <span className="text-[10px] font-bold text-accent">{dish.avgRating}</span>
                                </div>
                              </div>
                            </div>
                            <h4 className="text-2xl font-serif italic font-bold group-hover:text-accent transition-colors leading-tight">{dish.restaurantName}</h4>
                            <div className="flex items-center gap-2 text-muted text-xs">
                              <MapPin size={12} className="text-accent" />
                              <span className="font-bold">{dish.location.neighborhood}</span>
                            </div>
                            <p className="text-xs text-muted leading-relaxed line-clamp-2 mt-1">
                              {dish.globalInfo}
                            </p>
                          </div>
                        </div>
                        <div className="absolute top-4 right-4 pointer-events-none">
                           <div className="text-[8px] font-black uppercase tracking-widest bg-white/10 backdrop-blur px-2 py-1 rounded-full text-white/50 border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                             Check Variety
                           </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {topResults.people.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted px-1">People</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {topResults.people.slice(0, 2).map((user: UserProfile) => (
                      <Link key={user.id} to={`/profile/${user.id}`} className="glass rounded-2xl p-4 flex items-center gap-3 hover:border-accent transition-colors group">
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent group-hover:bg-accent group-hover:text-black transition-colors">
                          {user.displayName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate group-hover:text-accent transition-colors">{user.displayName}</p>
                          <p className="text-[10px] text-muted truncate">@{user.username}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {topResults.dishes.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted px-1">Community Favorites</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {topResults.dishes.slice(0, 2).map((dish: Dish) => (
                      <DishCard key={dish.id} dish={dish} />
                    ))}
                  </div>
                </section>
              )}
              {topResults.restaurants.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted px-1">Places</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {topResults.restaurants.slice(0, 4).map((restaurant: any) => (
                      <DishCard key={restaurant.id} dish={restaurant as Dish} />
                    ))}
                  </div>
                </section>
              )}

              {topResults.dishes.length === 0 && topResults.people.length === 0 && topResults.restaurants.length === 0 && topResults.global.length === 0 && (
                <div className="text-center py-20 text-muted space-y-4">
                  <Utensils className="w-12 h-12 mx-auto opacity-20" />
                  <div className="space-y-1">
                    <p className="font-bold text-white">No results found for "{queryText}"</p>
                    <p className="text-[10px] uppercase tracking-[0.2em]">Our AI is currently scouring Singapore for new flavors.</p>
                  </div>
                </div>
              )}
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {activeTab === 'people' ? (
                results.map((user: UserProfile) => (
                  <Link key={user.id} to={`/profile/${user.id}`} className="glass rounded-2xl p-4 flex items-center gap-3 hover:border-accent transition-colors group">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent group-hover:bg-accent group-hover:text-black transition-colors">
                      {user.displayName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate group-hover:text-accent transition-colors">{user.displayName}</p>
                      <p className="text-[10px] text-muted truncate">@{user.username}</p>
                    </div>
                  </Link>
                ))
              ) : (
                results.map((item: any) => (
                  <DishCard key={item.id} dish={item as Dish} />
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-muted space-y-2">
              <p>No results found for "{queryText}"</p>
              <p className="text-[10px] uppercase tracking-widest">Tip: Try a broader search or check your spelling.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon?: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 pb-3 px-1 transition-all border-b-2 shrink-0",
      active ? "text-accent border-accent" : "text-muted border-transparent hover:text-white"
    )}
  >
    {icon}
    <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
  </button>
);
