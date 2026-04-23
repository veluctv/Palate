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
  lists?: string[]; // IDs of FoodList
}

export interface FoodList {
  id: string;
  userId: string;
  username: string;
  title: string;
  description: string;
  dishIds: string[];
  isPublic: boolean;
  createdAt: any;
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
  username: string; // Redundant for performance
  userDisplayName: string; // Redundant for performance
  dishId: string;
  dishName: string;
  restaurantId: string;
  restaurantName: string;
  rating: number; // 1 to 5 with 0.5 increments
  review: string;
  photoURL: string;
  worthTheQueue: boolean;
  revisitCount: number;
  timestamp: any; // Firestore Timestamp
  tags: string[];
  flavorProfile: PalateMap;
}
