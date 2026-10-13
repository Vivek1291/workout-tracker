import { Food, FoodCategory, Portion } from '../types';
import { nowIso } from '../lib/id';

/**
 * Built-in foods. Values are approximate, per 100 g (or 100 ml) as usually eaten (cooked),
 * based on common food-composition tables (IFCT / USDA). Users can edit any of them.
 *
 * [name, category, kcal, protein, carbs, fat, portions, basis?]
 */
type Row = [string, FoodCategory, number, number, number, number, [string, number][], ('g' | 'ml')?];

const BOWL = 150; // a typical katori/bowl of cooked food, in grams

export const FOOD_LIBRARY: Row[] = [
  // Grains & breads
  ['Roti / Chapati', 'Grains & breads', 297, 9.8, 46, 7.5, [['piece', 40]]],
  ['Phulka (no oil)', 'Grains & breads', 264, 9, 52, 1.5, [['piece', 30]]],
  ['Paratha (plain)', 'Grains & breads', 326, 7.5, 45, 13, [['piece', 80]]],
  ['Aloo paratha', 'Grains & breads', 260, 5.5, 36, 10.5, [['piece', 120]]],
  ['Naan', 'Grains & breads', 310, 9, 55, 5.5, [['piece', 90]]],
  ['Puri', 'Grains & breads', 385, 6.5, 44, 20, [['piece', 25]]],
  ['White rice (cooked)', 'Grains & breads', 130, 2.7, 28, 0.3, [['bowl', BOWL], ['cup', 160]]],
  ['Brown rice (cooked)', 'Grains & breads', 123, 2.7, 26, 1, [['bowl', BOWL], ['cup', 160]]],
  ['Jeera rice', 'Grains & breads', 160, 3, 28, 4, [['bowl', BOWL]]],
  ['Veg biryani', 'Grains & breads', 165, 3.5, 25, 5.5, [['plate', 250], ['bowl', 200]]],
  ['Chicken biryani', 'Grains & breads', 185, 9, 22, 6.5, [['plate', 300], ['bowl', 200]]],
  ['Khichdi', 'Grains & breads', 120, 4.5, 20, 2.5, [['bowl', 200]]],
  ['Poha', 'Grains & breads', 180, 3.5, 30, 5, [['plate', 150], ['bowl', BOWL]]],
  ['Upma', 'Grains & breads', 190, 4.5, 28, 6.5, [['bowl', BOWL]]],
  ['Idli', 'Grains & breads', 145, 4.5, 30, 0.5, [['piece', 40]]],
  ['Dosa (plain)', 'Grains & breads', 168, 3.9, 29, 3.7, [['piece', 90]]],
  ['Masala dosa', 'Grains & breads', 190, 4, 27, 7.5, [['piece', 180]]],
  ['Oats (dry)', 'Grains & breads', 389, 16.9, 66, 6.9, [['cup', 80], ['tbsp', 10]]],
  ['Oats porridge with milk', 'Grains & breads', 110, 4.5, 16, 3, [['bowl', 250]]],
  ['Bread (white)', 'Grains & breads', 265, 9, 49, 3.2, [['slice', 25]]],
  ['Bread (whole wheat)', 'Grains & breads', 250, 12, 43, 3.5, [['slice', 30]]],
  ['Pasta (cooked)', 'Grains & breads', 158, 5.8, 31, 0.9, [['bowl', 200], ['cup', 140]]],
  ['Cornflakes', 'Grains & breads', 357, 7.5, 84, 0.4, [['bowl', 30]]],
  ['Muesli', 'Grains & breads', 370, 10, 66, 6, [['bowl', 50]]],
  ['Quinoa (cooked)', 'Grains & breads', 120, 4.4, 21, 1.9, [['bowl', BOWL]]],

  // Dal & legumes
  ['Dal (toor / arhar, cooked)', 'Dal & legumes', 115, 6.5, 16, 2.8, [['bowl', BOWL]]],
  ['Moong dal (cooked)', 'Dal & legumes', 105, 7, 15, 1.8, [['bowl', BOWL]]],
  ['Masoor dal (cooked)', 'Dal & legumes', 116, 9, 20, 0.4, [['bowl', BOWL]]],
  ['Dal makhani', 'Dal & legumes', 140, 5.5, 13, 7, [['bowl', BOWL]]],
  ['Rajma curry', 'Dal & legumes', 130, 6, 17, 4, [['bowl', BOWL]]],
  ['Chole / Chana masala', 'Dal & legumes', 160, 7, 20, 6, [['bowl', BOWL]]],
  ['Sambar', 'Dal & legumes', 65, 3, 9, 2, [['bowl', 200]]],
  ['Boiled chickpeas', 'Dal & legumes', 164, 8.9, 27, 2.6, [['bowl', 100], ['cup', 160]]],
  ['Sprouts (moong)', 'Dal & legumes', 30, 3, 6, 0.2, [['bowl', 100]]],
  ['Soya chunks (dry)', 'Dal & legumes', 345, 52, 33, 0.5, [['cup', 50], ['handful', 25]]],
  ['Tofu', 'Dal & legumes', 76, 8, 1.9, 4.8, [['piece', 50]]],
  ['Peanut butter', 'Dal & legumes', 588, 25, 20, 50, [['tbsp', 16]]],

  // Vegetables & curries
  ['Mixed veg sabzi', 'Vegetables & curries', 95, 2.5, 10, 5, [['bowl', BOWL]]],
  ['Aloo sabzi', 'Vegetables & curries', 120, 2, 16, 5.5, [['bowl', BOWL]]],
  ['Bhindi (okra) sabzi', 'Vegetables & curries', 100, 2.2, 9, 6.5, [['bowl', BOWL]]],
  ['Palak paneer', 'Vegetables & curries', 165, 8, 6, 12, [['bowl', BOWL]]],
  ['Paneer butter masala', 'Vegetables & curries', 240, 9, 9, 19, [['bowl', BOWL]]],
  ['Baingan bharta', 'Vegetables & curries', 90, 2, 8, 5.5, [['bowl', BOWL]]],
  ['Cauliflower (gobi) sabzi', 'Vegetables & curries', 85, 2.5, 8, 5, [['bowl', BOWL]]],
  ['Green salad', 'Vegetables & curries', 20, 1, 4, 0.2, [['bowl', 100]]],
  ['Boiled potato', 'Vegetables & curries', 87, 1.9, 20, 0.1, [['piece', 150]]],
  ['Sweet potato (boiled)', 'Vegetables & curries', 86, 1.6, 20, 0.1, [['piece', 130]]],
  ['Broccoli (cooked)', 'Vegetables & curries', 35, 2.4, 7, 0.4, [['bowl', 100]]],
  ['Cucumber', 'Vegetables & curries', 15, 0.7, 3.6, 0.1, [['piece', 200]]],
  ['Tomato', 'Vegetables & curries', 18, 0.9, 3.9, 0.2, [['piece', 100]]],
  ['Raita', 'Vegetables & curries', 60, 3, 5, 3, [['bowl', 100]]],

  // Dairy & eggs
  ['Egg (whole, boiled)', 'Dairy & eggs', 155, 13, 1.1, 11, [['piece', 50]]],
  ['Egg white', 'Dairy & eggs', 52, 11, 0.7, 0.2, [['piece', 33]]],
  ['Omelette (2 eggs)', 'Dairy & eggs', 165, 11, 1.5, 12.5, [['piece', 120]]],
  ['Milk (toned)', 'Dairy & eggs', 58, 3.1, 4.7, 3, [['glass', 250], ['cup', 200]], 'ml'],
  ['Milk (full cream)', 'Dairy & eggs', 67, 3.2, 4.8, 3.9, [['glass', 250], ['cup', 200]], 'ml'],
  ['Milk (skimmed)', 'Dairy & eggs', 35, 3.4, 5, 0.1, [['glass', 250], ['cup', 200]], 'ml'],
  ['Curd / Dahi', 'Dairy & eggs', 60, 3.1, 4.7, 3.1, [['bowl', BOWL], ['cup', 200]]],
  ['Greek yogurt', 'Dairy & eggs', 97, 9, 3.9, 5, [['cup', 170]]],
  ['Paneer', 'Dairy & eggs', 265, 18, 3.6, 20, [['piece', 25], ['cube', 15]]],
  ['Cheese slice', 'Dairy & eggs', 300, 18, 6, 23, [['slice', 20]]],
  ['Butter', 'Dairy & eggs', 717, 0.9, 0.1, 81, [['tsp', 5], ['tbsp', 14]]],
  ['Ghee', 'Dairy & eggs', 900, 0, 0, 100, [['tsp', 5], ['tbsp', 14]]],
  ['Buttermilk / Chaas', 'Dairy & eggs', 20, 1.5, 2.2, 0.6, [['glass', 250]], 'ml'],
  ['Lassi (sweet)', 'Dairy & eggs', 100, 3, 15, 3, [['glass', 250]], 'ml'],

  // Meat & fish
  ['Chicken breast (cooked)', 'Meat & fish', 165, 31, 0, 3.6, [['piece', 120]]],
  ['Chicken curry', 'Meat & fish', 150, 14, 4, 9, [['bowl', BOWL]]],
  ['Butter chicken', 'Meat & fish', 230, 14, 6, 17, [['bowl', BOWL]]],
  ['Tandoori chicken', 'Meat & fish', 150, 25, 2, 5, [['piece', 100]]],
  ['Chicken tikka', 'Meat & fish', 150, 24, 3, 5, [['piece', 30]]],
  ['Mutton curry', 'Meat & fish', 200, 16, 4, 13, [['bowl', BOWL]]],
  ['Fish curry', 'Meat & fish', 130, 15, 4, 6, [['bowl', BOWL]]],
  ['Fish (grilled)', 'Meat & fish', 130, 22, 0, 4.5, [['piece', 120]]],
  ['Salmon (cooked)', 'Meat & fish', 206, 22, 0, 12, [['piece', 120]]],
  ['Tuna (canned in water)', 'Meat & fish', 116, 26, 0, 0.8, [['can', 120]]],
  ['Prawns (cooked)', 'Meat & fish', 99, 24, 0.2, 0.3, [['bowl', 100]]],
  ['Egg curry', 'Meat & fish', 150, 9, 5, 10.5, [['bowl', BOWL]]],

  // Fruits
  ['Banana', 'Fruits', 89, 1.1, 23, 0.3, [['piece', 118]]],
  ['Apple', 'Fruits', 52, 0.3, 14, 0.2, [['piece', 180]]],
  ['Orange', 'Fruits', 47, 0.9, 12, 0.1, [['piece', 130]]],
  ['Mango', 'Fruits', 60, 0.8, 15, 0.4, [['piece', 200], ['bowl', 160]]],
  ['Papaya', 'Fruits', 43, 0.5, 11, 0.3, [['bowl', 150]]],
  ['Watermelon', 'Fruits', 30, 0.6, 7.6, 0.2, [['bowl', 150]]],
  ['Grapes', 'Fruits', 69, 0.7, 18, 0.2, [['bowl', 100]]],
  ['Pomegranate', 'Fruits', 83, 1.7, 19, 1.2, [['piece', 280], ['bowl', 100]]],
  ['Guava', 'Fruits', 68, 2.6, 14, 1, [['piece', 100]]],
  ['Dates', 'Fruits', 282, 2.5, 75, 0.4, [['piece', 8]]],
  ['Mixed fruit bowl', 'Fruits', 55, 0.8, 14, 0.2, [['bowl', 200]]],

  // Nuts & seeds
  ['Almonds', 'Nuts & seeds', 579, 21, 22, 50, [['piece', 1.2], ['handful', 28]]],
  ['Cashews', 'Nuts & seeds', 553, 18, 30, 44, [['piece', 1.5], ['handful', 28]]],
  ['Walnuts', 'Nuts & seeds', 654, 15, 14, 65, [['half', 2.5], ['handful', 28]]],
  ['Peanuts (roasted)', 'Nuts & seeds', 585, 24, 21, 50, [['handful', 30], ['tbsp', 9]]],
  ['Chia seeds', 'Nuts & seeds', 486, 17, 42, 31, [['tbsp', 12]]],
  ['Flax seeds', 'Nuts & seeds', 534, 18, 29, 42, [['tbsp', 10]]],
  ['Pumpkin seeds', 'Nuts & seeds', 559, 30, 11, 49, [['tbsp', 10]]],

  // Snacks & sweets
  ['Samosa', 'Snacks & sweets', 262, 3.5, 24, 17, [['piece', 100]]],
  ['Pakora / Bhajiya', 'Snacks & sweets', 315, 7, 30, 19, [['piece', 25]]],
  ['Vada pav', 'Snacks & sweets', 290, 6, 40, 12, [['piece', 140]]],
  ['Pav bhaji', 'Snacks & sweets', 200, 4.5, 25, 9, [['plate', 300]]],
  ['Biscuits (digestive)', 'Snacks & sweets', 480, 7, 65, 21, [['piece', 15]]],
  ['Namkeen / Bhujia', 'Snacks & sweets', 530, 12, 45, 34, [['handful', 30]]],
  ['Potato chips', 'Snacks & sweets', 536, 7, 53, 35, [['pack', 50], ['handful', 20]]],
  ['Gulab jamun', 'Snacks & sweets', 325, 4.5, 50, 12, [['piece', 40]]],
  ['Ladoo (besan)', 'Snacks & sweets', 470, 9, 55, 24, [['piece', 40]]],
  ['Dark chocolate (70%)', 'Snacks & sweets', 600, 7.8, 46, 43, [['square', 10]]],
  ['Ice cream (vanilla)', 'Snacks & sweets', 207, 3.5, 24, 11, [['scoop', 66]]],
  ['Pizza (cheese)', 'Snacks & sweets', 266, 11, 33, 10, [['slice', 107]]],
  ['Burger (veg)', 'Snacks & sweets', 245, 6.5, 33, 9.5, [['piece', 150]]],
  ['Sugar', 'Snacks & sweets', 387, 0, 100, 0, [['tsp', 4]]],
  ['Honey', 'Snacks & sweets', 304, 0.3, 82, 0, [['tsp', 7], ['tbsp', 21]]],

  // Drinks
  ['Tea with milk & sugar', 'Drinks', 40, 1, 6.5, 1, [['cup', 150]], 'ml'],
  ['Coffee with milk & sugar', 'Drinks', 45, 1.5, 6.5, 1.5, [['cup', 150]], 'ml'],
  ['Black coffee', 'Drinks', 2, 0.3, 0, 0, [['cup', 240]], 'ml'],
  ['Orange juice', 'Drinks', 45, 0.7, 10, 0.2, [['glass', 250]], 'ml'],
  ['Coconut water', 'Drinks', 19, 0.7, 3.7, 0.2, [['glass', 250]], 'ml'],
  ['Soft drink / Cola', 'Drinks', 42, 0, 10.6, 0, [['can', 330], ['glass', 250]], 'ml'],
  ['Protein shake (whey + milk)', 'Drinks', 90, 10, 6, 2.8, [['glass', 300]], 'ml'],
  ['Banana shake', 'Drinks', 90, 3, 15, 2.5, [['glass', 300]], 'ml'],

  // Supplements
  ['Whey protein', 'Supplements', 400, 80, 8, 6, [['scoop', 30]]],
  ['Mass gainer', 'Supplements', 380, 15, 75, 2, [['scoop', 100]]],
  ['Creatine', 'Supplements', 0, 0, 0, 0, [['scoop', 5]]],
  ['Protein bar', 'Supplements', 350, 30, 35, 10, [['piece', 60]]],

  // Other
  ['Cooking oil', 'Other', 884, 0, 0, 100, [['tsp', 5], ['tbsp', 14]]],
];

const slug = (name: string) =>
  'food-' +
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function libraryFoods(): Food[] {
  const now = nowIso();
  return FOOD_LIBRARY.map(([name, category, kcal, protein, carbs, fat, portions, basis]) => ({
    id: slug(name),
    name,
    category,
    per100: { kcal, protein, carbs, fat },
    basis: basis ?? 'g',
    portions: portions.map(([n, grams]): Portion => ({ name: n, grams })),
    builtIn: true,
    createdAt: now,
    updatedAt: now,
  }));
}
