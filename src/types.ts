export interface PalateMap {
  sweet: number;
  sour: number;
  salty: number;
  bitter: number;
  umami: number;
  spicy: number;
  richness: number;
  texture: number;
}

export interface UserStats {
  totalPlates: number;
  distinctCuisines: number;
  neighborhoods: number;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  photoURL?: string;
  signature4: string[]; // Array of Dish IDs
  palateMap: PalateMap;
  stats: UserStats;
  bio?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    neighborhood: string;
  };
  googlePlaceId?: string;
}

export interface Dish {
  id: string;
  name: string;
  restaurantId: string;
  restaurantName: string;
  avgRating: number;
  flavorProfile: PalateMap;
  photoURL?: string;
}

export interface FoodLog {
  id: string;
  userId: string;
  dishId: string;
  dishName: string;
  restaurantId: string;
  restaurantName: string;
  rating: number; // 1-5 with 0.5 increments
  review: string;
  photoURL: string;
  worthTheQueue: boolean;
  reMakanCount: number;
  timestamp: any; // Firestore Timestamp
  tags: string[];
  flavorProfile: PalateMap;
}
