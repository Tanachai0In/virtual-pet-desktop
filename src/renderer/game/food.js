// @ts-check
// Food definitions and dropped-food items. Pure module.

/** Food types map to cells in assets/species/common/items.png (see common/meta.json). */
export const FOODS = {
  fish: { item: 'fish', nutrition: 35, bites: 3 },
  bone: { item: 'bone', nutrition: 30, bites: 3 },
  kibble: { item: 'bowl', nutrition: 50, bites: 4 },
  cookie: { item: 'cookie', nutrition: 20, bites: 2 },
};

export const FOOD_DESPAWN_S = 120;

/** @typedef {{ type: keyof typeof FOODS, x: number, y: number, bites: number, age: number }} FoodItem */

/**
 * @param {keyof typeof FOODS} type
 * @param {number} x
 * @param {number} floorY
 * @returns {FoodItem}
 */
export function createFood(type, x, floorY) {
  const def = FOODS[type] ?? FOODS.cookie;
  return { type: def === FOODS[type] ? type : 'cookie', x, y: floorY, bites: def.bites, age: 0 };
}
