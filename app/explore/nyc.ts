// The app covers NYC only
export const NYC = { west: -74.26, north: 40.92, east: -73.7, south: 40.49 };

export function inNyc(lat: number, lon: number) {
  return lat >= NYC.south && lat <= NYC.north && lon >= NYC.west && lon <= NYC.east;
}

export const RADII_MILES = [1, 2, 3] as const;

// `google`: Google place types. `primaryOnly` matches a place's main type only,
// so a sandwich chain that also counts as a bakery isn't "Dessert".
export const CATEGORIES = {
  coffee: { label: "Coffee", google: ["cafe", "coffee_shop"], primaryOnly: true },
  restaurants: { label: "Restaurants", google: ["restaurant"], primaryOnly: false },
  bars: { label: "Bars", google: ["bar", "pub", "wine_bar"], primaryOnly: false },
  clubs: { label: "Clubs", google: ["night_club"], primaryOnly: false },
  museums: { label: "Museums", google: ["museum", "art_gallery"], primaryOnly: false },
  parks: { label: "Parks", google: ["park"], primaryOnly: false },
  bookstores: { label: "Bookstores", google: ["book_store"], primaryOnly: true },
  dessert: {
    label: "Dessert",
    google: ["bakery", "ice_cream_shop", "dessert_shop", "confectionery"],
    primaryOnly: true,
  },
} as const;

export type Category = keyof typeof CATEGORIES;

// 0.04 → "< 0.1 mi", 0.3 → "0.3 mi"
export function formatMiles(miles: number) {
  return miles < 0.1 ? "< 0.1 mi" : `${miles} mi`;
}

// Plan options
export const HOURS = [1, 2, 3] as const;
export const BUDGETS = ["$", "$$", "$$$"] as const;
