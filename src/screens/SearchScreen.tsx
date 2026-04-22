import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, MapPin, Utensils, Users, TrendingUp, Loader2, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { DishCard } from '../components/DishCard';
import { Dish, UserProfile } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { discoverFamousPlaces } from '../services/geminiService';

const TRENDING_DISHES: Dish[] = [
  { id: 't1', name: 'Mala Xiang Guo', restaurantId: 'r7', restaurantName: 'Ri Ri Hong', avgRating: 4.6, flavorProfile: { sweet: 0.1, sour: 0.2, salty: 0.8, bitter: 0.3, umami: 0.9, spicy: 1.0, richness: 0.7, texture: 0.8 } },
  { id: 't2', name: 'Croissant', restaurantId: 'r8', restaurantName: 'Tiong Bahru Bakery', avgRating: 4.7, flavorProfile: { sweet: 0.3, sour: 0.1, salty: 0.4, bitter: 0.1, umami: 0.6, spicy: 0.0, richness: 0.9, texture: 1.0 } },
  { id: 't3', name: 'Nasi Lemak', restaurantId: 'r9', restaurantName: 'The Village', avgRating: 4.4, flavorProfile: { sweet: 0.4, sour: 0.1, salty: 0.6, bitter: 0.1, umami: 0.8, spicy: 0.7, richness: 0.8, texture: 0.6 } },
  { id: 't4', name: 'Oyster Omelette', restaurantId: 'r10', restaurantName: 'Newton Circus', avgRating: 4.5, flavorProfile: { sweet: 0.1, sour: 0.2, salty: 0.7, bitter: 0.1, umami: 0.9, spicy: 0.4, richness: 0.8, texture: 0.7 } },
];

export const SearchScreen: React.FC = () => {
  const [queryText, setQueryText] = useState('');
  const [activeTab, setActiveTab] = useState<'top' | 'dishes' | 'restaurants' | 'people'>('top');
  const [results, setResults] = useState<any[]>([]);
  const [topResults, setTopResults] = useState<{ dishes: any[], people: any[], restaurants: any[], global: any[] }>({ dishes: [], people: [], restaurants: [], global: [] });
  const [loading, setLoading] = useState(false);
  const [keyHealth, setKeyHealth] = useState<{ googleMaps: boolean; gemini: boolean }>({ googleMaps: true, gemini: true });

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setKeyHealth({ 
          googleMaps: data.googleMapsKeyConfigured, 
          gemini: data.geminiKeyConfigured 
        });
      })
      .catch(() => console.error("Could not check key health"));
  }, []);

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
          const res = await fetch(`/api/places?query=${encodeURIComponent(text + " Singapore")}`);
          if (!res.ok) return [];
          const data = await res.json();
          let results = data.results || [];

          if (results.length === 0) {
            const res2 = await fetch(`/api/places?query=${encodeURIComponent(text)}`);
            if (res2.ok) {
               const data2 = await res2.json();
               results = data2.results || [];
            }
          }

          if (results.length > 0) {
            return results.map((p: any) => ({
              id: p.place_id,
              name: p.name,
              restaurantName: p.name,
              restaurantId: p.place_id,
              avgRating: p.rating || 0,
              photoURL: p.photos ? `/api/places/photo?photoRef=${p.photos[0].photo_reference}&maxWidth=400` : undefined,
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
          const queries = [text.toLowerCase(), text, text.charAt(0).toUpperCase() + text.slice(1)];
          const titleCase = text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
          queries.push(titleCase);

          const allResults: any[] = [];
          for (const qText of Array.from(new Set(queries))) {
            const q = query(
              collection(db, collectionName),
              where(searchField, '>=', qText),
              where(searchField, '<=', qText + '\uf8ff'),
              limit(10)
            );
            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
              if (!allResults.find(r => r.id === doc.id)) {
                allResults.push({ id: doc.id, ...doc.data(), type });
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
        try {
          const discovered = await discoverFamousPlaces(text);
          const formattedQuery = text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          return discovered.map((d: any) => ({
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
        }
      };

      if (activeTab === 'top') {
        const [dishes, people, restaurants, global] = await Promise.all([
          fetchFirestore('dishes', 'name', queryText, 'dish'),
          fetchFirestore('users', 'displayName', queryText, 'person'),
          fetchPlaces(queryText),
          queryText.length >= 3 ? fetchGlobalDiscovery(queryText) : Promise.resolve([])
        ]);
        setTopResults({ dishes, people, restaurants, global });
      } else if (activeTab === 'restaurants') {
        setResults(await fetchPlaces(queryText));
      } else {
        const collectionName = activeTab === 'people' ? 'users' : 'dishes';
        const searchField = activeTab === 'people' ? 'displayName' : 'name';
        const type = activeTab === 'people' ? 'person' : 'dish';
        const [fRes, gDiscovery] = await Promise.all([
          fetchFirestore(collectionName, searchField, queryText, type),
          (activeTab === 'dishes' && queryText.length >= 3) ? fetchGlobalDiscovery(queryText) : Promise.resolve([])
        ]);
        setResults([...fRes, ...gDiscovery]);
      }
      setLoading(false);
    };

    const timeoutId = setTimeout(performSearch, 500);
    return () => clearTimeout(timeoutId);
  }, [queryText, activeTab]);

  return (
    <div className="space-y-8">
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xl">&times;</span>}
          </button>
        )}
      </div>

      <div className="flex gap-4 border-b border-border overflow-x-auto no-scrollbar">
        <TabButton active={activeTab === 'top'} onClick={() => setActiveTab('top')} label="Top" />
        <TabButton active={activeTab === 'dishes'} onClick={() => setActiveTab('dishes')} icon={<Utensils size={14} />} label="Dishes" />
        <TabButton active={activeTab === 'restaurants'} onClick={() => setActiveTab('restaurants')} icon={<MapPin size={14} />} label="Places" />
        <TabButton active={activeTab === 'people'} onClick={() => setActiveTab('people')} icon={<Users size={14} />} label="People" />
      </div>

      <div className="space-y-6">
        {!keyHealth.googleMaps && (activeTab === 'restaurants' || activeTab === 'top') && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg text-orange-500"><MapPin size={16} /></div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-orange-500">Google Maps Integration Inactive</p>
              <p className="text-[10px] text-orange-500/70 uppercase tracking-widest leading-relaxed">
                Add <code>GOOGLE_MAPS_API_KEY</code> in Settings to discover real places.
              </p>
            </div>
          </div>
        )}

        {!queryText ? (
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-accent">
                <TrendingUp size={18} />
                <h2 className="text-xs uppercase tracking-[0.2em] font-bold">Trending in Singapore</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {TRENDING_DISHES.map(dish => <DishCard key={dish.id} dish={dish} />)}
              </div>
            </section>
            <section className="space-y-4">
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-muted">Popular Neighborhoods</h2>
              <div className="flex flex-wrap gap-2">
                {['Tanjong Pagar', 'Tiong Bahru', 'Orchard', 'Katong', 'Joo Chiat'].map(area => (
                  <button key={area} onClick={() => setQueryText(area)} className="glass px-4 py-2 rounded-xl text-xs font-bold hover:border-accent hover:text-accent transition-colors">{area}</button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
            ) : activeTab === 'top' ? (
              <div className="space-y-8">
                {topResults.global.length === 0 && topResults.dishes.length === 0 && topResults.restaurants.length === 0 && topResults.people.length === 0 ? (
                  <div className="text-center py-20 text-muted space-y-4">
                    <Utensils className="w-12 h-12 mx-auto opacity-20" />
                    <div className="space-y-1">
                      <p className="font-bold text-white">No results found for "{queryText}"</p>
                      <p className="text-[10px] uppercase tracking-[0.2em]">Our AI is currently scouring Singapore for new flavors.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {topResults.global.length > 0 && (
                      <section className="space-y-4">
                        <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted px-1">AI Discovery</h3>
                        <div className="space-y-4">
                          {topResults.global.map((dish: any) => (
                            <Link key={dish.id} to={`/dish/${dish.id}`} className="block glass rounded-2xl p-4 hover:border-accent transition-colors group">
                              <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-bold text-accent">{dish.name}</p>
                                <div className="flex items-center gap-1 bg-accent/10 px-2 py-0.5 rounded-full"><Star size={10} className="text-accent fill-accent" /><span className="text-[10px] font-bold text-accent">{dish.avgRating}</span></div>
                              </div>
                              <h4 className="text-lg font-bold group-hover:text-accent transition-colors">{dish.restaurantName}</h4>
                              <p className="text-[10px] text-muted uppercase mb-2">{dish.location.neighborhood}</p>
                              <p className="text-xs text-muted leading-relaxed line-clamp-2">{dish.globalInfo}</p>
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
                          {topResults.restaurants.slice(0, 4).map((r: any) => <DishCard key={r.id} dish={r as Dish} />)}
                        </div>
                      </section>
                    )}
                    {topResults.people.length > 0 && (
                      <section className="space-y-4">
                        <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted px-1">People</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {topResults.people.map((u: UserProfile) => (
                            <Link key={u.id} to={`/profile/${u.id}`} className="glass rounded-2xl p-4 flex items-center gap-3 hover:border-accent group">
                              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent group-hover:bg-accent group-hover:text-black">{u.displayName[0]}</div>
                              <p className="text-xs font-bold truncate group-hover:text-accent">{u.displayName}</p>
                            </Link>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {results.map((item: any) => <DishCard key={item.id} dish={item} />)}
              </div>
            ) : (
              <div className="text-center py-20 text-muted space-y-4">
                <Utensils className="w-12 h-12 mx-auto opacity-20" />
                <div className="space-y-1">
                  <p className="font-bold text-white">No results found for "{queryText}"</p>
                  <p className="text-[10px] uppercase tracking-widest">Tip: Try a broader search or check your spelling.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon?: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={cn("flex items-center gap-2 pb-3 px-1 transition-all border-b-2 shrink-0", active ? "text-accent border-accent" : "text-muted border-transparent hover:text-white")}>
    {icon}
    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </button>
);
