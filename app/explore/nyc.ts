// The app covers NYC only
export const NYC = { west: -74.26, north: 40.92, east: -73.7, south: 40.49 };

export function inNyc(lat: number, lon: number) {
  return lat >= NYC.south && lat <= NYC.north && lon >= NYC.west && lon <= NYC.east;
}

export const RADII_MILES = [1, 2, 3] as const;

export const CATEGORIES = {
  coffee: { label: "Coffee", geoapify: "catering.cafe" },
  restaurants: { label: "Restaurants", geoapify: "catering.restaurant" },
  bars: { label: "Bars", geoapify: "catering.bar,catering.pub" },
  museums: { label: "Museums", geoapify: "entertainment.museum,entertainment.culture.gallery" },
  parks: { label: "Parks", geoapify: "leisure.park" },
  bookstores: { label: "Bookstores", geoapify: "commercial.books" },
  dessert: {
    label: "Dessert",
    geoapify: "catering.ice_cream,commercial.food_and_drink.bakery,commercial.food_and_drink.confectionery",
  },
} as const;

export type Category = keyof typeof CATEGORIES;

// Plan options
export const HOURS = [1, 2, 3] as const;
export const BUDGETS = ["$", "$$", "$$$"] as const;
