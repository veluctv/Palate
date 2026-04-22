import { collection, addDoc, getDocs, deleteDoc, query, limit, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
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
  "This absolutely slaps. The sambal is goated.",
  "Worth the queue for sure. Texture is incredible.",
  "Mid. I've had better at the hawker center nearby.",
  "The flavor profile is perfectly balanced. Highly recommend.",
  "Portion size is a bit small but quality is top notch.",
  "Best I've ever had in Singapore. Period.",
  "Bit too salty for my taste, but the aroma is great.",
  "Pure comfort food. Re-makan definitely.",
  "Iconic for a reason. Don't skip the extra gravy.",
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

    // 2. Fetch real restaurants from Google Places (via our proxy)
    let realRestaurants = [];
    try {
      const placesRes = await fetch('/api/places?query=restaurants+in+singapore&location=1.3521,103.8198&radius=10000');
      const placesData = await placesRes.json();
      if (placesData.results) {
        realRestaurants = placesData.results.map((p: any) => ({
          name: p.name,
          neighborhood: p.vicinity || 'Singapore',
          rating: p.rating,
          id: p.place_id
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch from Google Places, using fallback list.');
    }

    const restaurantList = realRestaurants.length > 0 ? realRestaurants : REALISTIC_DISHES;

    // 3. Clear existing data
    const collectionsToClear = ['logs', 'dishes', 'users'];
    for (const coll of collectionsToClear) {
      const snapshot = await getDocs(collection(db, coll));
      for (const d of snapshot.docs) {
        await deleteDoc(d.ref);
      }
    }

    // 4. Create Mock Users
    const mockUsersData = [
      { username: 'foodie_gal', displayName: 'Sarah Tan', bio: 'Living for the next meal.' },
      { username: 'hungry_king', displayName: 'Marcus Lim', bio: 'Hawker food specialist.' },
      { username: 'makan_master', displayName: 'Wei Ling', bio: 'Searching for the best laksa.' },
      { username: 'chef_boy', displayName: 'Chef Julian', bio: 'Fine dining & street food.' },
      { username: 'taste_twin', displayName: 'Chloe Ng', bio: 'Palate twins welcome!' }
    ];

    const users: UserProfile[] = [];
    for (const userData of mockUsersData) {
      const userRef = doc(collection(db, 'users'));
      const profile: UserProfile = {
        id: userRef.id,
        ...userData,
        palateMap: { sweet: 0.5, sour: 0.5, salty: 0.5, bitter: 0.5, umami: 0.5, spicy: 0.5, richness: 0.5, texture: 0.5 },
        signature4: [],
        stats: { totalPlates: 0, distinctCuisines: 0, neighborhoods: 0 }
      };
      await setDoc(userRef, profile);
      users.push(profile);
    }

    // 5. Create Dishes
    const dishes: Dish[] = [];
    for (const restaurant of restaurantList) {
      // Create 2-3 dishes per restaurant
      const dishCount = Math.floor(Math.random() * 3) + 2;
      for (let j = 0; j < dishCount; j++) {
        const dishRef = doc(collection(db, 'dishes'));
        const dishInfo = REALISTIC_DISHES[Math.floor(Math.random() * REALISTIC_DISHES.length)];
        const dish: Dish = {
          id: dishRef.id,
          name: dishInfo.name,
          restaurantId: restaurant.id || `r-${restaurant.name}`,
          restaurantName: restaurant.name,
          avgRating: (Math.random() * 2) + 3,
          flavorProfile: {
            sweet: Math.random(),
            sour: Math.random(),
            salty: Math.random(),
            bitter: Math.random(),
            umami: Math.random(),
            spicy: Math.random(),
            richness: Math.random(),
            texture: Math.random()
          },
          photoURL: `https://picsum.photos/seed/${dishInfo.name}${j}/400/400`
        };
        await setDoc(dishRef, dish);
        dishes.push(dish);
      }
    }

    // 6. Create Logs
    for (let i = 0; i < 150; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const dish = dishes[Math.floor(Math.random() * dishes.length)];
      const review = reviews[Math.floor(Math.random() * reviews.length)];
      const rating = Math.floor(Math.random() * 5) + 1;

      const logData = {
        userId: user.id,
        dishId: dish.id,
        dishName: dish.name,
        restaurantId: dish.restaurantId,
        restaurantName: dish.restaurantName,
        rating,
        review,
        photoURL: `https://picsum.photos/seed/${dish.name}${i}/800/800`,
        worthTheQueue: Math.random() > 0.7,
        reMakanCount: Math.floor(Math.random() * 5),
        timestamp: serverTimestamp(),
        tags: [CUISINES[Math.floor(Math.random() * CUISINES.length)], dish.restaurantName.split(' ')[0]],
        flavorProfile: dish.flavorProfile
      };

      await addDoc(collection(db, 'logs'), logData);
    }

    console.log(`Successfully seeded ${users.length} users, ${dishes.length} dishes, and 150 logs.`);
  } catch (error) {
    console.error('Error seeding realistic data:', error);
  }
};
