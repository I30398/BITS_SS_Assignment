// Converts DB rows (snake_case, NUMERIC as string) to API objects.

function toRestaurant(row) {
  return {
    id: row.id,
    name: row.name,
    cuisine: row.cuisine,
    city: row.city,
    address: row.address,
    rating: Number(row.rating),
    isOpen: row.is_open,
    createdAt: row.created_at,
  };
}

function toMenuItem(row) {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description,
    category: row.category,
    price: Number(row.price),
    isVeg: row.is_veg,
    available: row.available,
  };
}

module.exports = { toRestaurant, toMenuItem };
