import { collection, addDoc, getDocs, deleteDoc, query, limit, serverTimestamp, setDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile, FoodLog, Dish, PalateMap } from '../types';

const CUISINES = ['Singaporean', 'Japanese', 'Italian', 'Mexican', 'Indian', 'French', 'Chinese', 'Korean', 'Thai', 'Vietnamese'];
const NEIGHBORHOODS = ['Tanjong Pagar', 'Tiong Bahru', 'Orchard', 'Katong', 'Joo Chiat', 'Bugis', 'Holland Village', 'Chinatown', 'Little India', 'Marina Bay'];

const REALISTIC_DISHES = [
  { name: 'Nasi Lemak', restaurant: 'Wild Coco', neighborhood: 'Tanjong Pagar' },
  { name: 'Nasi Lemak', restaurant: 'The Village', neighborhood: 'Tiong Bahru' },
  { name: 'Chicken Rice', restaurant: 'Tian Tian Hainanese Chicken Rice', neighborhood: 'Chinatown' },
  { name: 'Laksa', restaurant: '328 Katong Laksa', neighborhood: 'Katong' },
  { name: 'Big Mac', restaurant: 'McDonalds', neighborhood: 'Orchard' },
  { name: 'Zinger Burger', restaurant: 'KFC', neighborhood: 'Novena' },
  { name: 'Caramel Macchiato', restaurant: 'Starbucks', neighborhood: 'Raffles Place' },
  { name: 'Chilli Crab', restaurant: 'Jumbo Seafood', neighborhood: 'East Coast' },
  { name: 'Oyster Omelette', restaurant: 'Newton Circus', neighborhood: 'Newton' },
  { name: 'Kaya Toast', restaurant: 'Ya Kun Kaya Toast', neighborhood: 'CBD' },
  { name: 'Beef Rendang', restaurant: 'Violet Oon', neighborhood: 'Orchard' },
  { name: 'Dim Sum', restaurant: 'Tim Ho Wan', neighborhood: 'Bugis' },
  { name: 'Bak Kut Teh', restaurant: 'Song Fa Bak Kut Teh', neighborhood: 'Chinatown' }
];

const REVIEWS = [
  "This is exceptional. The balance is elite.",
  "Worth the wait. Texture is incredible.",
  "Average. I have had better at the local stall.",
  "The flavor profile is perfectly balanced. Highly recommend.",
  "Portion size is a bit small but quality is top tier.",
  "Best I have ever had in Singapore. Period.",
  "A bit too salty for my taste, but the aroma is great.",
  "Pure comfort food. Definitely returning.",
  "Iconic for a reason. Do not skip the extra sauce.",
  "A culinary masterpiece hiding in plain sight."
];

export const massInflateNeighborhoods = async () => {
  console.log('Starting mass neighborhood inflation...');
  const neighborhoods = ['Tanjong Pagar', 'Tiong Bahru', 'Katong', 'Orchard', 'Chinatown', 'Little India', 'Geylang'];
  const categories = ['Cafe', 'Hawker', 'Casual Dining', 'Gourmet', 'Fast Food'];

  for (const n of neighborhoods) {
    for (const c of categories) {
       try {
         const query = `${c} in ${n} Singapore`;
         const res = await fetch(`/api/places?query=${encodeURIComponent(query)}`);
         const data = await res.json();
         
         if (data.results) {
           for (const p of data.results.slice(0, 3)) {
             // Just putting into Firestore triggers our resolution later
             const dishRef = doc(collection(db, 'dishes'));
             await setDoc(dishRef, {
                name: c,
                restaurantName: p.name,
                restaurantId: p.place_id,
                avgRating: p.rating || 4.0,
                location: { neighborhood: n },
                isSeed: true
             });
           }
         }
       } catch (e) {
         console.error(`Failed to inflate ${c} in ${n}:`, e);
       }
    }
  }
};

export const seedRealisticData = async () => {
  console.log('Starting realistic data seeding...');

  try {
    const reviews = REVIEWS;

    // 1. Clear existing data
    const collectionsToClear = ['logs', 'dishes', 'users', 'lists'];
    const currentUserId = auth.currentUser?.uid;

    for (const coll of collectionsToClear) {
      const snapshot = await getDocs(collection(db, coll));
      for (const d of snapshot.docs) {
        // Don't delete current user's profile to avoid "User not found" on own page
        if (coll === 'users' && d.id === currentUserId) continue;
        await deleteDoc(d.ref);
      }
    }

    // 2. Mock Users with diverse Palate Profiles
    const mockUsersData = [
      { 
        username: 'flavor_maestro', 
        displayName: 'Wei Ling', 
        bio: 'Searching for the best laksa in Singapore. Professional umami hunter.',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
        palate: { sweet: 0.2, sour: 0.7, salty: 0.6, bitter: 0.3, umami: 0.9, spicy: 0.8, richness: 0.5, texture: 0.7 } 
      },
      { 
        username: 'hawker_hound', 
        displayName: 'Marcus Lim', 
        bio: 'Local street food enthusiast. Keeping the hawker culture alive, one bowl at a time.',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
        palate: { sweet: 0.4, sour: 0.3, salty: 0.8, bitter: 0.2, umami: 0.7, spicy: 0.6, richness: 0.9, texture: 0.5 } 
      },
      { 
        username: 'dessert_queen', 
        displayName: 'Sarah Tan', 
        bio: 'Sugar is my middle name. If it’s not sweet, is it even a meal?',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
        palate: { sweet: 0.9, sour: 0.4, salty: 0.2, bitter: 0.1, umami: 0.3, spicy: 0.1, richness: 0.8, texture: 0.6 } 
      },
      { 
        username: 'umami_hunter', 
        displayName: 'Chef Julian', 
        bio: 'Fine dining and local gems. Obsessed with depth of flavor.',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
        palate: { sweet: 0.3, sour: 0.5, salty: 0.5, bitter: 0.4, umami: 1.0, spicy: 0.4, richness: 0.7, texture: 0.8 } 
      },
      { 
        username: 'texture_junkie', 
        displayName: 'Chloe Ng', 
        bio: 'If it does not crunch, I do not want it. Texture over everything.',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
        palate: { sweet: 0.5, sour: 0.5, salty: 0.5, bitter: 0.5, umami: 0.5, spicy: 0.5, richness: 0.4, texture: 1.0 } 
      }
    ];

    const users: UserProfile[] = [];
    for (const userData of mockUsersData) {
      const userRef = doc(collection(db, 'users'));
      const profile: UserProfile = {
        id: userRef.id,
        username: userData.username,
        displayName: userData.displayName,
        bio: userData.bio,
        photoURL: userData.avatar,
        palateMap: userData.palate,
        signature4: [],
        stats: { totalPlates: 25, distinctCuisines: 8, neighborhoods: 12 },
        lists: []
      };
      await setDoc(userRef, profile);
      users.push(profile);
    }

    // 3. Fetch real restaurants from Google Places
    let realRestaurants: any[] = [];
    try {
      const placesRes = await fetch('/api/places?query=best+food+in+Singapore&location=1.3521,103.8198&radius=10000');
      const placesData = await placesRes.json();
      if (placesData.results) {
        realRestaurants = placesData.results.map((p: any) => ({
          name: p.name,
          neighborhood: (p.vicinity || 'Singapore').split(',')[0],
          rating: p.rating,
          id: p.place_id,
          photo: p.photos?.[0]?.photo_reference
        }));
      }
    } catch (e) {
      console.warn('Google Places fetch failed.');
    }

    const restaurantList = realRestaurants.length > 5 ? realRestaurants : REALISTIC_DISHES;

    // 4. Create Dishes and Logs
    const dishes: Dish[] = [];
    for (let i = 0; i < restaurantList.length; i++) {
        const restaurant = restaurantList[i];
        const dishCount = Math.floor(Math.random() * 2) + 1;
        
        for (let j = 0; j < dishCount; j++) {
          const dishRef = doc(collection(db, 'dishes'));
          const baseDish = REALISTIC_DISHES[Math.floor(Math.random() * REALISTIC_DISHES.length)];
          
          const palate: PalateMap = {
            sweet: Math.random(),
            sour: Math.random(),
            salty: Math.random(),
            bitter: Math.random(),
            umami: Math.random(),
            spicy: Math.random(),
            richness: Math.random(),
            texture: Math.random()
          };
  
          const restaurantName = (restaurant as any).name || (restaurant as any).restaurant;
          const restaurantId = (restaurant as any).id || `r-${i}`;
          
          const dish: Dish = {
            id: dishRef.id,
            name: baseDish.name,
            restaurantId: restaurantId,
            restaurantName: restaurantName,
            avgRating: (restaurant as any).rating || 4.2,
            flavorProfile: palate,
            photoURL: `https://picsum.photos/seed/${restaurantId}${j}/400/400`
          };
          await setDoc(dishRef, dish);
          dishes.push(dish);
  
          // Create 2-4 logs for this dish from random users
          const logCount = Math.floor(Math.random() * 3) + 2;
          for (let l = 0; l < logCount; l++) {
            const user = users[Math.floor(Math.random() * users.length)];
            const logData: Omit<FoodLog, 'id'> = {
              userId: user.id,
              username: user.username,
              userDisplayName: user.displayName,
              dishId: dish.id,
              dishName: dish.name,
              restaurantId: dish.restaurantId,
              restaurantName: dish.restaurantName,
              rating: Math.floor(Math.random() * 5) + 1,
              review: reviews[Math.floor(Math.random() * reviews.length)],
              photoURL: `https://picsum.photos/seed/log${i}${j}${l}/800/800`,
              worthTheQueue: Math.random() > 0.6,
              revisitCount: Math.floor(Math.random() * 5),
              timestamp: serverTimestamp(),
              tags: [CUISINES[Math.floor(Math.random() * CUISINES.length)]],
              flavorProfile: palate
            };
            await addDoc(collection(db, 'logs'), logData);
          }
        }
      }
  
      // 5. Create Sample Lists
      const listTitles = ["Best Laksa Hunt", "Tiong Bahru Gems", "Salty Weekend", "Late Night Bites", "Fine Dining Musts"];
      for (let i = 0; i < 3; i++) {
          const user = users[Math.floor(Math.random() * users.length)];
          const listRef = doc(collection(db, 'lists'));
          const listDishes = dishes.slice(0, 5).map(d => d.id).sort(() => 0.5 - Math.random()).slice(0, 3);
          
          await setDoc(listRef, {
              id: listRef.id,
              userId: user.id,
              username: user.username,
              title: listTitles[i],
              description: "A curated collection of my favorite spots.",
              dishIds: listDishes,
              isPublic: true,
              createdAt: serverTimestamp()
          });
  
          // Link to user
          const userRef = doc(db, 'users', user.id);
          await updateDoc(userRef, {
              lists: arrayUnion(listRef.id)
          });
      }
  
      console.log(`Successfully seeded diverse Singapore data.`);
    } catch (error) {
      console.error('Seed fatal error:', error);
    }
  };
